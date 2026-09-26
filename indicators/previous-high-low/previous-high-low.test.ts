import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, realisticDaily, closeSeries, gScriptTime, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * Previous-period levels, as every swing and intraday trader draws them:
 * the high, low (and, for the day, close) of the last COMPLETED day, week and
 * month, held flat through the whole of the current one. Periods are IST
 * calendar days, Monday-to-Sunday weeks and calendar months.
 *
 * On a chart of the same timeframe the previous period is simply the previous
 * bar; on a higher timeframe than the level it is not drawn.
 */

const IST = 19_800;
const DAY = 86_400;

/** Seconds of 00:00 IST on a calendar date. */
const istMidnight = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 1000 - IST;
const istDayIndex = (t: number) => Math.floor((t + IST) / DAY);
const weekKey = (t: number) => { const d = istDayIndex(t); return d - ((d + 3) % 7); };
const monthKey = (t: number) => { const w = new Date((t + IST) * 1000); return w.getUTCFullYear() * 12 + w.getUTCMonth(); };
const weekOpen = (t: number) => weekKey(t) * DAY - IST;
const monthOpen = (t: number) => { const w = new Date((t + IST) * 1000); return Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), 1) / 1000 - IST; };
const dayOpen = (t: number) => istDayIndex(t) * DAY - IST;

interface Shape { open: number; high: number; low: number; close: number; volume?: number }

/** Weekday sessions from a calendar date, one shape per session, stamped at 09:15 IST. */
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

/** Hourly bars (09:15 … 15:15 IST, seven a session) for the given sessions. */
function hourly(sessionTimes: readonly number[], shapes: readonly Shape[]): OHLCV[] {
  const times = sessionTimes.flatMap((t) => Array.from({ length: 7 }, (_, k) => t + k * 3600));
  return stamp(times, shapes);
}

/** Roll bars up into calendar buckets stamped at each bucket's open. */
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

/** The previous completed period's field, per chart bar, by plain loop. */
function previousPeriod(chart: readonly OHLCV[], keyOf: (t: number) => number, key: 'high' | 'low' | 'close'): Maybe[] {
  const order: number[] = [];
  const rolled = new Map<number, { high: number; low: number; close: number }>();
  for (const bar of chart) {
    const k = keyOf(bar.time as number);
    const cur = rolled.get(k);
    if (cur === undefined) {
      rolled.set(k, { high: bar.high, low: bar.low, close: bar.close });
      order.push(k);
    } else {
      cur.high = Math.max(cur.high, bar.high);
      cur.low = Math.min(cur.low, bar.low);
      cur.close = bar.close;
    }
  }
  return chart.map((bar) => {
    const index = order.indexOf(keyOf(bar.time as number));
    return index <= 0 ? null : rolled.get(order[index - 1])![key];
  });
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

const inr = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Three sessions of hourly bars, Mon 3 – Wed 5 June 2024.
//  Day 1: high 110, low 95, close 100.
//  Day 2: dips to 94 on its 3rd bar (first break under 95) and reaches 112 on
//         its 4th (first break over 110); high 112, low 94, close 105.
//  Day 3: opens on a gap, trading 113 on its first bar (a break over 112).
const hl = (highs: number[], lows: number[], lastClose: number): Shape[] =>
  highs.map((h, k) => ({ open: (h + lows[k]) / 2, high: h, low: lows[k], close: k === highs.length - 1 ? lastClose : (h + lows[k]) / 2 }));
const threeDays = hourly(sessions(2024, 6, 3, 3), [
  ...hl([101, 103, 110, 104, 102, 101, 100], [99, 97, 95, 98, 99, 98, 99], 100),
  ...hl([104, 108, 109, 112, 111, 107, 106], [98, 96, 94, 97, 99, 100, 101], 105),
  ...hl([113, 115, 111, 110, 111, 112, 113], [104, 108, 107, 106, 107, 108, 109], 110),
]);
// The week before (27–31 May) and the months before, as a provider serves them.
const priorWeek = stamp([istMidnight(2024, 5, 27)], [{ open: 100, high: 120, low: 90, close: 100 }]);
const thisWeek = stamp([istMidnight(2024, 6, 3)], [{ open: 100, high: 115, low: 94, close: 110 }]);
const priorMonths = stamp([istMidnight(2024, 4, 1), istMidnight(2024, 5, 1)], [
  { open: 100, high: 500, low: 50, close: 100 },
  { open: 100, high: 600, low: 60, close: 100 },
]);
const intradayData = {
  timeframe: '1H',
  timeframes: { '1D': rollUp(threeDays, dayOpen), W: [...priorWeek, ...thisWeek], '1M': priorMonths },
};

describe('Previous High and Low — last day, week and month levels', () => {
  let runtime: PackRuntime;
  let levels: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    levels = await runtime.load('previous-high-low');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it("holds the previous day's high, low and close through the whole next session", async () => {
    const run = await levels.run(threeDays, {}, intradayData);
    const seven = (v: number | null) => new Array(7).fill(v);
    expect(run.plot('Previous day high')).toEqual([...seven(null), ...seven(110), ...seven(112)]);
    expect(run.plot('Previous day low')).toEqual([...seven(null), ...seven(95), ...seven(94)]);
    expect(run.plot('Previous day close')).toEqual([...seven(null), ...seven(100), ...seven(105)]);
  });

  it("draws last week's and last month's range on an intraday chart", async () => {
    const run = await levels.run(threeDays, {}, intradayData);
    expect(run.plot('Previous week high')).toEqual(new Array(21).fill(120));
    expect(run.plot('Previous week low')).toEqual(new Array(21).fill(90));
    expect(run.plot('Previous month high')).toEqual(new Array(21).fill(600));
    expect(run.plot('Previous month low')).toEqual(new Array(21).fill(60));
  });

  it('draws them as step lines', async () => {
    const run = await levels.run(threeDays, {}, intradayData);
    const lines = run.snapshot.outputs.filter((o) => o.title.startsWith('Previous') && o.kind === 'serial.numeric');
    expect(lines.map((o) => [o.visual.type, o.style.lineType])).toEqual(new Array(7).fill(['line', 'stepped']));
  });

  it("alerts the first break of the previous day's high and low in a session", async () => {
    const run = await levels.run(threeDays, {}, intradayData);
    expect(barsWhere(run.alert('Broke previous day high'))).toEqual([10, 14]);
    expect(barsWhere(run.alert('Broke previous day low'))).toEqual([9]);
    expect(barsWhere(run.markers('Previous day high break'))).toEqual([10, 14]);
    expect(barsWhere(run.markers('Previous day low break'))).toEqual([9]);
  });

  it('labels each level at the latest bar with its price', async () => {
    const run = await levels.run(threeDays, {}, intradayData);
    const labels = run.drawings.labels.map((l) => ({ bar: l.sourceBarIndex, y: l.y, text: l.text }));
    expect(labels).toEqual([
      { bar: 20, y: 112, text: `PDH ${inr(112)}` },
      { bar: 20, y: 94, text: `PDL ${inr(94)}` },
      { bar: 20, y: 105, text: `PDC ${inr(105)}` },
      { bar: 20, y: 120, text: `PWH ${inr(120)}` },
      { bar: 20, y: 90, text: `PWL ${inr(90)}` },
      { bar: 20, y: 600, text: `PMH ${inr(600)}` },
      { bar: 20, y: 60, text: `PML ${inr(60)}` },
    ]);
  });

  it('groups a large price the Indian way', async () => {
    const big = threeDays.map((b) => ({ ...b, open: b.open * 1250, high: b.high * 1250, low: b.low * 1250, close: b.close * 1250 }));
    const run = await levels.run(big, { week: false, month: false }, { timeframe: '1H', timeframes: { '1D': rollUp(big, dayOpen) } });
    expect(run.drawings.labels.map((l) => l.text)).toEqual(['PDH 1,40,000.00', 'PDL 1,17,500.00', 'PDC 1,31,250.00']);
  });

  it('hides what a trader switches off', async () => {
    const run = await levels.run(threeDays, { day: false, 'day-close': false, month: false, labels: false }, intradayData);
    for (const title of ['Previous day high', 'Previous day low', 'Previous day close', 'Previous month high', 'Previous month low']) {
      expect(run.plot(title).every((v) => v === null)).toBe(true);
    }
    expect(run.plot('Previous week high')[0]).toBe(120);
    expect(run.drawings.labels).toEqual([]);
    expect(barsWhere(run.markers('Previous day high break'))).toEqual([]);
    // The alert for the same break follows the marker's own gating: with
    // Previous day high/low off, there is nothing to alert on either.
    expect(barsWhere(run.alert('Broke previous day high'))).toEqual([]);
    expect(barsWhere(run.alert('Broke previous day low'))).toEqual([]);
  });

  it('draws nothing for a period whose data has not arrived', async () => {
    const run = await levels.run(threeDays, {}, { timeframe: '1H' });
    expect(run.plot('Previous day high').every((v) => v === null)).toBe(true);
    expect(run.plot('Previous week high').every((v) => v === null)).toBe(true);
    expect(run.drawings.labels).toEqual([]);
  });

  describe('on a daily chart', () => {
    // Mon 27 May – Wed 5 June 2024. May closes on Friday the 31st, so the
    // 31 May session is the one that completes the month.
    const days = stamp(sessions(2024, 5, 27, 8), [
      { open: 100, high: 110, low: 90, close: 100 },
      { open: 100, high: 111, low: 91, close: 101 },
      { open: 100, high: 112, low: 92, close: 102 },
      { open: 100, high: 113, low: 93, close: 103 },
      { open: 100, high: 114, low: 94, close: 104 },
      { open: 100, high: 115, low: 95, close: 105 },
      { open: 100, high: 116, low: 96, close: 106 },
      { open: 100, high: 117, low: 97, close: 107 },
    ]);
    const weeks = stamp([istMidnight(2024, 5, 20), istMidnight(2024, 5, 27), istMidnight(2024, 6, 3)], [
      { open: 100, high: 300, low: 30, close: 100 },
      { open: 100, high: 400, low: 40, close: 100 },
      { open: 100, high: 450, low: 45, close: 100 },
    ]);
    const daily = { timeframe: '1D', timeframes: { W: weeks, '1M': priorMonths } };

    it("reads the previous day as yesterday's bar", async () => {
      const run = await levels.run(days, {}, daily);
      expect(run.plot('Previous day high')).toEqual([null, 110, 111, 112, 113, 114, 115, 116]);
      expect(run.plot('Previous day close')).toEqual([null, 100, 101, 102, 103, 104, 105, 106]);
    });

    it('switches the week at Monday and the month at the first session of June', async () => {
      const run = await levels.run(days, {}, daily);
      expect(run.plot('Previous week high')).toEqual([300, 300, 300, 300, 300, 400, 400, 400]);
      // 31 May completes May, but May is still the CURRENT month on that bar:
      // the previous month stays April until June begins.
      expect(run.plot('Previous month high')).toEqual([500, 500, 500, 500, 500, 600, 600, 600]);
    });

    it('takes out yesterday on a daily chart: a higher high breaks it', async () => {
      const run = await levels.run(days, {}, daily);
      expect(barsWhere(run.alert('Broke previous day high'))).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(barsWhere(run.alert('Broke previous day low'))).toEqual([]);
    });
  });

  it('on a weekly chart draws last week and last month, and no daily levels', async () => {
    const weekTimes = [istMidnight(2024, 1, 15), istMidnight(2024, 1, 22), istMidnight(2024, 1, 29), istMidnight(2024, 2, 5)];
    const weeks = stamp(weekTimes, [
      { open: 10, high: 20, low: 5, close: 12 },
      { open: 12, high: 22, low: 6, close: 13 },
      { open: 13, high: 24, low: 7, close: 14 },
      { open: 14, high: 26, low: 8, close: 15 },
    ]);
    const months = stamp([istMidnight(2023, 12, 1), istMidnight(2024, 1, 1)], [
      { open: 10, high: 30, low: 3, close: 12 },
      { open: 12, high: 40, low: 4, close: 13 },
    ]);
    const run = await levels.run(weeks, {}, { timeframe: 'W', timeframes: { '1M': months } });
    expect(run.plot('Previous day high').every((v) => v === null)).toBe(true);
    expect(run.plot('Previous week high')).toEqual([null, 20, 22, 24]);
    // The week opening 29 January belongs to January; February starts on the 5th.
    expect(run.plot('Previous month high')).toEqual([30, 30, 30, 40]);
  });

  describe('against the definition on three months of hourly bars', () => {
    const shapes = realisticDaily(7 * 60, 13);
    const chart = hourly(sessions(2024, 1, 1, 60), shapes);
    const data = {
      timeframe: '1H',
      timeframes: { '1D': rollUp(chart, dayOpen), W: rollUp(chart, weekOpen), '1M': rollUp(chart, monthOpen) },
    };

    it('matches every level bar for bar', async () => {
      const run = await levels.run(chart, {}, data);
      const check = (title: string, keyOf: (t: number) => number, field: 'high' | 'low' | 'close') =>
        expect(closeSeries(run.plot(title), previousPeriod(chart, keyOf, field)), title).toEqual({ ok: true });
      check('Previous day high', istDayIndex, 'high');
      check('Previous day low', istDayIndex, 'low');
      check('Previous day close', istDayIndex, 'close');
      check('Previous week high', weekKey, 'high');
      check('Previous week low', weekKey, 'low');
      check('Previous month high', monthKey, 'high');
      check('Previous month low', monthKey, 'low');
    });

    it('alerts the first trade through the previous day high in each session', async () => {
      const run = await levels.run(chart, {}, data);
      const pdh = previousPeriod(chart, istDayIndex, 'high');
      const expected: number[] = [];
      let sessionHigh = -Infinity;
      chart.forEach((bar, i) => {
        if (i === 0 || istDayIndex(bar.time as number) !== istDayIndex(chart[i - 1].time as number)) sessionHigh = -Infinity;
        const level = pdh[i];
        if (level !== null && bar.high > level && sessionHigh <= level) expected.push(i);
        sessionHigh = Math.max(sessionHigh, bar.high);
      });
      expect(expected.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('Broke previous day high'))).toEqual(expected);
    });
  });
});
