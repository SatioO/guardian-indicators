import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, realisticDaily, closeSeries, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * Up/down volume ratio, as William O'Neil published it (50 days):
 *
 *   up   = sum of volume over the last `length` bars that closed above the previous close
 *   down = sum of volume over the last `length` bars that closed below the previous close
 *   ratio = up / down
 *
 * A bar whose close is unchanged counts for neither side, and so does bar 0,
 * which has no previous close. The first ratio is on bar `length − 1`. With no
 * down volume in the window the ratio is unbounded and nothing is drawn.
 */
function upDownRatio(bars: readonly OHLCV[], length: number): Maybe[] {
  return bars.map((_, i) => {
    if (i + 1 < length) return null;
    let up = 0;
    let down = 0;
    for (let k = Math.max(1, i - length + 1); k <= i; k++) {
      if (bars[k].close > bars[k - 1].close) up += bars[k].volume;
      else if (bars[k].close < bars[k - 1].close) down += bars[k].volume;
    }
    return down === 0 ? null : up / down;
  });
}

/** Bars where `values` enters the zone at or beyond `level` from outside it. */
function entries(values: readonly Maybe[], level: number, side: 'at-or-above' | 'at-or-below'): number[] {
  const inside = (v: number) => (side === 'at-or-above' ? v >= level : v <= level);
  const hits: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const [x, px] = [values[i], values[i - 1]];
    if (x !== null && px !== null && inside(x) && !inside(px)) hits.push(i);
  }
  return hits;
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

/** Bars closing at `closes`, each trading the matching volume. */
const closesWith = (closes: readonly number[], volumes: readonly number[]) =>
  barsFrom(closes.map((close, i) => ({ open: close, high: close + 0.5, low: close - 0.5, close, volume: volumes[i] })));

describe('Up/Down Volume Ratio — volume on up days against down days', () => {
  let runtime: PackRuntime;
  let ud: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    ud = await runtime.load('up-down-volume');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('sets up-day volume against down-day volume and ignores unchanged days', async () => {
    // Bar 1 up 100, bar 2 up 200, bar 3 down 300, bar 4 unchanged (999 ignored), bar 5 up 400.
    const bars = closesWith([10, 11, 12, 11, 11, 12], [50, 100, 200, 300, 999, 400]);
    const values = (await ud.run(bars, { length: 4 })).plot('U/D ratio');
    expect(values.slice(0, 3)).toEqual([null, null, null]);
    expect(values[3]).toBeCloseTo(300 / 300, 12); // bars 0–3
    expect(values[4]).toBeCloseTo(300 / 300, 12); // bars 1–4
    expect(values[5]).toBeCloseTo(600 / 300, 12); // bars 2–5
  });

  it('matches the published definition on a realistic series', async () => {
    const bars = realisticDaily();
    const values = (await ud.run(bars)).plot('U/D ratio');
    expect(values.slice(0, 49)).toEqual(new Array(49).fill(null));
    expect(closeSeries(values, upDownRatio(bars, 50))).toEqual({ ok: true });
  });

  it('follows the length a trader sets', async () => {
    const bars = realisticDaily();
    expect(closeSeries((await ud.run(bars, { length: 20 })).plot('U/D ratio'), upDownRatio(bars, 20))).toEqual({ ok: true });
  });

  it('draws nothing while the window holds no down day', async () => {
    const bars = closesWith(Array.from({ length: 60 }, (_, i) => 100 + i), new Array(60).fill(1_000));
    expect((await ud.run(bars)).plot('U/D ratio').every((v) => v === null)).toBe(true);
  });

  it('draws the balance line and the zone lines a trader sets', async () => {
    const bars = realisticDaily(80);
    const run = await ud.run(bars);
    expect([run.level('Balanced'), run.level('Accumulation level'), run.level('Distribution level')]).toEqual([1, 1.5, 0.7]);
    const custom = await ud.run(bars, { 'accumulation-at': 2, 'distribution-at': 0.5 });
    expect([custom.level('Accumulation level'), custom.level('Distribution level')]).toEqual([2, 0.5]);
  });

  describe('accumulation and distribution', () => {
    // Two up days for every down day (ratio 2), then one up day for every two
    // down days (ratio 0.5), then back: the 20-day ratio passes through both
    // zone lines each way.
    const steps = [
      ...Array.from({ length: 60 }, (_, i) => (i % 3 === 2 ? -1 : 1)),
      ...Array.from({ length: 60 }, (_, i) => (i % 3 === 2 ? 1 : -1)),
      ...Array.from({ length: 60 }, (_, i) => (i % 3 === 2 ? -1 : 1)),
    ];
    const closes = steps.reduce<number[]>((path, step) => [...path, path[path.length - 1] + step], [200]);
    const bars = closesWith(closes, new Array(closes.length).fill(1_000));
    const ref = upDownRatio(bars, 20);

    it('colours the line in the accumulation and distribution zones', async () => {
      const colors = (await ud.run(bars, { length: 20 })).plotColors('U/D ratio');
      const inZone = (test: (v: number) => boolean) =>
        new Set(ref.flatMap((v, i) => (v !== null && test(v) ? [colors[i]] : [])));
      const accumulation = inZone((v) => v >= 1.5);
      const distribution = inZone((v) => v <= 0.7);
      const between = inZone((v) => v > 0.7 && v < 1.5);
      expect([accumulation.size, distribution.size, between.size]).toEqual([1, 1, 1]);
      expect([...accumulation]).toEqual(['#26a69a']);
      expect([...distribution]).toEqual(['#ef5350']);
      expect([...between]).not.toContain('#26a69a');
      expect([...between]).not.toContain('#ef5350');
    });

    it('raises an alert as the ratio enters each zone', async () => {
      const run = await ud.run(bars, { length: 20 });
      const intoAccumulation = entries(ref, 1.5, 'at-or-above');
      const intoDistribution = entries(ref, 0.7, 'at-or-below');
      expect(intoAccumulation.length).toBeGreaterThan(0);
      expect(intoDistribution.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('Entered accumulation'))).toEqual(intoAccumulation);
      expect(barsWhere(run.alert('Entered distribution'))).toEqual(intoDistribution);
    });
  });

  // The two totals behind the ratio are useful secondary numbers per
  // AUTHORING's design standard ("put useful secondary numbers in the Data
  // Window"), matching the pattern other pack indicators already use
  // (supertrend's "Stop distance %", relative-strength's "RS spread"). A
  // plot whose value is a bare `math.*` call used to get no value type from
  // the output analyser, silently dropping the whole script to the legacy
  // route — fixed in v2 (a math.* series result is now typed).
  it('shows the up and down volume totals in the Data Window', async () => {
    // Bar 1 up 100, bar 2 up 200, bar 3 down 300, bar 4 unchanged (999 ignored), bar 5 up 400.
    const bars = closesWith([10, 11, 12, 11, 11, 12], [50, 100, 200, 300, 999, 400]);
    const run = await ud.run(bars, { length: 4 });
    expect(run.shown('Up volume')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    expect(run.shown('Down volume')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    expect(run.plot('Up volume')).toEqual([null, null, null, 300, 300, 600]);
    expect(run.plot('Down volume')).toEqual([null, null, null, 300, 300, 300]);
  });
});
