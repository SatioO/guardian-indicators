import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, flatRangeBars, realisticDaily, closeSeries, field, rma, sma, trueRange, zip, gapBars, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/*
 * Reference contract — the reference platform's built-in Average True Range,
 * expressed as a percent of the close:
 *
 *   TR    = max(high − low, |high − close[1]|, |low − close[1]|); the first bar
 *           (no prior close) is its own high − low            (ta.tr(true))
 *   ATR   = RMA(TR, 14) by default; Smoothing offers RMA / SMA / EMA / WMA
 *   ATR%  = 100 × ATR / close
 *
 * RMA is Wilder's average seeded with the SMA of the first `length` values.
 * EMA is seeded on the very first bar with the source value itself — the
 * reference platform's own documented equivalent is
 * `sum := na(sum[1]) ? src : alpha*src + (1-alpha)*nz(sum[1])` — so it never
 * withholds output for a warm-up window, unlike SMA/RMA/WMA. Nothing is drawn
 * until `length` true ranges exist for the RMA/SMA/WMA smoothing choices.
 */

/** EMA seeded with the source value on the first bar, α = 2 / (length + 1); no warm-up. */
function ema(values: readonly Maybe[], length: number): Maybe[] {
  const alpha = 2 / (length + 1);
  const out: Maybe[] = new Array(values.length).fill(null);
  let prev: number | null = null;
  values.forEach((v, i) => {
    if (v === null) {
      out[i] = prev;
      return;
    }
    prev = prev === null ? v : alpha * v + (1 - alpha) * prev;
    out[i] = prev;
  });
  return out;
}

/** Linearly weighted average: the newest value weighs `length`, the oldest 1. */
function wma(values: readonly Maybe[], length: number): Maybe[] {
  return values.map((_, i) => {
    if (i + 1 < length) return null;
    let num = 0;
    for (let k = 0; k < length; k++) {
      const v = values[i - k];
      if (v === null) return null;
      num += v * (length - k);
    }
    return num / ((length * (length + 1)) / 2);
  });
}

/** Bars where `a` crosses above `b`: above now, at or below on the bar before. */
function crossesAbove(a: readonly Maybe[], b: readonly Maybe[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < a.length; i++) {
    const [x, y, px, py] = [a[i], b[i], a[i - 1], b[i - 1]];
    if (x !== null && y !== null && px !== null && py !== null && x > y && px <= py) out.push(i);
  }
  return out;
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

const percentOfClose = (bars: readonly OHLCV[], atr: readonly Maybe[]) =>
  zip(atr, field(bars, 'close'), (a, c) => (100 * a) / c);

/** A daily series with an overnight gap every 15 bars. */
const gappy = gapBars({ count: 300, seed: 5, intervalSec: 86_400, startPrice: 250 });

describe('ATR% — average true range as a percent of price', () => {
  let runtime: PackRuntime;
  let atrPct: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    atrPct = await runtime.load('atr-percent');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads 200/101 % on bars that always span 100 → 102 and close at 101', async () => {
    const run = await atrPct.run(flatRangeBars(40, 100, 102));
    const values = run.plot('ATR%');
    // True range is 2 on every bar; nothing until the 14-bar average exists.
    expect(values.slice(0, 13)).toEqual(new Array(13).fill(null));
    for (const value of values.slice(13)) expect(value).toBeCloseTo(200 / 101, 10);
  });

  it('counts an overnight gap that the day\'s own range misses', async () => {
    // Twenty quiet 100 → 102 days closing at 101, then a gap: the next day
    // trades 109 → 111 and closes at 110. Its range is 2, but its true range
    // reaches back to yesterday's 101 close: 111 − 101 = 10.
    const bars = barsFrom([
      ...Array.from({ length: 20 }, () => ({ open: 101, high: 102, low: 100, close: 101 })),
      { open: 110, high: 111, low: 109, close: 110 },
    ]);
    const run = await atrPct.run(bars);
    // Wilder: (13 × 2 + 10) / 14 = 36 / 14 rupees, on a 110 close.
    expect(run.plot('ATR%')[20]).toBeCloseTo((100 * (36 / 14)) / 110, 10);
  });

  it('matches Wilder\'s ATR over the close on a gapping daily series', async () => {
    const run = await atrPct.run(gappy);
    const expected = percentOfClose(gappy, rma(trueRange(gappy), 14));
    expect(closeSeries(run.plot('ATR%'), expected)).toEqual({ ok: true });
  });

  it('follows the Length a trader sets', async () => {
    const bars = realisticDaily();
    const run = await atrPct.run(bars, { length: 5 });
    expect(closeSeries(run.plot('ATR%'), percentOfClose(bars, rma(trueRange(bars), 5)))).toEqual({ ok: true });
  });

  it.each([
    ['SMA', sma],
    ['WMA', wma],
  ] as const)('smooths the true range with %s when chosen', async (smoothing, average) => {
    const run = await atrPct.run(gappy, { smoothing });
    expect(closeSeries(run.plot('ATR%'), percentOfClose(gappy, average(trueRange(gappy), 14)))).toEqual({ ok: true });
  });

  // LANGUAGE FINDING (reported): ta.ema requires `length` valid source values
  // before producing anything, seeded by their SMA, and gives na before that
  // — the reference platform's own documented pine_ema equivalent seeds with
  // the source value on the very first bar and never withholds output for a
  // warm-up window (`sum := na(sum[1]) ? src : alpha*src + (1-alpha)*nz(sum[1])`).
  // On TR = [2, 3, 7, 5, 6] with length 3, ta.ema gives [null, null, 4, 4.5, 5.25]
  // (SMA-seeded) where the published formula gives [2, 2.5, 4.75, 4.875, 5.4375]
  // from bar 0 — the converged values also disagree, not just the warm-up. This
  // test holds the published contract; it is expected to fail until ta.ema is
  // corrected, and then must be turned back into a plain test.
  it.fails('[language finding: ta.ema first-bar seed] smooths the true range with EMA when chosen', async () => {
    const run = await atrPct.run(gappy, { smoothing: 'EMA' });
    expect(closeSeries(run.plot('ATR%'), percentOfClose(gappy, ema(trueRange(gappy), 14)))).toEqual({ ok: true });
  });

  it('shows the ATR in rupees in the Data Window, off the pane', async () => {
    const run = await atrPct.run(gappy);
    expect(closeSeries(run.plot('ATR (price)'), rma(trueRange(gappy), 14))).toEqual({ ok: true });
    expect(run.shown('ATR (price)')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });

  describe('against its own average', () => {
    const atrPercent = percentOfClose(gappy, rma(trueRange(gappy), 14));

    it('draws the average ATR% over the Average length a trader sets', async () => {
      const run = await atrPct.run(gappy, { 'average-length': 20 });
      expect(closeSeries(run.plot('ATR% average'), sma(atrPercent, 20))).toEqual({ ok: true });
    });

    it('colours the line while volatility runs above its average', async () => {
      const run = await atrPct.run(gappy);
      const average = sma(atrPercent, 50);
      const colors = run.plotColors('ATR%');
      const above = atrPercent.flatMap((v, i) => (v !== null && average[i] !== null && v > average[i]! ? [i] : []));
      const below = atrPercent.flatMap((v, i) => (v !== null && average[i] !== null && v <= average[i]! ? [i] : []));
      expect(above.length).toBeGreaterThan(0);
      expect(below.length).toBeGreaterThan(0);
      expect(new Set(above.map((i) => colors[i])).size).toBe(1);
      expect(new Set(below.map((i) => colors[i])).size).toBe(1);
      expect(colors[above[0]]).not.toBe(colors[below[0]]);
    });

    it('raises the expansion alert on the bar ATR% crosses above its average', async () => {
      const run = await atrPct.run(gappy);
      const expected = crossesAbove(atrPercent, sma(atrPercent, 50));
      expect(expected.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('Volatility expanding'))).toEqual(expected);
    });
  });

  it('offers the reference smoothing choices, RMA first', () => {
    const smoothing = atrPct.manifest.inputs?.find((i) => i.key === 'input@smoothing');
    expect(smoothing).toMatchObject({ kind: 'select', default: 'RMA' });
    expect(smoothing?.kind === 'select' && smoothing.options.map((o) => o.value))
      .toEqual(['RMA', 'SMA', 'EMA', 'WMA']);
  });
});
