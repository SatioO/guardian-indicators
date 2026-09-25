import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, realisticDaily, closeSeries, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * Elder Force Index, as the reference platform defines it (length 13):
 *
 *   force = change(close) × volume
 *   efi   = ema(force, length)
 *
 * ta.ema: alpha = 2 / (length + 1), seeded with the simple average of the
 * first `length` defined values. Bar 0 has no change, so the first force is
 * on bar 1 and the first EFI on bar `length`.
 */
function forceIndex(bars: readonly OHLCV[]): Maybe[] {
  return bars.map((bar, i) => (i === 0 ? null : (bar.close - bars[i - 1].close) * bar.volume));
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

/** Bars where `values` crosses zero: above now, at or below on the bar before (or the reverse). */
function zeroCrosses(values: readonly Maybe[], way: 'above' | 'below'): number[] {
  const hits: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const [x, px] = [values[i], values[i - 1]];
    if (x === null || px === null) continue;
    if (way === 'above' ? x > 0 && px <= 0 : x < 0 && px >= 0) hits.push(i);
  }
  return hits;
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

describe('Elder Force Index — price change times volume, smoothed', () => {
  let runtime: PackRuntime;
  let efi: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    efi = await runtime.load('elder-force-index');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads 1,000 when every bar rises ₹1 on 1,000 shares, from bar 13', async () => {
    const bars = pathBars(Array.from({ length: 30 }, (_, i) => 100 + i), 0.5, 1_000);
    const values = (await efi.run(bars)).plot('EFI');
    expect(values.slice(0, 13)).toEqual(new Array(13).fill(null));
    for (const value of values.slice(13)) expect(value).toBeCloseTo(1_000, 9);
  });

  it('matches the published definition on a realistic series', async () => {
    const bars = realisticDaily();
    expect(closeSeries((await efi.run(bars)).plot('EFI'), ema(forceIndex(bars), 13))).toEqual({ ok: true });
  });

  it('follows the length a trader sets', async () => {
    const bars = realisticDaily();
    expect(closeSeries((await efi.run(bars, { length: 2 })).plot('EFI'), ema(forceIndex(bars), 2))).toEqual({ ok: true });
  });

  it('shows the one-bar force in the Data Window, off the pane', async () => {
    const bars = realisticDaily();
    const run = await efi.run(bars);
    expect(closeSeries(run.plot('Force (1 bar)'), forceIndex(bars))).toEqual({ ok: true });
    expect(run.shown('Force (1 bar)')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });

  it('draws a zero line', async () => {
    expect((await efi.run(realisticDaily(40))).level('Zero')).toBe(0);
  });

  describe('bulls and bears', () => {
    const swings = pathBars([
      ...Array.from({ length: 40 }, (_, i) => 100 + i),
      ...Array.from({ length: 40 }, (_, i) => 139 - i),
      ...Array.from({ length: 40 }, (_, i) => 100 + i),
    ]);
    const ref = ema(forceIndex(swings), 13);

    it('colours the line green above zero and red below', async () => {
      const colors = (await efi.run(swings)).plotColors('EFI');
      const positive = new Set(ref.flatMap((v, i) => (v !== null && v > 0 ? [colors[i]] : [])));
      const negative = new Set(ref.flatMap((v, i) => (v !== null && v < 0 ? [colors[i]] : [])));
      expect([...positive]).toEqual(['#26a69a']);
      expect([...negative]).toEqual(['#ef5350']);
    });

    it('raises the zero-cross alerts on the bars EFI changes sign', async () => {
      const run = await efi.run(swings);
      const up = zeroCrosses(ref, 'above');
      const down = zeroCrosses(ref, 'below');
      expect(up.length).toBeGreaterThan(0);
      expect(down.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('EFI crossed above zero'))).toEqual(up);
      expect(barsWhere(run.alert('EFI crossed below zero'))).toEqual(down);
    });
  });
});
