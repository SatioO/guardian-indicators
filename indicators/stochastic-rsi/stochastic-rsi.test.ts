import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, realisticDaily, closeSeries, field, rma, sma, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * Wilder's RSI as the reference platform's RSI study computes it:
 *   up   = rma(max(change(src), 0), length)
 *   down = rma(-min(change(src), 0), length)
 *   rsi  = down == 0 ? 100 : up == 0 ? 0 : 100 - 100 / (1 + up / down)
 * rma seeded with the simple average of the first `length` changes, so the
 * first value lands on bar `length`.
 */
function rsi(values: readonly number[], length: number): Maybe[] {
  const change = values.map((v, i) => (i === 0 ? null : v - values[i - 1]));
  const up = rma(change.map((c) => (c === null ? null : Math.max(c, 0))), length);
  const down = rma(change.map((c) => (c === null ? null : -Math.min(c, 0))), length);
  return up.map((u, i) => {
    const dn = down[i];
    if (u === null || dn === null) return null;
    if (dn === 0) return 100;
    if (u === 0) return 0;
    return 100 - 100 / (1 + u / dn);
  });
}

/**
 * Stochastic of a series against its own range over the last `length` bars:
 *   100 * (src - lowest(src, length)) / (highest(src, length) - lowest(src, length))
 * Undefined until `length` bars exist. Missing values inside the window are
 * skipped, as the reference platform's highest/lowest skip them; a window
 * with no range has no reading.
 */
function stochOf(values: readonly Maybe[], length: number): Maybe[] {
  return values.map((v, i) => {
    if (v === null || i + 1 < length) return null;
    let hi = -Infinity;
    let lo = Infinity;
    for (let k = i - length + 1; k <= i; k++) {
      const w = values[k];
      if (w === null) continue;
      hi = Math.max(hi, w);
      lo = Math.min(lo, w);
    }
    return hi === lo ? null : (100 * (v - lo)) / (hi - lo);
  });
}

/**
 * The reference platform's Stoch RSI (K 3, D 3, RSI length 14, Stochastic
 * length 14, source close):
 *   rsi1 = rsi(src, lengthRSI)
 *   k    = sma(stoch(rsi1, rsi1, rsi1, lengthStoch), smoothK)
 *   d    = sma(k, smoothD)
 */
function stochRsiRef(
  values: readonly number[],
  { smoothK = 3, smoothD = 3, rsiLength = 14, stochLength = 14 } = {},
): { k: Maybe[]; d: Maybe[]; rsi: Maybe[] } {
  const r = rsi(values, rsiLength);
  const k = sma(stochOf(r, stochLength), smoothK);
  return { k, d: sma(k, smoothD), rsi: r };
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

/** Bars where K crosses D (in `dir`) while D is inside the zone `inZone` accepts. */
function zoneCrosses(k: readonly Maybe[], d: readonly Maybe[], dir: 'up' | 'down', inZone: (dv: number) => boolean): number[] {
  return k.flatMap((kv, i) => {
    const dv = d[i];
    const kp = i > 0 ? k[i - 1] : null;
    const dp = i > 0 ? d[i - 1] : null;
    if (kv === null || dv === null || kp === null || dp === null) return [];
    const crossed = dir === 'up' ? kv > dv && kp <= dp : kv < dv && kp >= dp;
    return crossed && inZone(dv) ? [i] : [];
  });
}

const hl2 = (bars: readonly OHLCV[]) => bars.map((b) => (b.high + b.low) / 2);

/**
 * Closes that alternate 100 / 101 for twenty bars, rise one point a bar for
 * twenty (bars 20–39), fall one point a bar for twenty (bars 40–59), then
 * tick up twice (bars 60–61).
 *
 * Every up close raises Wilder's RSI and every down close lowers it (the
 * average gain grows while the average loss only decays, or the reverse). So
 * once a 14-bar window lies wholly inside the rise (bar 33 on), RSI is the
 * highest reading in it and Stochastic of RSI is exactly 100; once a window
 * lies wholly inside the fall (bar 53 on), it is exactly 0. K, the 3-bar
 * average of that, is then 100 on bars 35–39 and 0 on bars 55–59; D, the
 * 3-bar average of K, is 100 on bars 37–39 and 0 on bars 57–59.
 */
const runs = pathBars([
  ...Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 100 : 101)),
  ...Array.from({ length: 20 }, (_, i) => 102 + i),
  ...Array.from({ length: 20 }, (_, i) => 120 - i),
  102, 103,
]);

describe('Stochastic RSI — where RSI sits in its own recent range', () => {
  let runtime: PackRuntime;
  let stochRsi: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    stochRsi = await runtime.load('stochastic-rsi');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('pins K and D at 100 through a run of up closes and at 0 through a run of down closes', async () => {
    const run = await stochRsi.run(runs);
    const k = run.plot('K');
    const d = run.plot('D');
    // K is the 3-bar average of the raw reading, D the 3-bar average of K.
    for (let bar = 35; bar <= 39; bar++) expect(k[bar]).toBeCloseTo(100, 9);
    for (let bar = 37; bar <= 39; bar++) expect(d[bar]).toBeCloseTo(100, 9);
    for (let bar = 55; bar <= 59; bar++) expect(k[bar]).toBeCloseTo(0, 9);
    for (let bar = 57; bar <= 59; bar++) expect(d[bar]).toBeCloseTo(0, 9);
  });

  it('starts K on bar 17 and D on bar 19 with the default lengths', async () => {
    // RSI(14) first exists on bar 14. On that bar the 14-bar window holds one
    // RSI reading and so no range; the raw reading starts on bar 15, K (3 bars
    // of it) on 17 and D (3 bars of K) on 19.
    const run = await stochRsi.run(realisticDaily());
    const k = run.plot('K');
    const d = run.plot('D');
    expect(k.findIndex((v) => v !== null)).toBe(17);
    expect(d.findIndex((v) => v !== null)).toBe(19);
  });

  it('matches the published formula on a realistic series', async () => {
    const bars = realisticDaily();
    const run = await stochRsi.run(bars);
    const ref = stochRsiRef(field(bars, 'close'));
    expect(closeSeries(run.plot('K'), ref.k)).toEqual({ ok: true });
    expect(closeSeries(run.plot('D'), ref.d)).toEqual({ ok: true });
  });

  it('follows the smoothing, lengths and source a trader sets', async () => {
    const bars = realisticDaily();
    const settings = { k: 5, d: 4, 'rsi-length': 10, 'stoch-length': 20, source: 'hl2' };
    const run = await stochRsi.run(bars, settings);
    const ref = stochRsiRef(hl2(bars), { smoothK: 5, smoothD: 4, rsiLength: 10, stochLength: 20 });
    expect(closeSeries(run.plot('K'), ref.k)).toEqual({ ok: true });
    expect(closeSeries(run.plot('D'), ref.d)).toEqual({ ok: true });
  });

  it('shows the RSI it is built on in the Data Window only', async () => {
    const bars = realisticDaily();
    const run = await stochRsi.run(bars);
    expect(closeSeries(run.plot('RSI'), stochRsiRef(field(bars, 'close')).rsi)).toEqual({ ok: true });
    expect(run.shown('RSI')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });

  describe('zones', () => {
    it('draws the 80 / 50 / 20 bands and shades between the outer two', async () => {
      const run = await stochRsi.run(runs);
      expect(run.level('Upper band')).toBe(80);
      expect(run.level('Middle')).toBe(50);
      expect(run.level('Lower band')).toBe(20);
      const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
      expect(fills).toHaveLength(1);
      expect(fills[0].style.color).toBe('rgba(56, 189, 248, 0.1)');
    });

    it('marks and alerts K crossing D inside the zones', async () => {
      // Bar 40, the first down close after K = D = 100: the raw reading drops
      // below 100, so K (at least 66.7) falls under D (at least 88.9, still in
      // the upper zone). Bar 60, the first up close after K = D = 0: K rises
      // over D (at most 11.1, still in the lower zone).
      const run = await stochRsi.run(runs);
      const bullish = barsWhere(run.alert('Bullish cross in oversold'));
      const bearish = barsWhere(run.alert('Bearish cross in overbought'));
      expect(bearish).toContain(40);
      expect(bullish).toContain(60);
      const ref = stochRsiRef(field(runs, 'close'));
      expect(bullish).toEqual(zoneCrosses(ref.k, ref.d, 'up', (dv) => dv <= 20));
      expect(bearish).toEqual(zoneCrosses(ref.k, ref.d, 'down', (dv) => dv >= 80));
      expect(barsWhere(run.markers('Bullish cross in oversold'))).toEqual(bullish);
      expect(barsWhere(run.markers('Bearish cross in overbought'))).toEqual(bearish);
    });

    it('matches the reference crosses on a realistic series, with custom bands', async () => {
      const bars = realisticDaily();
      const run = await stochRsi.run(bars, { upper: 70, lower: 30 });
      const ref = stochRsiRef(field(bars, 'close'));
      const bullish = zoneCrosses(ref.k, ref.d, 'up', (dv) => dv <= 30);
      const bearish = zoneCrosses(ref.k, ref.d, 'down', (dv) => dv >= 70);
      expect(bullish.length).toBeGreaterThan(0);
      expect(bearish.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('Bullish cross in oversold'))).toEqual(bullish);
      expect(barsWhere(run.alert('Bearish cross in overbought'))).toEqual(bearish);
    });

    it('keeps the alerts but drops the markers when crosses are not marked', async () => {
      const run = await stochRsi.run(runs, { 'mark-crosses': false });
      expect(barsWhere(run.markers('Bullish cross in oversold'))).toEqual([]);
      expect(barsWhere(run.markers('Bearish cross in overbought'))).toEqual([]);
      expect(barsWhere(run.alert('Bullish cross in oversold'))).toContain(60);
    });
  });
});
