import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, flatRangeBars, pathBars, realisticDaily, atr, closeSeries, field, sma, zip, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * The swing trader's one-glance dashboard. Every number is the latest bar's:
 *  ADR%      100 × (mean of high ÷ low over 20 bars − 1)
 *  ATR%      100 × ATR(14) ÷ close        (Wilder's average true range)
 *  RVOL      volume ÷ mean volume of the 50 bars BEFORE this one
 *  Off high  100 × (close ÷ highest high of 252 bars − 1)
 *  Above low 100 × (close ÷ lowest low of 252 bars − 1)
 *  Turnover  mean of close × volume over 50 bars, in ₹ crore (÷ 1,00,00,000)
 *  Up/down   volume on up closes ÷ volume on down closes over 50 bars
 *            (a close above the previous close is up, below it down)
 *  From 50   100 × (close ÷ SMA 50 − 1)
 *  3M vs     100 × ((close ÷ close 63 bars ago) ÷ (index ÷ index 63 bars ago) − 1)
 */

const BENCHMARK = 'INDEX:NIFTY';

const span = (values: readonly number[], i: number, length: number) => values.slice(i - length + 1, i + 1);

function reference(bars: readonly OHLCV[], index: readonly OHLCV[]) {
  const closes = field(bars, 'close');
  const volumes = field(bars, 'volume');
  const ratio = bars.map((b) => b.high / b.low);
  const avgVol = sma(volumes, 50);
  const upDown: Maybe[] = bars.map((_b, i) => {
    if (i < 49) return null;
    let up = 0;
    let down = 0;
    for (let k = i - 49; k <= i; k++) {
      if (k === 0) continue;
      if (closes[k] > closes[k - 1]) up += volumes[k];
      else if (closes[k] < closes[k - 1]) down += volumes[k];
    }
    return up / down;
  });
  return {
    adr: sma(ratio, 20).map((v) => (v === null ? null : 100 * (v - 1))),
    atr: zip(atr(bars, 14), closes, (a, c) => (100 * a) / c),
    rvol: volumes.map((v, i) => (i < 50 ? null : v / (avgVol[i - 1] as number))),
    offHigh: closes.map((c, i) => (i < 251 ? null : 100 * (c / Math.max(...span(field(bars, 'high'), i, 252)) - 1))),
    aboveLow: closes.map((c, i) => (i < 251 ? null : 100 * (c / Math.min(...span(field(bars, 'low'), i, 252)) - 1))),
    turnover: sma(bars.map((b) => b.close * b.volume), 50).map((v) => (v === null ? null : v / 1e7)),
    upDown,
    from50: zip(closes, sma(closes, 50), (c, m) => 100 * (c / m - 1)),
    vsIndex: closes.map((c, i) => (i < 63 ? null : 100 * ((c / closes[i - 63]) / (index[i].close / index[i - 63].close) - 1))),
  };
}

describe('Swing Dashboard — the numbers a swing trader checks first', () => {
  let runtime: PackRuntime;
  let dash: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    dash = await runtime.load('swing-dashboard');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  const valueOf = (run: Awaited<ReturnType<PackIndicator['run']>>, name: string) =>
    run.table().find((row) => row[0] === name)?.[1];

  describe('worked by hand', () => {
    it('reads a stock that always spans 100 → 102 as 2% ADR and a 2-rupee ATR', async () => {
      const run = await dash.run(flatRangeBars(60, 100, 102));
      expect(run.plot('ADR%')[59]).toBeCloseTo(2, 10);
      expect(run.plot('ATR%')[59]).toBeCloseTo(200 / 101, 10);
      expect(valueOf(run, 'ADR% (20)')).toBe('2.00%');
      expect(valueOf(run, 'ATR% (14)')).toBe('1.98%');
    });

    it('reads triple volume against a steady average as RVOL 3', async () => {
      const bars = barsFrom([
        ...Array.from({ length: 60 }, () => ({ open: 100, high: 101, low: 99, close: 100, volume: 1_000 })),
        { open: 100, high: 101, low: 99, close: 100, volume: 3_000 },
      ]);
      const run = await dash.run(bars);
      expect(run.plot('RVOL')[60]).toBeCloseTo(3, 12);
      expect(valueOf(run, 'RVOL (50)')).toBe('3.00×');
    });

    it('reads volume on up closes against volume on down closes', async () => {
      // Closes alternate 100, 101, 100, …: every up close trades 2,000, every
      // down close 1,000, so 50 bars hold 25 of each and the ratio is 2.
      const bars = barsFrom(Array.from({ length: 100 }, (_, i) => ({
        open: 100, high: 101.5, low: 99.5, close: i % 2 === 1 ? 101 : 100, volume: i % 2 === 1 ? 2_000 : 1_000,
      })));
      const run = await dash.run(bars);
      expect(run.plot('Up/down volume ratio')[99]).toBeCloseTo(2, 12);
      expect(valueOf(run, 'Up/down volume (50)')).toBe('2.00');
    });

    it('shows an unmistakable bullish extreme, not a dash, when a window has no down-close volume at all', async () => {
      // 60 strictly rising closes: every one of the last 50 is an up close, so
      // the window's down-close volume is exactly zero. Up ÷ 0 is undefined by
      // division alone, but by the row's own definition (up volume vs down
      // volume) a window with real up-volume and NO down-volume at all is the
      // most one-sided reading the ratio can describe — it must read as an
      // extreme, not as "insufficient data" (there are 60 bars of history).
      const bars = barsFrom(Array.from({ length: 60 }, (_, i) => ({
        open: 100 + i, high: 101 + i, low: 99 + i, close: 100.5 + i, volume: 1_000,
      })));
      const run = await dash.run(bars);
      expect(valueOf(run, 'Up/down volume (50)')).toBe('∞');
    });

    it('shows average turnover in crore, lakh below one crore, grouped the Indian way', async () => {
      const turnover = async (close: number, volume: number) =>
        valueOf(await dash.run(barsFrom(Array.from({ length: 60 }, () => ({ open: close, high: close + 1, low: close - 1, close, volume })))), 'Avg turnover (50)');
      expect(await turnover(250, 4_00_000)).toBe('₹ 10.0 Cr'); // 250 × 4,00,000 = 10,00,00,000
      expect(await turnover(50, 1_00_000)).toBe('₹ 50.0 L'); // 50,00,000
      expect(await turnover(2_500, 50_00_000)).toBe('₹ 1,250.0 Cr');
    });

    it('reads 20% up against a 10% up index as 9.1% outperformance over three months', async () => {
      const stock = pathBars(Array.from({ length: 64 }, (_, i) => (i < 63 ? 100 : 120)));
      const index = pathBars(Array.from({ length: 64 }, (_, i) => (i < 63 ? 1_000 : 1_100)));
      const run = await dash.run(stock, {}, { symbols: { [BENCHMARK]: index } });
      expect(run.plot('3M vs benchmark (%)')[63]).toBeCloseTo((1.2 / 1.1 - 1) * 100, 10);
      expect(valueOf(run, '3M vs NIFTY')).toBe('+9.1%');
    });
  });

  describe('against the definitions on real-looking bars', () => {
    const stock = realisticDaily(400, 41);
    const index = realisticDaily(400, 43);
    const ref = reference(stock, index);

    it('matches every number bar for bar in the Data Window', async () => {
      const run = await dash.run(stock, {}, { symbols: { [BENCHMARK]: index } });
      const pairs: [string, Maybe[]][] = [
        ['ADR%', ref.adr], ['ATR%', ref.atr], ['RVOL', ref.rvol],
        ['% off 52-week high', ref.offHigh], ['% above 52-week low', ref.aboveLow],
        ['Avg turnover (₹ Cr)', ref.turnover], ['Up/down volume ratio', ref.upDown],
        ['% from 50 SMA', ref.from50], ['3M vs benchmark (%)', ref.vsIndex],
      ];
      for (const [title, expected] of pairs) {
        expect(closeSeries(run.plot(title), expected), title).toEqual({ ok: true });
        expect(run.shown(title), title).toEqual({ pane: false, dataWindow: true, statusLine: false });
      }
    });

    it('tabulates the latest bar', async () => {
      const run = await dash.run(stock, {}, { symbols: { [BENCHMARK]: index } });
      const last = 399;
      const pct = (v: Maybe, sign = false) => `${sign && (v as number) >= 0 ? '+' : ''}${(v as number).toFixed(sign ? 1 : 2)}%`;
      const crore = ref.turnover[last] as number;
      const money = crore >= 1
        ? `₹ ${crore.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Cr`
        : `₹ ${(crore * 100).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`;
      expect(run.table()).toEqual([
        ['Swing dashboard', ''],
        ['ADR% (20)', pct(ref.adr[last])],
        ['ATR% (14)', pct(ref.atr[last])],
        ['RVOL (50)', `${(ref.rvol[last] as number).toFixed(2)}×`],
        ['Off 52-week high', pct(ref.offHigh[last], true)],
        ['Above 52-week low', pct(ref.aboveLow[last], true)],
        ['Avg turnover (50)', money],
        ['Up/down volume (50)', (ref.upDown[last] as number).toFixed(2)],
        ['From 50 SMA', pct(ref.from50[last], true)],
        ['3M vs NIFTY', pct(ref.vsIndex[last], true)],
      ]);
    });
  });

  describe('colours that mean something', () => {
    const cellColor = (run: Awaited<ReturnType<PackIndicator['run']>>, name: string) =>
      run.drawings.tables[0].rows.find((row) => row.cells[0].text === name)?.cells[1].color;

    it('greens an ADR above the minimum and mutes one below', async () => {
      const wide = await dash.run(flatRangeBars(60, 100, 105)); // ≈ 5%
      const narrow = await dash.run(flatRangeBars(60, 100, 102)); // 2%
      expect(cellColor(wide, 'ADR% (20)')).toBe('#26a69a');
      expect(cellColor(narrow, 'ADR% (20)')).toBe('#787b86');
      const lowered = await dash.run(flatRangeBars(60, 100, 102), { 'min-adr': 1.5 });
      expect(cellColor(lowered, 'ADR% (20)')).toBe('#26a69a');
    });

    it('flags a volume surge and a volume dry-up apart', async () => {
      const base = Array.from({ length: 60 }, () => ({ open: 100, high: 101, low: 99, close: 100, volume: 1_000 }));
      const surge = await dash.run(barsFrom([...base, { ...base[0], volume: 2_000 }]));
      const dry = await dash.run(barsFrom([...base, { ...base[0], volume: 300 }]));
      const normal = await dash.run(barsFrom([...base, { ...base[0], volume: 1_000 }]));
      const colors = [cellColor(surge, 'RVOL (50)'), cellColor(dry, 'RVOL (50)'), cellColor(normal, 'RVOL (50)')];
      expect(colors[0]).toBe('#f59e0b');
      expect(colors[1]).toBe('#38bdf8');
      expect(colors[2]).toBeUndefined();
    });

    it('greens what a long setup wants and reds what it does not', async () => {
      const rising = pathBars(Array.from({ length: 300 }, (_, i) => 100 + i), 0.5, 5_00_000);
      const falling = pathBars(Array.from({ length: 300 }, (_, i) => 400 - i), 0.5, 1_000);
      const flatIndex = pathBars(Array.from({ length: 300 }, () => 1_000));
      const up = await dash.run(rising, {}, { symbols: { [BENCHMARK]: flatIndex } });
      const down = await dash.run(falling, {}, { symbols: { [BENCHMARK]: flatIndex } });
      for (const name of ['Off 52-week high', 'Above 52-week low', 'Avg turnover (50)', 'From 50 SMA', '3M vs NIFTY']) {
        expect(cellColor(up, name), name).toBe('#26a69a');
        expect(cellColor(down, name), name).toBe('#ef5350');
      }
      // A monotonic run has no reversal day, so the last 50 bars hold volume
      // on only one side of the up/down split — the bullish-extreme (∞) and
      // the all-down (0.00) cases from the "unmistakable bullish extreme" and
      // "volume on up closes against volume on down closes" tests above.
      expect(cellColor(up, 'Up/down volume (50)')).toBe('#26a69a');
      expect(cellColor(down, 'Up/down volume (50)')).toBe('#ef5350');
    });
  });

  it('shows a dash for what it cannot know yet', async () => {
    const run = await dash.run(flatRangeBars(30, 100, 102));
    expect(valueOf(run, 'ADR% (20)')).toBe('2.00%');
    expect(valueOf(run, 'RVOL (50)')).toBe('—');
    expect(valueOf(run, 'Off 52-week high')).toBe('—');
    expect(valueOf(run, '3M vs NIFTY')).toBe('—');
  });

  it('docks where a trader puts it and names the benchmark it compares with', async () => {
    const run = await dash.run(flatRangeBars(60, 100, 102), { position: 'Bottom left' });
    expect(run.drawings.tables[0].placement.zone).toBe('bottom-left');
    expect(dash.manifest.inputs?.find((i) => i.key === 'input@benchmark')).toMatchObject({ default: BENCHMARK });
  });

  // KNOWN LANGUAGE BUG (tracked, being fixed at the root by the coordinator):
  // input.symbol only ever declares its static DEFAULT in requires.symbols —
  // never the runtime setting — so overriding the Benchmark input to anything
  // other than its own default blows up the whole indicator instead of
  // comparing against the chosen index. This pin documents that crash with a
  // genuinely different benchmark and distinct symbol data; once the language
  // fix lands, turn it back into a plain test asserting the '3M vs <name>'
  // row/plot reflects the new benchmark's data (not the default's).
  it.fails('compares against a benchmark the trader actually changes it to', async () => {
    const bankNifty = flatRangeBars(60, 200, 204);
    const run = await dash.run(flatRangeBars(60, 100, 102), { benchmark: 'INDEX:BANKNIFTY' }, {
      symbols: { [BENCHMARK]: flatRangeBars(60, 100, 102), 'INDEX:BANKNIFTY': bankNifty },
    });
    expect(valueOf(run, '3M vs BANKNIFTY')).toBeDefined();
  });

  describe('alerts for the setups the table describes', () => {
    // 60 bars alternating up/down closes (ratio 2, ≥ 1) followed by one dry
    // bar (volume far below the 50-bar average) and then one normal bar.
    // Quiet accumulation = RVOL at or below Volume dry-up at (0.5 default)
    // AND up/down volume at or above 1 — the exact composite listing.json's
    // "How to read it" names ("a volume dry-up near the high, with up/down
    // volume above 1"). RVOL surge = RVOL at or above Volume surge at (1.5).
    const alternating = Array.from({ length: 60 }, (_, i) => ({
      open: 100, high: 101.5, low: 99.5, close: i % 2 === 1 ? 101 : 100, volume: i % 2 === 1 ? 2_000 : 1_000,
    }));
    // Average volume of the alternating window is 1,500.
    const dryBar = { open: 100, high: 101, low: 99, close: 101, volume: 300 }; // RVOL = 300/1,500 = 0.2 ≤ 0.5
    const normalBar = { open: 100, high: 101, low: 99, close: 101, volume: 1_500 }; // RVOL = 1
    const surgeBar = { open: 100, high: 101, low: 99, close: 101, volume: 3_000 }; // RVOL = 2 ≥ 1.5

    it('fires the quiet-accumulation alert only when volume dries up while up/down volume stays at or above 1', async () => {
      const dry = await dash.run(barsFrom([...alternating, dryBar]));
      const normal = await dash.run(barsFrom([...alternating, normalBar]));
      expect(dry.alert('Quiet accumulation').at(-1)).toBe(true);
      expect(normal.alert('Quiet accumulation').at(-1)).toBeFalsy();
    });

    it('fires the volume-surge alert only when RVOL reaches the Volume surge at threshold', async () => {
      const surge = await dash.run(barsFrom([...alternating, surgeBar]));
      const normal = await dash.run(barsFrom([...alternating, normalBar]));
      expect(surge.alert('Volume surge').at(-1)).toBe(true);
      expect(normal.alert('Volume surge').at(-1)).toBeFalsy();
    });
  });
});
