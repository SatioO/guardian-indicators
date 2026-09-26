import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, realisticDaily, closeSeries, zip, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * Klinger Oscillator, as the reference platform's built-in study defines it
 * (fast 34, slow 55, signal 13):
 *
 *   sv     = change(hlc3) >= 0 ? volume : −volume
 *   kvo    = ema(sv, fast) − ema(sv, slow)
 *   signal = ema(kvo, signal)
 *
 * On bar 0 the change is missing and the comparison is false, so the study's
 * own source counts bar 0 as −volume; every later bar is signed by its change
 * (an unchanged hlc3 counts as +volume). ta.ema: alpha = 2 / (length + 1),
 * seeded with the simple average of the first `length` defined values.
 */
function signedVolume(bars: readonly OHLCV[]): number[] {
  const typical = bars.map(({ high, low, close }) => (high + low + close) / 3);
  return bars.map((bar, i) => (i > 0 && typical[i] - typical[i - 1] >= 0 ? bar.volume : -bar.volume));
}

function ema(values: readonly Maybe[], length: number): Maybe[] {
  const alpha = 2 / (length + 1);
  const out: Maybe[] = new Array(values.length).fill(null);
  const seed: number[] = [];
  let prev: number | null = null;
  values.forEach((v, i) => {
    if (v === null) return;
    if (prev === null) {
      seed.push(v);
      if (seed.length === length) prev = seed.reduce((a, b) => a + b, 0) / length;
      else return;
    } else {
      prev = alpha * v + (1 - alpha) * prev;
    }
    out[i] = prev;
  });
  return out;
}

function klinger(bars: readonly OHLCV[], fast: number, slow: number, signalLength: number) {
  const sv = signedVolume(bars);
  const line = zip(ema(sv, fast), ema(sv, slow), (f, s) => f - s);
  const signal = ema(line, signalLength);
  return { line, signal, histogram: zip(line, signal, (l, s) => l - s) };
}

/** Bars where `a` crosses `b`: above now, at or below on the bar before (or the reverse). */
function crosses(a: readonly Maybe[], b: readonly Maybe[], way: 'above' | 'below'): number[] {
  const hits: number[] = [];
  for (let i = 1; i < a.length; i++) {
    const [x, y, px, py] = [a[i], b[i], a[i - 1], b[i - 1]];
    if (x === null || y === null || px === null || py === null) continue;
    if (way === 'above' ? x > y && px <= py : x < y && px >= py) hits.push(i);
  }
  return hits;
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

describe('Klinger Oscillator — signed volume, fast against slow', () => {
  let runtime: PackRuntime;
  let kvo: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    kvo = await runtime.load('klinger-oscillator');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('works out by hand on a steady rise, with bar 0 counted as −volume', async () => {
    // sv = −100, 100, 100, 100, 100. Fast 2 (alpha 2/3) seeds on bar 1 at 0,
    // then 200/3, 800/9, 2,600/27; slow 3 (alpha 1/2) seeds on bar 2 at 100/3,
    // then 200/3, 250/3. KVO = 100/3, 200/9, 350/27; its 2-bar signal seeds on
    // bar 3 at 250/9, then 1,450/81.
    const bars = pathBars([100, 101, 102, 103, 104], 0.5, 100);
    const run = await kvo.run(bars, { 'fast-length': 2, 'slow-length': 3, 'signal-length': 2 });
    const line = run.plot('KVO');
    const signal = run.plot('Signal');
    expect(line.slice(0, 2)).toEqual([null, null]);
    [100 / 3, 200 / 9, 350 / 27].forEach((v, k) => expect(line[2 + k]).toBeCloseTo(v, 10));
    expect(signal.slice(0, 3)).toEqual([null, null, null]);
    expect(signal[3]).toBeCloseTo(250 / 9, 10);
    expect(signal[4]).toBeCloseTo(1_450 / 81, 10);
  });

  it('matches the published definition on a realistic series (34, 55, 13)', async () => {
    const bars = realisticDaily();
    const run = await kvo.run(bars);
    const ref = klinger(bars, 34, 55, 13);
    expect(run.plot('KVO').slice(0, 54)).toEqual(new Array(54).fill(null));
    expect(run.plot('Signal').slice(0, 66)).toEqual(new Array(66).fill(null));
    expect(closeSeries(run.plot('KVO'), ref.line)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Signal'), ref.signal)).toEqual({ ok: true });
  });

  it('exposes each bar\'s signed volume in the Data Window', async () => {
    const bars = realisticDaily();
    const run = await kvo.run(bars);
    expect(run.plot('Signed volume')).toEqual(signedVolume(bars));
    expect(run.shown('Signed volume')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });

  it('follows the lengths a trader sets', async () => {
    const bars = realisticDaily();
    const run = await kvo.run(bars, { 'fast-length': 10, 'slow-length': 30, 'signal-length': 5 });
    const ref = klinger(bars, 10, 30, 5);
    expect(closeSeries(run.plot('KVO'), ref.line)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Signal'), ref.signal)).toEqual({ ok: true });
  });

  it('draws KVO minus its signal as columns, green above zero and red below', async () => {
    const bars = realisticDaily();
    const run = await kvo.run(bars);
    const ref = klinger(bars, 34, 55, 13);
    expect(closeSeries(run.plot('KVO histogram'), ref.histogram)).toEqual({ ok: true });
    expect(run.outputs().find((o) => o.title === 'KVO histogram')?.visual).toBe('columns');
    const colors = run.plotColors('KVO histogram');
    const positive = new Set(ref.histogram.flatMap((v, i) => (v !== null && v > 0 ? [colors[i]] : [])));
    const negative = new Set(ref.histogram.flatMap((v, i) => (v !== null && v < 0 ? [colors[i]] : [])));
    expect(positive.size).toBe(1);
    expect(negative.size).toBe(1);
    expect([...positive][0]).not.toBe([...negative][0]);
    expect(run.level('Zero')).toBe(0);
  });

  it('raises an alert on each cross of the signal line', async () => {
    const bars = realisticDaily();
    const run = await kvo.run(bars);
    const ref = klinger(bars, 34, 55, 13);
    const up = crosses(ref.line, ref.signal, 'above');
    const down = crosses(ref.line, ref.signal, 'below');
    expect(up.length).toBeGreaterThan(0);
    expect(down.length).toBeGreaterThan(0);
    expect(barsWhere(run.alert('KVO crossed above signal'))).toEqual(up);
    expect(barsWhere(run.alert('KVO crossed below signal'))).toEqual(down);
  });
});
