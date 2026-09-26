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
 * The reference platform's True Strength Index study (long 25, short 13,
 * signal 13, source close):
 *   pc     = change(close)
 *   tsi    = 100 * ema(ema(pc, long), short) / ema(ema(abs(pc), long), short)
 *   signal = ema(tsi, signal)
 * The study plots ×100. (The reference language's own ta.tsi function returns
 * the bare ratio in −1..1; G Script's ta.tsi returns the ×100 value.)
 */
function tsiRef(values: readonly number[], long = 25, short = 13, signalLength = 13): { tsi: Maybe[]; signal: Maybe[] } {
  const pc: Maybe[] = values.map((v, i) => (i === 0 ? null : v - values[i - 1]));
  const num = ema(ema(pc, long), short);
  const den = ema(ema(pc.map((c) => (c === null ? null : Math.abs(c))), long), short);
  const tsi = num.map((n, i) => {
    const d = den[i];
    return n === null || d === null || d === 0 ? null : (100 * n) / d;
  });
  return { tsi, signal: ema(tsi, signalLength) };
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

describe('True Strength Index — double-smoothed momentum', () => {
  let runtime: PackRuntime;
  let tsi: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    tsi = await runtime.load('true-strength-index');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads +100 on a steady rise and −100 on a steady fall, on the ×100 scale', async () => {
    // Every change is +1 (or −1), so the smoothed change equals the smoothed
    // absolute change and TSI = 100 × (±1). The change starts on bar 1, the
    // 25-bar EMA of it on bar 25, the 13-bar EMA of that on bar 37; the
    // 13-bar signal EMA of TSI on bar 49.
    const rise = await tsi.run(pathBars(Array.from({ length: 60 }, (_, i) => 100 + i)));
    const values = rise.plot('TSI');
    expect(values.slice(0, 37)).toEqual(new Array(37).fill(null));
    for (const v of values.slice(37)) expect(v).toBeCloseTo(100, 9);
    const signal = rise.plot('Signal');
    expect(signal.slice(0, 49)).toEqual(new Array(49).fill(null));
    for (const v of signal.slice(49)) expect(v).toBeCloseTo(100, 9);

    const fall = await tsi.run(pathBars(Array.from({ length: 60 }, (_, i) => 200 - i)));
    for (const v of fall.plot('TSI').slice(37)) expect(v).toBeCloseTo(-100, 9);
  });

  it('matches the published formula on a realistic series', async () => {
    const bars = realisticDaily();
    const run = await tsi.run(bars);
    const ref = tsiRef(field(bars, 'close'));
    expect(closeSeries(run.plot('TSI'), ref.tsi)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Signal'), ref.signal)).toEqual({ ok: true });
  });

  it('follows the long, short and signal lengths a trader sets', async () => {
    const bars = realisticDaily();
    const run = await tsi.run(bars, { 'long-length': 20, 'short-length': 8, 'signal-length': 5 });
    const ref = tsiRef(field(bars, 'close'), 20, 8, 5);
    expect(closeSeries(run.plot('TSI'), ref.tsi)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Signal'), ref.signal)).toEqual({ ok: true });
  });

  describe('signals', () => {
    const bars = realisticDaily();
    const ref = tsiRef(field(bars, 'close'));
    const zero = new Array<Maybe>(240).fill(0);

    it('alerts when TSI crosses its signal line', async () => {
      const run = await tsi.run(bars);
      const up = crosses(ref.tsi, ref.signal, 'above');
      const down = crosses(ref.tsi, ref.signal, 'below');
      expect(up.length).toBeGreaterThan(0);
      expect(down.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('Crossed above signal'))).toEqual(up);
      expect(barsWhere(run.alert('Crossed below signal'))).toEqual(down);
    });

    it('alerts when TSI crosses zero', async () => {
      // A slow wave, so momentum turns both ways.
      const wave = pathBars(Array.from({ length: 240 }, (_, i) => 200 + 30 * Math.sin(i / 15)), 1);
      const waveRef = tsiRef(field(wave, 'close'));
      const run = await tsi.run(wave);
      const up = crosses(waveRef.tsi, zero, 'above');
      const down = crosses(waveRef.tsi, zero, 'below');
      expect(up.length).toBeGreaterThan(0);
      expect(down.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('Crossed above zero'))).toEqual(up);
      expect(barsWhere(run.alert('Crossed below zero'))).toEqual(down);
    });

    it('draws the zero line and shows TSI minus signal in the Data Window only', async () => {
      const run = await tsi.run(bars);
      expect(run.level('Zero')).toBe(0);
      const spread = ref.tsi.map((t, i) => (t === null || ref.signal[i] === null ? null : t - (ref.signal[i] as number)));
      expect(closeSeries(run.plot('TSI minus signal'), spread)).toEqual({ ok: true });
      expect(run.shown('TSI minus signal')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    });
  });
});
