import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, realisticDaily, closeSeries, field, map, sma, zip, type PackIndicator, type PackRuntime, type Maybe } from 'guardian-gscript-toolchain';

/**
 * The reference platform's Envelope: basis = sma(source, 20) (ema when
 * "Exponential" is on), upper = basis × (1 + 10 / 100), lower = basis ×
 * (1 − 10 / 100). Defaults: length 20, percent 10, source close,
 * exponential off.
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

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

describe('Envelope — a fixed-percent band around an average', () => {
  let runtime: PackRuntime;
  let env: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    env = await runtime.load('envelope');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  const bars = realisticDaily();
  const closes = field(bars, 'close');

  it('reads 110 and 90 around closes that hold at 100', async () => {
    const run = await env.run(pathBars(new Array(30).fill(100)));
    expect(run.plot('Upper band').slice(0, 19)).toEqual(new Array(19).fill(null));
    for (const v of run.plot('Basis').slice(19)) expect(v).toBeCloseTo(100, 10);
    for (const v of run.plot('Upper band').slice(19)) expect(v).toBeCloseTo(110, 10);
    for (const v of run.plot('Lower band').slice(19)) expect(v).toBeCloseTo(90, 10);
  });

  it('puts the bands 10% either side of the 20-bar simple average by default', async () => {
    const run = await env.run(bars);
    const basis = sma(closes, 20);
    expect(closeSeries(run.plot('Basis'), basis)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Upper band'), map(basis, (b) => b * 1.1))).toEqual({ ok: true });
    expect(closeSeries(run.plot('Lower band'), map(basis, (b) => b * 0.9))).toEqual({ ok: true });
  });

  it('follows the length, percent and source a trader sets, exponential when asked', async () => {
    const run = await env.run(bars, { length: 10, percent: 2.5, exponential: true, source: 'hl2' });
    const hl2 = bars.map((b) => (b.high + b.low) / 2);
    const basis = ema(hl2, 10);
    expect(closeSeries(run.plot('Basis'), basis)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Upper band'), map(basis, (b) => b * 1.025))).toEqual({ ok: true });
    expect(closeSeries(run.plot('Lower band'), map(basis, (b) => b * 0.975))).toEqual({ ok: true });
  });

  it('fills the envelope between the bands', async () => {
    const run = await env.run(bars);
    const titleOf = (key: string) => run.snapshot.outputs.find((o) => o.key === key)?.title;
    const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
    expect(fills.map((f) => [f.style.color, f.dependencies.map(titleOf)]))
      .toEqual([['rgba(56, 189, 248, 0.1)', ['Upper band', 'Lower band']]]);
  });

  it('shows how far the close is from the basis, as a percent, in the Data Window', async () => {
    const run = await env.run(bars);
    const distance = zip(closes, sma(closes, 20), (c, b) => (c / b - 1) * 100);
    expect(closeSeries(run.plot('Distance from basis %'), distance)).toEqual({ ok: true });
    expect(run.shown('Distance from basis %')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });

  describe('stretched too far', () => {
    // Twenty closes at 100, then a jump to 115 on bar 20: the basis is
    // (100·19 + 115) / 20 = 100.75, the upper band 110.825, and the close is
    // above it. It falls back to 100 on bar 21 and holds; on bar 45 a drop
    // to 88 brings the basis to (100·19 + 88) / 20 = 99.4 and the lower band
    // to 89.46, and the close is under it.
    const path = pathBars([
      ...new Array(20).fill(100),
      115,
      ...new Array(24).fill(100),
      88,
      ...new Array(5).fill(100),
    ], 0.5);

    it('alerts when the close crosses outside the envelope', async () => {
      const run = await env.run(path);
      expect(run.plot('Upper band')[20]).toBeCloseTo(100.75 * 1.1, 10);
      expect(run.plot('Lower band')[45]).toBeCloseTo(99.4 * 0.9, 10);
      expect(barsWhere(run.alert('Close above upper band'))).toEqual([20]);
      expect(barsWhere(run.alert('Close below lower band'))).toEqual([45]);
    });
  });
});
