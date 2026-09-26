import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, realisticDaily, closeSeries, field, sma, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * Mark Minervini's trend template, criterion by criterion (daily bars):
 *  1. close > SMA 150 and close > SMA 200
 *  2. SMA 150 > SMA 200
 *  3. SMA 200 rising: above its value 20 bars ago
 *  4. SMA 50 > SMA 150 and SMA 50 > SMA 200
 *  5. close > SMA 50
 *  6. close ≥ 1.30 × 52-week low   (lowest low of 252 bars)
 *  7. close ≥ 0.75 × 52-week high  (highest high of 252 bars — within 25%)
 *  8. relative strength: the stock's 252-bar return beats the benchmark's
 *     (close ÷ close 252 bars ago, against the same for the index) — a stand-in
 *     for Minervini's RS rating, which ranks a stock against the whole market.
 * A criterion that cannot be judged yet (warm-up, missing data) does not pass.
 */

const BENCHMARK = 'INDEX:NIFTY';

function highest(bars: readonly OHLCV[], length: number): Maybe[] {
  return bars.map((_b, i) => (i + 1 < length ? null : Math.max(...bars.slice(i - length + 1, i + 1).map((b) => b.high))));
}
function lowest(bars: readonly OHLCV[], length: number): Maybe[] {
  return bars.map((_b, i) => (i + 1 < length ? null : Math.min(...bars.slice(i - length + 1, i + 1).map((b) => b.low))));
}

/** Each criterion per bar, as plain loops over the published definition. */
function criteria(stock: readonly OHLCV[], index: readonly OHLCV[] | null): boolean[][] {
  const closes = field(stock, 'close');
  const [s50, s150, s200] = [sma(closes, 50), sma(closes, 150), sma(closes, 200)];
  const [hi, lo] = [highest(stock, 252), lowest(stock, 252)];
  const gt = (a: Maybe, b: Maybe) => a !== null && b !== null && a > b;
  return stock.map((bar, i) => {
    const c = bar.close;
    const rs = index !== null && i >= 252
      && c / stock[i - 252].close > index[i].close / index[i - 252].close;
    return [
      gt(c, s150[i]) && gt(c, s200[i]),
      gt(s150[i], s200[i]),
      i >= 20 && gt(s200[i], s200[i - 20]),
      gt(s50[i], s150[i]) && gt(s50[i], s200[i]),
      gt(c, s50[i]),
      lo[i] !== null && c >= 1.3 * lo[i],
      hi[i] !== null && c >= 0.75 * hi[i],
      rs,
    ];
  });
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));
const signed = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

describe('Trend Template — the eight-point stage 2 checklist', () => {
  let runtime: PackRuntime;
  let template: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    template = await runtime.load('trend-template');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  // A clean advance: +1 a day for 300 days against a flat index.
  const rising = pathBars(Array.from({ length: 300 }, (_, i) => 100 + i), 0.5);
  const flatIndex = pathBars(Array.from({ length: 300 }, () => 1000), 2);
  const withFlatIndex = { symbols: { [BENCHMARK]: flatIndex } };

  it('passes all eight on a clean advance, from the first bar that can judge them all', async () => {
    const run = await template.run(rising, {}, withFlatIndex);
    const count = run.plot('Criteria passed');
    // Bar 252 is the first with a 12-month return to compare; every other
    // criterion is already true by then.
    expect(count[251]).toBe(7);
    expect(count.slice(252).every((c) => c === 8)).toBe(true);
    expect(barsWhere(run.alert('Trend template passed'))).toEqual([252]);
  });

  it('shades only the bars that pass', async () => {
    const run = await template.run(rising, {}, withFlatIndex);
    const shaded = run.colorEffect('Background color').flatMap((c, i) => (c === null ? [] : [i]));
    expect(shaded).toEqual(Array.from({ length: 48 }, (_, k) => 252 + k));
    const plain = await template.run(rising, { shade: false }, withFlatIndex);
    expect(plain.colorEffect('Background color').every((c) => c === null)).toBe(true);
  });

  it('tabulates each criterion at the latest bar with a tick, and the numbers behind it', async () => {
    const run = await template.run(rising, {}, withFlatIndex);
    const last = 299;
    const closes = field(rising, 'close');
    const [s50, s150, s200] = [sma(closes, 50), sma(closes, 150), sma(closes, 200)];
    const hi = highest(rising, 252)[last] as number;
    const lo = lowest(rising, 252)[last] as number;
    const c = closes[last];
    const pct = (a: number, b: number) => signed((a / b - 1) * 100);
    const min = (a: string, b: string) => (parseFloat(a) <= parseFloat(b) ? a : b);
    expect(run.table()).toEqual([
      ['Trend template', '8 / 8', ''],
      ['✓', 'Close above SMA 150 and 200', min(pct(c, s150[last] as number), pct(c, s200[last] as number))],
      ['✓', 'SMA 150 above SMA 200', pct(s150[last] as number, s200[last] as number)],
      ['✓', 'SMA 200 rising (20 bars)', pct(s200[last] as number, s200[last - 20] as number)],
      ['✓', 'SMA 50 above SMA 150 and 200', min(pct(s50[last] as number, s150[last] as number), pct(s50[last] as number, s200[last] as number))],
      ['✓', 'Close above SMA 50', pct(c, s50[last] as number)],
      ['✓', 'At least 30% above 52-week low', pct(c, lo)],
      ['✓', 'Within 25% of 52-week high', pct(c, hi)],
      ['✓', 'Beats NIFTY over 12 months', signed(((c / closes[last - 252]) / 1 - 1) * 100)],
    ]);
    const colors = run.drawings.tables[0].rows.slice(1).map((row) => row.cells[0].color);
    expect(new Set(colors).size).toBe(1);
  });

  it('marks failures on a decline, and never passes', async () => {
    const falling = pathBars(Array.from({ length: 300 }, (_, i) => 400 - i), 0.5);
    const run = await template.run(falling, {}, withFlatIndex);
    expect(run.plot('Criteria passed').every((c) => c !== null && c < 8)).toBe(true);
    expect(barsWhere(run.alert('Trend template passed'))).toEqual([]);
    const table = run.table();
    expect(table[0][1]).toBe('0 / 8');
    expect(table.slice(1).map((row) => row[0])).toEqual(new Array(8).fill('✗'));
    const passing = await template.run(rising, {}, withFlatIndex);
    const failColor = run.drawings.tables[0].rows[1].cells[0].color;
    const passColor = passing.drawings.tables[0].rows[1].cells[0].color;
    expect(failColor).toBeDefined();
    expect(failColor).not.toBe(passColor);
  });

  it('cannot judge relative strength without the benchmark, and says so', async () => {
    const run = await template.run(rising);
    expect(run.plot('Criteria passed')[299]).toBe(7);
    expect(barsWhere(run.alert('Trend template passed'))).toEqual([]);
    expect(run.table()[8]).toEqual(['—', 'Beats NIFTY over 12 months', '—']);
  });

  it('agrees with the definition bar for bar on real-looking bars', async () => {
    const stock = realisticDaily(700, 31);
    const index = realisticDaily(700, 37);
    const run = await template.run(stock, {}, { symbols: { [BENCHMARK]: index } });
    const each = criteria(stock, index);
    const counts: Maybe[] = each.map((row) => row.filter(Boolean).length);
    expect(closeSeries(run.plot('Criteria passed'), counts)).toEqual({ ok: true });
    const passed = each.map((row) => row.every(Boolean));
    const became = passed.flatMap((p, i) => (p && i > 0 && !passed[i - 1] ? [i] : []));
    const lost = passed.flatMap((p, i) => (!p && i > 0 && passed[i - 1] ? [i] : []));
    expect(became.length).toBeGreaterThan(0);
    expect(barsWhere(run.alert('Trend template passed'))).toEqual(became);
    expect(barsWhere(run.alert('Trend template lost'))).toEqual(lost);
    // The table reads the latest bar's criteria.
    const marks = run.table().slice(1).map((row) => row[0]);
    expect(marks).toEqual(each[699].map((ok) => (ok ? '✓' : '✗')));
  });

  it('draws the 50, 150 and 200-day averages, and can hide them', async () => {
    const stock = realisticDaily(400, 31);
    const run = await template.run(stock);
    const closes = field(stock, 'close');
    expect(closeSeries(run.plot('SMA 50'), sma(closes, 50))).toEqual({ ok: true });
    expect(closeSeries(run.plot('SMA 150'), sma(closes, 150))).toEqual({ ok: true });
    expect(closeSeries(run.plot('SMA 200'), sma(closes, 200))).toEqual({ ok: true });
    const hidden = await template.run(stock, { averages: false });
    expect(hidden.plot('SMA 50').every((v) => v === null)).toBe(true);
  });

  it('follows the thresholds a trader sets', async () => {
    const stock = realisticDaily(700, 31);
    const index = realisticDaily(700, 37);
    const strict = await template.run(stock, { 'above-low': 90, 'near-high': 5 }, { symbols: { [BENCHMARK]: index } });
    const loose = await template.run(stock, {}, { symbols: { [BENCHMARK]: index } });
    const sum = (v: (number | null)[]) => v.reduce<number>((a, x) => a + (x ?? 0), 0);
    expect(sum(strict.plot('Criteria passed'))).toBeLessThan(sum(loose.plot('Criteria passed')));
    expect(strict.table()[6][1]).toBe('At least 90% above 52-week low');
    expect(strict.table()[7][1]).toBe('Within 5% of 52-week high');
  });

  it('relabels the high/low rows when Year (bars) is not the 252-bar default', async () => {
    const stock = realisticDaily(400, 31);
    const index = realisticDaily(400, 37);
    const run = await template.run(stock, { year: 60 }, { symbols: { [BENCHMARK]: index } });
    expect(run.table()[6][1]).toBe('At least 30% above 60-bar low');
    expect(run.table()[7][1]).toBe('Within 25% of 60-bar high');
  });

  it('shows a margin that agrees with the ✓/✗ mark on a two-part criterion, even when only one half holds', async () => {
    // Ramp up for 380 bars (so every average is well warmed up), then decline
    // steadily enough that close falls below SMA150 while staying above SMA200.
    const up = Array.from({ length: 380 }, (_, i) => 100 + i);
    const down: number[] = [];
    let v = up[up.length - 1];
    for (let i = 0; i < 30; i += 1) { v -= 2.2; down.push(v); }
    const stock = pathBars([...up, ...down], 0.5);
    const index = pathBars(Array.from({ length: stock.length }, () => 1000), 2);
    const run = await template.run(stock, {}, { symbols: { [BENCHMARK]: index } });
    const closes = field(stock, 'close');
    const [s150, s200] = [sma(closes, 150), sma(closes, 200)];
    const last = stock.length - 1;
    const c = closes[last];
    // Independently confirm the shape this repro needs: close below SMA150,
    // still above SMA200 — a normal pullback, not a contrived edge case.
    expect(c).toBeLessThan(s150[last] as number);
    expect(c).toBeGreaterThan(s200[last] as number);
    const marginVsSma150 = (c / (s150[last] as number) - 1) * 100;
    const marginVsSma200 = (c / (s200[last] as number) - 1) * 100;
    const expectedDetail = signed(Math.min(marginVsSma150, marginVsSma200));
    const row1 = run.table()[1];
    expect(row1[0]).toBe('✗');
    expect(row1[2]).toBe(expectedDetail);
    // The sign must agree with the mark: a ✗ never shows a positive number.
    expect(row1[2].startsWith('-')).toBe(true);
  });

  it('uses the Fails color for the header count on an outright fail, and amber only for a near-miss', async () => {
    const falling = pathBars(Array.from({ length: 300 }, (_, i) => 400 - i), 0.5);
    const outright = await template.run(falling, {});
    const outrightHeader = outright.drawings.tables[0].rows[0].cells[1];
    expect(outrightHeader.text).toBe('0 / 8');
    expect(outrightHeader.color).toBe('#ef5350'); // default Fails color

    const rising = pathBars(Array.from({ length: 300 }, (_, i) => 100 + i), 0.5);
    const nearMiss = await template.run(rising); // no benchmark data: 7/8
    const nearMissHeader = nearMiss.drawings.tables[0].rows[0].cells[1];
    expect(nearMissHeader.text).toBe('7 / 8');
    expect(nearMissHeader.color).toBe('#f59e0b');

    const customFail = await template.run(falling, { 'fail-color': '#123456' });
    expect(customFail.drawings.tables[0].rows[0].cells[1].color).toBe('#123456');
  });

  it('asks for the benchmark as a symbol input, defaulting to the NIFTY 50', () => {
    expect(template.manifest.inputs?.find((i) => i.key === 'input@benchmark')).toMatchObject({ default: BENCHMARK });
  });
});
