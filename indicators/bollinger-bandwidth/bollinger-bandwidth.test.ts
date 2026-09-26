import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, closeSeries, sma, type PackIndicator, type PackRuntime, type Maybe, type PackRun } from 'guardian-gscript-toolchain';

/*
 * Reference contract — the reference platform's built-in Bollinger BandWidth:
 *
 *   basis = SMA(src, 20)      dev = 2 × stdev(src, 20)   (population stdev)
 *   BBW   = (upper − lower) / basis × 100                (a percent of the basis)
 *   Highest Expansion  = highest(BBW, 125)
 *   Lowest Contraction = lowest(BBW, 125)
 *
 * The built-in plots BBW × 100, and so does this pack. highest/lowest look at
 * the last 125 bars, skip bars where BBW is not yet defined, and are undefined
 * until 125 bars exist. A squeeze is a bar where BBW is at its Lowest
 * Contraction: the narrowest the bands have been in 125 bars.
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

function bandwidth(src: readonly number[], length: number, mult: number): Maybe[] {
  const basis = sma(src, length);
  const sd = stdevPopulation(src, length);
  return src.map((_, i) => {
    const b = basis[i];
    const s = sd[i];
    return b === null || s === null || b === 0 ? null : ((2 * mult * s) / b) * 100;
  });
}

/** basis, upper and lower bands: the same ta.bb(src, length, mult) family the width is built from. */
function bands(src: readonly number[], length: number, mult: number): { basis: Maybe[]; upper: Maybe[]; lower: Maybe[] } {
  const basis = sma(src, length);
  const sd = stdevPopulation(src, length);
  const upper = basis.map((b, i) => (b === null || sd[i] === null ? null : b + mult * sd[i]!));
  const lower = basis.map((b, i) => (b === null || sd[i] === null ? null : b - mult * sd[i]!));
  return { basis, upper, lower };
}

/** Extreme of the last `length` bars, skipping undefined ones; undefined before bar length − 1. */
function extreme(values: readonly Maybe[], length: number, pick: (a: number, b: number) => number): Maybe[] {
  return values.map((_, i) => {
    if (i + 1 < length) return null;
    let best: number | null = null;
    for (let k = i - length + 1; k <= i; k++) {
      const v = values[k];
      if (v !== null) best = best === null ? v : pick(best, v);
    }
    return best;
  });
}

/** A deterministic random walk whose daily swing size changes over time. */
function walk(count: number, seed: number, swing: (i: number) => number): number[] {
  let s = seed;
  const rnd = () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return s / 0x100000000;
  };
  const closes = [300];
  for (let i = 1; i < count; i++) closes.push(closes[i - 1] * Math.exp((rnd() - 0.5) * swing(i)));
  return closes;
}

/** The price each absolute-location marker sits at, per bar (`null` = no marker). */
function markerPrices(run: PackRun, title: string): Maybe[] {
  const output = run.snapshot.outputs.find((o) => o.title === title && o.kind === 'serial.event');
  if (output?.payload?.kind !== 'serial.event') throw new Error(`no marker '${title}'`);
  const { events } = output.payload;
  const out: Maybe[] = new Array(run.bars.length).fill(null);
  if (events.encoding === 'dense') {
    events.values.forEach((v, i) => { out[i] = typeof v === 'number' ? v : null; });
  } else if (events.encoding === 'sparse') {
    events.barIndexes.forEach((bar, k) => {
      const v = events.values[k];
      out[bar] = typeof v === 'number' ? v : null;
    });
  } else {
    throw new Error(`marker '${title}' carries no prices`);
  }
  return out;
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

// Swings shrink and grow in waves, so the bands squeeze and expand repeatedly.
const closes = walk(600, 21, (i) => 0.012 + 0.03 * Math.abs(Math.sin(i / 60)));
const bars = pathBars(closes, 0.5);

describe('Bollinger BandWidth — how wide the bands are, with squeezes marked', () => {
  let runtime: PackRuntime;
  let bbw: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    bbw = await runtime.load('bollinger-bandwidth');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads 400/101 % when the close alternates 100 ↔ 102', async () => {
    // Basis 101, population deviation exactly 1, so the bands are 4 wide:
    // 4 / 101 × 100.
    const alternating = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 100 : 102));
    const run = await bbw.run(pathBars(alternating));
    const values = run.plot('BBW');
    expect(values.slice(0, 19)).toEqual(new Array(19).fill(null));
    for (const value of values.slice(19)) expect(value).toBeCloseTo(400 / 101, 10);
  });

  const width = bandwidth(closes, 20, 2);

  it('matches the published formula', async () => {
    const run = await bbw.run(bars);
    expect(closeSeries(run.plot('BBW'), width)).toEqual({ ok: true });
  });

  it('follows the Length, StdDev and Source a trader sets', async () => {
    const run = await bbw.run(bars, { length: 10, mult: 1.5, source: 'hlc3' });
    const hlc3 = bars.map((bar) => (bar.high + bar.low + bar.close) / 3);
    expect(closeSeries(run.plot('BBW'), bandwidth(hlc3, 10, 1.5))).toEqual({ ok: true });
  });

  it('exposes the underlying bands’ price levels in the Data Window', async () => {
    const run = await bbw.run(bars);
    const { basis, upper, lower } = bands(closes, 20, 2);
    expect(closeSeries(run.plot('Basis (price)'), basis)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Upper band (price)'), upper)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Lower band (price)'), lower)).toEqual({ ok: true });
    expect(run.shown('Basis (price)')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    expect(run.shown('Upper band (price)')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    expect(run.shown('Lower band (price)')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });

  it('draws the Highest Expansion and Lowest Contraction over the last 125 bars', async () => {
    const run = await bbw.run(bars);
    expect(closeSeries(run.plot('Highest expansion'), extreme(width, 125, Math.max))).toEqual({ ok: true });
    expect(closeSeries(run.plot('Lowest contraction'), extreme(width, 125, Math.min))).toEqual({ ok: true });
  });

  it('follows the expansion and contraction lengths a trader sets', async () => {
    const run = await bbw.run(bars, { 'expansion-length': 60, 'contraction-length': 90 });
    expect(closeSeries(run.plot('Highest expansion'), extreme(width, 60, Math.max))).toEqual({ ok: true });
    expect(closeSeries(run.plot('Lowest contraction'), extreme(width, 90, Math.min))).toEqual({ ok: true });
  });

  describe('squeezes', () => {
    const lowest = extreme(width, 125, Math.min);
    const squeezes = width.flatMap((w, i) => (w !== null && lowest[i] !== null && w <= lowest[i]! ? [i] : []));

    it('marks every bar where the bands are the narrowest in 125 bars', async () => {
      const run = await bbw.run(bars);
      expect(squeezes.length).toBeGreaterThan(0);
      expect(barsWhere(run.markers('Squeeze'))).toEqual(squeezes);
    });

    it('raises the squeeze alert on the same bars', async () => {
      const run = await bbw.run(bars);
      expect(barsWhere(run.alert('Squeeze'))).toEqual(squeezes);
    });

    it('sits the squeeze mark on the BBW line itself', async () => {
      const run = await bbw.run(bars);
      const expected = width.map((w, i) => (squeezes.includes(i) ? w : null));
      expect(closeSeries(markerPrices(run, 'Squeeze'), expected)).toEqual({ ok: true });
    });
  });
});
