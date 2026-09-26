import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, realisticDaily, closeSeries, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * The reference platform's Williams %R (length 14, source close):
 *   %R = 100 * (close - highest(high, length)) / (highest(high, length) - lowest(low, length))
 * undefined until `length` bars exist. Runs from 0 (close at the high) to
 * −100 (close at the low).
 */
function williamsR(bars: readonly OHLCV[], length: number): Maybe[] {
  return bars.map((bar, i) => {
    if (i + 1 < length) return null;
    let hh = -Infinity;
    let ll = Infinity;
    for (let k = i - length + 1; k <= i; k++) {
      hh = Math.max(hh, bars[k].high);
      ll = Math.min(ll, bars[k].low);
    }
    return (100 * (bar.close - hh)) / (hh - ll);
  });
}

/** Bars that always span 100 → 110 and close where the test says. */
const fixedRange = (closes: readonly number[]) =>
  barsFrom(closes.map((close) => ({ open: close, high: 110, low: 100, close })));

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

describe('Williams %R — close against the recent high-low range', () => {
  let runtime: PackRuntime;
  let wpr: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    wpr = await runtime.load('williams-r');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads −50 for a close in the middle of a fixed 100 → 110 range', async () => {
    // Highest high 110, lowest low 100: %R = 100 × (105 − 110) ÷ 10 = −50,
    // undefined until 14 bars exist.
    const run = await wpr.run(fixedRange(new Array(20).fill(105)));
    const values = run.plot('%R');
    expect(values.slice(0, 13)).toEqual(new Array(13).fill(null));
    for (const v of values.slice(13)) expect(v).toBeCloseTo(-50, 12);
  });

  it('matches the published formula on a realistic series', async () => {
    const bars = realisticDaily();
    const run = await wpr.run(bars);
    expect(closeSeries(run.plot('%R'), williamsR(bars, 14))).toEqual({ ok: true });
  });

  it('follows the length a trader sets', async () => {
    const bars = realisticDaily();
    const run = await wpr.run(bars, { length: 5 });
    expect(closeSeries(run.plot('%R'), williamsR(bars, 5))).toEqual({ ok: true });
  });

  describe('overbought and oversold', () => {
    // Fourteen closes at 105 (−50), then 109, 109 (−10: overbought), 105 (−50:
    // it has left overbought), 101, 101 (−90: oversold), 105 (−50: it has left
    // oversold), 105.
    const bars = fixedRange([...new Array(14).fill(105), 109, 109, 105, 101, 101, 105, 105]);

    it('draws the −20 / −50 / −80 levels and shades the band between them', async () => {
      const run = await wpr.run(bars);
      expect(run.level('Overbought')).toBe(-20);
      expect(run.level('Middle')).toBe(-50);
      expect(run.level('Oversold')).toBe(-80);
      const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
      expect(fills).toHaveLength(1);
      expect(fills[0].style.color).toBe('rgba(167, 139, 250, 0.1)');
    });

    it('moves the levels where a trader sets them', async () => {
      const run = await wpr.run(bars, { overbought: -10, oversold: -90 });
      expect(run.level('Overbought')).toBe(-10);
      expect(run.level('Oversold')).toBe(-90);
    });

    it('colours the line inside each zone', async () => {
      const run = await wpr.run(bars);
      const colors = run.plotColors('%R');
      const [middle, overbought, oversold] = [colors[13], colors[14], colors[17]];
      expect(new Set([middle, overbought, oversold]).size).toBe(3);
      expect(colors[16]).toBe(middle);
    });

    it('marks and alerts the bar %R leaves each zone', async () => {
      const run = await wpr.run(bars);
      expect(barsWhere(run.alert('Left overbought'))).toEqual([16]);
      expect(barsWhere(run.alert('Left oversold'))).toEqual([19]);
      expect(barsWhere(run.markers('Left overbought'))).toEqual([16]);
      expect(barsWhere(run.markers('Left oversold'))).toEqual([19]);
    });

    // The input labeled 'Overbought' must govern only the overbought zone (the
    // line inside it, and the marker for leaving it); the input labeled
    // 'Oversold' must govern only the oversold zone. Neither should recolor
    // the other zone's marker.
    it('colours each zone-exit marker from the input named for that zone, not the other one', async () => {
      const style = (run: Awaited<ReturnType<typeof wpr.run>>, title: string) => {
        const hits = run.snapshot.outputs.filter((o) => o.title === title);
        expect(hits).toHaveLength(1);
        return hits[0].style.color;
      };

      const defaultRun = await wpr.run(bars);
      expect(style(defaultRun, 'Left overbought')).toBe('#26a69a'); // 'Overbought' default
      expect(style(defaultRun, 'Left oversold')).toBe('#ef5350'); // 'Oversold' default

      const highRun = await wpr.run(bars, { 'high-color': '#00ff00' });
      expect(style(highRun, 'Left overbought')).toBe('#00ff00');
      expect(style(highRun, 'Left oversold')).toBe('#ef5350');

      const lowRun = await wpr.run(bars, { 'low-color': '#0000ff' });
      expect(style(lowRun, 'Left overbought')).toBe('#26a69a');
      expect(style(lowRun, 'Left oversold')).toBe('#0000ff');
    });

    it('keeps the alerts but drops the markers when zone exits are not marked', async () => {
      const run = await wpr.run(bars, { 'mark-exits': false });
      expect(barsWhere(run.markers('Left overbought'))).toEqual([]);
      expect(barsWhere(run.markers('Left oversold'))).toEqual([]);
      expect(barsWhere(run.alert('Left overbought'))).toEqual([16]);
    });
  });
});
