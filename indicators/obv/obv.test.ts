import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, pathBars, realisticDaily, closeSeries, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * On Balance Volume, as the reference platform defines it:
 *
 *   obv = cum(sign(change(close)) × volume)
 *
 * A bar that closes above the previous close adds its volume, one that closes
 * below subtracts it, and an unchanged close adds nothing. Bar 0 has no
 * previous close, so its change is missing and adds nothing: the line starts
 * at 0 on the first bar (ta.obv's convention, and the platform's cumulative
 * sum over a missing first term).
 *
 * The signal line is the platform's ta.ema: alpha = 2 / (length + 1), seeded
 * with the simple average of the first `length` defined values.
 */
function onBalanceVolume(bars: readonly OHLCV[]): number[] {
  let total = 0;
  return bars.map((bar, i) => {
    if (i > 0) {
      const prev = bars[i - 1].close;
      if (bar.close > prev) total += bar.volume;
      else if (bar.close < prev) total -= bar.volume;
    }
    return total;
  });
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

describe('On Balance Volume — running volume by close direction', () => {
  let runtime: PackRuntime;
  let obv: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    obv = await runtime.load('obv');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('adds up-close volume, subtracts down-close volume and ignores unchanged closes', async () => {
    // closes 10 → 11 (+100) → 11 (flat, 200 ignored) → 10 (−300) → 12 (+400) → 12 (flat) → 9 (−600)
    const bars = barsFrom([
      { open: 10, high: 10.5, low: 9.5, close: 10, volume: 500 },
      { open: 10, high: 11.5, low: 9.5, close: 11, volume: 100 },
      { open: 11, high: 11.5, low: 10.5, close: 11, volume: 200 },
      { open: 11, high: 11.5, low: 9.5, close: 10, volume: 300 },
      { open: 10, high: 12.5, low: 9.5, close: 12, volume: 400 },
      { open: 12, high: 12.5, low: 11.5, close: 12, volume: 50 },
      { open: 12, high: 12.5, low: 8.5, close: 9, volume: 600 },
    ]);
    expect((await obv.run(bars)).plot('OBV')).toEqual([0, 100, 100, -200, 200, 200, -400]);
  });

  it('matches the published definition on a realistic series', async () => {
    const bars = realisticDaily();
    expect(closeSeries((await obv.run(bars)).plot('OBV'), onBalanceVolume(bars))).toEqual({ ok: true });
  });

  it('smooths OBV with a 21-bar exponential signal line by default', async () => {
    const bars = realisticDaily();
    const signal = (await obv.run(bars)).plot('Signal');
    expect(signal.slice(0, 20)).toEqual(new Array(20).fill(null));
    expect(closeSeries(signal, ema(onBalanceVolume(bars), 21))).toEqual({ ok: true });
  });

  it('follows the signal length a trader sets', async () => {
    const bars = realisticDaily();
    const signal = (await obv.run(bars, { 'signal-length': 9 })).plot('Signal');
    expect(closeSeries(signal, ema(onBalanceVolume(bars), 9))).toEqual({ ok: true });
  });

  describe('against its signal', () => {
    // Rally, slide, rally again: OBV crosses its signal both ways.
    const swings = pathBars([
      ...Array.from({ length: 40 }, (_, i) => 100 + i),
      ...Array.from({ length: 30 }, (_, i) => 139 - i),
      ...Array.from({ length: 30 }, (_, i) => 110 + i),
    ]);
    const line = onBalanceVolume(swings);
    const signal = ema(line, 21);

    it('colours OBV by whether it is above or below the signal', async () => {
      const run = await obv.run(swings);
      const colors = run.plotColors('OBV');
      const above = line.flatMap((v, i) => (signal[i] !== null && v >= (signal[i] as number) ? [i] : []));
      const below = line.flatMap((v, i) => (signal[i] !== null && v < (signal[i] as number) ? [i] : []));
      expect(above.length).toBeGreaterThan(0);
      expect(below.length).toBeGreaterThan(0);
      expect(new Set(above.map((i) => colors[i])).size).toBe(1);
      expect(new Set(below.map((i) => colors[i])).size).toBe(1);
      expect(colors[above[0]]).not.toBe(colors[below[0]]);
      // Before the signal exists the line keeps a neutral colour of its own.
      expect([colors[above[0]], colors[below[0]]]).not.toContain(colors[0]);
    });

    it('raises an alert on each cross, once, on the bar it happens', async () => {
      const run = await obv.run(swings);
      const up = crosses(line, signal, 'above');
      const down = crosses(line, signal, 'below');
      expect(up.length).toBeGreaterThan(0);
      expect(down.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('OBV crossed above signal'))).toEqual(up);
      expect(barsWhere(run.alert('OBV crossed below signal'))).toEqual(down);
    });
  });
});
