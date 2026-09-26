import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, realisticDaily, closeSeries, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * Relative volume (RVOL), as the reference platform's volume studies define
 * it for a daily chart: the bar's volume divided by the simple average of the
 * last `length` bars' volume, the bar itself included.
 *
 *   rvol = volume / sma(volume, length)          length 50 by default
 *
 * Undefined (nothing drawn) until `length` bars exist, and wherever the
 * average is zero. This is NOT the platform's intraday "Relative Volume at
 * Time", which compares a session's cumulative volume with the same time of
 * earlier sessions — a different study.
 */
function relativeVolume(bars: readonly OHLCV[], length: number): Maybe[] {
  return bars.map((bar, i) => {
    if (i + 1 < length) return null;
    let sum = 0;
    for (let k = i - length + 1; k <= i; k++) sum += bars[k].volume;
    return sum === 0 ? null : bar.volume / (sum / length);
  });
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

describe('Relative Volume — volume against its average', () => {
  let runtime: PackRuntime;
  let rvol: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    rvol = await runtime.load('relative-volume');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads 1.0 on bars that all trade the same volume, and nothing before 50 bars', async () => {
    const bars = barsFrom(Array.from({ length: 60 }, () => ({ open: 100, high: 101, low: 99, close: 100.5, volume: 1_000 })));
    const values = (await rvol.run(bars)).plot('RVOL');
    expect(values.slice(0, 49)).toEqual(new Array(49).fill(null));
    for (const value of values.slice(49)) expect(value).toBeCloseTo(1, 12);
  });

  it('divides each bar\'s volume by the average of the last 50 bars', async () => {
    const bars = realisticDaily();
    const run = await rvol.run(bars);
    expect(closeSeries(run.plot('RVOL'), relativeVolume(bars, 50))).toEqual({ ok: true });
  });

  it('follows the average length a trader sets', async () => {
    const bars = realisticDaily();
    const run = await rvol.run(bars, { length: 20 });
    expect(closeSeries(run.plot('RVOL'), relativeVolume(bars, 20))).toEqual({ ok: true });
  });

  describe('a surge', () => {
    // 60 ordinary bars of 1,000 shares, alternating up and down candles, with
    // two 3,000-share bars: an up bar at 55 and a down bar at 56. Worked by
    // hand: the average at bar 55 is (49 × 1,000 + 3,000) / 50 = 1,040, so
    // RVOL = 3,000 / 1,040 ≈ 2.88; at bar 56 it is 3,000 / 1,080 ≈ 2.78.
    const shapes = Array.from({ length: 60 }, (_, i) => {
      const up = i % 2 === 1;
      const volume = i === 55 || i === 56 ? 3_000 : 1_000;
      return up
        ? { open: 100, high: 102, low: 99, close: 101, volume }
        : { open: 101, high: 102, low: 99, close: 100, volume };
    });
    // Bar 53 is a doji (close = open): it counts as an up bar.
    shapes[53] = { open: 100, high: 101, low: 99, close: 100, volume: 1_000 };
    const bars = barsFrom(shapes);

    it('measures the surge bar against an average that includes it', async () => {
      const values = (await rvol.run(bars)).plot('RVOL');
      expect(values[55]).toBeCloseTo(3_000 / 1_040, 12);
      expect(values[56]).toBeCloseTo(3_000 / 1_080, 12);
    });

    it('colours each column by its candle and brightens the surges', async () => {
      const colors = (await rvol.run(bars)).plotColors('RVOL');
      const [up, down, upSurge, downSurge] = [colors[51], colors[52], colors[55], colors[56]];
      expect(new Set([up, down, upSurge, downSurge]).size).toBe(4);
      expect(colors[53]).toBe(up);
      expect(colors[59]).toBe(up);
      expect(colors[58]).toBe(down);
    });

    it('splits the surge alert by direction, so a trader can be paged on buying or selling surges separately', async () => {
      // Bar 55 is the up/bullish surge, bar 56 the down/bearish surge (see the
      // shape comment above): each direction must raise only its own alert.
      const run = await rvol.run(bars);
      expect(barsWhere(run.alert('Bullish volume surge'))).toEqual([55]);
      expect(barsWhere(run.alert('Bearish volume surge'))).toEqual([56]);

      const tighter = await rvol.run(bars, { 'surge-at': 2.8 });
      expect(barsWhere(tighter.alert('Bullish volume surge'))).toEqual([55]);
      expect(barsWhere(tighter.alert('Bearish volume surge'))).toEqual([]);
    });

    it('draws the normal line at 1.0 and the surge line where the trader sets it', async () => {
      const run = await rvol.run(bars, { 'surge-at': 2.5 });
      expect(run.level('Normal volume')).toBe(1);
      expect(run.level('Surge level')).toBe(2.5);
      expect((await rvol.run(bars)).level('Surge level')).toBe(2);
    });

    it('shows the average volume in the Data Window, off the pane', async () => {
      const run = await rvol.run(bars);
      expect(run.plot('Average volume')[55]).toBeCloseTo(1_040, 9);
      expect(run.shown('Average volume')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    });
  });

  it('draws nothing where no volume traded', async () => {
    const bars = barsFrom(Array.from({ length: 60 }, () => ({ open: 100, high: 101, low: 99, close: 100, volume: 0 })));
    const run = await rvol.run(bars);
    expect(run.plot('RVOL').every((v) => v === null)).toBe(true);
    expect(barsWhere(run.alert('Bullish volume surge'))).toEqual([]);
    expect(barsWhere(run.alert('Bearish volume surge'))).toEqual([]);
  });
});
