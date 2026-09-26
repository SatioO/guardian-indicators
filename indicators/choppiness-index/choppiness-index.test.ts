import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, flatRangeBars, pathBars, closeSeries, trueRange, chopBars, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/*
 * Reference contract — the reference platform's built-in Choppiness Index:
 *
 *   CHOP = 100 × log10( Σ ATR(1) over 14 bars / (highest(high, 14) − lowest(low, 14)) )
 *              / log10(14)
 *
 * ATR(1) is each bar's true range (the first bar, with no previous close, is
 * its own high − low). Bands at 61.8 and 38.2 with the space between them
 * filled, and a middle line at 50. Nothing is drawn until 14 bars exist.
 */

function choppiness(bars: readonly OHLCV[], length: number): Maybe[] {
  const tr = trueRange(bars);
  return bars.map((_, i) => {
    if (i + 1 < length) return null;
    let sum = 0;
    let hi = -Infinity;
    let lo = Infinity;
    for (let k = i - length + 1; k <= i; k++) {
      sum += tr[k];
      hi = Math.max(hi, bars[k].high);
      lo = Math.min(lo, bars[k].low);
    }
    return hi === lo ? null : (100 * Math.log10(sum / (hi - lo))) / Math.log10(length);
  });
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

/**
 * Tight overlapping bars (closes see-saw ±1 around the level, wicks of 2) that
 * break into a steady 4-a-bar trend and then go sideways again: choppy, then
 * trending, then choppy.
 */
const market = pathBars([
  ...Array.from({ length: 60 }, (_, i) => 500 + (i % 2 === 0 ? -1 : 1)),
  ...Array.from({ length: 50 }, (_, i) => 504 + i * 4),
  ...Array.from({ length: 60 }, (_, i) => 700 + (i % 2 === 0 ? -1 : 1)),
], 2);

describe('Choppiness Index — trending or going sideways', () => {
  let runtime: PackRuntime;
  let chop: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    chop = await runtime.load('choppiness-index');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads 100 when every bar covers the whole range: 100 → 102', async () => {
    // Fourteen true ranges of 2 add to 28 over a 14-bar range of 2: the ratio is
    // 14 and log10(14) / log10(14) = 1.
    const values = (await chop.run(flatRangeBars(30, 100, 102))).plot('CHOP');
    expect(values.slice(0, 13)).toEqual(new Array(13).fill(null));
    for (const value of values.slice(13)) expect(value).toBeCloseTo(100, 10);
  });

  it('reads 100 · log10(28/15) / log10(14) on a steady climb of one rupee a bar', async () => {
    // Half-rupee wicks: every bar after the first has a true range of 2, so 14
    // of them add to 28, while the 14-bar range runs from 14.5 below the close
    // to 0.5 above it: 15.
    const values = (await chop.run(pathBars(Array.from({ length: 40 }, (_, i) => 100 + i), 0.5))).plot('CHOP');
    for (const value of values.slice(14)) {
      expect(value).toBeCloseTo((100 * Math.log10(28 / 15)) / Math.log10(14), 10);
    }
  });

  it('matches the published formula on a sideways daily series', async () => {
    const bars = chopBars({ count: 300, seed: 4, intervalSec: 86_400, startPrice: 800 });
    const run = await chop.run(bars);
    expect(closeSeries(run.plot('CHOP'), choppiness(bars, 14))).toEqual({ ok: true });
  });

  it('follows the Length a trader sets', async () => {
    const run = await chop.run(market, { length: 21 });
    expect(closeSeries(run.plot('CHOP'), choppiness(market, 21))).toEqual({ ok: true });
  });

  it('draws the 61.8 and 38.2 bands with the space between them filled, and 50 in the middle', async () => {
    const run = await chop.run(market);
    expect(run.level('Choppy above')).toBe(61.8);
    expect(run.level('Middle band')).toBe(50);
    expect(run.level('Trending below')).toBe(38.2);
    const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
    expect(fills).toHaveLength(1);
    expect(fills[0].style.color).toBe('rgba(56, 189, 248, 0.1)');
  });

  it('moves the bands where a trader sets them', async () => {
    const run = await chop.run(market, { 'choppy-above': 60, 'trending-below': 40 });
    expect(run.level('Choppy above')).toBe(60);
    expect(run.level('Trending below')).toBe(40);
  });

  it('keeps the choppy and trending bands from crossing (choppy can\'t reach past the middle, trending can\'t start above it)', () => {
    const choppyAbove = chop.manifest.inputs?.find((i) => i.key === 'input@choppy-above');
    const trendingBelow = chop.manifest.inputs?.find((i) => i.key === 'input@trending-below');
    expect(choppyAbove).toMatchObject({ kind: 'number', default: 61.8, min: 50, max: 100 });
    expect(trendingBelow).toMatchObject({ kind: 'number', default: 38.2, min: 0, max: 50 });
  });

  describe('regimes', () => {
    const ref = choppiness(market, 14);

    it('colours the line while the market is choppy and while it trends', async () => {
      const run = await chop.run(market);
      const colors = run.plotColors('CHOP');
      const choppy = ref.flatMap((v, i) => (v !== null && v > 61.8 ? [i] : []));
      const trending = ref.flatMap((v, i) => (v !== null && v < 38.2 ? [i] : []));
      const between = ref.flatMap((v, i) => (v !== null && v >= 38.2 && v <= 61.8 ? [i] : []));
      expect([choppy.length, trending.length, between.length].every((n) => n > 0)).toBe(true);
      const colourOf = (bars: number[]) => new Set(bars.map((i) => colors[i]));
      expect([colourOf(choppy).size, colourOf(trending).size, colourOf(between).size]).toEqual([1, 1, 1]);
      expect(new Set([colors[choppy[0]], colors[trending[0]], colors[between[0]]]).size).toBe(3);
    });

    it('raises alerts as the market starts trending and as it turns choppy', async () => {
      const run = await chop.run(market);
      const crossed = (test: (v: number) => boolean) => ref.flatMap((v, i) => {
        const prev = ref[i - 1];
        return v !== null && prev !== null && prev !== undefined && test(v) && !test(prev) ? [i] : [];
      });
      const trending = crossed((v) => v < 38.2);
      const choppy = crossed((v) => v > 61.8);
      expect(trending.length).toBeGreaterThan(0);
      expect(choppy.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('Trend started'))).toEqual(trending);
      expect(barsWhere(run.alert('Market turned choppy'))).toEqual(choppy);
    });
  });
});
