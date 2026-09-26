import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, realisticDaily, closeSeries, sma, gScriptTime, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * A moving average of a HIGHER timeframe drawn on this chart: the average is
 * computed on the other timeframe's own closes, then each chart bar shows the
 * value of the latest higher-timeframe bar that had CLOSED by the time the chart
 * bar closed (no lookahead — the reference platform's lookahead-off rule).
 *
 * EMA — alpha = 2 ÷ (length + 1), seeded with the SMA of the first `length`
 * closes; SMA — mean of the last `length` closes.
 */

const IST = 19_800;
const DAY = 86_400;
const istMidnight = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 1000 - IST;
const dayKey = (t: number) => Math.floor((t + IST) / DAY);
const weekOpen = (t: number) => { const d = dayKey(t); return (d - ((d + 3) % 7)) * DAY - IST; };
const monthOpen = (t: number) => { const w = new Date((t + IST) * 1000); return Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), 1) / 1000 - IST; };
/** When each kind of bucket that `t` opens has closed. */
const dayClose = (t: number) => (dayKey(t) + 1) * DAY - IST;
const weekClose = (t: number) => weekOpen(t) + 7 * DAY;
const monthClose = (t: number) => { const w = new Date((t + IST) * 1000); return Date.UTC(w.getUTCFullYear(), w.getUTCMonth() + 1, 1) / 1000 - IST; };

interface Shape { open: number; high: number; low: number; close: number; volume?: number }
function sessions(y: number, m: number, d: number, count: number): number[] {
  const out: number[] = [];
  for (let t = istMidnight(y, m, d); out.length < count; t += DAY) {
    const weekday = new Date((t + IST) * 1000).getUTCDay();
    if (weekday !== 0 && weekday !== 6) out.push(t + 9 * 3600 + 15 * 60);
  }
  return out;
}
const stamp = (times: readonly number[], shapes: readonly Shape[]): OHLCV[] =>
  shapes.map((s, i) => ({ time: gScriptTime(times[i]), open: s.open, high: s.high, low: s.low, close: s.close, volume: s.volume ?? 1_000 }));
function rollUp(bars: readonly OHLCV[], openOf: (t: number) => number): OHLCV[] {
  const out: OHLCV[] = [];
  for (const bar of bars) {
    const open = openOf(bar.time as number);
    const last = out[out.length - 1];
    if (last && (last.time as number) === open) {
      out[out.length - 1] = { ...last, high: Math.max(last.high, bar.high), low: Math.min(last.low, bar.low), close: bar.close, volume: last.volume + bar.volume };
    } else {
      out.push({ ...bar, time: gScriptTime(open) });
    }
  }
  return out;
}

function ema(values: readonly number[], length: number): Maybe[] {
  const alpha = 2 / (length + 1);
  let prev: number | null = null;
  return values.map((v, i) => {
    if (i + 1 < length) return null;
    if (prev === null) {
      let sum = 0;
      for (let k = i - length + 1; k <= i; k++) sum += values[k];
      prev = sum / length;
    } else {
      prev = alpha * v + (1 - alpha) * prev;
    }
    return prev;
  });
}

/** Higher-timeframe values lined up on chart bars: the latest one closed by each chart bar's close. */
function alignNoLookahead(
  chart: readonly OHLCV[], chartClose: (t: number) => number,
  higher: readonly OHLCV[], higherClose: (t: number) => number, values: readonly Maybe[],
): Maybe[] {
  return chart.map((bar) => {
    let found: Maybe = null;
    higher.forEach((h, j) => { if (higherClose(h.time as number) <= chartClose(bar.time as number)) found = values[j]; });
    return found;
  });
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

describe('Higher Timeframe MA — a weekly or monthly average on a faster chart', () => {
  let runtime: PackRuntime;
  let mtf: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    mtf = await runtime.load('mtf-moving-average');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it("steps to each week's average only once that week has closed, by hand", async () => {
    // Weekly closes 100, 110, 120, 130 (weeks of 1, 8, 15 and 22 Jan 2024);
    // the chart shows the daily sessions of the last two weeks.
    const weeks = stamp([1, 8, 15, 22].map((d) => istMidnight(2024, 1, d)), [100, 110, 120, 130].map((c) => ({ open: c, high: c + 1, low: c - 1, close: c })));
    const days = stamp(sessions(2024, 1, 15, 10), Array.from({ length: 10 }, (_, i) => ({ open: 120 + i, high: 121 + i, low: 119 + i, close: 120 + i })));
    const run = await mtf.run(days, { type: 'SMA', length: 2 }, { timeframe: '1D', timeframes: { W: weeks } });
    // Week of the 15th: the last closed week is the 8th → (100 + 110) ÷ 2.
    // Week of the 22nd: the 15th has closed → (110 + 120) ÷ 2.
    expect(run.plot('Higher-timeframe MA')).toEqual([105, 105, 105, 105, 105, 115, 115, 115, 115, 115]);
  });

  it('computes a 10-week EMA on the weekly closes by default', async () => {
    const days = stamp(sessions(2023, 1, 2, 400), realisticDaily(400, 17));
    const weeks = rollUp(days, weekOpen);
    const run = await mtf.run(days, {}, { timeframe: '1D', timeframes: { W: weeks } });
    const expected = alignNoLookahead(days, dayClose, weeks, weekClose, ema(weeks.map((w) => w.close), 10));
    expect(expected.filter((v) => v !== null).length).toBeGreaterThan(300);
    expect(closeSeries(run.plot('Higher-timeframe MA'), expected)).toEqual({ ok: true });
  });

  it('draws it as a step line', async () => {
    const days = stamp(sessions(2024, 1, 1, 30), realisticDaily(30));
    const run = await mtf.run(days, {}, { timeframe: '1D', timeframes: { W: rollUp(days, weekOpen) } });
    const out = run.snapshot.outputs.find((o) => o.title === 'Higher-timeframe MA');
    expect([out?.visual.type, out?.style.lineType]).toEqual(['line', 'stepped']);
  });

  it('can average the monthly closes instead', async () => {
    const days = stamp(sessions(2021, 1, 4, 700), realisticDaily(700, 2));
    const months = rollUp(days, monthOpen);
    const run = await mtf.run(days, { timeframe: '1M', type: 'SMA', length: 6 }, { timeframe: '1D', timeframes: { '1M': months } });
    const expected = alignNoLookahead(days, dayClose, months, monthClose, sma(months.map((m) => m.close), 6));
    expect(closeSeries(run.plot('Higher-timeframe MA'), expected)).toEqual({ ok: true });
  });

  it('can put a daily average on an intraday chart', async () => {
    const times = sessions(2024, 1, 1, 40).flatMap((t) => Array.from({ length: 7 }, (_, k) => t + k * 3600));
    const hours = stamp(times, realisticDaily(times.length, 6));
    const days = rollUp(hours, (t) => dayKey(t) * DAY - IST);
    const run = await mtf.run(hours, { timeframe: '1D', length: 5 }, { timeframe: '1H', timeframes: { '1D': days } });
    const expected = alignNoLookahead(hours, (t) => t + 3600, days, dayClose, ema(days.map((d) => d.close), 5));
    expect(closeSeries(run.plot('Higher-timeframe MA'), expected)).toEqual({ ok: true });
  });

  describe('a second average', () => {
    const days = stamp(sessions(2022, 1, 3, 600), realisticDaily(600, 9));
    const weeks = rollUp(days, weekOpen);
    const data = { timeframe: '1D', timeframes: { W: weeks } };

    it('is off by default', async () => {
      const run = await mtf.run(days, {}, data);
      expect(run.plot('Second higher-timeframe MA').every((v) => v === null)).toBe(true);
    });

    it('defaults to the 30-week simple average when switched on', async () => {
      const run = await mtf.run(days, { second: true }, data);
      const expected = alignNoLookahead(days, dayClose, weeks, weekClose, sma(weeks.map((w) => w.close), 30));
      expect(closeSeries(run.plot('Second higher-timeframe MA'), expected)).toEqual({ ok: true });
    });
  });

  it('keeps the distance of the close from the average in the Data Window', async () => {
    const days = stamp(sessions(2023, 1, 2, 300), realisticDaily(300, 17));
    const weeks = rollUp(days, weekOpen);
    const run = await mtf.run(days, {}, { timeframe: '1D', timeframes: { W: weeks } });
    const average = alignNoLookahead(days, dayClose, weeks, weekClose, ema(weeks.map((w) => w.close), 10));
    const expected = days.map((d, i) => { const m = average[i]; return m === null ? null : (100 * (d.close - m)) / m; });
    expect(closeSeries(run.plot('Close vs MA (%)'), expected)).toEqual({ ok: true });
    expect(run.shown('Close vs MA (%)')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });

  it('alerts when the close crosses the average', async () => {
    // A market that swings above and below its weekly average every few months.
    const closes = Array.from({ length: 300 }, (_, i) => 200 + 25 * Math.sin(i / 20) + 4 * Math.sin(i / 3));
    const days = stamp(sessions(2023, 1, 2, 300), closes.map((c, i) => {
      const o = i === 0 ? c : closes[i - 1];
      return { open: o, high: Math.max(o, c) + 1, low: Math.min(o, c) - 1, close: c };
    }));
    const weeks = rollUp(days, weekOpen);
    const run = await mtf.run(days, {}, { timeframe: '1D', timeframes: { W: weeks } });
    const average = alignNoLookahead(days, dayClose, weeks, weekClose, ema(weeks.map((w) => w.close), 10));
    const above: number[] = [];
    const below: number[] = [];
    days.forEach((d, i) => {
      const [m, pm] = [average[i], average[i - 1]];
      if (i === 0 || m === null || pm === null) return;
      if (d.close > m && days[i - 1].close <= pm) above.push(i);
      if (d.close < m && days[i - 1].close >= pm) below.push(i);
    });
    expect(above.length).toBeGreaterThan(0);
    expect(below.length).toBeGreaterThan(0);
    expect(barsWhere(run.alert('Crossed above higher-timeframe MA'))).toEqual(above);
    expect(barsWhere(run.alert('Crossed below higher-timeframe MA'))).toEqual(below);
  });

  it('labels the average at the latest bar with its timeframe and length', async () => {
    const days = stamp(sessions(2023, 1, 2, 200), realisticDaily(200, 17));
    const weeks = rollUp(days, weekOpen);
    const run = await mtf.run(days, { second: true }, { timeframe: '1D', timeframes: { W: weeks } });
    expect(run.drawings.labels.map((l) => [l.sourceBarIndex, l.text])).toEqual([
      [199, 'W EMA 10'],
      [199, 'W SMA 30'],
    ]);
    expect(run.drawings.labels[0].y).toBeCloseTo(run.plot('Higher-timeframe MA')[199] as number, 9);
    expect(run.drawings.labels[1].y).toBeCloseTo(run.plot('Second higher-timeframe MA')[199] as number, 9);
    const monthly = await mtf.run(days, { timeframe: '1M', type: 'SMA', length: 3 }, { timeframe: '1D', timeframes: { '1M': rollUp(days, monthOpen) } });
    expect(monthly.drawings.labels.map((l) => l.text)).toEqual(['M SMA 3']);
  });

  it('draws nothing until the higher timeframe arrives', async () => {
    const days = stamp(sessions(2023, 1, 2, 120), realisticDaily(120, 17));
    const run = await mtf.run(days);
    expect(run.plot('Higher-timeframe MA').every((v) => v === null)).toBe(true);
    expect(run.drawings.labels).toEqual([]);
  });

  it('still shows a real, correctly-aligned value when the chosen timeframe is finer than the chart (documented in Limits)', async () => {
    // A weekly chart with Timeframe set to Daily: the "higher" timeframe here
    // is actually finer than the chart, so the line takes the daily average's
    // value as of each week's own close — the same no-lookahead alignment as
    // every other case, just run the other way round.
    const days = stamp(sessions(2023, 1, 2, 60), realisticDaily(60, 17));
    const weeks = rollUp(days, weekOpen);
    const run = await mtf.run(weeks, { timeframe: '1D', type: 'SMA', length: 2 }, { timeframe: 'W', timeframes: { '1D': days } });
    const dailySma = sma(days.map((d) => d.close), 2);
    const expected = alignNoLookahead(weeks, weekClose, days, dayClose, dailySma);
    expect(expected.some((v) => v !== null)).toBe(true);
    expect(closeSeries(run.plot('Higher-timeframe MA'), expected)).toEqual({ ok: true });
  });

  it('offers daily, weekly and monthly, weekly by default', () => {
    const input = mtf.manifest.inputs?.find((i) => i.key === 'input@timeframe');
    expect(input).toMatchObject({ kind: 'select', default: 'W' });
    expect(input?.kind === 'select' && input.options.map((o) => o.value)).toEqual(['1D', 'W', '1M']);
  });
});
