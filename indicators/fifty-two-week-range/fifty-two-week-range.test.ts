import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, realisticDaily, closeSeries, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * The 52-week range, as swing traders read it:
 *   52-week high = highest high of the last `length` bars (252 by default, the
 *                  current bar included) — the reference platform's
 *                  `highest(high, 252)`, undefined until 252 bars exist;
 *   52-week low  = lowest low of the same window;
 *   % off high   = 100 × (close ÷ high − 1)   (0 at the high, negative below);
 *   % above low  = 100 × (close ÷ low − 1)    (0 at the low, positive above).
 */

/** Highest high and lowest low of the last `length` bars, as plain loops. */
function yearRange(bars: readonly OHLCV[], length: number): { high: Maybe[]; low: Maybe[] } {
  const high: Maybe[] = [];
  const low: Maybe[] = [];
  bars.forEach((_bar, i) => {
    if (i + 1 < length) { high.push(null); low.push(null); return; }
    let h = -Infinity;
    let l = Infinity;
    for (let k = i - length + 1; k <= i; k++) {
      h = Math.max(h, bars[k].high);
      l = Math.min(l, bars[k].low);
    }
    high.push(h);
    low.push(l);
  });
  return { high, low };
}

const pctFrom = (bars: readonly OHLCV[], level: readonly Maybe[]): Maybe[] =>
  bars.map((bar, i) => { const v = level[i]; return v === null ? null : 100 * (bar.close / v - 1); });

// Seven hand-shaped bars. With a 5-bar window the high is 120 (bar 2) and the
// low 80 (bar 4) from bar 4 on, so the numbers can be read off by eye.
const shaped = barsFrom([
  { open: 95, high: 100, low: 90, close: 95 },
  { open: 95, high: 110, low: 95, close: 105 },
  { open: 105, high: 120, low: 100, close: 115 },
  { open: 115, high: 115, low: 96, close: 100 },
  { open: 100, high: 105, low: 80, close: 84 },
  { open: 84, high: 96, low: 84, close: 90 },
  { open: 90, high: 100, low: 88, close: 99 },
]);

describe('52-Week Range — distance from the yearly high and low', () => {
  let runtime: PackRuntime;
  let range: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    range = await runtime.load('fifty-two-week-range');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads how far the close sits below the high of the window', async () => {
    const run = await range.run(shaped, { length: 5 });
    const off = run.plot('% off 52-week high');
    expect(off.slice(0, 4)).toEqual([null, null, null, null]);
    expect(off[4]).toBeCloseTo(-30, 10); // 84 against 120
    expect(off[5]).toBeCloseTo(-25, 10); // 90 against 120
    expect(off[6]).toBeCloseTo(-17.5, 10); // 99 against 120
  });

  it('reads how far the close sits above the low of the window', async () => {
    const run = await range.run(shaped, { length: 5 });
    const above = run.plot('% above 52-week low');
    expect(above.slice(0, 4)).toEqual([null, null, null, null]);
    expect(above[4]).toBeCloseTo(5, 10); // 84 against 80
    expect(above[5]).toBeCloseTo(12.5, 10); // 90 against 80
    expect(above[6]).toBeCloseTo(23.75, 10); // 99 against 80
  });

  it('uses a 252-bar year by default and draws nothing before it is complete', async () => {
    const bars = realisticDaily(400);
    const run = await range.run(bars);
    const ref = yearRange(bars, 252);
    expect(closeSeries(run.plot('% off 52-week high'), pctFrom(bars, ref.high))).toEqual({ ok: true });
    expect(closeSeries(run.plot('% above 52-week low'), pctFrom(bars, ref.low))).toEqual({ ok: true });
    expect(run.plot('% off 52-week high')[250]).toBeNull();
  });

  it('draws guide levels a trader can move: within 25% of the high, 30% above the low', async () => {
    const run = await range.run(shaped, { length: 5 });
    expect(run.level('Near-high guide')).toBe(-25);
    expect(run.level('Above-low guide')).toBe(30);
    expect(run.level('Zero')).toBe(0);
    const moved = await range.run(shaped, { length: 5, 'near-high': -15, 'above-low': 50 });
    expect(moved.level('Near-high guide')).toBe(-15);
    expect(moved.level('Above-low guide')).toBe(50);
  });

  it('lights each line only while price is on the right side of its guide', async () => {
    const run = await range.run(shaped, { length: 5, 'above-low': 10 });
    const offColors = run.plotColors('% off 52-week high');
    // −30% is outside the near-high zone; −25% (inclusive) and −17.5% are inside.
    expect(offColors[4]).not.toBe(offColors[6]);
    expect(offColors[5]).toBe(offColors[6]);
    const lowColors = run.plotColors('% above 52-week low');
    // +5% is under the 10% guide here; +12.5% and +23.75% are over it.
    expect(lowColors[4]).not.toBe(lowColors[5]);
    expect(lowColors[5]).toBe(lowColors[6]);
  });

  it('puts the high and low prices and the position in the range in the Data Window', async () => {
    const run = await range.run(shaped, { length: 5 });
    expect(run.plot('52-week high').slice(4)).toEqual([120, 120, 120]);
    expect(run.plot('52-week low').slice(4)).toEqual([80, 80, 80]);
    const position = run.plot('Position in range');
    expect(position[4]).toBeCloseTo(10, 10); // (84 − 80) ÷ 40
    expect(position[5]).toBeCloseTo(25, 10); // (90 − 80) ÷ 40
    expect(position[6]).toBeCloseTo(47.5, 10); // (99 − 80) ÷ 40
    for (const title of ['52-week high', '52-week low', 'Position in range']) {
      expect(run.shown(title)).toEqual({ pane: false, dataWindow: true, statusLine: false });
    }
  });

  it('shades the near-high zone between zero and its guide, and can leave it clear', async () => {
    const fillStyle = async (settings: Record<string, unknown>) => {
      const run = await range.run(shaped, { length: 5, ...settings });
      const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
      expect(fills).toHaveLength(1);
      return fills[0].style.color;
    };
    expect(await fillStyle({})).toBe('rgba(56, 189, 248, 0.1)');
    expect(await fillStyle({ shade: false })).toBe('rgba(56, 189, 248, 0)');
  });

  describe('new highs and lows', () => {
    // A 3-bar window: 115 on bar 4 is a new high; 113 on bar 8 is one again once
    // 115 has left the window. 85 on bar 10 is a new low.
    const highs = [110, 110, 110, 110, 115, 112, 111, 111, 113, 112, 108];
    const lows = [100, 100, 100, 100, 104, 104, 104, 104, 104, 104, 85];
    const bars = barsFrom(highs.map((h, i) => ({ open: lows[i] + 1, high: h, low: lows[i], close: lows[i] + 2 })));
    const barsWhere = (values: readonly (boolean | null)[]) => values.flatMap((hit, bar) => (hit ? [bar] : []));

    /** High above every high of the prior length − 1 bars (window of `length` incl. today). */
    const referenceNewHighs = (length: number) => highs.flatMap((h, i) =>
      (i + 1 >= length && h > Math.max(...highs.slice(i - length + 1, i)) ? [i] : []));

    it('marks and alerts the bars that set a new high of the window', async () => {
      const run = await range.run(bars, { length: 3 });
      expect(referenceNewHighs(3)).toEqual([4, 8]);
      expect(barsWhere(run.markers('New 52-week high'))).toEqual([4, 8]);
      expect(barsWhere(run.alert('New 52-week high'))).toEqual([4, 8]);
    });

    it('agrees with the plain-loop definition over a year of real-looking bars', async () => {
      const real = realisticDaily(600);
      const run = await range.run(real);
      const expected = real.flatMap((bar, i) => {
        if (i + 1 < 252) return [];
        let prior = -Infinity;
        for (let k = i - 251; k < i; k++) prior = Math.max(prior, real[k].high);
        return bar.high > prior ? [i] : [];
      });
      expect(expected.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('New 52-week high'))).toEqual(expected);
    });

    it('marks and alerts a new low of the window', async () => {
      const run = await range.run(bars, { length: 3 });
      expect(barsWhere(run.markers('New 52-week low'))).toEqual([10]);
      expect(barsWhere(run.alert('New 52-week low'))).toEqual([10]);
    });

    it('plots the new-high and new-low dots at different heights so a bar that is both does not hide one under the other', async () => {
      // Bar 2 both clears every prior high and undercuts every prior low of the window.
      const doubleExtreme = barsFrom([
        { open: 100, high: 105, low: 95, close: 100 },
        { open: 100, high: 106, low: 96, close: 101 },
        { open: 100, high: 120, low: 80, close: 100 },
      ]);
      const run = await range.run(doubleExtreme, { length: 3 });
      expect(barsWhere(run.markers('New 52-week high'))).toEqual([2]);
      expect(barsWhere(run.markers('New 52-week low'))).toEqual([2]);
      const dotValue = (title: string) => {
        const out = run.snapshot.outputs.find((o) => o.title === title);
        const payload = out?.payload as { kind: string; events?: { encoding: string; values: (number | null)[] } } | undefined;
        if (payload?.kind !== 'serial.event' || payload.events?.encoding !== 'dense') throw new Error(`no dense event payload for '${title}'`);
        return payload.events.values[2];
      };
      const highValue = dotValue('New 52-week high');
      const lowValue = dotValue('New 52-week low');
      expect(highValue).not.toBeNull();
      expect(lowValue).not.toBeNull();
      expect(highValue).not.toBe(lowValue);
    });
  });
});
