import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, pathBars, realisticDaily, closeSeries, field, zip, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * Exponential average as the reference platform computes it: alpha =
 * 2 / (length + 1), seeded with the simple average of the first `length`
 * values that exist, missing before that.
 */
function ema(values: readonly Maybe[], length: number): Maybe[] {
  const alpha = 2 / (length + 1);
  const out: Maybe[] = [];
  let prev: number | null = null;
  let seed = 0;
  let count = 0;
  for (const v of values) {
    if (v === null) { out.push(prev); continue; }
    if (prev === null) {
      seed += v;
      count += 1;
      if (count === length) prev = seed / length;
      out.push(prev);
      continue;
    }
    prev = alpha * v + (1 - alpha) * prev;
    out.push(prev);
  }
  return out;
}

/**
 * Elder's Impulse System: the 13-bar EMA's slope and the slope of the MACD
 * histogram (12, 26, 9 — MACD line = EMA12 − EMA26, signal = EMA9 of it,
 * histogram = line − signal). +1 (green) when both rose on the bar, −1 (red)
 * when both fell, 0 (blue) otherwise. Missing until the histogram has a slope:
 * bar 34 with the default lengths.
 */
function impulse(bars: readonly OHLCV[], emaLength = 13, fast = 12, slow = 26, signal = 9): Maybe[] {
  const close = field(bars, 'close');
  const trend = ema(close, emaLength);
  const line = zip(ema(close, fast), ema(close, slow), (f, s) => f - s);
  const hist = zip(line, ema(line, signal), (l, s) => l - s);
  return bars.map((_, i) => {
    if (i === 0) return null;
    const [e0, e1, h0, h1] = [trend[i], trend[i - 1], hist[i], hist[i - 1]];
    if (e0 === null || e1 === null || h0 === null || h1 === null) return null;
    if (e0 > e1 && h0 > h1) return 1;
    if (e0 < e1 && h0 < h1) return -1;
    return 0;
  });
}

function histogram(bars: readonly OHLCV[]): Maybe[] {
  const close = field(bars, 'close');
  const line = zip(ema(close, 12), ema(close, 26), (f, s) => f - s);
  return zip(line, ema(line, 9), (l, s) => l - s);
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

/**
 * Compounding 2% a bar for 60 bars, then a slide whose daily loss grows 5% a
 * bar for 30. In the rise both the EMA and the histogram climb (green); at the
 * top the EMA is still rising while the histogram already falls (blue); deep in
 * the accelerating slide both fall (red).
 */
const peak = 100 * 1.02 ** 59;
const boomAndBust = barsFrom(Array.from({ length: 90 }, (_, i) => {
  const close = i < 60 ? 100 * 1.02 ** i : peak - 60 * (1.05 ** (i - 59) - 1);
  return { open: close, high: close * 1.005, low: close * 0.995, close };
}));

/** A market that swings every few weeks, so all three impulse states occur. */
const swings = pathBars(Array.from({ length: 300 }, (_, i) => 200 + 15 * Math.sin(i / 8) + 3 * Math.sin(i * 1.7)), 1);

describe('Elder Impulse System — trend and momentum agreeing', () => {
  let runtime: PackRuntime;
  let ei: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    ei = await runtime.load('elder-impulse');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads +1, −1 or 0 on every bar as the definition does, from bar 34', async () => {
    const run = await ei.run(swings);
    const ref = impulse(swings);
    expect(ref.findIndex((v) => v !== null)).toBe(34);
    expect(new Set(ref.filter((v) => v !== null))).toEqual(new Set([1, -1, 0]));
    expect(closeSeries(run.plot('Impulse'), ref)).toEqual({ ok: true });
  });

  it('agrees with the definition on a trending market too', async () => {
    const bars = realisticDaily();
    const run = await ei.run(bars);
    expect(closeSeries(run.plot('Impulse'), impulse(bars))).toEqual({ ok: true });
  });

  it('follows the EMA and MACD lengths a trader sets', async () => {
    const run = await ei.run(swings, { 'ema-length': 21, fast: 8, slow: 21, signal: 5 });
    expect(closeSeries(run.plot('Impulse'), impulse(swings, 21, 8, 21, 5))).toEqual({ ok: true });
  });

  it('reads green through a compounding rise, blue at the top and red through an accelerating slide', async () => {
    const run = await ei.run(boomAndBust);
    const states = run.plot('Impulse');
    expect(states.slice(40, 60)).toEqual(new Array(20).fill(1));
    expect(states[60]).toBe(0);
    expect(states.slice(70)).toEqual(new Array(20).fill(-1));
  });

  describe('on the chart', () => {
    it('colours each bar green, red or blue by its impulse, and leaves the warm-up bars alone', async () => {
      const run = await ei.run(swings);
      const ref = impulse(swings);
      const colors = run.colorEffect('Bar color');
      const expected = ref.map((v) => (v === null ? null : v === 1 ? '#26a69a' : v === -1 ? '#ef5350' : '#38bdf8'));
      expect(colors).toEqual(expected);
    });

    it('leaves the bars uncoloured when bar colouring is off', async () => {
      const run = await ei.run(swings, { 'color-bars': false });
      expect(run.colorEffect('Bar color').every((c) => c === null)).toBe(true);
    });

    it('draws the 13-bar EMA the impulse is judged by', async () => {
      const run = await ei.run(swings);
      expect(closeSeries(run.plot('Impulse EMA'), ema(field(swings, 'close'), 13))).toEqual({ ok: true });
    });

    it('can hide the EMA and keep the bar colours', async () => {
      const run = await ei.run(swings, { 'show-ema': false });
      expect(run.plot('Impulse EMA').every((v) => v === null)).toBe(true);
      expect(run.colorEffect('Bar color').some((c) => c !== null)).toBe(true);
    });

    it('shows the impulse and the MACD histogram in the Data Window only', async () => {
      const run = await ei.run(swings);
      expect(closeSeries(run.plot('MACD histogram'), histogram(swings))).toEqual({ ok: true });
      expect(run.shown('Impulse')).toEqual({ pane: false, dataWindow: true, statusLine: false });
      expect(run.shown('MACD histogram')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    });
  });

  it('raises the alerts on the bar the impulse turns green or red', async () => {
    const run = await ei.run(swings);
    const ref = impulse(swings);
    const turned = (state: number) => ref.flatMap((v, i) =>
      (i > 0 && v === state && ref[i - 1] !== null && ref[i - 1] !== state ? [i] : []));
    expect(turned(1).length).toBeGreaterThan(2);
    expect(turned(-1).length).toBeGreaterThan(2);
    expect(barsWhere(run.alert('Turned green'))).toEqual(turned(1));
    expect(barsWhere(run.alert('Turned red'))).toEqual(turned(-1));
  });
});
