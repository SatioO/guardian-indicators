import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, realisticDaily, atr, closeSeries, field, sma, zip, type PackIndicator, type PackRuntime, type Maybe } from 'guardian-gscript-toolchain';

/**
 * Extension from a moving average, the way swing traders size up a stretched move:
 *   percent  = 100 × (close − MA) ÷ MA
 *   in ATRs  = (close − MA) ÷ ATR(14)       (ATR = Wilder's average true range)
 * The averages follow the reference platform's built-ins:
 *   EMA — alpha = 2 ÷ (length + 1), seeded with the simple average of the first
 *         `length` closes (nothing before);
 *   SMA — mean of the last `length` closes;
 *   WMA — weights length … 1, newest heaviest.
 */

function ema(values: readonly number[], length: number): Maybe[] {
  const alpha = 2 / (length + 1);
  const out: Maybe[] = [];
  let prev: number | null = null;
  values.forEach((v, i) => {
    if (i + 1 < length) { out.push(null); return; }
    if (prev === null) {
      let sum = 0;
      for (let k = i - length + 1; k <= i; k++) sum += values[k];
      prev = sum / length;
    } else {
      prev = alpha * v + (1 - alpha) * prev;
    }
    out.push(prev);
  });
  return out;
}

function wma(values: readonly number[], length: number): Maybe[] {
  return values.map((_, i) => {
    if (i + 1 < length) return null;
    let num = 0;
    let den = 0;
    for (let w = 1; w <= length; w++) {
      num += values[i - length + w] * w;
      den += w;
    }
    return num / den;
  });
}

const percentFrom = (closes: readonly number[], avg: readonly Maybe[]) =>
  zip(closes, avg, (c, m) => (100 * (c - m)) / m);

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

describe('MA Extension — how stretched price is from its average', () => {
  let runtime: PackRuntime;
  let ext: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    ext = await runtime.load('ma-extension');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads a jump from a flat base against the average, by hand', async () => {
    // Four closes at 100, then 110.
    const bars = pathBars([100, 100, 100, 100, 110]);
    const bySma = await ext.run(bars, { 'ma-type': 'SMA', length: 4 });
    // SMA(4) = (100 + 100 + 100 + 110) ÷ 4 = 102.5 → 110 is 7.317…% above it.
    expect(bySma.plot('Extension')[4]).toBeCloseTo((110 / 102.5 - 1) * 100, 10);
    const byEma = await ext.run(bars, { length: 4 });
    // EMA(4) seeds at 100 on bar 3, then 100 + 0.4 × 10 = 104 → 5.769…%.
    expect(byEma.plot('Extension').slice(0, 3)).toEqual([null, null, null]);
    expect(byEma.plot('Extension')[3]).toBeCloseTo(0, 12);
    expect(byEma.plot('Extension')[4]).toBeCloseTo((110 / 104 - 1) * 100, 10);
  });

  it('measures from the 21-bar EMA by default', async () => {
    const bars = realisticDaily();
    const run = await ext.run(bars);
    const closes = field(bars, 'close');
    expect(closeSeries(run.plot('Extension'), percentFrom(closes, ema(closes, 21)))).toEqual({ ok: true });
    expect(run.outputs().find((o) => o.title === 'Extension')?.visual).toBe('columns');
  });

  it('can measure from a simple or a weighted average instead', async () => {
    const bars = realisticDaily();
    const closes = field(bars, 'close');
    const bySma = await ext.run(bars, { 'ma-type': 'SMA', length: 50 });
    expect(closeSeries(bySma.plot('Extension'), percentFrom(closes, sma(closes, 50)))).toEqual({ ok: true });
    const byWma = await ext.run(bars, { 'ma-type': 'WMA', length: 10 });
    expect(closeSeries(byWma.plot('Extension'), percentFrom(closes, wma(closes, 10)))).toEqual({ ok: true });
  });

  it('can measure in ATRs instead of percent', async () => {
    const bars = realisticDaily();
    const closes = field(bars, 'close');
    const run = await ext.run(bars, { measure: 'ATRs' });
    const distance = zip(closes, ema(closes, 21), (c, m) => c - m);
    const expected = zip(distance, atr(bars, 14), (d, a) => d / a);
    expect(closeSeries(run.plot('Extension'), expected)).toEqual({ ok: true });
    const shorter = await ext.run(bars, { measure: 'ATRs', 'atr-length': 5 });
    expect(closeSeries(shorter.plot('Extension'), zip(distance, atr(bars, 5), (d, a) => d / a))).toEqual({ ok: true });
  });

  it('keeps the average and both measures in the Data Window', async () => {
    const bars = realisticDaily();
    const closes = field(bars, 'close');
    const run = await ext.run(bars);
    const average = ema(closes, 21);
    expect(closeSeries(run.plot('Average'), average)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Extension (%)'), percentFrom(closes, average))).toEqual({ ok: true });
    const inAtrs = zip(zip(closes, average, (c, m) => c - m), atr(bars, 14), (d, a) => d / a);
    expect(closeSeries(run.plot('Extension (ATRs)'), inAtrs)).toEqual({ ok: true });
    for (const title of ['Average', 'Extension (%)', 'Extension (ATRs)']) {
      expect(run.shown(title)).toEqual({ pane: false, dataWindow: true, statusLine: false });
    }
  });

  describe('extended and stretched', () => {
    // SMA(5): a two-bar spike to 115/116 is 11.7% and 9.2% over the average
    // (extended), a drop to 85/84 is 12.4% and 10.4% under it (stretched).
    const closes = [
      ...Array.from({ length: 10 }, () => 100),
      115, 116, 100, 100, 100, 100, 100, 85, 84, 100, 100, 100,
    ];
    const bars = pathBars(closes);
    const settings = { 'ma-type': 'SMA', length: 5 };

    it('colours extended columns amber, stretched ones blue, the rest by side', async () => {
      const run = await ext.run(bars, settings);
      const values = run.plot('Extension');
      expect(values[10]).toBeCloseTo((115 / 103 - 1) * 100, 10);
      expect(values[17]).toBeCloseTo((85 / 97 - 1) * 100, 10);
      const colors = run.plotColors('Extension');
      const [extended, stretched, below, above] = [colors[10], colors[17], colors[12], colors[19]];
      expect(new Set([extended, stretched, below, above]).size).toBe(4);
      expect(colors[11]).toBe(extended);
      expect(colors[18]).toBe(stretched);
    });

    it('draws the thresholds and a zero line, in the unit being measured', async () => {
      const pct = await ext.run(bars, settings);
      expect(pct.level('Extended level')).toBe(8);
      expect(pct.level('Stretched level')).toBe(-8);
      expect(pct.level('Zero')).toBe(0);
      const inAtrs = await ext.run(bars, { ...settings, measure: 'ATRs' });
      expect(inAtrs.level('Extended level')).toBe(3);
      expect(inAtrs.level('Stretched level')).toBe(-3);
      const moved = await ext.run(bars, { ...settings, 'extended-pct': 12, 'stretched-pct': -5 });
      expect(moved.level('Extended level')).toBe(12);
      expect(moved.level('Stretched level')).toBe(-5);
    });

    it('alerts once when price becomes extended or stretched', async () => {
      const run = await ext.run(bars, settings);
      expect(barsWhere(run.alert('Became extended'))).toEqual([10]);
      expect(barsWhere(run.alert('Became stretched'))).toEqual([17]);
    });

    it('judges the thresholds on a swinging market exactly as the definition does', async () => {
      const real = pathBars(Array.from({ length: 300 }, (_, i) => 100 + 8 * Math.sin(i / 6) + 3 * Math.sin(i / 2.3)), 1);
      const run = await ext.run(real, { length: 10, 'extended-pct': 4, 'stretched-pct': -4 });
      const value = percentFrom(field(real, 'close'), ema(field(real, 'close'), 10));
      const crossedUp = value.flatMap((v, i) => {
        const p = value[i - 1];
        return i > 0 && v !== null && p !== null && v > 4 && p <= 4 ? [i] : [];
      });
      const crossedDown = value.flatMap((v, i) => {
        const p = value[i - 1];
        return i > 0 && v !== null && p !== null && v < -4 && p >= -4 ? [i] : [];
      });
      expect(crossedUp.length).toBeGreaterThan(0);
      expect(crossedDown.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('Became extended'))).toEqual(crossedUp);
      expect(barsWhere(run.alert('Became stretched'))).toEqual(crossedDown);
    });
  });

  it('offers EMA, SMA and WMA, EMA first', () => {
    const type = ext.manifest.inputs?.find((i) => i.key === 'input@ma-type');
    expect(type).toMatchObject({ kind: 'select', default: 'EMA' });
    expect(type?.kind === 'select' && type.options.map((o) => o.value)).toEqual(['EMA', 'SMA', 'WMA']);
  });
});
