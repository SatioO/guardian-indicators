import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, pathBars, realisticDaily, closeSeries, type PackIndicator, type PackRuntime, type BarShape, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * Money Flow Index, as the reference platform defines it (length 14, source
 * hlc3):
 *
 *   flow      = hlc3 × volume
 *   positive  = sum of flow over the last `length` bars where change(hlc3) > 0
 *   negative  = sum of flow over the last `length` bars where change(hlc3) < 0
 *   mfi       = 100 − 100 / (1 + positive / negative)
 *
 * A bar whose hlc3 did not change counts for neither side. Every bar in the
 * window needs a change, so the first value is on bar `length` (bar 0 has no
 * previous hlc3). With no negative flow the ratio is unbounded and MFI is
 * 100; with no flow on either side (0 / 0) it is undefined and draws nothing.
 */
function moneyFlowIndex(bars: readonly OHLCV[], length: number): Maybe[] {
  const typical = bars.map(({ high, low, close }) => (high + low + close) / 3);
  return bars.map((_, i) => {
    if (i < length) return null;
    let positive = 0;
    let negative = 0;
    for (let k = i - length + 1; k <= i; k++) {
      const flow = typical[k] * bars[k].volume;
      if (typical[k] > typical[k - 1]) positive += flow;
      else if (typical[k] < typical[k - 1]) negative += flow;
    }
    if (negative === 0) return positive === 0 ? null : 100;
    return 100 - 100 / (1 + positive / negative);
  });
}

/** Bars where `values` crosses `level`: above now, at or below on the bar before (or the reverse). */
function crosses(values: readonly Maybe[], level: number, way: 'above' | 'below'): number[] {
  const hits: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const [x, px] = [values[i], values[i - 1]];
    if (x === null || px === null) continue;
    if (way === 'above' ? x > level && px <= level : x < level && px >= level) hits.push(i);
  }
  return hits;
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

/** A bar with no range, so its hlc3 is exactly `price`. */
const at = (price: number, volume: number): BarShape => ({ open: price, high: price, low: price, close: price, volume });

describe('Money Flow Index — volume-weighted RSI of the typical price', () => {
  let runtime: PackRuntime;
  let mfi: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    mfi = await runtime.load('money-flow-index');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('splits the typical-price flow by direction and ignores unchanged bars', async () => {
    // hlc3 10 → 11 (+1,100) → 11 (unchanged: 2,200 ignored) → 10 (−3,000) → 12 (+4,800)
    const bars = barsFrom([at(10, 50), at(11, 100), at(11, 200), at(10, 300), at(12, 400)]);
    const values = (await mfi.run(bars, { length: 3 })).plot('MFI');
    expect(values.slice(0, 3)).toEqual([null, null, null]);
    // Bars 1–3: 1,100 up, 3,000 down → 100 − 100 / (1 + 11/30) = 1,100/41.
    expect(values[3]).toBeCloseTo(1_100 / 41, 10);
    // Bars 2–4: 4,800 up, 3,000 down → 100 − 100 / 2.6.
    expect(values[4]).toBeCloseTo(100 - 100 / 2.6, 10);
  });

  it('matches the published definition on a realistic series', async () => {
    const bars = realisticDaily();
    const values = (await mfi.run(bars)).plot('MFI');
    expect(values.slice(0, 14)).toEqual(new Array(14).fill(null));
    expect(closeSeries(values, moneyFlowIndex(bars, 14))).toEqual({ ok: true });
  });

  it('follows the length a trader sets', async () => {
    const bars = realisticDaily();
    expect(closeSeries((await mfi.run(bars, { length: 21 })).plot('MFI'), moneyFlowIndex(bars, 21))).toEqual({ ok: true });
  });

  it('reads 100 when there was no negative flow in the window', async () => {
    const bars = barsFrom(Array.from({ length: 20 }, (_, i) => at(100 + i, 1_000)));
    const values = (await mfi.run(bars)).plot('MFI');
    for (const value of values.slice(14)) expect(value).toBe(100);
  });

  // Was ta.mfi reading 100 when a window has no flow on either side (0 / 0 —
  // every hlc3 unchanged, or no volume), where the definition is undefined —
  // fixed in v2.
  it('draws nothing over a window with no flow on either side', async () => {
    const bars = barsFrom(Array.from({ length: 30 }, () => at(100, 1_000)));
    expect((await mfi.run(bars)).plot('MFI')).toEqual(moneyFlowIndex(bars, 14)); // all null
  });

  it('draws the overbought, middle and oversold levels a trader sets, shaded between', async () => {
    const bars = realisticDaily(60);
    const run = await mfi.run(bars);
    expect([run.level('Overbought'), run.level('Middle'), run.level('Oversold')]).toEqual([80, 50, 20]);
    const custom = await mfi.run(bars, { overbought: 90, oversold: 10 });
    expect([custom.level('Overbought'), custom.level('Oversold')]).toEqual([90, 10]);
    const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
    expect(fills).toHaveLength(1);
    expect(fills[0].style.color).toBe('rgba(167, 139, 250, 0.1)');
  });

  describe('the zones', () => {
    // A steady climb pushes MFI to 100, a steady slide takes it to 0, and the
    // turn back up lifts it out again.
    const swings = pathBars([
      ...Array.from({ length: 30 }, (_, i) => 100 + i),
      ...Array.from({ length: 30 }, (_, i) => 129 - i),
      ...Array.from({ length: 30 }, (_, i) => 100 + i),
    ]);
    const ref = moneyFlowIndex(swings, 14);

    it('raises an alert as MFI leaves the overbought and oversold zones', async () => {
      const run = await mfi.run(swings);
      const leftOverbought = crosses(ref, 80, 'below');
      const leftOversold = crosses(ref, 20, 'above');
      expect(leftOverbought.length).toBeGreaterThan(0);
      expect(leftOversold.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('MFI left overbought'))).toEqual(leftOverbought);
      expect(barsWhere(run.alert('MFI left oversold'))).toEqual(leftOversold);
    });

    it('colours the line inside each zone', async () => {
      const colors = (await mfi.run(swings)).plotColors('MFI');
      const inZone = (test: (v: number) => boolean) =>
        new Set(ref.flatMap((v, i) => (v !== null && test(v) ? [colors[i]] : [])));
      const overbought = inZone((v) => v >= 80);
      const oversold = inZone((v) => v <= 20);
      const between = inZone((v) => v > 20 && v < 80);
      expect([overbought.size, oversold.size, between.size]).toEqual([1, 1, 1]);
      expect(new Set([...overbought, ...oversold, ...between]).size).toBe(3);
    });

    it('surfaces the zone state as a Data Window number, independent of the coloured line', async () => {
      const run = await mfi.run(swings);
      // 1 in overbought, -1 in oversold, 0 in between; null wherever MFI itself is null.
      const expected = ref.map((v) => (v === null ? null : v >= 80 ? 1 : v <= 20 ? -1 : 0));
      expect(run.plot('Zone')).toEqual(expected);
      expect(run.shown('Zone')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    });
  });
});
