import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, realisticDaily, closeSeries, field, type PackIndicator, type PackRuntime, type Maybe } from 'guardian-gscript-toolchain';

/**
 * Exponential average, alpha = 2 / (length + 1), seeded with the simple
 * average of the first `length` defined values; missing values are skipped
 * (the reference platform's warm-up and na handling).
 */
function ema(values: readonly Maybe[], length: number): Maybe[] {
  const alpha = 2 / (length + 1);
  const out: Maybe[] = [];
  let prev: number | null = null;
  const seed: number[] = [];
  for (const v of values) {
    if (v === null) { out.push(prev); continue; }
    if (prev === null) {
      seed.push(v);
      if (seed.length === length) prev = seed.reduce((a, b) => a + b, 0) / length;
      out.push(prev);
      continue;
    }
    prev = alpha * v + (1 - alpha) * prev;
    out.push(prev);
  }
  return out;
}

/**
 * The reference platform's TRIX (length 18):
 *   out = 10000 * change(ema(ema(ema(log(close), length), length), length))
 * i.e. the bar-to-bar change of a triple-smoothed natural log of the close,
 * in hundredths of a percent.
 */
function trixRef(values: readonly number[], length = 18): Maybe[] {
  const triple = ema(ema(ema(values.map(Math.log), length), length), length);
  return triple.map((v, i) => {
    const prev = i > 0 ? triple[i - 1] : null;
    return v === null || prev === null ? null : 10000 * (v - prev);
  });
}

/** Bars where `a` crosses `b` in `dir` (both defined on this bar and the one before). */
function crosses(a: readonly Maybe[], b: readonly Maybe[], dir: 'above' | 'below'): number[] {
  return a.flatMap((av, i) => {
    const bv = b[i];
    const ap = i > 0 ? a[i - 1] : null;
    const bp = i > 0 ? b[i - 1] : null;
    if (av === null || bv === null || ap === null || bp === null) return [];
    return (dir === 'above' ? av > bv && ap <= bp : av < bv && ap >= bp) ? [i] : [];
  });
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

describe('TRIX — rate of change of a triple-smoothed log price', () => {
  let runtime: PackRuntime;
  let trix: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    trix = await runtime.load('trix');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads 10 on a price compounding 0.1% a bar', async () => {
    // log(close) rises by exactly 0.001 a bar. An EMA seeded with the simple
    // average of a straight line lags it by a constant, so each of the three
    // EMAs is a straight line of the same slope, and 10000 × 0.001 = 10.
    // The EMAs start on bars 17, 34 and 51; their change on bar 52.
    const run = await trix.run(pathBars(Array.from({ length: 80 }, (_, i) => 100 * Math.exp(0.001 * i)), 0.01));
    const values = run.plot('TRIX');
    expect(values.slice(0, 52)).toEqual(new Array(52).fill(null));
    for (const v of values.slice(52)) expect(v).toBeCloseTo(10, 6);
  });

  it('matches the published formula on a realistic series', async () => {
    const bars = realisticDaily();
    const run = await trix.run(bars);
    expect(closeSeries(run.plot('TRIX'), trixRef(field(bars, 'close')))).toEqual({ ok: true });
  });

  it('follows the length a trader sets', async () => {
    const bars = realisticDaily();
    const run = await trix.run(bars, { length: 9 });
    expect(closeSeries(run.plot('TRIX'), trixRef(field(bars, 'close'), 9))).toEqual({ ok: true });
  });

  describe('signal line', () => {
    const bars = realisticDaily();
    const reference = trixRef(field(bars, 'close'));

    it('draws a 9-bar EMA of TRIX by default', async () => {
      const run = await trix.run(bars);
      expect(closeSeries(run.plot('Signal'), ema(reference, 9))).toEqual({ ok: true });
    });

    it('follows the signal length and can be switched off', async () => {
      const longer = await trix.run(bars, { 'signal-length': 15 });
      expect(closeSeries(longer.plot('Signal'), ema(reference, 15))).toEqual({ ok: true });
      const off = await trix.run(bars, { 'show-signal': false });
      expect(off.plot('Signal').every((v) => v === null)).toBe(true);
    });
  });

  describe('signals', () => {
    // A slow wave, so TRIX turns both ways.
    const wave = pathBars(Array.from({ length: 260 }, (_, i) => 200 + 30 * Math.sin(i / 15)), 1);
    const reference = trixRef(field(wave, 'close'));
    const signal = ema(reference, 9);
    const zero = reference.map(() => 0);

    it('alerts when TRIX crosses zero', async () => {
      const run = await trix.run(wave);
      const up = crosses(reference, zero, 'above');
      const down = crosses(reference, zero, 'below');
      expect(up.length).toBeGreaterThan(0);
      expect(down.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('Crossed above zero'))).toEqual(up);
      expect(barsWhere(run.alert('Crossed below zero'))).toEqual(down);
    });

    it('alerts when TRIX crosses its signal line', async () => {
      const run = await trix.run(wave);
      const up = crosses(reference, signal, 'above');
      const down = crosses(reference, signal, 'below');
      expect(up.length).toBeGreaterThan(0);
      expect(down.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('Crossed above signal'))).toEqual(up);
      expect(barsWhere(run.alert('Crossed below signal'))).toEqual(down);
    });

    it('draws the zero line', async () => {
      expect((await trix.run(wave)).level('Zero')).toBe(0);
    });
  });
});
