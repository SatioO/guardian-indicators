import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, closeSeries, field, sma, chopBars, type PackIndicator, type PackRuntime, type Maybe } from 'guardian-gscript-toolchain';

/*
 * Reference contract — the reference platform's built-in Bollinger Bands %B:
 *
 *   basis = SMA(src, 20)          dev = 2 × stdev(src, 20)
 *   upper = basis + dev           lower = basis − dev
 *   %B    = (src − lower) / (upper − lower)
 *
 * stdev is the POPULATION standard deviation (divide by n), as the built-in's
 * ta.stdev is by default; the sample one (n − 1) would read differently and is
 * checked against below. Source is the close by default. Levels at 1 (upper
 * band), 0.5 (basis) and 0 (lower band), the 0–1 region filled. Nothing is
 * drawn until 20 bars exist, or while the bands have no width.
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

function percentB(src: readonly number[], length: number, mult: number): Maybe[] {
  const basis = sma(src, length);
  const sd = stdevPopulation(src, length);
  return src.map((x, i) => {
    const b = basis[i];
    const s = sd[i];
    if (b === null || s === null || s === 0) return null;
    return (x - (b - mult * s)) / (2 * mult * s);
  });
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

/** A sideways market that pokes through both bands. */
const chop = chopBars({ count: 400, seed: 3, intervalSec: 86_400, startPrice: 500 });

describe('Bollinger %B — where the close sits inside the bands', () => {
  let runtime: PackRuntime;
  let pctB: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    pctB = await runtime.load('bollinger-percent-b');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads 0.75 and 0.25 when the close alternates 100 ↔ 102', async () => {
    // Twenty closes, ten at 100 and ten at 102: basis 101, population
    // deviation exactly 1, bands 99 and 103. A 102 close sits 3/4 of the way
    // up; a 100 close 1/4. (The sample deviation would make them 0.738/0.262.)
    const closes = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 100 : 102));
    const run = await pctB.run(pathBars(closes));
    const values = run.plot('%B');
    expect(values.slice(0, 19)).toEqual(new Array(19).fill(null));
    values.slice(19).forEach((value, k) => {
      expect(value).toBeCloseTo(closes[19 + k] === 102 ? 0.75 : 0.25, 10);
    });
  });

  it('draws nothing while the bands have no width', async () => {
    const run = await pctB.run(pathBars(new Array(30).fill(100)));
    expect(run.plot('%B').every((v) => v === null)).toBe(true);
  });

  it('matches the published formula on a sideways market', async () => {
    const run = await pctB.run(chop);
    expect(closeSeries(run.plot('%B'), percentB(field(chop, 'close'), 20, 2))).toEqual({ ok: true });
  });

  it('follows the Length, StdDev and Source a trader sets', async () => {
    const run = await pctB.run(chop, { length: 10, mult: 1.5, source: 'hl2' });
    const hl2 = chop.map((bar) => (bar.high + bar.low) / 2);
    expect(closeSeries(run.plot('%B'), percentB(hl2, 10, 1.5))).toEqual({ ok: true });
  });

  it('draws the band levels at 1, 0.5 and 0 with the space between the bands filled', async () => {
    const run = await pctB.run(chop);
    expect(run.level('Upper band')).toBe(1);
    expect(run.level('Middle band')).toBe(0.5);
    expect(run.level('Lower band')).toBe(0);
    const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
    expect(fills).toHaveLength(1);
    expect(fills[0].style.color).toBe('rgba(56, 189, 248, 0.1)');
  });

  describe('outside the bands', () => {
    const ref = percentB(field(chop, 'close'), 20, 2);
    const above = ref.flatMap((v, i) => (v !== null && v > 1 ? [i] : []));
    const below = ref.flatMap((v, i) => (v !== null && v < 0 ? [i] : []));
    const inside = ref.flatMap((v, i) => (v !== null && v >= 0 && v <= 1 ? [i] : []));

    it('colours the line above the upper band and below the lower band', async () => {
      const run = await pctB.run(chop);
      const colors = run.plotColors('%B');
      expect([above.length, below.length, inside.length].every((n) => n > 0)).toBe(true);
      const colourOf = (bars: number[]) => new Set(bars.map((i) => colors[i]));
      expect([colourOf(above).size, colourOf(below).size, colourOf(inside).size]).toEqual([1, 1, 1]);
      expect(new Set([colors[above[0]], colors[below[0]], colors[inside[0]]]).size).toBe(3);
    });

    it('raises an alert on the bar the close breaks out of either band', async () => {
      const run = await pctB.run(chop);
      const crossed = (test: (v: number) => boolean) => ref.flatMap((v, i) => {
        const prev = ref[i - 1];
        return v !== null && prev !== null && prev !== undefined && test(v) && !test(prev) ? [i] : [];
      });
      const upBreaks = crossed((v) => v > 1);
      const downBreaks = crossed((v) => v < 0);
      expect(upBreaks.length).toBeGreaterThan(0);
      expect(downBreaks.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('Close above the upper band'))).toEqual(upBreaks);
      expect(barsWhere(run.alert('Close below the lower band'))).toEqual(downBreaks);
    });
  });

  it('does not call the first defined bar a breakout, even when it is outside the band', async () => {
    // Nineteen closes at 100, then 110: the first %B is already above 1 (the
    // upper band is about 104.86), but there is no earlier reading to break from.
    const run = await pctB.run(pathBars([...new Array(19).fill(100), 110, 111]));
    expect(run.plot('%B')[19]).toBeGreaterThan(1);
    expect(barsWhere(run.alert('Close above the upper band'))).toEqual([]);
  });

  it('shows the bands in the Data Window, off the pane', async () => {
    const run = await pctB.run(chop);
    const close = field(chop, 'close');
    const basis = sma(close, 20);
    const sd = stdevPopulation(close, 20);
    const upper = basis.map((b, i) => (b === null || sd[i] === null ? null : b + 2 * sd[i]!));
    expect(closeSeries(run.plot('Upper band (price)'), upper)).toEqual({ ok: true });
    expect(run.shown('Upper band (price)')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    expect(run.shown('Lower band (price)')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });
});
