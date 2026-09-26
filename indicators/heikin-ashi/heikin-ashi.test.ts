import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, realisticDaily, type PackIndicator, type PackRun, type PackRuntime, type OHLCV } from 'guardian-gscript-toolchain';

interface Candle { open: number; high: number; low: number; close: number }

/**
 * Heikin Ashi candles as the reference platform draws them:
 *   haClose = (open + high + low + close) / 4
 *   haOpen  = (haOpen[1] + haClose[1]) / 2, seeded (open + close) / 2 on the first bar
 *   haHigh  = max(high, haOpen, haClose)
 *   haLow   = min(low, haOpen, haClose)
 */
function heikinAshi(bars: readonly OHLCV[]): Candle[] {
  const out: Candle[] = [];
  bars.forEach((bar, i) => {
    const close = (bar.open + bar.high + bar.low + bar.close) / 4;
    const open = i === 0 ? (bar.open + bar.close) / 2 : (out[i - 1].open + out[i - 1].close) / 2;
    out.push({ open, close, high: Math.max(bar.high, open, close), low: Math.min(bar.low, open, close) });
  });
  return out;
}

/** The candles a plotcandle output hands the chart, one per bar. */
function candles(run: PackRun, title: string): (Candle | null)[] {
  const out = run.snapshot.outputs.find((o) => o.kind === 'serial.ohlc' && o.title === title);
  if (out?.payload?.kind !== 'serial.ohlc') throw new Error(`no candles titled '${title}'`);
  const { values } = out.payload;
  if (values.encoding === 'dense') return [...values.values];
  const dense = new Array<Candle | null>(run.bars.length).fill(null);
  values.barIndexes.forEach((bar, k) => { dense[bar] = values.values[k]; });
  return dense;
}

function expectCandlesClose(actual: readonly (Candle | null)[], expected: readonly Candle[]) {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((e, i) => {
    const a = actual[i];
    expect(a, `bar ${i}`).not.toBeNull();
    for (const key of ['open', 'high', 'low', 'close'] as const) {
      expect(Math.abs((a as Candle)[key] - e[key]), `bar ${i} ${key}`).toBeLessThan(1e-9 * Math.max(1, Math.abs(e[key])));
    }
  });
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

/** A candle is up when it closes at or above its open. */
const isUp = (c: Candle) => c.close >= c.open;

describe('Heikin Ashi — averaged candles', () => {
  let runtime: PackRuntime;
  let ha: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    ha = await runtime.load('heikin-ashi');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('draws every candle as the reference defines it, from the first bar', async () => {
    const bars = realisticDaily();
    const run = await ha.run(bars);
    expectCandlesClose(candles(run, 'Heikin Ashi'), heikinAshi(bars));
  });

  // Worked by hand. Bar 0 opens at (100 + 105) / 2 = 102.5 and closes at
  // (100 + 110 + 95 + 105) / 4 = 102.5. Bar 1 opens at (102.5 + 102.5) / 2 and
  // closes at 108, its low is its open (no lower wick). Bar 2 opens at
  // (102.5 + 108) / 2 = 105.25, closes at 106.25, and wicks down to 100. Bar 3
  // opens at 105.75, closes at 96 and its high is its open (no upper wick).
  const worked = barsFrom([
    { open: 100, high: 110, low: 95, close: 105 },
    { open: 105, high: 112, low: 104, close: 111 },
    { open: 111, high: 113, low: 100, close: 101 },
    { open: 101, high: 102, low: 90, close: 91 },
  ]);

  it('matches four candles worked by hand, seeding the first open at (open + close) / 2', async () => {
    const run = await ha.run(worked);
    expect(candles(run, 'Heikin Ashi')).toEqual([
      { open: 102.5, high: 110, low: 95, close: 102.5 },
      { open: 102.5, high: 112, low: 102.5, close: 108 },
      { open: 105.25, high: 113, low: 100, close: 106.25 },
      { open: 105.75, high: 105.75, low: 90, close: 96 },
    ]);
  });

  describe('colours', () => {
    it('colours up and down candles apart, and a candle without a wick against the trend strongest', async () => {
      const colors = (await ha.run(worked)).plotColors('Heikin Ashi');
      // weak up (lower wick), strong up (no lower wick), weak up, strong down (no upper wick)
      const [weakUp, strongUp, weakUpAgain, strongDown] = colors;
      expect(weakUpAgain).toBe(weakUp);
      expect(new Set([weakUp, strongUp, strongDown]).size).toBe(3);
      expect(strongUp).toBe('#26a69a');
      expect(strongDown).toBe('#ef5350');
    });

    it('draws every candle in its plain trend colour when strong candles are not singled out', async () => {
      const colors = (await ha.run(worked, { strong: false })).plotColors('Heikin Ashi');
      expect(colors).toEqual(['#26a69a', '#26a69a', '#26a69a', '#ef5350']);
    });

    it('takes the up and down colours a trader picks', async () => {
      const colors = (await ha.run(worked, { strong: false, 'up-color': '#00ff00', 'down-color': '#ff00ff' }))
        .plotColors('Heikin Ashi');
      expect(colors).toEqual(['#00ff00', '#00ff00', '#00ff00', '#ff00ff']);
    });
  });

  describe('turns', () => {
    it('raises the turn alerts on the bar the candle colour changes', async () => {
      const bars = realisticDaily();
      const ref = heikinAshi(bars).map(isUp);
      const turnedUp = ref.flatMap((up, i) => (i > 0 && up && !ref[i - 1] ? [i] : []));
      const turnedDown = ref.flatMap((up, i) => (i > 0 && !up && ref[i - 1] ? [i] : []));
      expect(turnedUp.length).toBeGreaterThan(2);
      const run = await ha.run(bars);
      expect(barsWhere(run.alert('Turned up'))).toEqual(turnedUp);
      expect(barsWhere(run.alert('Turned down'))).toEqual(turnedDown);
    });

    it('turns down on the fourth worked candle only', async () => {
      const run = await ha.run(worked);
      expect(barsWhere(run.alert('Turned down'))).toEqual([3]);
      expect(barsWhere(run.alert('Turned up'))).toEqual([]);
    });

    it('counts the candles in a row of one colour in the Data Window, negative for down', async () => {
      const run = await ha.run(worked);
      expect(run.plot('Candles in a row')).toEqual([1, 2, 3, -1]);
      expect(run.shown('Candles in a row')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    });
  });
});
