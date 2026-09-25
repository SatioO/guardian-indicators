import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, pathBars, realisticDaily, closeSeries, type PackIndicator, type PackRuntime, type BarShape, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * Chaikin Money Flow, as the reference platform defines it (length 20):
 *
 *   mfv = high == low ? 0 : ((close − low) − (high − close)) / (high − low) × volume
 *   cmf = sum(mfv, length) / sum(volume, length)
 *
 * A zero-range bar contributes no money flow but its volume still counts in
 * the denominator. Undefined until `length` bars exist, and wherever no volume
 * traded in the window (0 / 0).
 */
function chaikinMoneyFlow(bars: readonly OHLCV[], length: number): Maybe[] {
  return bars.map((_, i) => {
    if (i + 1 < length) return null;
    let flow = 0;
    let traded = 0;
    for (let k = i - length + 1; k <= i; k++) {
      const { high, low, close, volume } = bars[k];
      if (high !== low) flow += (((close - low) - (high - close)) / (high - low)) * volume;
      traded += volume;
    }
    return traded === 0 ? null : flow / traded;
  });
}

/** Bars where `values` crosses zero: above now, at or below on the bar before (or the reverse). */
function zeroCrosses(values: readonly Maybe[], way: 'above' | 'below'): number[] {
  const hits: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const [x, px] = [values[i], values[i - 1]];
    if (x === null || px === null) continue;
    if (way === 'above' ? x > 0 && px <= 0 : x < 0 && px >= 0) hits.push(i);
  }
  return hits;
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

const atHigh = (volume: number): BarShape => ({ open: 10, high: 11, low: 9, close: 11, volume });
const atLow = (volume: number): BarShape => ({ open: 10, high: 11, low: 9, close: 9, volume });
const mid = (close: number, volume: number): BarShape => ({ open: 10, high: 11, low: 9, close, volume });

describe('Chaikin Money Flow — buying and selling pressure over 20 bars', () => {
  let runtime: PackRuntime;
  let cmf: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    cmf = await runtime.load('chaikin-money-flow');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('weighs each close in its range by the volume behind it', async () => {
    // 10 bars closing at the high on 100 shares, then 10 at the low on 300:
    // (10 × 100 − 10 × 300) / (10 × 100 + 10 × 300) = −2,000 / 4,000 = −0.5.
    const bars = barsFrom([...Array.from({ length: 10 }, () => atHigh(100)), ...Array.from({ length: 10 }, () => atLow(300))]);
    const values = (await cmf.run(bars)).plot('CMF');
    expect(values.slice(0, 19)).toEqual(new Array(19).fill(null));
    expect(values[19]).toBeCloseTo(-0.5, 12);
  });

  it('counts a zero-range bar\'s volume but none of its money flow', async () => {
    // 19 bars at the high on 100 shares and one bar with no range on 100:
    // 1,900 / 2,000 = 0.95.
    const bars = barsFrom([
      ...Array.from({ length: 19 }, () => atHigh(100)),
      { open: 10, high: 10, low: 10, close: 10, volume: 100 },
    ]);
    expect((await cmf.run(bars)).plot('CMF')[19]).toBeCloseTo(0.95, 12);
  });

  it('matches the published definition on a realistic series', async () => {
    const bars = realisticDaily();
    expect(closeSeries((await cmf.run(bars)).plot('CMF'), chaikinMoneyFlow(bars, 20))).toEqual({ ok: true });
  });

  it('follows the length a trader sets', async () => {
    const bars = realisticDaily();
    expect(closeSeries((await cmf.run(bars, { length: 10 })).plot('CMF'), chaikinMoneyFlow(bars, 10))).toEqual({ ok: true });
  });

  it('draws nothing where no volume traded', async () => {
    const bars = barsFrom(Array.from({ length: 30 }, () => atHigh(0)));
    expect((await cmf.run(bars)).plot('CMF').every((v) => v === null)).toBe(true);
  });

  it('colours buying pressure green and selling pressure red, bright beyond the guides', async () => {
    // Windows of 20: strong buying (≈ +1), mild buying (+0.02), mild selling
    // (−0.02), strong selling (≈ −1), each held long enough to fill a window.
    const bars = barsFrom([
      ...Array.from({ length: 20 }, () => atHigh(100)),
      ...Array.from({ length: 20 }, () => mid(10.02, 100)),
      ...Array.from({ length: 20 }, () => mid(9.98, 100)),
      ...Array.from({ length: 20 }, () => atLow(100)),
    ]);
    const run = await cmf.run(bars);
    const values = run.plot('CMF');
    const colors = run.plotColors('CMF');
    expect(values[19]).toBeCloseTo(1, 12);
    expect(values[39]).toBeCloseTo(0.02, 12);
    expect(values[59]).toBeCloseTo(-0.02, 12);
    expect(values[79]).toBeCloseTo(-1, 12);
    const [strongBuy, mildBuy, mildSell, strongSell] = [colors[19], colors[39], colors[59], colors[79]];
    expect(new Set([strongBuy, mildBuy, mildSell, strongSell]).size).toBe(4);
    expect(strongBuy).toBe('#26a69a');
    expect(strongSell).toBe('#ef5350');
  });

  it('draws the zero line and the guide lines a trader sets', async () => {
    const bars = realisticDaily(60);
    const run = await cmf.run(bars);
    expect(run.level('Zero')).toBe(0);
    // 0.2 by default: high enough that "bright" stays a minority of bars on a
    // realistic series (see the next test), matching listing.json's claim
    // that bright columns are "strong enough that many traders take note".
    expect(run.level('Buying pressure')).toBe(0.2);
    expect(run.level('Selling pressure')).toBe(-0.2);
    const wide = await cmf.run(bars, { guide: 0.1 });
    expect(wide.level('Buying pressure')).toBe(0.1);
    expect(wide.level('Selling pressure')).toBe(-0.1);
  });

  it('keeps bright columns a minority on a realistic series at the default guide', async () => {
    // At the old 0.05 default, 80-90% of bars were bright on realistic data —
    // the guide filtered almost nothing. At 0.2, bright bars stay a clear
    // minority, so "bright" actually singles out the stronger readings.
    const bars = realisticDaily(1000, 7);
    const run = await cmf.run(bars);
    const values = run.plot('CMF');
    const colors = run.plotColors('CMF');
    const nonNull = values
      .map((v, i) => ({ v, color: colors[i] }))
      .filter((x): x is { v: number; color: string } => x.v !== null);
    const brightCount = nonNull.filter((x) => x.color === '#26a69a' || x.color === '#ef5350').length;
    expect(brightCount / nonNull.length).toBeLessThan(0.5);
  });

  it('raises the zero-cross alerts on the bars CMF changes sign', async () => {
    const swings = pathBars([
      ...Array.from({ length: 40 }, (_, i) => 100 + i),
      ...Array.from({ length: 40 }, (_, i) => 139 - i),
      ...Array.from({ length: 40 }, (_, i) => 100 + i),
    ]);
    const run = await cmf.run(swings);
    const ref = chaikinMoneyFlow(swings, 20);
    const up = zeroCrosses(ref, 'above');
    const down = zeroCrosses(ref, 'below');
    expect(up.length).toBeGreaterThan(0);
    expect(down.length).toBeGreaterThan(0);
    expect(barsWhere(run.alert('CMF crossed above zero'))).toEqual(up);
    expect(barsWhere(run.alert('CMF crossed below zero'))).toEqual(down);
  });
});
