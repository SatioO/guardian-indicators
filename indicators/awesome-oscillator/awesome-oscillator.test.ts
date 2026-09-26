import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, pathBars, realisticDaily, closeSeries, sma, zip, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

const hl2 = (bars: readonly OHLCV[]) => bars.map((b) => (b.high + b.low) / 2);

/**
 * The reference platform's Awesome Oscillator:
 *   ao = sma(hl2, 5) - sma(hl2, 34)
 * drawn as columns, red where ao - ao[1] <= 0 and green otherwise (so the
 * first defined bar, which has no previous value, is green).
 */
function awesome(bars: readonly OHLCV[], fast = 5, slow = 34): Maybe[] {
  return zip(sma(hl2(bars), fast), sma(hl2(bars), slow), (f, s) => f - s);
}

/** 'up' where the reference colours a column green, 'down' where red. */
function columnSides(values: readonly Maybe[]): ('up' | 'down' | null)[] {
  return values.map((v, i) => {
    if (v === null) return null;
    const prev = i > 0 ? values[i - 1] : null;
    return prev !== null && v - prev <= 0 ? 'down' : 'up';
  });
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

/** Bars with no range: high = low = close, so the median price is the close. */
const pointBars = (closes: readonly number[]) =>
  barsFrom(closes.map((c) => ({ open: c, high: c, low: c, close: c })));

describe('Awesome Oscillator — fast minus slow average of the median price', () => {
  let runtime: PackRuntime;
  let ao: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    ao = await runtime.load('awesome-oscillator');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads a steady 14.5 on a price that climbs one point a bar', async () => {
    // Median price 100 + i. The 5-bar average lags the newest value by 2, the
    // 34-bar average by 16.5, so AO = 16.5 − 2 = 14.5 once 34 bars exist.
    const run = await ao.run(pointBars(Array.from({ length: 50 }, (_, i) => 100 + i)));
    const values = run.plot('AO');
    expect(values.slice(0, 33)).toEqual(new Array(33).fill(null));
    for (const v of values.slice(33)) expect(v).toBeCloseTo(14.5, 9);
  });

  it('matches the published formula on a realistic series', async () => {
    const bars = realisticDaily();
    const run = await ao.run(bars);
    expect(closeSeries(run.plot('AO'), awesome(bars))).toEqual({ ok: true });
  });

  it('follows the fast and slow lengths a trader sets', async () => {
    const bars = realisticDaily();
    const run = await ao.run(bars, { 'fast-length': 3, 'slow-length': 21 });
    expect(closeSeries(run.plot('AO'), awesome(bars, 3, 21))).toEqual({ ok: true });
  });

  it('colours each column green when AO rose from the bar before and red otherwise', async () => {
    const bars = realisticDaily();
    const run = await ao.run(bars);
    const colors = run.plotColors('AO');
    const sides = columnSides(awesome(bars));
    const up = colors[sides.indexOf('up')];
    const down = colors[sides.indexOf('down')];
    expect(up).not.toBe(down);
    sides.forEach((side, i) => {
      if (side !== null) expect(colors[i], `bar ${i}`).toBe(side === 'up' ? up : down);
    });
    // The first column has nothing to compare with and is green, as on the
    // reference platform; a flat reading (AO equal to the bar before) is red.
    expect(sides[33]).toBe('up');
  });

  describe('signals', () => {
    // Price swings in a slow wave, so AO crosses zero and changes colour.
    const wave = pathBars(Array.from({ length: 160 }, (_, i) => 200 + 30 * Math.sin(i / 12)), 1);
    const reference = awesome(wave);
    const crosses = (dir: 'above' | 'below') => reference.flatMap((v, i) => {
      const prev = i > 0 ? reference[i - 1] : null;
      if (v === null || prev === null) return [];
      return (dir === 'above' ? v > 0 && prev <= 0 : v < 0 && prev >= 0) ? [i] : [];
    });
    const diff = reference.map((v, i) => (v === null || i === 0 || reference[i - 1] === null ? null : v - (reference[i - 1] as number)));
    const turns = (to: 'green' | 'red') => diff.flatMap((d, i) => {
      const prev = i > 0 ? diff[i - 1] : null;
      if (d === null || prev === null) return [];
      return (to === 'green' ? d > 0 && prev <= 0 : d < 0 && prev >= 0) ? [i] : [];
    });

    it('alerts when AO crosses the zero line', async () => {
      const run = await ao.run(wave);
      expect(crosses('above').length).toBeGreaterThan(0);
      expect(crosses('below').length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('Crossed above zero'))).toEqual(crosses('above'));
      expect(barsWhere(run.alert('Crossed below zero'))).toEqual(crosses('below'));
    });

    it('alerts when the columns change direction, named by direction not colour', async () => {
      // The column colours are user-configurable (Rising column / Falling
      // column inputs), so the alert names must describe the direction the
      // momentum turned, not a colour that a trader may have changed.
      const run = await ao.run(wave);
      expect(turns('green').length).toBeGreaterThan(0);
      expect(turns('red').length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('Turned rising'))).toEqual(turns('green'));
      expect(barsWhere(run.alert('Turned falling'))).toEqual(turns('red'));
    });

    it('draws the zero line', async () => {
      expect((await ao.run(wave)).level('Zero')).toBe(0);
    });
  });

  it('exposes the bar-to-bar change behind the column colour in the Data Window', async () => {
    const bars = realisticDaily();
    const run = await ao.run(bars);
    const reference = awesome(bars);
    const expectedChange = reference.map((v, i) => {
      const prev = i > 0 ? reference[i - 1] : null;
      return v === null || prev === null ? null : v - prev;
    });
    expect(closeSeries(run.plot('Change'), expectedChange)).toEqual({ ok: true });
    expect(run.shown('Change')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });
});
