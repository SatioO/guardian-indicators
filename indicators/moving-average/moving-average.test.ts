import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, realisticDaily, closeSeries, field, rma, sma, zip, type PackIndicator, type PackRun, type PackRuntime, type Maybe } from 'guardian-gscript-toolchain';

/**
 * Exponential average as the reference platform defines ta.ema: alpha =
 * 2 / (length + 1), seeded with the simple average of the first `length`
 * defined values (so a series that starts undefined seeds later).
 */
function ema(values: readonly Maybe[], length: number): Maybe[] {
  const alpha = 2 / (length + 1);
  const out: Maybe[] = new Array(values.length).fill(null);
  let prev: number | null = null;
  const seed: number[] = [];
  values.forEach((v, i) => {
    if (v === null) return;
    if (prev === null) {
      seed.push(v);
      if (seed.length === length) {
        prev = seed.reduce((a, b) => a + b, 0) / length;
        out[i] = prev;
      }
      return;
    }
    prev = alpha * v + (1 - alpha) * prev;
    out[i] = prev;
  });
  return out;
}

/** Linearly weighted: weight `length` on the newest value down to 1 on the oldest. */
function wma(values: readonly Maybe[], length: number): Maybe[] {
  const total = (length * (length + 1)) / 2;
  return values.map((_, i) => {
    if (i + 1 < length) return null;
    let sum = 0;
    for (let k = 0; k < length; k++) {
      const v = values[i - k];
      if (v === null) return null;
      sum += v * (length - k);
    }
    return sum / total;
  });
}

/**
 * Hull, as the reference platform's Hull Moving Average publishes it:
 * wma(2·wma(src, round(length / 2)) − wma(src, length), round(√length)).
 * Lengths like 21 (21/2 = 10.5, √21 = 4.58) tell round from floor.
 */
function hma(values: readonly Maybe[], length: number): Maybe[] {
  const raw = zip(wma(values, Math.round(length / 2)), wma(values, length), (h, f) => 2 * h - f);
  return wma(raw, Math.round(Math.sqrt(length)));
}

/** Volume-weighted: sma(src × volume) ÷ sma(volume). */
function vwma(values: readonly Maybe[], volume: readonly Maybe[], length: number): Maybe[] {
  return zip(sma(zip(values, volume, (v, w) => v * w), length), sma(volume, length), (a, b) => a / b);
}

/**
 * Arnaud Legoux: a Gaussian-weighted window. With m = offset·(length − 1) and
 * s = length / sigma, the i-th oldest value weighs exp(−(i − m)² / 2s²).
 */
function alma(values: readonly Maybe[], length: number, offset: number, sigma: number): Maybe[] {
  const m = offset * (length - 1);
  const s = length / sigma;
  return values.map((_, bar) => {
    if (bar + 1 < length) return null;
    let norm = 0;
    let sum = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.exp(-((i - m) ** 2) / (2 * s * s));
      const v = values[bar - length + 1 + i];
      if (v === null) return null;
      norm += w;
      sum += v * w;
    }
    return sum / norm;
  });
}

/** Least-squares line through the last `length` values, read at the newest bar. */
function lsma(values: readonly Maybe[], length: number): Maybe[] {
  return values.map((_, bar) => {
    if (bar + 1 < length) return null;
    let sx = 0; let sy = 0; let sxx = 0; let sxy = 0;
    for (let x = 0; x < length; x++) {
      const y = values[bar - length + 1 + x];
      if (y === null) return null;
      sx += x; sy += y; sxx += x * x; sxy += x * y;
    }
    const slope = (length * sxy - sx * sy) / (length * sxx - sx * sx);
    const intercept = (sy - slope * sx) / length;
    return intercept + slope * (length - 1);
  });
}

/** 2·E1 − E2, E2 being the average of E1. */
function dema(values: readonly Maybe[], length: number): Maybe[] {
  const e1 = ema(values, length);
  return zip(e1, ema(e1, length), (a, b) => 2 * a - b);
}

/** 3·E1 − 3·E2 + E3. */
function tema(values: readonly Maybe[], length: number): Maybe[] {
  const e1 = ema(values, length);
  const e2 = ema(e1, length);
  const e3 = ema(e2, length);
  return zip(zip(e1, e2, (a, b) => 3 * a - 3 * b), e3, (a, c) => a + c);
}

describe('Moving Average — one average, ten ways to take it', () => {
  let runtime: PackRuntime;
  let ma: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    ma = await runtime.load('moving-average');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  const bars = realisticDaily();

  it('draws a 21-bar exponential average of the close by default', async () => {
    const run = await ma.run(bars);
    expect(closeSeries(run.plot('Moving average'), ema(field(bars, 'close'), 21))).toEqual({ ok: true });
  });

  const closes = field(bars, 'close');
  it.each([
    ['SMA', (n: number) => sma(closes, n)],
    ['EMA', (n: number) => ema(closes, n)],
    ['WMA', (n: number) => wma(closes, n)],
    ['RMA', (n: number) => rma(closes, n)],
    ['VWMA', (n: number) => vwma(closes, field(bars, 'volume'), n)],
    ['ALMA', (n: number) => alma(closes, n, 0.85, 6)],
    ['DEMA', (n: number) => dema(closes, n)],
    ['TEMA', (n: number) => tema(closes, n)],
    ['LSMA', (n: number) => lsma(closes, n)],
  ] as const)('takes the %s the trader picks, over the length they set', async (type, reference) => {
    for (const length of [9, 16, 21]) {
      const run = await ma.run(bars, { type, length });
      expect(closeSeries(run.plot('Moving average'), reference(length)), `${type} ${length}`).toEqual({ ok: true });
    }
  });

  // LANGUAGE FINDING (reported): ta.hma floors both the half-length
  // (length / 2) and the final smoothing length (round(sqrt(length)))
  // instead of rounding them, disagreeing with the reference platform's
  // published Hull Moving Average formula — and with this repo's own
  // documented contract (gScriptStdlibNumericalContract.ts's `hma9` entry,
  // which states `round(sqrt(length))` for the final stage). At length 21,
  // round(21 / 2) = 11 vs floor 10, and round(sqrt(21)) = 5 vs floor 4;
  // ta.hma's output matches only the floor-based values (verified by probe:
  // exact match to a floor/floor reference, tolerance 1e-6, across the whole
  // series; a round/round reference first diverges once both are defined).
  // This test holds the reference contract; it is expected to fail until
  // ta.hma is corrected, and then must be turned back into a plain it.each
  // case (folded back into the loop above).
  it.fails('[language finding: ta.hma floors instead of rounds] takes the HMA the trader picks, over the length they set', async () => {
    for (const length of [9, 16, 21]) {
      const run = await ma.run(bars, { type: 'HMA', length });
      expect(closeSeries(run.plot('Moving average'), hma(closes, length)), `HMA ${length}`).toEqual({ ok: true });
    }
  });

  it('shapes the ALMA with the offset and sigma the trader sets', async () => {
    const run = await ma.run(bars, { type: 'ALMA', length: 12, 'alma-offset': 0.5, 'alma-sigma': 4 });
    expect(closeSeries(run.plot('Moving average'), alma(closes, 12, 0.5, 4))).toEqual({ ok: true });
  });

  it('offers the ten averages, exponential first picked', () => {
    const type = ma.manifest.inputs?.find((i) => i.key === 'input@type');
    expect(type).toMatchObject({ kind: 'select', default: 'EMA' });
    expect(type?.kind === 'select' && type.options.map((o) => o.value))
      .toEqual(['SMA', 'EMA', 'WMA', 'HMA', 'RMA', 'VWMA', 'ALMA', 'DEMA', 'TEMA', 'LSMA']);
  });

  it('averages the source the trader picks', async () => {
    const run = await ma.run(bars, { source: 'hl2', type: 'SMA', length: 10 });
    const hl2 = zip(field(bars, 'high'), field(bars, 'low'), (h, l) => (h + l) / 2);
    expect(closeSeries(run.plot('Moving average'), sma(hl2, 10))).toEqual({ ok: true });
  });

  it('shifts the line by the offset the trader sets, without changing its values', async () => {
    const offsetOf = (run: PackRun) => run.snapshot.outputs.find((o) => o.title === 'Moving average')?.offsetBars;
    const plain = await ma.run(bars);
    const shifted = await ma.run(bars, { offset: 5 });
    const back = await ma.run(bars, { offset: -3 });
    expect(offsetOf(plain)).toBe(0);
    expect(offsetOf(shifted)).toBe(5);
    expect(offsetOf(back)).toBe(-3);
    expect(shifted.plot('Moving average')).toEqual(plain.plot('Moving average'));
  });

  describe('on a step up and a step down', () => {
    // Ten closes at 100, ten at 105, ten at 95; a 5-bar SMA. The average
    // climbs on bars 10–14, holds at 105 on 15–19, falls on 20–24 and holds
    // at 95 after. The close jumps over it on bar 10 and drops under it on 20.
    const steps = pathBars([
      ...new Array(10).fill(100),
      ...new Array(10).fill(105),
      ...new Array(10).fill(95),
    ], 0.5);
    const settings = { type: 'SMA', length: 5 };
    const barsWhere = (values: readonly (boolean | null)[]) =>
      values.flatMap((hit, bar) => (hit ? [bar] : []));

    it('colours the line by its slope, holding the colour while it runs flat', async () => {
      const run = await ma.run(steps, settings);
      const colors = run.plotColors('Moving average');
      const [up, down] = [colors[12], colors[22]];
      expect([up, down]).toEqual(['#26a69a', '#ef5350']);
      expect(colors.slice(10, 20)).toEqual(new Array(10).fill(up));
      expect(colors.slice(20, 30)).toEqual(new Array(10).fill(down));
    });

    it('alerts when the close crosses above or below the average', async () => {
      const run = await ma.run(steps, settings);
      expect(barsWhere(run.alert('Close crossed above the average'))).toEqual([10]);
      expect(barsWhere(run.alert('Close crossed below the average'))).toEqual([20]);
    });
  });
});
