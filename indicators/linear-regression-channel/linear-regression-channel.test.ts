import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, pathBars, realisticDaily, field, type PackIndicator, type PackRun, type PackRuntime } from 'guardian-gscript-toolchain';

/**
 * The reference platform's Linear Regression Channel (length 100, source close,
 * upper and lower deviation 2, extend right), drawn on the last bar only:
 * - the base line is the least-squares line through the last `length` values,
 *   from the oldest bar of the window to the newest;
 * - the channel edges sit `deviation` × the standard deviation of the
 *   residuals from it, using the SAMPLE standard deviation (divisor length − 1);
 * - Pearson's R is the correlation of the values with the fitted line, which is
 *   their correlation with time and so carries the sign of the trend: positive
 *   while prices rise, negative while they fall.
 */
interface Fit { start: number; end: number; deviation: number; r: number }
function regression(values: readonly number[], end: number, n: number): Fit {
  const ys = values.slice(end - n + 1, end + 1); // oldest first, x = 0 … n − 1
  let sx = 0; let sy = 0; let sxx = 0; let sxy = 0;
  ys.forEach((y, x) => { sx += x; sy += y; sxx += x * x; sxy += x * y; });
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  const fitted = ys.map((_, x) => intercept + slope * x);
  const meanY = sy / n;
  const meanF = fitted.reduce((a, b) => a + b, 0) / n;
  let ssr = 0; let syy = 0; let sff = 0; let syf = 0;
  ys.forEach((y, x) => {
    ssr += (y - fitted[x]) ** 2;
    syy += (y - meanY) ** 2;
    sff += (fitted[x] - meanF) ** 2;
    syf += (y - meanY) * (fitted[x] - meanF);
  });
  return {
    start: fitted[0],
    end: fitted[n - 1],
    deviation: Math.sqrt(ssr / (n - 1)),
    r: syy === 0 || sff === 0 ? 0 : syf / Math.sqrt(syy * sff),
  };
}

const close = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

/** The line drawn in a colour (the channel draws one line per colour). */
function lineIn(run: PackRun, color: string) {
  const hits = run.drawings.lines.filter((l) => l.color === color);
  if (hits.length !== 1) throw new Error(`expected one line in ${color}, found ${hits.length}`);
  return hits[0];
}

const BASE = '#38bdf8';
const UPPER = '#ef5350';
const LOWER = '#26a69a';

/**
 * 40 closes along 100 + 0.5·i with a +1, −1, −1, +1 wobble that repeats every
 * four bars. Over a 20-bar window the wobble sums to zero and is uncorrelated
 * with time, so the fit is exactly the line, every residual is ±1 and the
 * sample deviation is √(20/19). With time's variance (20² − 1)/12 = 33.25,
 * Pearson's R = √(0.25·33.25 / (0.25·33.25 + 1)) = √(8.3125/9.3125).
 */
const WOBBLE = [1, -1, -1, 1];
const wobbly = barsFrom(Array.from({ length: 40 }, (_, i) => {
  const c = 100 + 0.5 * i + WOBBLE[i % 4];
  return { open: c, high: c + 0.25, low: c - 0.25, close: c };
}));

/** A market that swings every few weeks, so closes break out of a short channel. */
const swings = pathBars(Array.from({ length: 300 }, (_, i) => 200 + 15 * Math.sin(i / 8) + 3 * Math.sin(i * 1.7)), 1);

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

describe('Linear Regression Channel — the fitted trend and its spread', () => {
  let runtime: PackRuntime;
  let lr: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    lr = await runtime.load('linear-regression-channel');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('draws the base line through the least-squares fit of the last 100 closes', async () => {
    const bars = realisticDaily();
    const last = bars.length - 1;
    const fit = regression(field(bars, 'close'), last, 100);
    const base = lineIn(await lr.run(bars), BASE);
    expect(base.sourceBarIndex1).toBe(last - 99);
    expect(base.sourceBarIndex2).toBe(last);
    expect(close(base.price1, fit.start)).toBe(true);
    expect(close(base.price2, fit.end)).toBe(true);
  });

  it('draws the channel edges two sample deviations of the residuals either side', async () => {
    const bars = realisticDaily();
    const last = bars.length - 1;
    const fit = regression(field(bars, 'close'), last, 100);
    const run = await lr.run(bars);
    const upper = lineIn(run, UPPER);
    const lower = lineIn(run, LOWER);
    expect([upper.sourceBarIndex1, upper.sourceBarIndex2]).toEqual([last - 99, last]);
    expect([lower.sourceBarIndex1, lower.sourceBarIndex2]).toEqual([last - 99, last]);
    expect(close(upper.price1, fit.start + 2 * fit.deviation)).toBe(true);
    expect(close(upper.price2, fit.end + 2 * fit.deviation)).toBe(true);
    expect(close(lower.price1, fit.start - 2 * fit.deviation)).toBe(true);
    expect(close(lower.price2, fit.end - 2 * fit.deviation)).toBe(true);
  });

  it('fits a wobbling line exactly, worked by hand', async () => {
    const run = await lr.run(wobbly, { length: 20 });
    const width = 2 * Math.sqrt(20 / 19);
    const base = lineIn(run, BASE);
    // The window is bars 20 … 39: the line reads 100 + 0.5·20 = 110 to 119.5.
    expect(base.sourceBarIndex1).toBe(20);
    expect(base.price1).toBeCloseTo(110, 10);
    expect(base.price2).toBeCloseTo(119.5, 10);
    expect(lineIn(run, UPPER).price1).toBeCloseTo(110 + width, 10);
    expect(lineIn(run, LOWER).price2).toBeCloseTo(119.5 - width, 10);
  });

  it('follows the length, source and deviations a trader sets', async () => {
    const bars = realisticDaily();
    const last = bars.length - 1;
    const highs = field(bars, 'high');
    const fit = regression(highs, last, 50);
    const run = await lr.run(bars, { length: 50, source: 'high', 'upper-deviation': 1.5, 'lower-deviation': 3 });
    expect(close(lineIn(run, BASE).price1, fit.start)).toBe(true);
    expect(close(lineIn(run, UPPER).price2, fit.end + 1.5 * fit.deviation)).toBe(true);
    expect(close(lineIn(run, LOWER).price2, fit.end - 3 * fit.deviation)).toBe(true);
  });

  describe('extending the lines', () => {
    it('extends all three lines to the right by default', async () => {
      const run = await lr.run(realisticDaily());
      expect(run.drawings.lines.map((l) => l.extend)).toEqual(['right', 'right', 'right']);
    });

    it('extends both ways, one way or not at all as a trader sets', async () => {
      const both = await lr.run(realisticDaily(), { 'extend-left': true });
      expect(both.drawings.lines.map((l) => l.extend)).toEqual(['both', 'both', 'both']);
      const leftOnly = await lr.run(realisticDaily(), { 'extend-left': true, 'extend-right': false });
      expect(leftOnly.drawings.lines.map((l) => l.extend)).toEqual(['left', 'left', 'left']);
      const none = await lr.run(realisticDaily(), { 'extend-right': false });
      expect(none.drawings.lines.map((l) => l.extend ?? 'none')).toEqual(['none', 'none', 'none']);
    });
  });

  describe("Pearson's R", () => {
    it('labels the channel with the fit\'s R under the start of the lower line', async () => {
      const bars = realisticDaily();
      const last = bars.length - 1;
      const fit = regression(field(bars, 'close'), last, 100);
      const run = await lr.run(bars);
      expect(run.drawings.labels).toHaveLength(1);
      const [tag] = run.drawings.labels;
      expect(tag.text).toBe(`R ${fit.r.toFixed(3)}`);
      expect(tag.sourceBarIndex).toBe(last - 99);
      expect(close(tag.y as number, fit.start - 2 * fit.deviation)).toBe(true);
      expect(tag).toMatchObject({ style: 'label_up', yloc: 'price' });
    });

    it('reads R 0.945 on the wobbling line, worked by hand', async () => {
      const run = await lr.run(wobbly, { length: 20 });
      expect(Math.sqrt(8.3125 / 9.3125).toFixed(3)).toBe('0.945');
      expect(run.drawings.labels[0].text).toBe('R 0.945');
    });

    it('signs R negative on a falling market of the same shape', async () => {
      // Mirrored around 150: c = 300 − wobbly's close, so the fit has the same
      // |slope| and residuals but trends down — R should flip sign, not magnitude.
      const falling = barsFrom(wobbly.map((b, i) => {
        const c = 200 - (b.close - 100);
        return { open: c, high: c + 0.25, low: c - 0.25, close: c, volume: i };
      }));
      const run = await lr.run(falling, { length: 20 });
      expect(run.drawings.labels[0].text).toBe('R -0.945');
    });

    it('reads R 0 on a market that does not move', async () => {
      const flat = barsFrom(Array.from({ length: 30 }, () => ({ open: 100, high: 100.5, low: 99.5, close: 100 })));
      const run = await lr.run(flat, { length: 20 });
      expect(run.drawings.labels[0].text).toBe('R 0.000');
      expect(lineIn(run, BASE).price1).toBeCloseTo(100, 10);
      expect(lineIn(run, UPPER).price1).toBeCloseTo(100, 10);
    });

    it('can leave R off', async () => {
      const run = await lr.run(realisticDaily(), { 'show-r': false });
      expect(run.drawings.labels).toHaveLength(0);
      expect(run.drawings.lines).toHaveLength(3);
    });

    it('is always readable in the Data Window, even with the label off', async () => {
      const bars = realisticDaily();
      const last = bars.length - 1;
      const fit = regression(field(bars, 'close'), last, 100);
      const run = await lr.run(bars, { 'show-r': false });
      expect(run.drawings.labels).toHaveLength(0);
      const r = run.plot("Pearson's R");
      expect(r.slice(0, last - 99).every((v) => v === null)).toBe(true);
      expect(close(r[last] as number, fit.r)).toBe(true);
      expect(run.shown("Pearson's R")).toEqual({ pane: false, dataWindow: true, statusLine: false });
    });
  });

  it('draws nothing until `length` bars are loaded', async () => {
    const run = await lr.run(realisticDaily().slice(0, 99));
    expect(run.drawings.lines).toHaveLength(0);
    expect(run.drawings.labels).toHaveLength(0);
  });

  describe('the channel as values', () => {
    it('shades the upper and lower halves of the channel', async () => {
      const run = await lr.run(realisticDaily());
      const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
      expect(fills.map((o) => o.style.color)).toEqual(['rgba(239, 83, 80, 0.08)', 'rgba(38, 166, 154, 0.08)']);
      const unshaded = await lr.run(realisticDaily(), { shade: false });
      expect(unshaded.snapshot.outputs.filter((o) => o.kind === 'derived.fill').map((o) => o.style.color))
        .toEqual(['rgba(239, 83, 80, 0)', 'rgba(38, 166, 154, 0)']);
    });

    it('gives the channel lines their values bar by bar across the window, in the Data Window', async () => {
      const bars = realisticDaily();
      const last = bars.length - 1;
      const fit = regression(field(bars, 'close'), last, 100);
      const run = await lr.run(bars);
      const at = (i: number) => fit.start + ((fit.end - fit.start) * (i - (last - 99))) / 99;
      const base = run.plot('Channel base');
      const upper = run.plot('Channel upper');
      const lower = run.plot('Channel lower');
      expect(base.slice(0, last - 99).every((v) => v === null)).toBe(true);
      for (const i of [last - 99, last - 50, last]) {
        expect(close(base[i] as number, at(i))).toBe(true);
        expect(close(upper[i] as number, at(i) + 2 * fit.deviation)).toBe(true);
        expect(close(lower[i] as number, at(i) - 2 * fit.deviation)).toBe(true);
      }
      for (const title of ['Channel base', 'Channel upper', 'Channel lower']) {
        expect(run.shown(title)).toEqual({ pane: false, dataWindow: true, statusLine: false });
      }
    });
  });

  it('raises the breakout alerts when a close crosses the channel as it stood on that bar', async () => {
    const closes = field(swings, 'close');
    const edges = closes.map((_, i) => {
      if (i < 19) return null;
      const fit = regression(closes, i, 20);
      return { upper: fit.end + 2 * fit.deviation, lower: fit.end - 2 * fit.deviation };
    });
    const above: number[] = [];
    const below: number[] = [];
    for (let i = 20; i < closes.length; i++) {
      const [now, before] = [edges[i], edges[i - 1]];
      if (now === null || before === null) continue;
      if (closes[i] > now.upper && closes[i - 1] <= before.upper) above.push(i);
      if (closes[i] < now.lower && closes[i - 1] >= before.lower) below.push(i);
    }
    expect(above.length).toBeGreaterThan(0);
    expect(below.length).toBeGreaterThan(0);
    const run = await lr.run(swings, { length: 20 });
    expect(barsWhere(run.alert('Close above channel'))).toEqual(above);
    expect(barsWhere(run.alert('Close below channel'))).toEqual(below);
  });
});
