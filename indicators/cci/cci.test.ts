import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, realisticDaily, closeSeries, field, rma, sma, type PackIndicator, type PackRuntime, type Maybe } from 'guardian-gscript-toolchain';
/**
 * The reference platform's CCI (length 20, source close — the reference
 * platform's own default for CCI's Source input, even though the classic
 * formula is defined on the typical price):
 *   cci = (src - sma(src, length)) / (0.015 * dev(src, length))
 * where dev is the MEAN ABSOLUTE deviation from that same average,
 *   dev = Σ |src[i] - sma| / length   over the window
 * (not the standard deviation). Undefined until `length` bars exist.
 */
function commodityChannelIndex(values: readonly number[], length: number): Maybe[] {
  return values.map((v, i) => {
    if (i + 1 < length) return null;
    let sum = 0;
    for (let k = i - length + 1; k <= i; k++) sum += values[k];
    const mean = sum / length;
    let absDev = 0;
    for (let k = i - length + 1; k <= i; k++) absDev += Math.abs(values[k] - mean);
    return (v - mean) / (0.015 * (absDev / length));
  });
}

/**
 * Exponential average, alpha = 2 / (length + 1), seeded with the simple average
 * of the first `length` defined values (the reference platform's warm-up).
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

/** Linearly weighted average: the newest value weighs `length`, the oldest 1. */
function wma(values: readonly Maybe[], length: number): Maybe[] {
  return values.map((_, i) => {
    if (i + 1 < length) return null;
    let num = 0;
    let den = 0;
    for (let k = 0; k < length; k++) {
      const v = values[i - k];
      if (v === null) return null;
      num += v * (length - k);
      den += length - k;
    }
    return num / den;
  });
}

/** Bars with no range: high = low = close, so the typical price is the close. */
const pointBars = (closes: readonly number[]) =>
  barsFrom(closes.map((c) => ({ open: c, high: c, low: c, close: c })));

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

describe('CCI — commodity channel index', () => {
  let runtime: PackRuntime;
  let cci: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    cci = await runtime.load('cci');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads 666.7 then 333.3 as a jump to 110 enters a flat 100 window', async () => {
    // Bar 19: window = nineteen 100s and one 110. Mean 100.5; mean absolute
    // deviation (19 × 0.5 + 9.5) ÷ 20 = 0.95; CCI = 9.5 ÷ (0.015 × 0.95) = 2000/3.
    // Bar 20: eighteen 100s and two 110s. Mean 101; deviation (18 + 18) ÷ 20
    // = 1.8; CCI = 9 ÷ (0.015 × 1.8) = 1000/3.
    const run = await cci.run(pointBars([...new Array(19).fill(100), 110, 110]));
    const values = run.plot('CCI');
    expect(values.slice(0, 19)).toEqual(new Array(19).fill(null));
    expect(values[19]).toBeCloseTo(2000 / 3, 9);
    expect(values[20]).toBeCloseTo(1000 / 3, 9);
  });

  it('matches the published formula on a realistic series', async () => {
    const bars = realisticDaily();
    const run = await cci.run(bars);
    expect(closeSeries(run.plot('CCI'), commodityChannelIndex(field(bars, 'close'), 20))).toEqual({ ok: true });
  });

  it('follows the length and source a trader sets', async () => {
    const bars = realisticDaily();
    const run = await cci.run(bars, { length: 14, source: 'close' });
    expect(closeSeries(run.plot('CCI'), commodityChannelIndex(field(bars, 'close'), 14))).toEqual({ ok: true });
  });

  describe('smoothing line', () => {
    const bars = realisticDaily();
    const reference = commodityChannelIndex(field(bars, 'close'), 20);

    it('is off by default', async () => {
      const run = await cci.run(bars);
      expect(run.plot('CCI smoothing').every((v) => v === null)).toBe(true);
    });

    it('defaults the smoothing length to 14 when a trader turns smoothing on', async () => {
      const run = await cci.run(bars, { smoothing: 'SMA' });
      expect(closeSeries(run.plot('CCI smoothing'), sma(reference, 14))).toEqual({ ok: true });
    });

    it.each([
      ['SMA', 5, sma(reference, 5)],
      ['EMA', 9, ema(reference, 9)],
      ['SMMA (RMA)', 5, rma(reference, 5)],
      ['WMA', 5, wma(reference, 5)],
    ] as const)('averages CCI with a %s of the length a trader sets', async (method, length, expected) => {
      const run = await cci.run(bars, { smoothing: method, 'smoothing-length': length });
      expect(closeSeries(run.plot('CCI smoothing'), expected)).toEqual({ ok: true });
    });
  });

  describe('bands and signals', () => {
    // Nineteen 100s, then 110, 110, 90, 100, 110 (bars 19–23). Worked by hand
    // with the definition above:
    //   bar 19  mean 100.5, dev 0.95  →  +666.7   (above +100)
    //   bar 20  mean 101,   dev 1.8   →  +333.3   (above +100)
    //   bar 21  mean 100.5, dev 1.9   →  −368.4   (below −100: crossed −100 and 0)
    //   bar 22  mean 100.5, dev 1.9   →   −17.5   (inside the band)
    //   bar 23  mean 101,   dev 2.7   →  +222.2   (crossed 0 and +100)
    const bars = pointBars([...new Array(19).fill(100), 110, 110, 90, 100, 110]);

    it('reads the worked values', async () => {
      const values = (await cci.run(bars)).plot('CCI');
      expect(values[21]).toBeCloseTo(-10.5 / 0.0285, 9);
      expect(values[22]).toBeCloseTo(-0.5 / 0.0285, 9);
      expect(values[23]).toBeCloseTo(9 / 0.0405, 9);
    });

    it('draws ±100 bands around a zero line and shades between them', async () => {
      const run = await cci.run(bars);
      expect(run.level('Upper band')).toBe(100);
      expect(run.level('Zero')).toBe(0);
      expect(run.level('Lower band')).toBe(-100);
      const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
      expect(fills).toHaveLength(1);
      expect(fills[0].style.color).toBe('rgba(56, 189, 248, 0.1)');
    });

    it('moves the bands where a trader sets them', async () => {
      const run = await cci.run(bars, { upper: 200, lower: -200 });
      expect(run.level('Upper band')).toBe(200);
      expect(run.level('Lower band')).toBe(-200);
    });

    it('colours the line above the upper band and below the lower band', async () => {
      const colors = (await cci.run(bars)).plotColors('CCI');
      const [above, below, inside] = [colors[19], colors[21], colors[22]];
      expect(new Set([above, below, inside]).size).toBe(3);
      expect(colors[23]).toBe(above);
    });

    it('alerts when CCI crosses a band or the zero line', async () => {
      const run = await cci.run(bars);
      expect(barsWhere(run.alert('Crossed above upper band'))).toEqual([23]);
      expect(barsWhere(run.alert('Crossed below lower band'))).toEqual([21]);
      expect(barsWhere(run.alert('Crossed above zero'))).toEqual([23]);
      expect(barsWhere(run.alert('Crossed below zero'))).toEqual([21]);
    });
  });
});
