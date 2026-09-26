import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, realisticDaily, closeSeries, field, sma, type PackIndicator, type PackRuntime, type OHLCV } from 'guardian-gscript-toolchain';

const BENCHMARK = 'INDEX:NIFTY';

/** 100 × (stock ÷ index), rebased so the first bar reads 100. */
function rsLine(stock: readonly OHLCV[], index: readonly OHLCV[]): number[] {
  const base = stock[0].close / index[0].close;
  return stock.map((bar, i) => (100 * (bar.close / index[i].close)) / base);
}

/** True on bars where `values` equals its own highest over `length` bars. */
function atHigh(values: readonly number[], length: number): boolean[] {
  return values.map((v, i) => {
    if (i + 1 < length) return false;
    return Math.max(...values.slice(i - length + 1, i + 1)) === v;
  });
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

describe('Relative Strength — a stock against its index', () => {
  let runtime: PackRuntime;
  let rs: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    rs = await runtime.load('relative-strength');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  const stock = realisticDaily(300, 7);
  const index = realisticDaily(300, 11);
  const withIndex = { symbols: { [BENCHMARK]: index } };

  it('draws the RS line: 100 on the first bar, above 100 once the stock has outperformed', async () => {
    const run = await rs.run(stock, {}, withIndex);
    expect(closeSeries(run.plot('RS line'), rsLine(stock, index))).toEqual({ ok: true });
    expect(run.plot('RS line')[0]).toBeCloseTo(100, 12);
  });

  it('smooths the RS line with the average a trader sets', async () => {
    const run = await rs.run(stock, { 'average-length': 21 }, withIndex);
    expect(closeSeries(run.plot('RS average'), sma(rsLine(stock, index), 21))).toEqual({ ok: true });
  });

  it('draws nothing until the index has data, rather than a wrong line', async () => {
    const run = await rs.run(stock);
    expect(run.plot('RS line').every((v) => v === null)).toBe(true);
  });

  describe('new highs', () => {
    // The index falls while the stock goes sideways: the RS line makes new
    // highs even though the price does not — the classic "RS leads" setup.
    const flatStock = pathBars(Array.from({ length: 120 }, (_, i) => 100 + Math.sin(i / 3)), 0.5);
    const fallingIndex = pathBars(Array.from({ length: 120 }, (_, i) => 1000 - i * 2), 2);
    const opts = { symbols: { [BENCHMARK]: fallingIndex } };

    it('marks bars where the RS line is at its lookback high', async () => {
      const run = await rs.run(flatStock, { lookback: 50 }, opts);
      const expected = barsWhere(atHigh(rsLine(flatStock, fallingIndex), 50));
      expect(expected.length).toBeGreaterThan(0);
      expect(barsWhere(run.markers('RS new high'))).toEqual(expected);
    });

    it('singles out the new highs that come before a price high', async () => {
      const run = await rs.run(flatStock, { lookback: 50 }, opts);
      const line = rsLine(flatStock, fallingIndex);
      const rsHigh = atHigh(line, 50);
      const priceHigh = atHigh(field(flatStock, 'close'), 50);
      const expected = barsWhere(rsHigh.map((h, i) => h && !priceHigh[i]));
      expect(expected.length).toBeGreaterThan(0);
      expect(barsWhere(run.markers('RS leads price'))).toEqual(expected);
      expect(barsWhere(run.alert('RS new high before price'))).toEqual(expected);
    });
  });

  it('tabulates outperformance over 1, 3, 6 and 12 months', async () => {
    const run = await rs.run(stock, {}, withIndex);
    const line = rsLine(stock, index);
    const last = line.length - 1;
    const pct = (bars: number) => {
      const change = (line[last] / line[last - bars] - 1) * 100;
      return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
    };
    expect(run.table()).toEqual([
      ['vs INDEX:NIFTY', ''],
      ['1M', pct(21)],
      ['3M', pct(63)],
      ['6M', pct(126)],
      ['12M', pct(252)],
    ]);
  });

  it('asks for the benchmark as a symbol input, defaulting to the NIFTY 50', () => {
    const input = rs.manifest.inputs?.find((i) => i.key === 'input@benchmark');
    expect(input).toMatchObject({ default: BENCHMARK });
  });

  it('shows an em dash for a period with too little history yet, while shorter periods still compute', async () => {
    // 100 bars covers 1M (21) and 3M (63) but not 6M (126) or 12M (252).
    const shortStock = realisticDaily(100, 7);
    const shortIndex = realisticDaily(100, 11);
    const run = await rs.run(shortStock, {}, { symbols: { [BENCHMARK]: shortIndex } });
    const line = rsLine(shortStock, shortIndex);
    const last = line.length - 1;
    const pct = (bars: number) => {
      const change = (line[last] / line[last - bars] - 1) * 100;
      return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
    };
    expect(run.table()).toEqual([
      ['vs INDEX:NIFTY', ''],
      ['1M', pct(21)],
      ['3M', pct(63)],
      ['6M', '—'],
      ['12M', '—'],
    ]);
  });

  it('draws a dashed baseline at 100, the outperform/underperform boundary', async () => {
    const run = await rs.run(stock, {}, withIndex);
    expect(run.level('Baseline')).toBe(100);
  });

  it('shows the RS line spread above/below its average in the Data Window', async () => {
    const run = await rs.run(stock, {}, withIndex);
    const line = rsLine(stock, index);
    const avg = sma(line, 50);
    const expected = line.map((v, i) => (avg[i] === null ? null : v - (avg[i] as number)));
    expect(closeSeries(run.plot('RS spread'), expected)).toEqual({ ok: true });
    expect(run.shown('RS spread')).toMatchObject({ dataWindow: true, pane: false });
  });
});

