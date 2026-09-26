import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, realisticDaily, closeSeries, field, sma, type PackIndicator, type PackRuntime, type Maybe } from 'guardian-gscript-toolchain';

/**
 * The reference platform's Moving Average Ribbon: four averages of the close
 * over 20, 50, 100 and 200 bars, SMA by default. The ribbon is shaded bullish
 * when they are stacked 20 > 50 > 100 > 200 and bearish when stacked
 * 20 < 50 < 100 < 200.
 */

/** Exponential average (ta.ema): alpha 2 / (length + 1), seeded with the SMA. */
function ema(values: readonly Maybe[], length: number): Maybe[] {
  const alpha = 2 / (length + 1);
  const out: Maybe[] = new Array(values.length).fill(null);
  let prev: number | null = null;
  let seed = 0;
  values.forEach((v, i) => {
    if (v === null) return;
    if (i + 1 < length) { seed += v; return; }
    prev = prev === null ? (seed + v) / length : alpha * v + (1 - alpha) * prev;
    out[i] = prev;
  });
  return out;
}

const LENGTHS = [20, 50, 100, 200] as const;
const TITLES = ['Fast MA', 'Medium MA', 'Slow MA', 'Long MA'] as const;

/** Per bar: are the four averages strictly ordered, fastest on top (or bottom)? */
function stacked(averages: readonly Maybe[][], order: 'bull' | 'bear'): boolean[] {
  return averages[0].map((_, i) => {
    const row = averages.map((a) => a[i]);
    if (row.some((v) => v === null)) return false;
    const [a, b, c, d] = row as number[];
    return order === 'bull' ? a > b && b > c && c > d : a < b && b < c && c < d;
  });
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

describe('MA Ribbon — four averages and how they stack', () => {
  let runtime: PackRuntime;
  let ribbon: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    ribbon = await runtime.load('ma-ribbon');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  const bars = realisticDaily(400);
  const closes = field(bars, 'close');

  it('draws the 20, 50, 100 and 200-bar simple averages by default', async () => {
    const run = await ribbon.run(bars);
    LENGTHS.forEach((length, k) => {
      expect(closeSeries(run.plot(TITLES[k]), sma(closes, length)), TITLES[k]).toEqual({ ok: true });
    });
  });

  it('switches all four to exponential averages over the lengths the trader sets', async () => {
    const lengths = [10, 30, 60, 120];
    const run = await ribbon.run(bars, {
      type: 'EMA', 'fast-length': 10, 'medium-length': 30, 'slow-length': 60, 'long-length': 120,
    });
    lengths.forEach((length, k) => {
      expect(closeSeries(run.plot(TITLES[k]), ema(closes, length)), TITLES[k]).toEqual({ ok: true });
    });
  });

  describe('stacking', () => {
    // 250 bars rising by 1, then 350 falling by 1. On a straight rise the
    // averages sit in order of length (a 20-bar average trails price by 9.5,
    // a 200-bar one by 99.5), so the bullish stack first forms on bar 199,
    // the first bar the 200-bar average exists.
    const vee = pathBars([
      ...Array.from({ length: 250 }, (_, i) => 100 + i),
      ...Array.from({ length: 350 }, (_, i) => 348 - i),
    ], 0.5);
    const averages = LENGTHS.map((n) => sma(field(vee, 'close'), n));
    const bull = stacked(averages, 'bull');
    const bear = stacked(averages, 'bear');

    it('shades the ribbon green while bullishly stacked and red while bearishly stacked', async () => {
      const run = await ribbon.run(vee);
      expect(bull.indexOf(true)).toBe(199);
      expect(bear.some(Boolean)).toBe(true);
      // Each fill runs from the fast average to a hidden edge that exists only
      // while the ribbon is stacked that way; where the edge is empty, nothing
      // is shaded.
      const titleOf = (key: string) => run.snapshot.outputs.find((o) => o.key === key)?.title;
      const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
      expect(fills.map((f) => [f.style.color, f.dependencies.map(titleOf)])).toEqual([
        ['rgba(38, 166, 154, 0.15)', ['Fast MA', 'Bullish stack edge']],
        ['rgba(239, 83, 80, 0.15)', ['Fast MA', 'Bearish stack edge']],
      ]);
      const long = averages[3];
      expect(closeSeries(run.plot('Bullish stack edge'), long.map((v, i) => (bull[i] ? v : null)))).toEqual({ ok: true });
      expect(closeSeries(run.plot('Bearish stack edge'), long.map((v, i) => (bear[i] ? v : null)))).toEqual({ ok: true });
      expect(run.shown('Bullish stack edge').pane).toBe(false);
      expect(run.shown('Bearish stack edge').pane).toBe(false);
    });

    it('reports the stack in the Data Window: +1 bullish, −1 bearish, 0 mixed', async () => {
      const run = await ribbon.run(vee);
      const expected = bull.map((b, i) => (LENGTHS.some((_, k) => averages[k][i] === null) ? null : b ? 1 : bear[i] ? -1 : 0));
      expect(run.plot('Stack')).toEqual(expected);
      expect(run.shown('Stack')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    });

    it('can leave the ribbon unshaded', async () => {
      const run = await ribbon.run(vee, { shade: false });
      const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
      // Drawn fully transparent: `fill(..., { color: na })` stops the script
      // (reported as a language finding), so "off" is a transparent colour.
      expect(fills.map((f) => f.style.color)).toEqual(['rgba(38, 166, 154, 0)', 'rgba(239, 83, 80, 0)']);
    });

    it('alerts on the bar a bullish or bearish stack forms', async () => {
      const run = await ribbon.run(vee);
      const formed = (flags: boolean[]) => barsWhere(flags.map((f, i) => f && !(flags[i - 1] ?? false)));
      expect(formed(bull)).toEqual([199]);
      expect(formed(bear)).toHaveLength(1);
      expect(barsWhere(run.alert('Bullish stack formed'))).toEqual(formed(bull));
      expect(barsWhere(run.alert('Bearish stack formed'))).toEqual(formed(bear));
    });

    it('alerts on the bar a bullish or bearish stack breaks, not just when the opposite stack forms', async () => {
      const run = await ribbon.run(vee);
      const lost = (flags: boolean[]) => barsWhere(flags.map((f, i) => !f && (flags[i - 1] ?? false)));
      // The bullish stack breaks well before the bearish one forms — a trader
      // who only hears the two "formed" alerts gets no exit signal in between.
      const bullLostBars = lost(bull);
      expect(bullLostBars).toHaveLength(1);
      expect(bullLostBars[0]).toBeLessThan(bear.indexOf(true));
      expect(barsWhere(run.alert('Bullish stack lost'))).toEqual(bullLostBars);
      expect(barsWhere(run.alert('Bearish stack lost'))).toEqual(lost(bear));
    });
  });

  describe('readiness when Long length is not the largest', () => {
    // Long length shorter than Fast/Medium/Slow: the ribbon is only defined
    // (and Stack only meaningful) once ALL four averages exist, not merely
    // the long one — the four length inputs have no ordering constraint.
    const lengths = { fast: 50, medium: 40, slow: 30, long: 5 };
    const bars = realisticDaily(60);
    const closesShort = field(bars, 'close');
    const averages = [lengths.fast, lengths.medium, lengths.slow, lengths.long].map((n) => sma(closesShort, n));

    it('keeps Stack at na until the slowest average (Fast, here) is defined, not just once Long is defined', async () => {
      const run = await ribbon.run(bars, {
        'fast-length': lengths.fast, 'medium-length': lengths.medium, 'slow-length': lengths.slow, 'long-length': lengths.long,
      });
      const fast = run.plot('Fast MA');
      // Sanity: Fast MA (the longest length) is still undefined at bar 48.
      expect(fast[48]).toBeNull();
      const expected = averages[0].map((_, i) => (averages.some((a) => a[i] === null) ? null : 0));
      // Every defined bar here is "mixed" (0): the four SMAs of a realistic
      // daily series over these lengths are not strictly ordered by design of
      // this test, so any non-null value would be wrong if it appeared early.
      const stack = run.plot('Stack');
      // The bug this guards against: Stack reads 0 ("mixed") once only the
      // long average (5 bars) is ready, even though Fast (50 bars) is not.
      expect(stack[48]).toBeNull();
      expect(stack.slice(0, 49)).toEqual(expected.slice(0, 49));
    });
  });
});
