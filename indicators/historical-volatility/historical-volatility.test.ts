import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, closeSeries, field, map, type PackIndicator, type PackRuntime, type Maybe } from 'guardian-gscript-toolchain';

/*
 * Reference contract — the reference platform's built-in Historical Volatility:
 *
 *   r   = ln(close / close[1])                     (undefined on the first bar)
 *   HV  = 100 × stdev(r, 10) × sqrt(periods per year)
 *
 * stdev is the population (biased) standard deviation, as the built-in's
 * ta.stdev is by default. The reference annualises with 365 calendar days on
 * daily and intraday charts; this pack defaults **Days per year** to 252, the
 * Indian trading year, and annualises every bar as one day. Nothing is drawn
 * until `length` returns exist (bar `length`).
 *
 * Extra, from the reference's percent rank: HV rank = the percent of the
 * previous 252 HV values at or below today's, undefined until all 252 exist.
 */

/** Population standard deviation of the last `length` values. */
function stdevPopulation(values: readonly Maybe[], length: number): Maybe[] {
  return values.map((_, i) => {
    if (i + 1 < length) return null;
    const window = values.slice(i - length + 1, i + 1);
    if (window.some((v) => v === null)) return null;
    const xs = window as number[];
    const mean = xs.reduce((a, b) => a + b, 0) / length;
    return Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / length);
  });
}

const logReturns = (closes: readonly number[]): Maybe[] =>
  closes.map((c, i) => (i === 0 ? null : Math.log(c / closes[i - 1])));

function hv(closes: readonly number[], length: number, daysPerYear: number): Maybe[] {
  return map(stdevPopulation(logReturns(closes), length), (s) => 100 * s * Math.sqrt(daysPerYear));
}

/** Percent of the previous `length` values at or below the current one. */
function percentRank(values: readonly Maybe[], length: number): Maybe[] {
  return values.map((v, i) => {
    if (v === null || i < length) return null;
    let count = 0;
    for (let k = 1; k <= length; k++) {
      const prev = values[i - k];
      if (prev === null) return null;
      if (prev <= v) count += 1;
    }
    return (100 * count) / length;
  });
}

/** A deterministic random walk whose daily swings change size over time. */
function walk(count: number, seed: number, swing: (i: number) => number): number[] {
  let s = seed;
  const rnd = () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return s / 0x100000000;
  };
  const closes = [200];
  for (let i = 1; i < count; i++) closes.push(closes[i - 1] * Math.exp((rnd() - 0.5) * swing(i)));
  return closes;
}

describe('Historical Volatility — annualised standard deviation of log returns', () => {
  let runtime: PackRuntime;
  let hvInd: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    hvInd = await runtime.load('historical-volatility');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads 100 · ln(1.1) · √252 when the close alternates 100 ↔ 110', async () => {
    // Log returns alternate +ln 1.1 and −ln 1.1: over ten of them the mean is
    // 0 and the population deviation is exactly ln 1.1 (the sample one would
    // be ln 1.1 · √(10/9)).
    const closes = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 100 : 110));
    const run = await hvInd.run(pathBars(closes));
    const values = run.plot('HV');
    expect(values.slice(0, 10)).toEqual(new Array(10).fill(null));
    for (const value of values.slice(10)) expect(value).toBeCloseTo(100 * Math.log(1.1) * Math.sqrt(252), 9);
  });

  it('reads zero on a stock compounding a steady 1% a day', async () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 * 1.01 ** i);
    const run = await hvInd.run(pathBars(closes));
    for (const value of run.plot('HV').slice(10)) expect(value).toBeCloseTo(0, 9);
  });

  describe('on a realistic random walk', () => {
    const closes = walk(600, 11, (i) => (i < 300 ? 0.04 : 0.015));
    const bars = pathBars(closes, 0.5);

    it('matches the published formula', async () => {
      const run = await hvInd.run(bars);
      expect(closeSeries(run.plot('HV'), hv(field(bars, 'close'), 10, 252))).toEqual({ ok: true });
    });

    it('follows the Length and Days per year a trader sets', async () => {
      const run = await hvInd.run(bars, { length: 21, 'days-per-year': 365 });
      expect(closeSeries(run.plot('HV'), hv(field(bars, 'close'), 21, 365))).toEqual({ ok: true });
    });

    // The walk swings hard for 300 bars and then goes quiet, so HV falls to the
    // bottom of its one-year range soon after bar 300.
    const rank = percentRank(hv(closes, 10, 252), 252);

    it('ranks today\'s HV against the last 252 bars in the Data Window', async () => {
      const run = await hvInd.run(bars);
      expect(closeSeries(run.plot('HV rank'), rank)).toEqual({ ok: true });
      expect(run.plot('HV rank').slice(0, 262).every((v) => v === null)).toBe(true);
      expect(run.shown('HV rank')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    });

    it('colours the line where volatility sits at the bottom or top of its year', async () => {
      const run = await hvInd.run(bars);
      const colors = run.plotColors('HV');
      const low = rank.flatMap((r, i) => (r !== null && r <= 10 ? [i] : []));
      const high = rank.flatMap((r, i) => (r !== null && r >= 90 ? [i] : []));
      const middle = rank.flatMap((r, i) => (r !== null && r > 10 && r < 90 ? [i] : []));
      expect([low.length, high.length, middle.length].every((n) => n > 0)).toBe(true);
      const colourOf = (bars: number[]) => new Set(bars.map((i) => colors[i]));
      expect(colourOf(low).size).toBe(1);
      expect(colourOf(high).size).toBe(1);
      expect(colourOf(middle).size).toBe(1);
      expect(new Set([colors[low[0]], colors[high[0]], colors[middle[0]]]).size).toBe(3);
    });

    it('raises the low-volatility alert on the bar HV rank first drops to 10 or below', async () => {
      const run = await hvInd.run(bars);
      const expected = rank.flatMap((r, i) => {
        const prev = rank[i - 1];
        return r !== null && prev !== null && prev !== undefined && r <= 10 && prev > 10 ? [i] : [];
      });
      expect(expected.length).toBeGreaterThan(0);
      expect(run.alert('Volatility at a yearly low').flatMap((hit, bar) => (hit ? [bar] : []))).toEqual(expected);
    });

    it('raises the high-volatility alert on the bar HV rank first rises to 90 or above', async () => {
      const run = await hvInd.run(bars);
      const expected = rank.flatMap((r, i) => {
        const prev = rank[i - 1];
        return r !== null && prev !== null && prev !== undefined && r >= 90 && prev < 90 ? [i] : [];
      });
      expect(expected.length).toBeGreaterThan(0);
      expect(run.alert('Volatility at a yearly high').flatMap((hit, bar) => (hit ? [bar] : []))).toEqual(expected);
    });
  });

  it('defaults Days per year to the 252-day Indian trading year', () => {
    const days = hvInd.manifest.inputs?.find((i) => i.key === 'input@days-per-year');
    expect(days).toMatchObject({ default: 252 });
  });
});
