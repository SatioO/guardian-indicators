import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, realisticDaily, closeSeries, supertrend, type PackIndicator, type PackRuntime, type Maybe } from 'guardian-gscript-toolchain';

/** Bars where the reference direction flips, and which way. */
function flips(direction: readonly Maybe[]): { up: number[]; down: number[] } {
  const up: number[] = [];
  const down: number[] = [];
  for (let i = 1; i < direction.length; i++) {
    if (direction[i - 1] === 1 && direction[i] === -1) up.push(i);
    if (direction[i - 1] === -1 && direction[i] === 1) down.push(i);
  }
  return { up, down };
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

describe('Supertrend — ATR trailing trend line', () => {
  let runtime: PackRuntime;
  let st: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    st = await runtime.load('supertrend');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  // A fall, a base, a rally and a second fall: three flips a trader would see.
  const swings = pathBars([
    ...Array.from({ length: 30 }, (_, i) => 200 - i * 2),
    ...Array.from({ length: 10 }, () => 140),
    ...Array.from({ length: 35 }, (_, i) => 140 + i * 2.5),
    ...Array.from({ length: 30 }, (_, i) => 227 - i * 3),
  ], 1.5);

  it('draws the up-trend line under price and the down-trend line over it', async () => {
    const bars = realisticDaily();
    const run = await st.run(bars);
    const ref = supertrend(bars, 3, 10);
    const up = ref.line.map((v, i) => (ref.direction[i] === -1 ? v : null));
    const down = ref.line.map((v, i) => (ref.direction[i] === 1 ? v : null));
    expect(closeSeries(run.plot('Up trend'), up)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Down trend'), down)).toEqual({ ok: true });
  });

  it('follows the ATR length and factor a trader sets', async () => {
    const bars = realisticDaily();
    const run = await st.run(bars, { 'atr-length': 7, factor: 2 });
    const ref = supertrend(bars, 2, 7);
    const up = ref.line.map((v, i) => (ref.direction[i] === -1 ? v : null));
    expect(closeSeries(run.plot('Up trend'), up)).toEqual({ ok: true });
  });

  it('marks every flip once, on the bar it happens', async () => {
    const run = await st.run(swings);
    const expected = flips(supertrend(swings, 3, 10).direction);
    expect(expected.up.length).toBeGreaterThan(0);
    expect(expected.down.length).toBeGreaterThan(0);
    expect(barsWhere(run.markers('Buy'))).toEqual(expected.up);
    expect(barsWhere(run.markers('Sell'))).toEqual(expected.down);
  });

  it('hides the flip markers when signals are switched off', async () => {
    const run = await st.run(swings, { signals: false });
    expect(barsWhere(run.markers('Buy'))).toEqual([]);
    expect(barsWhere(run.markers('Sell'))).toEqual([]);
  });

  it('raises the trend alerts on the flip bars', async () => {
    const run = await st.run(swings);
    const expected = flips(supertrend(swings, 3, 10).direction);
    expect(barsWhere(run.alert('Trend turned up'))).toEqual(expected.up);
    expect(barsWhere(run.alert('Trend turned down'))).toEqual(expected.down);
    expect(barsWhere(run.alert('Trend changed'))).toEqual([...expected.up, ...expected.down].sort((a, b) => a - b));
  });

  it('shades the trend between price and the line, green up and red down', async () => {
    const run = await st.run(swings);
    const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
    expect(fills).toHaveLength(2);
    expect(fills.map((o) => o.style.color)).toEqual(['rgba(38, 166, 154, 0.12)', 'rgba(239, 83, 80, 0.12)']);
  });

  it('keeps drawing the line when the shading is turned off', async () => {
    const run = await st.run(swings, { shade: false });
    const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
    expect(fills.map((o) => o.style.color)).toEqual(['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)']);
    expect(run.plot('Up trend').some((v) => v !== null)).toBe(true);
  });

  it('reports the direction in the Data Window only', async () => {
    const run = await st.run(swings);
    const ref = supertrend(swings, 3, 10);
    expect(closeSeries(run.plot('Direction'), ref.direction)).toEqual({ ok: true });
    expect(run.shown('Direction')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });

  it('reports the stop distance from close, as a percent, in the Data Window only', async () => {
    const run = await st.run(swings);
    const ref = supertrend(swings, 3, 10);
    // Published as the gap between close and the trailing line, in the same
    // units a trader would size a stop with: percent of the current close.
    const expected = ref.line.map((line, i) =>
      line === null ? null : (Math.abs(swings[i].close - line) / swings[i].close) * 100,
    );
    expect(closeSeries(run.plot('Stop distance %'), expected)).toEqual({ ok: true });
    expect(run.shown('Stop distance %')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });
});
