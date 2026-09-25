import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, pathBars, realisticDaily, accumulationDistribution, closeSeries, type PackIndicator, type PackRuntime, type Maybe } from 'guardian-gscript-toolchain';

/**
 * Accumulation/Distribution, as the reference platform defines it:
 *
 *   ad = cum(high == low ? 0 : ((close − low) − (high − close)) / (high − low) × volume)
 *
 * The multiplier runs from +1 (close at the high) to −1 (close at the low); a
 * zero-range bar has no close location and adds nothing. Being a cumulative
 * sum from 0, the line reads 0 on any leading zero-range bars.
 * (`accumulationDistribution` from the toolchain’s references is this formula.)
 *
 * The signal line is the platform's ta.ema: alpha = 2 / (length + 1), seeded
 * with the simple average of the first `length` defined values.
 */
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

describe('Accumulation/Distribution — volume weighted by the close within the range', () => {
  let runtime: PackRuntime;
  let ad: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    ad = await runtime.load('accumulation-distribution');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('adds the full volume at the high, subtracts it at the low, and adds nothing on a zero-range bar', async () => {
    const bars = barsFrom([
      { open: 10, high: 12, low: 10, close: 12, volume: 100 }, // close at high: +100
      { open: 12, high: 12, low: 10, close: 10, volume: 50 }, // close at low: −50
      { open: 10, high: 11, low: 9, close: 10, volume: 300 }, // mid-range: 0
      { open: 10, high: 10, low: 10, close: 10, volume: 999 }, // zero range: nothing
      { open: 11, high: 14, low: 10, close: 13, volume: 200 }, // (3 − 1) / 4 = +0.5: +100
    ]);
    expect((await ad.run(bars)).plot('A/D')).toEqual([100, 50, 50, 50, 150]);
  });

  it('matches the published definition on a realistic series', async () => {
    const bars = realisticDaily();
    expect(closeSeries((await ad.run(bars)).plot('A/D'), accumulationDistribution(bars))).toEqual({ ok: true });
  });

  it('smooths the line with a 21-bar exponential signal line by default', async () => {
    const bars = realisticDaily();
    const signal = (await ad.run(bars)).plot('Signal');
    expect(signal.slice(0, 20)).toEqual(new Array(20).fill(null));
    expect(closeSeries(signal, ema(accumulationDistribution(bars), 21))).toEqual({ ok: true });
  });

  it('follows the signal length a trader sets', async () => {
    const bars = realisticDaily();
    const signal = (await ad.run(bars, { 'signal-length': 10 })).plot('Signal');
    expect(closeSeries(signal, ema(accumulationDistribution(bars), 10))).toEqual({ ok: true });
  });

  describe('against its signal', () => {
    // Closes near the high while rising, near the low while falling.
    const swings = pathBars([
      ...Array.from({ length: 40 }, (_, i) => 100 + i),
      ...Array.from({ length: 30 }, (_, i) => 139 - i),
      ...Array.from({ length: 30 }, (_, i) => 110 + i),
    ]);
    const line = accumulationDistribution(swings);
    const signal = ema(line, 21);

    it('colours the line by whether it is above or below the signal', async () => {
      const colors = (await ad.run(swings)).plotColors('A/D');
      const above = line.flatMap((v, i) => (v !== null && signal[i] !== null && v >= (signal[i] as number) ? [i] : []));
      const below = line.flatMap((v, i) => (v !== null && signal[i] !== null && v < (signal[i] as number) ? [i] : []));
      expect(above.length).toBeGreaterThan(0);
      expect(below.length).toBeGreaterThan(0);
      expect(new Set(above.map((i) => colors[i])).size).toBe(1);
      expect(new Set(below.map((i) => colors[i])).size).toBe(1);
      expect(colors[above[0]]).not.toBe(colors[below[0]]);
      expect([colors[above[0]], colors[below[0]]]).not.toContain(colors[0]);
    });

    it('raises an alert on each cross of the signal', async () => {
      const run = await ad.run(swings);
      const up = crosses(line, signal, 'above');
      const down = crosses(line, signal, 'below');
      expect(up.length).toBeGreaterThan(0);
      expect(down.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('A/D crossed above signal'))).toEqual(up);
      expect(barsWhere(run.alert('A/D crossed below signal'))).toEqual(down);
    });
  });

  // Was ta.accdist reading na until the first bar with a range, where the
  // platform's cumulative sum reads 0 from the first bar — fixed in v2.
  it('reads 0, not nothing, on zero-range bars before the first real contribution', async () => {
    const bars = barsFrom([
      { open: 10, high: 10, low: 10, close: 10, volume: 100 },
      { open: 10, high: 10, low: 10, close: 10, volume: 100 },
      { open: 10, high: 12, low: 10, close: 12, volume: 100 },
    ]);
    expect((await ad.run(bars)).plot('A/D')).toEqual(accumulationDistribution(bars)); // [0, 0, 100]
  });
});
