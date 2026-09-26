import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, realisticDaily, closeSeries, gScriptTime, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * Pivot Points Standard, as the reference platform publishes it. Every level
 * comes from the PREVIOUS period's high (H), low (L), close (C) — and its open
 * (O) for DM, or the CURRENT period's open (Oc) for Woodie:
 *
 * Traditional  P = (H+L+C)/3; R1 = 2P−L; S1 = 2P−H; R2 = P+(H−L); S2 = P−(H−L);
 *              R3 = 2P+(H−2L); S3 = 2P−(2H−L); R4 = 3P+(H−3L); S4 = 3P−(3H−L);
 *              R5 = 4P+(H−4L); S5 = 4P−(4H−L)
 * Fibonacci    P as above; R/S1 = P ± 0.382(H−L); R/S2 = P ± 0.618(H−L); R/S3 = P ± (H−L)
 * Woodie       P = (H+L+2·Oc)/4; R1 = 2P−L; S1 = 2P−H; R2 = P+(H−L); S2 = P−(H−L);
 *              R3 = H+2(P−L); S3 = L−2(H−P); R4 = R3+(H−L); S4 = S3−(H−L)
 * Classic      P as Traditional; R/S1 as Traditional; R/S2 = P ± (H−L);
 *              R/S3 = P ± 2(H−L); R/S4 = P ± 3(H−L)
 * DM           X = H+L+2C if O = C, 2H+L+C if C > O, else 2L+H+C;
 *              P = X/4; R1 = X/2 − L; S1 = X/2 − H
 * Camarilla    P as Traditional; R/S1 = C ± 1.1(H−L)/12; R/S2 = C ± 1.1(H−L)/6;
 *              R/S3 = C ± 1.1(H−L)/4; R/S4 = C ± 1.1(H−L)/2; R5 = (H/L)·C; S5 = C − (R5 − C)
 *
 * Periods are IST calendar days, Monday weeks and calendar months. "Auto" picks
 * daily pivots on an intraday chart, weekly on a daily chart and monthly on a
 * weekly chart. Number of pivots back defaults to 15.
 */

const SLOTS = ['P', 'R1', 'S1', 'R2', 'S2', 'R3', 'S3', 'R4', 'S4', 'R5', 'S5'] as const;
type Kind = 'Traditional' | 'Fibonacci' | 'Woodie' | 'Classic' | 'DM' | 'Camarilla';

function pivotLevels(kind: Kind, h: number, l: number, c: number, o: number, currentOpen: number): Record<string, number> {
  const r = h - l;
  if (kind === 'DM') {
    const x = o === c ? h + l + 2 * c : c > o ? 2 * h + l + c : 2 * l + h + c;
    return { P: x / 4, R1: x / 2 - l, S1: x / 2 - h };
  }
  if (kind === 'Woodie') {
    const p = (h + l + 2 * currentOpen) / 4;
    const r3 = h + 2 * (p - l);
    const s3 = l - 2 * (h - p);
    return { P: p, R1: 2 * p - l, S1: 2 * p - h, R2: p + r, S2: p - r, R3: r3, S3: s3, R4: r3 + r, S4: s3 - r };
  }
  const p = (h + l + c) / 3;
  switch (kind) {
    case 'Fibonacci':
      return { P: p, R1: p + 0.382 * r, S1: p - 0.382 * r, R2: p + 0.618 * r, S2: p - 0.618 * r, R3: p + r, S3: p - r };
    case 'Classic':
      return { P: p, R1: 2 * p - l, S1: 2 * p - h, R2: p + r, S2: p - r, R3: p + 2 * r, S3: p - 2 * r, R4: p + 3 * r, S4: p - 3 * r };
    case 'Camarilla': {
      const r5 = (h / l) * c;
      return {
        P: p,
        R1: c + (1.1 * r) / 12, S1: c - (1.1 * r) / 12,
        R2: c + (1.1 * r) / 6, S2: c - (1.1 * r) / 6,
        R3: c + (1.1 * r) / 4, S3: c - (1.1 * r) / 4,
        R4: c + (1.1 * r) / 2, S4: c - (1.1 * r) / 2,
        R5: r5, S5: c - (r5 - c),
      };
    }
    default:
      return {
        P: p, R1: 2 * p - l, S1: 2 * p - h, R2: p + r, S2: p - r,
        R3: 2 * p + (h - 2 * l), S3: 2 * p - (2 * h - l),
        R4: 3 * p + (h - 3 * l), S4: 3 * p - (3 * h - l),
        R5: 4 * p + (h - 4 * l), S5: 4 * p - (4 * h - l),
      };
  }
}

// ── IST calendar ─────────────────────────────────────────────────────────────
const IST = 19_800;
const DAY = 86_400;
const istMidnight = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 1000 - IST;
const dayKey = (t: number) => Math.floor((t + IST) / DAY);
const weekKey = (t: number) => { const d = dayKey(t); return d - ((d + 3) % 7); };
const monthKey = (t: number) => { const w = new Date((t + IST) * 1000); return w.getUTCFullYear() * 12 + w.getUTCMonth(); };
const dayOpen = (t: number) => dayKey(t) * DAY - IST;
const weekOpen = (t: number) => weekKey(t) * DAY - IST;
const monthOpen = (t: number) => { const w = new Date((t + IST) * 1000); return Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), 1) / 1000 - IST; };

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

/** Each chart bar's pivot levels from the period before its own, by plain loop. */
function referencePivots(chart: readonly OHLCV[], keyOf: (t: number) => number, kind: Kind): Record<string, Maybe[]> {
  const periods: { key: number; open: number; high: number; low: number; close: number }[] = [];
  for (const bar of chart) {
    const key = keyOf(bar.time as number);
    const last = periods[periods.length - 1];
    if (last?.key === key) {
      last.high = Math.max(last.high, bar.high);
      last.low = Math.min(last.low, bar.low);
      last.close = bar.close;
    } else {
      periods.push({ key, open: bar.open, high: bar.high, low: bar.low, close: bar.close });
    }
  }
  const out: Record<string, Maybe[]> = Object.fromEntries(SLOTS.map((s) => [s, []]));
  for (const bar of chart) {
    const index = periods.findIndex((p) => p.key === keyOf(bar.time as number));
    const prev = periods[index - 1];
    const levels = prev === undefined ? {} : pivotLevels(kind, prev.high, prev.low, prev.close, prev.open, periods[index].open);
    for (const slot of SLOTS) out[slot].push(levels[slot] ?? null);
  }
  return out;
}

const inr = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Two weeks of sessions, 1–12 January 2024. Week 1: high 110, low 90, close 105.
const twoWeeks = stamp(sessions(2024, 1, 1, 10), [
  { open: 100, high: 104, low: 96, close: 101 },
  { open: 101, high: 110, low: 99, close: 108 },
  { open: 108, high: 109, low: 90, close: 92 },
  { open: 92, high: 100, low: 91, close: 99 },
  { open: 99, high: 106, low: 98, close: 105 },
  { open: 106, high: 108, low: 103, close: 107 },
  { open: 107, high: 109, low: 104, close: 108 },
  { open: 108, high: 111, low: 105, close: 110 },
  { open: 110, high: 112, low: 107, close: 111 },
  { open: 111, high: 113, low: 108, close: 112 },
]);
const twoWeeksData = { timeframe: '1D', timeframes: { W: rollUp(twoWeeks, weekOpen) } };

describe('Pivot Points Standard', () => {
  let runtime: PackRuntime;
  let pivots: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    pivots = await runtime.load('pivot-points');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it("works out last week's traditional pivots on a daily chart, by hand", async () => {
    const run = await pivots.run(twoWeeks, {}, twoWeeksData);
    // H 110, L 90, C 105 → P = 305/3.
    const p = 305 / 3;
    const expected: Record<string, number> = {
      P: p, R1: 2 * p - 90, S1: 2 * p - 110, R2: p + 20, S2: p - 20,
      R3: 2 * p - 70, S3: 2 * p - 130, R4: 145, S4: 65, R5: 4 * p - 250, S5: 4 * p - 350,
    };
    for (const slot of SLOTS) {
      const values = run.plot(slot);
      expect(values.slice(0, 5), slot).toEqual([null, null, null, null, null]);
      for (const v of values.slice(5)) expect(v, slot).toBeCloseTo(expected[slot], 10);
    }
    expect(run.plot('R1')[5]).toBeCloseTo(113.3333333333, 8);
  });

  describe.each(['Traditional', 'Fibonacci', 'Woodie', 'Classic', 'DM', 'Camarilla'] as const)('%s', (kind) => {
    it('matches the published formulas bar for bar', async () => {
      const chart = stamp(sessions(2023, 1, 2, 300), realisticDaily(300, 21));
      const run = await pivots.run(chart, { type: kind }, { timeframe: '1D', timeframes: { W: rollUp(chart, weekOpen) } });
      const ref = referencePivots(chart, weekKey, kind);
      for (const slot of SLOTS) {
        expect(closeSeries(run.plot(slot), ref[slot]), `${kind} ${slot}`).toEqual({ ok: true });
      }
    });
  });

  it('keeps the DM branch on the close against the open of the previous period', async () => {
    // Week 1 closes BELOW its open (open 100, close 92): X = 2L + H + C.
    const down = twoWeeks.map((b, i) => (i === 4 ? { ...b, close: 92 } : b));
    const run = await pivots.run(down, { type: 'DM' }, { timeframe: '1D', timeframes: { W: rollUp(down, weekOpen) } });
    const x = 2 * 90 + 110 + 92;
    expect(run.plot('P')[5]).toBeCloseTo(x / 4, 10);
    expect(run.plot('R1')[5]).toBeCloseTo(x / 2 - 90, 10);
    expect(run.plot('S1')[5]).toBeCloseTo(x / 2 - 110, 10);
    expect(run.plot('R2')[5]).toBeNull();
  });

  it('keeps the DM branch on the close equal to the open of the previous period', async () => {
    // Week 1 closes AT its open (open 100, close 100): X = H + L + 2C.
    const flat = twoWeeks.map((b, i) => (i === 4 ? { ...b, close: 100 } : b));
    const run = await pivots.run(flat, { type: 'DM' }, { timeframe: '1D', timeframes: { W: rollUp(flat, weekOpen) } });
    const x = 110 + 90 + 2 * 100;
    expect(run.plot('P')[5]).toBeCloseTo(x / 4, 10);
    expect(run.plot('R1')[5]).toBeCloseTo(x / 2 - 90, 10);
    expect(run.plot('S1')[5]).toBeCloseTo(x / 2 - 110, 10);
    expect(run.plot('R2')[5]).toBeNull();
  });

  describe('choosing the period', () => {
    it('uses daily pivots on an intraday chart when set to Auto', async () => {
      const times = sessions(2024, 1, 1, 30).flatMap((t) => Array.from({ length: 7 }, (_, k) => t + k * 3600));
      const chart = stamp(times, realisticDaily(times.length, 4));
      const run = await pivots.run(chart, {}, { timeframe: '1H', timeframes: { '1D': rollUp(chart, dayOpen) } });
      const ref = referencePivots(chart, dayKey, 'Traditional');
      expect(closeSeries(run.plot('P'), ref.P)).toEqual({ ok: true });
      expect(closeSeries(run.plot('S3'), ref.S3)).toEqual({ ok: true });
    });

    it('uses monthly pivots on a weekly chart when set to Auto', async () => {
      const days = stamp(sessions(2022, 1, 3, 400), realisticDaily(400, 8));
      const weeks = rollUp(days, weekOpen);
      const run = await pivots.run(weeks, {}, { timeframe: 'W', timeframes: { '1M': rollUp(days, monthOpen) } });
      // A week belongs to the month it opens in; its pivots come from the month before that.
      const months = rollUp(days, monthOpen);
      const expected = weeks.map((w) => {
        const index = months.findIndex((m) => monthKey(m.time as number) === monthKey(w.time as number));
        const prev = months[index - 1];
        return prev === undefined ? null : (prev.high + prev.low + prev.close) / 3;
      });
      expect(closeSeries(run.plot('P'), expected)).toEqual({ ok: true });
    });

    it("holds April's monthly pivots through 31 May, the session that completes May", async () => {
      const days = stamp(sessions(2024, 5, 27, 8), Array.from({ length: 8 }, () => ({ open: 100, high: 101, low: 99, close: 100 })));
      const months = stamp([istMidnight(2024, 4, 1), istMidnight(2024, 5, 1)], [
        { open: 100, high: 130, low: 70, close: 100 }, // April: P = 100
        { open: 100, high: 160, low: 100, close: 130 }, // May: P = 130
      ]);
      const run = await pivots.run(days, { timeframe: 'Monthly' }, { timeframe: '1D', timeframes: { '1M': months } });
      expect(run.plot('P')).toEqual([100, 100, 100, 100, 100, 130, 130, 130]);
    });

    it('draws nothing when the pivot period is not above the chart timeframe', async () => {
      const run = await pivots.run(twoWeeks, { timeframe: 'Daily' }, twoWeeksData);
      expect(run.plot('P').every((v) => v === null)).toBe(true);
      expect(run.drawings.lines).toEqual([]);
      const monthlyChart = await pivots.run(rollUp(twoWeeks, monthOpen), {}, { timeframe: '1M' });
      expect(monthlyChart.plot('P').every((v) => v === null)).toBe(true);
    });

    it('draws nothing until the period data arrives', async () => {
      const run = await pivots.run(twoWeeks);
      expect(run.plot('P').every((v) => v === null)).toBe(true);
      expect(run.drawings.lines).toEqual([]);
      expect(run.drawings.labels).toEqual([]);
    });
  });

  describe('the drawn levels', () => {
    const chart = stamp(sessions(2023, 1, 2, 200), realisticDaily(200, 3));
    const data = { timeframe: '1D', timeframes: { W: rollUp(chart, weekOpen) } };
    /** First bar of each week on the chart, and the bar after the last. */
    const starts = chart.flatMap((b, i) => (i === 0 || weekKey(b.time as number) !== weekKey(chart[i - 1].time as number) ? [i] : []));

    it('draws each of the last 15 weeks as its own segments, a label at the left of each', async () => {
      const run = await pivots.run(chart, {}, data);
      const ref = referencePivots(chart, weekKey, 'Traditional');
      const recent = starts.slice(-15);
      const expected = recent.flatMap((start, k) => {
        const end = k + 1 < recent.length ? recent[k + 1] - 1 : chart.length - 1;
        return SLOTS.map((slot) => ({ x1: start, x2: end, y: ref[slot][start] as number }));
      });
      const lines = run.drawings.lines.map((l) => ({ x1: l.sourceBarIndex1, x2: l.sourceBarIndex2, y: l.price1 }));
      expect(lines).toHaveLength(15 * 11);
      lines.forEach((line, i) => {
        expect(line.x1).toBe(expected[i].x1);
        expect(line.x2).toBe(expected[i].x2);
        expect(line.y).toBeCloseTo(expected[i].y, 9);
      });
      expect(run.drawings.lines.every((l) => l.price1 === l.price2)).toBe(true);
      const labels = run.drawings.labels;
      expect(labels).toHaveLength(15 * 11);
      expect(labels[0]).toMatchObject({ sourceBarIndex: recent[0], text: `P (${inr(ref.P[recent[0]] as number)})` });
      expect(labels[1].text).toBe(`R1 (${inr(ref.R1[recent[0]] as number)})`);
    });

    it('colours the pivot, resistances and supports apart', async () => {
      const run = await pivots.run(chart, {}, data);
      const [p, r1, s1, r2] = run.drawings.lines.slice(0, 4).map((l) => l.color);
      expect(new Set([p, r1, s1]).size).toBe(3);
      expect(r2).toBe(r1);
    });

    it('follows the number of pivots back, and draws only the levels the type has', async () => {
      const run = await pivots.run(chart, { periods: 4, type: 'Fibonacci' }, data);
      expect(run.drawings.lines).toHaveLength(4 * 7);
      const dm = await pivots.run(chart, { periods: 2, type: 'DM' }, data);
      expect(dm.drawings.labels.map((l) => l.text.split(' ')[0])).toEqual(['P', 'R1', 'S1', 'P', 'R1', 'S1']);
    });

    it('can label without prices, or not at all', async () => {
      const noPrices = await pivots.run(chart, { periods: 1, prices: false }, data);
      expect(noPrices.drawings.labels.map((l) => l.text)).toEqual([...SLOTS]);
      const none = await pivots.run(chart, { periods: 1, labels: false }, data);
      expect(none.drawings.labels).toEqual([]);
      expect(none.drawings.lines).toHaveLength(11);
    });
  });

  it('keeps every level in the Data Window only', async () => {
    const run = await pivots.run(twoWeeks, {}, twoWeeksData);
    for (const slot of SLOTS) {
      expect(run.shown(slot)).toEqual({ pane: false, dataWindow: true, statusLine: false });
    }
  });

  it('offers the six types, Traditional first, and Auto first for the period', () => {
    const type = pivots.manifest.inputs?.find((i) => i.key === 'input@type');
    expect(type?.kind === 'select' && type.options.map((o) => o.value))
      .toEqual(['Traditional', 'Fibonacci', 'Woodie', 'Classic', 'DM', 'Camarilla']);
    const period = pivots.manifest.inputs?.find((i) => i.key === 'input@timeframe');
    expect(period?.kind === 'select' && period.options.map((o) => o.value)).toEqual(['Auto', 'Daily', 'Weekly', 'Monthly']);
    expect(pivots.manifest.inputs?.find((i) => i.key === 'input@periods')).toMatchObject({ default: 15 });
  });
});
