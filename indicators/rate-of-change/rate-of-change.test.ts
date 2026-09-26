import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, realisticDaily, closeSeries, field, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * The reference platform's Rate of Change (length 9, source close):
 *   roc = 100 * (source - source[length]) / source[length]
 * undefined until `length` earlier bars exist.
 */
function rateOfChange(values: readonly number[], length: number): Maybe[] {
  return values.map((v, i) => (i < length ? null : (100 * (v - values[i - length])) / values[i - length]));
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

const hl2 = (bars: readonly OHLCV[]) => bars.map((b) => (b.high + b.low) / 2);

describe('Rate of Change — percent change over a lookback', () => {
  let runtime: PackRuntime;
  let roc: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    roc = await runtime.load('rate-of-change');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads +10% for nine bars after a step from 100 to 110, then 0', async () => {
    // Nine closes at 100, then closes at 110. ROC(9) compares each close with
    // the close nine bars earlier: undefined on bars 0–8, 10% on bars 9–17
    // (110 against 100), 0% from bar 18 (110 against 110).
    const closes = [...new Array(9).fill(100), ...new Array(15).fill(110)];
    const run = await roc.run(pathBars(closes));
    const values = run.plot('ROC');
    expect(values.slice(0, 9)).toEqual(new Array(9).fill(null));
    for (const v of values.slice(9, 18)) expect(v).toBeCloseTo(10, 12);
    for (const v of values.slice(18)) expect(v).toBeCloseTo(0, 12);
  });

  it('matches the published formula on a realistic series', async () => {
    const bars = realisticDaily();
    const run = await roc.run(bars);
    expect(closeSeries(run.plot('ROC'), rateOfChange(field(bars, 'close'), 9))).toEqual({ ok: true });
  });

  it('follows the length and source a trader sets', async () => {
    const bars = realisticDaily();
    const run = await roc.run(bars, { length: 21, source: 'hl2' });
    expect(closeSeries(run.plot('ROC'), rateOfChange(hl2(bars), 21))).toEqual({ ok: true });
  });

  describe('around the zero line', () => {
    // 100 for nine bars, 110 for nine, 99 for nine, 110 for nine: ROC(9) is
    // +10% on bars 9–17, −10% on bars 18–26 (99 against 110) and +11.1% on
    // bars 27–35 (110 against 99). It crosses below zero on bar 18 and back
    // above on bar 27.
    const closes = [
      ...new Array(9).fill(100), ...new Array(9).fill(110),
      ...new Array(9).fill(99), ...new Array(9).fill(110),
    ];
    const bars = pathBars(closes);

    it('colours the line by which side of zero it is on', async () => {
      const run = await roc.run(bars);
      const colors = run.plotColors('ROC');
      // Bar 10 is +10% (above zero), bar 20 is -10% (below zero), bar 30 is
      // +11.1% (above zero again) — pin each region to its own colour, not
      // just to each other, so an inverted up/down ternary would be caught.
      expect(run.plot('ROC')[10]).toBeCloseTo(10, 12);
      expect(run.plot('ROC')[20]).toBeCloseTo(-10, 12);
      expect(colors[10]).toBe('#26a69a'); // default 'Above zero' colour
      expect(colors[20]).toBe('#ef5350'); // default 'Below zero' colour
      expect(colors[10]).not.toBe(colors[20]);
      expect(colors[30]).toBe(colors[10]);
      const recoloured = await roc.run(bars, { 'up-color': '#00ff00', 'down-color': '#ff00ff' });
      expect(recoloured.plotColors('ROC')[10]).toBe('#00ff00'); // above zero -> up-color
      expect(recoloured.plotColors('ROC')[20]).toBe('#ff00ff'); // below zero -> down-color
      expect(recoloured.plotColors('ROC')[10]).not.toBe(colors[10]);
      expect(recoloured.plotColors('ROC')[20]).not.toBe(colors[20]);
    });

    it('raises an alert on the bar it crosses zero, each way', async () => {
      const run = await roc.run(bars);
      expect(barsWhere(run.alert('Crossed above zero'))).toEqual([27]);
      expect(barsWhere(run.alert('Crossed below zero'))).toEqual([18]);
    });

    it('shows the change in price in the Data Window only', async () => {
      const run = await roc.run(bars);
      const change = run.plot('Change');
      expect(change.slice(0, 9)).toEqual(new Array(9).fill(null));
      expect(change[10]).toBeCloseTo(10, 12);
      expect(change[20]).toBeCloseTo(-11, 12);
      expect(change[30]).toBeCloseTo(11, 12);
      expect(run.shown('Change')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    });

    it('draws the zero line', async () => {
      const run = await roc.run(bars);
      expect(run.level('Zero')).toBe(0);
    });
  });
});
