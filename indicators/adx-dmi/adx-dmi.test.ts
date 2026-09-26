import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, pathBars, realisticDaily, closeSeries, rma, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * The reference platform's Directional Movement Index (DI length 14, ADX
 * smoothing 14), exactly as it publishes it:
 *   up = change(high), down = −change(low)
 *   +DM = up > down and up > 0 ? up : 0     (na on the first bar: no change yet)
 *   −DM = down > up and down > 0 ? down : 0
 *   TR  = true range, na on the first bar (no previous close)
 *   +DI = 100 · rma(+DM, len) / rma(TR, len),  −DI likewise
 *   ADX = 100 · rma(|+DI − −DI| / (+DI + −DI, or 1 when 0), adxLen)
 * rma is Wilder's average seeded with the simple average of its first `len`
 * values, so +DI/−DI first appear on bar `len` and ADX on bar len + adxLen − 1.
 */
function dmi(bars: readonly OHLCV[], len: number, adxLen: number): { plus: Maybe[]; minus: Maybe[]; adx: Maybe[] } {
  const tr: Maybe[] = [null];
  const plusDm: Maybe[] = [null];
  const minusDm: Maybe[] = [null];
  for (let i = 1; i < bars.length; i++) {
    const [bar, prev] = [bars[i], bars[i - 1]];
    tr.push(Math.max(bar.high - bar.low, Math.abs(bar.high - prev.close), Math.abs(bar.low - prev.close)));
    const up = bar.high - prev.high;
    const down = prev.low - bar.low;
    plusDm.push(up > down && up > 0 ? up : 0);
    minusDm.push(down > up && down > 0 ? down : 0);
  }
  const trAvg = rma(tr, len);
  const di = (dm: Maybe[]) => rma(dm, len).map((v, i) => (v === null ? null : (100 * v) / (trAvg[i] as number)));
  const plus = di(plusDm);
  const minus = di(minusDm);
  const dx = plus.map((p, i) => {
    const m = minus[i];
    if (p === null || m === null) return null;
    return Math.abs(p - m) / (p + m === 0 ? 1 : p + m);
  });
  return { plus, minus, adx: rma(dx, adxLen).map((v) => (v === null ? null : 100 * v)) };
}

/**
 * A steady climb: each bar one point above the last, two points tall, closing
 * mid-range. Up move 1 and down move −1 on every bar, so +DM = 1, −DM = 0 and
 * TR = 2: +DI reads 50, −DI 0 and ADX 100 from the first bar they exist.
 */
const climb = barsFrom(Array.from({ length: 60 }, (_, k) => ({ open: 101 + k, high: 102 + k, low: 100 + k, close: 101 + k })));

/** Bars where `a` crosses above (up) or below (down) `b`, from bar `from` on. */
function crossings(a: readonly Maybe[], b: readonly Maybe[], from = 1): { up: number[]; down: number[] } {
  const up: number[] = [];
  const down: number[] = [];
  for (let i = Math.max(1, from); i < a.length; i++) {
    const [a0, b0, a1, b1] = [a[i], b[i], a[i - 1], b[i - 1]];
    if (a0 === null || b0 === null || a1 === null || b1 === null) continue;
    if (a0 > b0 && a1 <= b1) up.push(i);
    if (a0 < b0 && a1 >= b1) down.push(i);
  }
  return { up, down };
}

const barsWhere = (values: readonly (boolean | null)[], from = 0) =>
  values.flatMap((hit, bar) => (hit && bar >= from ? [bar] : []));

const tail = (values: readonly Maybe[], from: number): Maybe[] => values.map((v, i) => (i < from ? null : v));

/** Swings every few weeks for 600 bars, so the DI lines cross often. */
const swings = pathBars(Array.from({ length: 600 }, (_, i) => 200 + 15 * Math.sin(i / 8) + 3 * Math.sin(i * 1.7)), 1);

/**
 * From this bar on, a seed placed on bar 0 has decayed below 1e-9 of the value
 * (Wilder's weight (13/14)^n), so any first-bar seeding convention agrees here.
 */
const SETTLED = 350;

describe('ADX / DMI — trend direction and strength', () => {
  let runtime: PackRuntime;
  let dm: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    dm = await runtime.load('adx-dmi');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  // Was: ta.dmi seeded its Wilder averages on bar 0 — TR = high − low,
  // ±DM = 0 — where the reference has no value yet, so +DI/−DI appeared one
  // bar early and differed from the reference until the seed washed out
  // (~300 bars). Fixed in v2.
  it('reads +DI 50, −DI 0 and ADX 100 on a steady climb from the first bar each exists, worked by hand', async () => {
    const run = await dm.run(climb);
    const plus = run.plot('+DI');
    const adx = run.plot('ADX');
    expect(plus.slice(0, 14)).toEqual(new Array(14).fill(null));
    for (const v of plus.slice(14)) expect(v).toBeCloseTo(50, 9);
    for (const v of run.plot('−DI').slice(14)) expect(v).toBeCloseTo(0, 9);
    expect(adx.slice(0, 27)).toEqual(new Array(27).fill(null));
    for (const v of adx.slice(27)) expect(v).toBeCloseTo(100, 9);
  });

  it('draws +DI, −DI and ADX as the reference defines them, from their first bars', async () => {
    const bars = realisticDaily();
    const run = await dm.run(bars);
    const ref = dmi(bars, 14, 14);
    expect(closeSeries(run.plot('+DI'), ref.plus)).toEqual({ ok: true });
    expect(closeSeries(run.plot('−DI'), ref.minus)).toEqual({ ok: true });
    expect(closeSeries(run.plot('ADX'), ref.adx)).toEqual({ ok: true });
  });

  it('draws +DI, −DI and ADX as the reference defines them once the first-bar seed has washed out', async () => {
    const bars = realisticDaily(600);
    const run = await dm.run(bars);
    const ref = dmi(bars, 14, 14);
    expect(closeSeries(tail(run.plot('+DI'), SETTLED), tail(ref.plus, SETTLED))).toEqual({ ok: true });
    expect(closeSeries(tail(run.plot('−DI'), SETTLED), tail(ref.minus, SETTLED))).toEqual({ ok: true });
    expect(closeSeries(tail(run.plot('ADX'), SETTLED), tail(ref.adx, SETTLED))).toEqual({ ok: true });
  });

  it('follows the DI length and ADX smoothing a trader sets', async () => {
    const bars = realisticDaily(600);
    const run = await dm.run(bars, { 'di-length': 10, 'adx-smoothing': 20 });
    const ref = dmi(bars, 10, 20);
    expect(closeSeries(tail(run.plot('+DI'), SETTLED), tail(ref.plus, SETTLED))).toEqual({ ok: true });
    expect(closeSeries(tail(run.plot('ADX'), SETTLED), tail(ref.adx, SETTLED))).toEqual({ ok: true });
  });

  describe('key level', () => {
    it('draws the key level at 25, or where a trader sets it', async () => {
      expect((await dm.run(climb)).level('Key level')).toBe(25);
      expect((await dm.run(climb, { 'key-level': 20 })).level('Key level')).toBe(20);
    });

    it('draws ADX in full colour at or above the key level and faded below it', async () => {
      const run = await dm.run(swings);
      const adx = run.plot('ADX');
      const colors = run.plotColors('ADX');
      const strong = new Set(colors.filter((_c, i) => adx[i] !== null && (adx[i] as number) >= 25));
      const weak = new Set(colors.filter((_c, i) => adx[i] !== null && (adx[i] as number) < 25));
      expect(strong).toEqual(new Set(['#38bdf8']));
      expect(weak.size).toBe(1);
      expect(weak.has('#38bdf8')).toBe(false);
    });
  });

  describe('alerts', () => {
    it('raises the DI cross alerts on the bars +DI and −DI cross', async () => {
      const run = await dm.run(swings);
      const ref = dmi(swings, 14, 14);
      const expected = crossings(ref.plus, ref.minus, SETTLED);
      expect(expected.up.length).toBeGreaterThan(2);
      expect(expected.down.length).toBeGreaterThan(2);
      expect(barsWhere(run.alert('Bullish DI cross'), SETTLED)).toEqual(expected.up);
      expect(barsWhere(run.alert('Bearish DI cross'), SETTLED)).toEqual(expected.down);
    });

    it('raises the trend-strength alert when ADX rises through the key level', async () => {
      const run = await dm.run(swings);
      const ref = dmi(swings, 14, 14);
      const key = ref.adx.map((v) => (v === null ? null : 25));
      const expected = crossings(ref.adx, key, SETTLED).up;
      expect(expected.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('ADX above key level'), SETTLED)).toEqual(expected);
    });
  });

  it('shows the gap between +DI and −DI in the Data Window only', async () => {
    const bars = realisticDaily(600);
    const run = await dm.run(bars);
    const ref = dmi(bars, 14, 14);
    const spread = ref.plus.map((p, i) => (p === null ? null : p - (ref.minus[i] as number)));
    expect(closeSeries(tail(run.plot('DI spread'), SETTLED), tail(spread, SETTLED))).toEqual({ ok: true });
    expect(run.shown('DI spread')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });
});
