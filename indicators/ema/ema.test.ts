import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, realisticDaily, closeSeries, field, emaModule, SOURCE_KEYS, sourceValue, type PackIndicator, type PackRuntime, type Maybe, type SourceKey, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * Exponential average as the reference platform defines ta.ema: alpha =
 * 2 / (length + 1), seeded with the simple average of the first `length`
 * values, nothing drawn before that.
 */
function ema(values: readonly number[], length: number): Maybe[] {
  const alpha = 2 / (length + 1);
  const out: Maybe[] = new Array(values.length).fill(null);
  if (values.length < length) return out;
  let prev = values.slice(0, length).reduce((a, b) => a + b, 0) / length;
  out[length - 1] = prev;
  for (let i = length; i < values.length; i++) {
    prev = alpha * values[i] + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
}

/** The chart's built-in EMA (the TypeScript module), one value per bar. */
function builtInEma(bars: readonly OHLCV[], period: number, source: SourceKey): Maybe[] {
  const spec = emaModule.compute({ bars } as never, { period, source, color: '#38bdf8', lineWidth: 1 });
  const byTime = new Map<number, number>();
  for (const layer of spec.layers) {
    if (layer.kind === 'line') for (const p of layer.points) byTime.set(p.time as number, p.value);
  }
  return bars.map((b) => byTime.get(b.time as number) ?? null);
}

const barsWhere = (xs: readonly (boolean | null)[]) => xs.flatMap((x, i) => (x ? [i] : []));

describe('pack: ema', () => {
  let runtime: PackRuntime;
  let ind: PackIndicator;

  beforeAll(async () => {
    runtime = await createTestRuntime();
    ind = await runtime.load('ema');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  const bars = realisticDaily();

  it('works a 3-bar EMA by hand: seeded with the simple average, then halves toward each close', async () => {
    const run = await ind.run(pathBars([1, 2, 3, 4, 5, 3]), { period: 3 });
    // seed (1+2+3)/3 = 2; α = 0.5 → 3, 4, then 0.5·3 + 0.5·4 = 3.5
    expect(run.plot('EMA')).toEqual([null, null, 2, 3, 4, 3.5]);
  });

  it('draws a 9-bar EMA of the close by default', async () => {
    const run = await ind.run(bars);
    expect(closeSeries(run.plot('EMA'), ema(field(bars, 'close') as number[], 9))).toEqual({ ok: true });
  });

  it.each([1, 9, 20, 50, 200])('matches the built-in EMA bar for bar at period %i', async (period) => {
    const run = await ind.run(bars, { period });
    expect(closeSeries(run.plot('EMA'), builtInEma(bars, period, 'close'))).toEqual({ ok: true });
  });

  it.each(SOURCE_KEYS.filter((k) => k !== 'close'))('matches the built-in EMA over the %s source', async (source) => {
    const run = await ind.run(bars, { period: 20, source });
    const expected = ema(bars.map((b) => sourceValue(b, source)), 20);
    expect(closeSeries(run.plot('EMA'), expected)).toEqual({ ok: true });
    expect(closeSeries(run.plot('EMA'), builtInEma(bars, 20, source))).toEqual({ ok: true });
  });

  it('draws nothing until the period is loaded', async () => {
    const run = await ind.run(bars.slice(0, 30), { period: 50 });
    expect(run.plot('EMA').every((v) => v === null)).toBe(true);
  });

  it('draws one line on the price chart, shown in the legend and Data Window', async () => {
    const run = await ind.run(bars);
    expect(run.outputs()).toEqual([{ title: 'EMA', kind: 'serial.numeric', visual: 'line' }]);
    expect(run.shown('EMA')).toEqual({ pane: true, dataWindow: true, statusLine: true });
    expect(ind.manifest.placement).toBe('price');
  });

  it('takes the built-in EMA\'s inputs and defaults', () => {
    const inputs = (ind.manifest.inputs ?? []).map((i) => ({ label: i.label, default: (i as { default?: unknown }).default }));
    expect(inputs).toEqual([
      { label: 'Period', default: 9 },
      { label: 'Source', default: 'close' },
      { label: 'Color', default: '#38bdf8' },
      { label: 'Line width', default: 1 },
    ]);
  });

  it('draws the line in the chosen colour and width', async () => {
    const run = await ind.run(bars, { color: '#ff0000', 'line-width': 3 });
    const output = run.snapshot.outputs.find((o) => o.title === 'EMA');
    expect(output?.style).toMatchObject({ color: '#ff0000', lineWidth: 3 });
  });

  it('fires the cross alerts on the bar the close crosses the EMA', async () => {
    // Flat at 10, a spike to 14 (crosses above at bar 10), back down (crosses below at bar 12).
    const closes = [...new Array(10).fill(10), 14, 14, 6, 6];
    const run = await ind.run(pathBars(closes), { period: 3 });
    expect(barsWhere(run.alert('Close crossed above the EMA'))).toEqual([10]);
    expect(barsWhere(run.alert('Close crossed below the EMA'))).toEqual([12]);
  });
});
