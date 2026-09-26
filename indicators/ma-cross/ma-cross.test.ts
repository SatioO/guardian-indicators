import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, realisticDaily, closeSeries, field, rma, sma, type PackIndicator, type PackRuntime, type Maybe } from 'guardian-gscript-toolchain';

/**
 * The reference platform's MA Cross: a fast (9) and a slow (21) simple
 * average of the close; the fast one crossing above the slow one is a golden
 * cross, crossing below a death cross. A cross happens on the bar the fast
 * average is above (below) the slow one after being at or below (at or
 * above) it on the bar before.
 */

/** ta.ema: alpha 2 / (length + 1), seeded with the SMA of the first `length` values. */
function ema(values: readonly number[], length: number): Maybe[] {
  const alpha = 2 / (length + 1);
  let prev: number | null = null;
  return values.map((v, i) => {
    if (i + 1 < length) return null;
    prev = prev === null ? values.slice(0, length).reduce((a, b) => a + b, 0) / length : alpha * v + (1 - alpha) * prev;
    return prev;
  });
}

/** ta.wma: weight `length` on the newest value down to 1. */
function wma(values: readonly number[], length: number): Maybe[] {
  return values.map((_, i) => {
    if (i + 1 < length) return null;
    let sum = 0;
    for (let k = 0; k < length; k++) sum += values[i - k] * (length - k);
    return sum / ((length * (length + 1)) / 2);
  });
}

/** Bars where `a` moves from at-or-below `b` to above it (or the mirror). */
function crossings(a: readonly Maybe[], b: readonly Maybe[], side: 'over' | 'under'): number[] {
  const out: number[] = [];
  for (let i = 1; i < a.length; i++) {
    const [x, y, px, py] = [a[i], b[i], a[i - 1], b[i - 1]];
    if (x === null || y === null || px === null || py === null) continue;
    if (side === 'over' ? x > y && px <= py : x < y && px >= py) out.push(i);
  }
  return out;
}

describe('MA Cross — a fast and a slow average, and where they cross', () => {
  let runtime: PackRuntime;
  let cross: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    cross = await runtime.load('ma-cross');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  const bars = realisticDaily();
  const closes = field(bars, 'close');
  // realisticDaily trends steadily; two beating sine waves give a market
  // that swings back and forth, so the averages cross many times.
  const waves = pathBars(Array.from({ length: 300 }, (_, i) =>
    100 + 8 * Math.sin(i / 9) + 3 * Math.sin(i / 2.3)), 1);
  const waveCloses = field(waves, 'close');

  it('draws the 9-bar and 21-bar simple averages by default', async () => {
    const run = await cross.run(bars);
    expect(closeSeries(run.plot('Fast MA'), sma(closes, 9))).toEqual({ ok: true });
    expect(closeSeries(run.plot('Slow MA'), sma(closes, 21))).toEqual({ ok: true });
  });

  it.each([
    ['SMA', sma],
    ['EMA', ema],
    ['WMA', wma],
    ['RMA', rma],
  ] as const)('takes %s averages over the lengths the trader sets', async (type, average) => {
    const run = await cross.run(bars, { type, 'fast-length': 5, 'slow-length': 30 });
    expect(closeSeries(run.plot('Fast MA'), average(closes, 5))).toEqual({ ok: true });
    expect(closeSeries(run.plot('Slow MA'), average(closes, 30))).toEqual({ ok: true });
  });

  describe('on a step up and a step down', () => {
    // 30 closes at 100, 30 at 110, 30 at 90. Both averages read 100 until bar
    // 30, where the close jumps: fast (100·8 + 110) / 9 = 101.1 leaps over
    // slow (100·20 + 110) / 21 = 100.5 — a golden cross. By bar 59 both read
    // 110; on bar 60 fast (110·8 + 90) / 9 = 107.8 drops under slow
    // (110·20 + 90) / 21 = 109.0 — a death cross.
    const steps = pathBars([
      ...new Array(30).fill(100),
      ...new Array(30).fill(110),
      ...new Array(30).fill(90),
    ], 0.5);
    const barsWhere = (values: readonly (boolean | null)[]) =>
      values.flatMap((hit, bar) => (hit ? [bar] : []));

    it('marks the golden cross and the death cross on the bar they happen', async () => {
      const run = await cross.run(steps);
      expect(run.plot('Fast MA')[30]).toBeCloseTo(910 / 9, 10);
      expect(run.plot('Slow MA')[30]).toBeCloseTo(2110 / 21, 10);
      expect(barsWhere(run.markers('Golden cross'))).toEqual([30]);
      expect(barsWhere(run.markers('Death cross'))).toEqual([60]);
    });

    it('raises the golden-cross and death-cross alerts on the same bars', async () => {
      const run = await cross.run(steps);
      expect(barsWhere(run.alert('Golden cross'))).toEqual([30]);
      expect(barsWhere(run.alert('Death cross'))).toEqual([60]);
    });
  });

  it('marks every cross on a swinging series, and only those', async () => {
    const run = await cross.run(waves);
    const fast = sma(waveCloses, 9);
    const slow = sma(waveCloses, 21);
    const barsWhere = (values: readonly (boolean | null)[]) =>
      values.flatMap((hit, bar) => (hit ? [bar] : []));
    expect(crossings(fast, slow, 'over').length).toBeGreaterThan(2);
    expect(barsWhere(run.markers('Golden cross'))).toEqual(crossings(fast, slow, 'over'));
    expect(barsWhere(run.markers('Death cross'))).toEqual(crossings(fast, slow, 'under'));
  });

  it('hides the labels when the trader switches them off, keeping the alerts', async () => {
    const run = await cross.run(waves, { signals: false });
    expect(run.markers('Golden cross').some(Boolean)).toBe(false);
    expect(run.markers('Death cross').some(Boolean)).toBe(false);
    expect(run.alert('Golden cross').some(Boolean)).toBe(true);
    expect(run.alert('Death cross').some(Boolean)).toBe(true);
  });

  it('shades between the averages green while the fast one is on top and red while it is below', async () => {
    const run = await cross.run(waves);
    const fast = sma(waveCloses, 9);
    const slow = sma(waveCloses, 21);
    const titleOf = (key: string) => run.snapshot.outputs.find((o) => o.key === key)?.title;
    const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
    expect(fills.map((f) => [f.style.color, f.dependencies.map(titleOf)])).toEqual([
      ['rgba(38, 166, 154, 0.15)', ['Fast MA', 'Bullish shade edge']],
      ['rgba(239, 83, 80, 0.15)', ['Fast MA', 'Bearish shade edge']],
    ]);
    const above = slow.map((v, i) => (v !== null && fast[i] !== null && (fast[i] as number) > v ? v : null));
    const below = slow.map((v, i) => (v !== null && fast[i] !== null && (fast[i] as number) < v ? v : null));
    expect(above.some((v) => v !== null) && below.some((v) => v !== null)).toBe(true);
    expect(closeSeries(run.plot('Bullish shade edge'), above)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Bearish shade edge'), below)).toEqual({ ok: true });
    expect(run.shown('Bullish shade edge').pane).toBe(false);
    expect(run.shown('Bearish shade edge').pane).toBe(false);
  });

  it('turns the shading fully transparent when the trader switches it off', async () => {
    const shaded = await cross.run(waves, { shade: true });
    const unshaded = await cross.run(waves, { shade: false });
    const fillsOf = (run: typeof shaded) => run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
    expect(fillsOf(unshaded).map((f) => f.style.color)).toEqual([
      'rgba(38, 166, 154, 0)',
      'rgba(239, 83, 80, 0)',
    ]);
    expect(fillsOf(shaded).map((f) => f.style.color)).not.toEqual(fillsOf(unshaded).map((f) => f.style.color));
  });

  it('shows how far the fast average sits from the slow one, as a percent, in the Data Window', async () => {
    const run = await cross.run(bars);
    const fast = sma(closes, 9);
    const slow = sma(closes, 21);
    const gap = fast.map((f, i) => (f === null || slow[i] === null ? null : (f / (slow[i] as number) - 1) * 100));
    expect(closeSeries(run.plot('Gap %'), gap)).toEqual({ ok: true });
    expect(run.shown('Gap %')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });
});
