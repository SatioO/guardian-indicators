import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, flatRangeBars, realisticDaily, atr, closeSeries, field, rma, sma, trueRange, zip, type PackIndicator, type PackRuntime, type Maybe } from 'guardian-gscript-toolchain';

/**
 * The reference platform's Keltner Channels:
 *   basis = ema(source, length) — sma when "Use exponential MA" is off
 *   range = atr(atrLength)          (Bands style "Average True Range", default)
 *         | tr, first bar high − low (Bands style "True Range")
 *         | rma(high − low, length)  (Bands style "Range")
 *   upper = basis + mult × range, lower = basis − mult × range
 * Defaults: length 20, multiplier 2, source close, exponential on, ATR length 10.
 */

/** ta.ema: alpha 2 / (length + 1), seeded with the SMA of the first `length` values. */
function ema(values: readonly number[], length: number): Maybe[] {
  const alpha = 2 / (length + 1);
  let prev: number | null = null;
  return values.map((v, i) => {
    if (i + 1 < length) return null;
    prev = prev === null ? values.slice(0, length).reduce((a, b) => a + b, 0) / length : alpha * v + (1 - alpha) * prev;
    return prev;
  });
}

const bands = (basis: readonly Maybe[], range: readonly Maybe[], mult: number) => ({
  upper: zip(basis, range, (b, r) => b + mult * r),
  lower: zip(basis, range, (b, r) => b - mult * r),
});

describe('Keltner Channels — an average with volatility bands', () => {
  let runtime: PackRuntime;
  let kc: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    kc = await runtime.load('keltner-channels');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  const bars = realisticDaily();
  const closes = field(bars, 'close');

  it('reads 101 ± 4 on bars that always span 100 → 102 and close at 101', async () => {
    // Every true range is 2, so the ATR is 2 and the bands sit 2 × 2 away.
    const run = await kc.run(flatRangeBars(40, 100, 102));
    expect(run.plot('Basis').slice(0, 19)).toEqual(new Array(19).fill(null));
    expect(run.plot('Upper band').slice(0, 19)).toEqual(new Array(19).fill(null));
    for (const v of run.plot('Basis').slice(19)) expect(v).toBeCloseTo(101, 10);
    for (const v of run.plot('Upper band').slice(19)) expect(v).toBeCloseTo(105, 10);
    for (const v of run.plot('Lower band').slice(19)) expect(v).toBeCloseTo(97, 10);
  });

  it('draws a 20-bar EMA basis with bands 2 × the 10-bar ATR away by default', async () => {
    const run = await kc.run(bars);
    const basis = ema(closes, 20);
    const expected = bands(basis, atr(bars, 10), 2);
    expect(closeSeries(run.plot('Basis'), basis)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Upper band'), expected.upper)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Lower band'), expected.lower)).toEqual({ ok: true });
  });

  it('uses a simple average for the basis when exponential is switched off', async () => {
    const run = await kc.run(bars, { exponential: false });
    const basis = sma(closes, 20);
    expect(closeSeries(run.plot('Basis'), basis)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Upper band'), bands(basis, atr(bars, 10), 2).upper)).toEqual({ ok: true });
  });

  it('follows the length, multiplier, ATR length and source a trader sets', async () => {
    const run = await kc.run(bars, { length: 14, multiplier: 1.5, 'atr-length': 7, source: 'hlc3' });
    const hlc3 = bars.map((b) => (b.high + b.low + b.close) / 3);
    const expected = bands(ema(hlc3, 14), atr(bars, 7), 1.5);
    expect(closeSeries(run.plot('Upper band'), expected.upper)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Lower band'), expected.lower)).toEqual({ ok: true });
  });

  it('can set the bands by each bar\'s own true range', async () => {
    // The first bar has no prior close, so its true range is its high − low.
    const run = await kc.run(bars, { 'bands-style': 'True Range' });
    const expected = bands(ema(closes, 20), trueRange(bars), 2);
    expect(closeSeries(run.plot('Upper band'), expected.upper)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Lower band'), expected.lower)).toEqual({ ok: true });
  });

  it('can set the bands by the Wilder average of the high − low range over Length', async () => {
    const run = await kc.run(bars, { 'bands-style': 'Range' });
    const range = rma(bars.map((b) => b.high - b.low), 20);
    const expected = bands(ema(closes, 20), range, 2);
    expect(closeSeries(run.plot('Upper band'), expected.upper)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Lower band'), expected.lower)).toEqual({ ok: true });
  });

  it('offers the three band styles, average true range first', () => {
    const style = kc.manifest.inputs?.find((i) => i.key === 'input@bands-style');
    expect(style).toMatchObject({ kind: 'select', default: 'Average True Range' });
    expect(style?.kind === 'select' && style.options.map((o) => o.value))
      .toEqual(['Average True Range', 'True Range', 'Range']);
  });

  it('fills the channel between the bands', async () => {
    const run = await kc.run(bars);
    const titleOf = (key: string) => run.snapshot.outputs.find((o) => o.key === key)?.title;
    const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
    expect(fills.map((f) => [f.style.color, f.dependencies.map(titleOf)]))
      .toEqual([['rgba(56, 189, 248, 0.1)', ['Upper band', 'Lower band']]]);
    // Off uses a fully transparent fill (`color.new(bandColor, 100)`), not
    // `color: na` — the indicator never passes `na` as a fill color.
    const plain = await kc.run(bars, { shade: false });
    expect(plain.snapshot.outputs.filter((o) => o.kind === 'derived.fill').map((f) => f.style.color))
      .toEqual(['rgba(56, 189, 248, 0)']);
  });

  it('shows the channel width as a percent of the basis in the Data Window', async () => {
    const run = await kc.run(flatRangeBars(40, 100, 102));
    // (105 − 97) / 101 = 7.92 %.
    expect(run.plot('Band width %')[30]).toBeCloseTo((8 / 101) * 100, 10);
    expect(run.shown('Band width %')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });

  describe('breakouts', () => {
    // Forty quiet bars (100–102, close 101), a surge to 110 on bar 40, quiet
    // again, then a slump to 92 on bar 60. On bar 40 the true range is 11, so
    // the ATR is (9 × 2 + 11) / 10 = 2.9, the basis 101 + (2 / 21) × 9 =
    // 101.857 and the upper band 101.857 + 5.8 = 107.66: the close of 110 is
    // through it.
    const quiet = { open: 101, high: 102, low: 100, close: 101 };
    const shaped = barsFrom([
      ...new Array(40).fill(quiet),
      { open: 101, high: 111, low: 100, close: 110 },
      ...new Array(19).fill(quiet),
      { open: 101, high: 102, low: 91, close: 92 },
      ...new Array(10).fill(quiet),
    ]);
    const barsWhere = (values: readonly (boolean | null)[]) =>
      values.flatMap((hit, bar) => (hit ? [bar] : []));

    it('alerts when the close breaks out above the upper band or below the lower band', async () => {
      const run = await kc.run(shaped);
      expect(run.plot('Upper band')[40]).toBeCloseTo(101 + 18 / 21 + 5.8, 10);
      const expected = bands(ema(field(shaped, 'close'), 20), atr(shaped, 10), 2);
      const through = (line: Maybe[], side: 'above' | 'below') => shaped.flatMap((b, i) => {
        const [now, prev] = [line[i], line[i - 1]];
        if (i === 0 || now === null || prev === null) return [];
        const c = b.close;
        const pc = shaped[i - 1].close;
        return (side === 'above' ? c > now && pc <= prev : c < now && pc >= prev) ? [i] : [];
      });
      expect(through(expected.upper, 'above')).toEqual([40]);
      expect(through(expected.lower, 'below')).toEqual([60]);
      expect(barsWhere(run.alert('Close above upper band'))).toEqual([40]);
      expect(barsWhere(run.alert('Close below lower band'))).toEqual([60]);
    });
  });
});
