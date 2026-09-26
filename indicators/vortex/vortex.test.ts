import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, pathBars, realisticDaily, closeSeries, trueRange, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * The reference platform's Vortex Indicator (period 14):
 *   VM+ = |high − low[1]|,  VM− = |low − high[1]|
 *   VI+ = Σ(VM+, n) / Σ(TR, n),  VI− = Σ(VM−, n) / Σ(TR, n)
 * TR is the one-bar ATR, so the first bar's TR is its own high − low. VM± has
 * no value on the first bar (no prior bar), and a sum over a window that holds
 * a missing value is missing, so VI± first appears on bar n.
 */
function vortex(bars: readonly OHLCV[], n: number): { plus: Maybe[]; minus: Maybe[] } {
  const tr = trueRange(bars);
  const plus: Maybe[] = [];
  const minus: Maybe[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < n) { plus.push(null); minus.push(null); continue; }
    let vmPlus = 0;
    let vmMinus = 0;
    let trSum = 0;
    for (let k = i - n + 1; k <= i; k++) {
      vmPlus += Math.abs(bars[k].high - bars[k - 1].low);
      vmMinus += Math.abs(bars[k].low - bars[k - 1].high);
      trSum += tr[k];
    }
    plus.push(vmPlus / trSum);
    minus.push(vmMinus / trSum);
  }
  return { plus, minus };
}

/** Bars where a crossover of `a` above `b` happens: a > b now, a <= b one bar ago. */
function crossings(a: readonly Maybe[], b: readonly Maybe[]): { up: number[]; down: number[] } {
  const up: number[] = [];
  const down: number[] = [];
  for (let i = 1; i < a.length; i++) {
    const [a0, b0, a1, b1] = [a[i], b[i], a[i - 1], b[i - 1]];
    if (a0 === null || b0 === null || a1 === null || b1 === null) continue;
    if (a0 > b0 && a1 <= b1) up.push(i);
    if (a0 < b0 && a1 >= b1) down.push(i);
  }
  return { up, down };
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

/**
 * A steady staircase: each bar sits one point above the last and spans two.
 * VM+ = |high − low[1]| = 3, VM− = |low − high[1]| = 1, TR = 2 on every bar,
 * so VI+ = 3/2 and VI− = 1/2 exactly. Mirrored, it falls.
 */
const staircase = (count: number, dir: 1 | -1, from = 100) =>
  Array.from({ length: count }, (_, k) => {
    const low = from + dir * k;
    return { open: low + 1, high: low + 2, low, close: low + 1 };
  });

/** A market that swings up and down every few weeks, so the lines cross often. */
const swings = pathBars(Array.from({ length: 300 }, (_, i) => 200 + 15 * Math.sin(i / 8) + 3 * Math.sin(i * 1.7)), 1);

describe('Vortex — VI+ and VI−', () => {
  let runtime: PackRuntime;
  let vi: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    vi = await runtime.load('vortex');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('draws VI+ and VI− as the reference defines them, from bar 14', async () => {
    const bars = realisticDaily();
    const run = await vi.run(bars);
    const ref = vortex(bars, 14);
    expect(closeSeries(run.plot('VI+'), ref.plus)).toEqual({ ok: true });
    expect(closeSeries(run.plot('VI−'), ref.minus)).toEqual({ ok: true });
  });

  it('reads VI+ 1.5 and VI− 0.5 on a rising staircase, worked by hand', async () => {
    const run = await vi.run(barsFrom(staircase(30, 1)));
    const plus = run.plot('VI+');
    const minus = run.plot('VI−');
    expect(plus.slice(0, 14)).toEqual(new Array(14).fill(null));
    for (const v of plus.slice(14)) expect(v).toBeCloseTo(1.5, 12);
    for (const v of minus.slice(14)) expect(v).toBeCloseTo(0.5, 12);
  });

  it('follows the Length a trader sets', async () => {
    const bars = realisticDaily();
    const run = await vi.run(bars, { length: 21 });
    const ref = vortex(bars, 21);
    expect(closeSeries(run.plot('VI+'), ref.plus)).toEqual({ ok: true });
    expect(closeSeries(run.plot('VI−'), ref.minus)).toEqual({ ok: true });
  });

  describe('crosses', () => {
    // A rally, then a slide: VI− overtakes VI+ once the slide is under way.
    const turn = barsFrom([...staircase(30, 1), ...staircase(30, -1, 129)]);

    it('raises the bullish and bearish cross alerts on the bars VI+ and VI− cross', async () => {
      const run = await vi.run(swings);
      const ref = vortex(swings, 14);
      const expected = crossings(ref.plus, ref.minus);
      expect(expected.up.length).toBeGreaterThan(2);
      expect(expected.down.length).toBeGreaterThan(2);
      expect(barsWhere(run.alert('Bullish cross'))).toEqual(expected.up);
      expect(barsWhere(run.alert('Bearish cross'))).toEqual(expected.down);
    });

    it('fires the bearish cross once when a rally turns into a slide', async () => {
      const run = await vi.run(turn);
      const ref = vortex(turn, 14);
      const expected = crossings(ref.plus, ref.minus);
      expect(expected.down).toHaveLength(1);
      expect(barsWhere(run.alert('Bearish cross'))).toEqual(expected.down);
      expect(barsWhere(run.alert('Bullish cross'))).toEqual([]);
    });
  });

  describe('how it reads', () => {
    it('marks each cross on the VI+ line, and can leave the marks off', async () => {
      const ref = vortex(swings, 14);
      const expected = crossings(ref.plus, ref.minus);
      const marked = await vi.run(swings);
      expect(barsWhere(marked.markers('Bullish cross mark'))).toEqual(expected.up);
      expect(barsWhere(marked.markers('Bearish cross mark'))).toEqual(expected.down);
      const plain = await vi.run(swings, { marks: false });
      expect(barsWhere(plain.markers('Bullish cross mark'))).toEqual([]);
      expect(barsWhere(plain.markers('Bearish cross mark'))).toEqual([]);
    });

    it('shades between the lines, green while VI+ leads and red while VI− leads', async () => {
      const run = await vi.run(swings);
      const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
      expect(fills.map((o) => o.style.color)).toEqual(['rgba(38, 166, 154, 0.12)', 'rgba(239, 83, 80, 0.12)']);
      const ref = vortex(swings, 14);
      const bull = run.plot('VI+ leading');
      const bear = run.plot('VI− leading');
      ref.plus.forEach((p, i) => {
        const m = ref.minus[i];
        expect(bull[i] !== null).toBe(p !== null && m !== null && p >= m);
        expect(bear[i] !== null).toBe(p !== null && m !== null && p < m);
      });
      expect(run.shown('VI+ leading').pane).toBe(false);
      expect(run.shown('VI− leading').pane).toBe(false);
    });

    it('leaves the pane unshaded when shading is switched off', async () => {
      const run = await vi.run(swings, { shade: false });
      // color: na means "no fill" (nativeRoute.regression.test.ts), so both
      // fills normalize to fully transparent black rather than a tinted zero.
      const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
      expect(fills.map((o) => o.style.color)).toEqual(['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)']);
    });

    it('draws a dashed guide at 1.0', async () => {
      const run = await vi.run(swings);
      expect(run.level('Level 1.0')).toBe(1);
    });

    it('shows the spread between the lines in the Data Window only', async () => {
      const bars = realisticDaily();
      const run = await vi.run(bars);
      const ref = vortex(bars, 14);
      const spread = ref.plus.map((p, i) => (p === null ? null : p - (ref.minus[i] as number)));
      expect(closeSeries(run.plot('VI spread'), spread)).toEqual({ ok: true });
      expect(run.shown('VI spread')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    });
  });
});
