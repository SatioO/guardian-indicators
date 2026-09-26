import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, closeSeries, parabolicSar, chopBars, type PackIndicator, type PackRun, type PackRuntime, type Maybe } from 'guardian-gscript-toolchain';

/**
 * The reference platform's Parabolic SAR, start 0.02, increment 0.02,
 * maximum 0.2 (Wilder's stop-and-reverse, as `parabolicSar` in the shared
 * references implements it). The pack draws it as dots: under price in an
 * up trend, over price in a down trend.
 */

/** The price each dot of a plotshape(location.absolute) marker is drawn at. */
function dotPrices(run: PackRun, title: string): Maybe[] {
  const output = run.snapshot.outputs.find((o) => o.title === title && o.kind === 'serial.event');
  const payload = output?.payload;
  const out: Maybe[] = new Array(run.bars.length).fill(null);
  if (payload?.kind !== 'serial.event') return out;
  const events = payload.events as
    | { encoding: 'dense'; values: readonly unknown[] }
    | { encoding: 'sparse'; barIndexes: readonly number[]; values: readonly unknown[] };
  const put = (bar: number, v: unknown) => { if (typeof v === 'number' && Number.isFinite(v)) out[bar] = v; };
  if (events.encoding === 'dense') events.values.forEach((v, bar) => put(bar, v));
  else if (events.encoding === 'sparse') events.barIndexes.forEach((bar, k) => put(bar, events.values[k]));
  else throw new Error(`unexpected encoding for '${title}'`);
  return out;
}

/** Which side of the close the SAR is on: +1 under (up trend), −1 over. */
const sideOf = (sar: readonly Maybe[], closes: readonly number[]) =>
  sar.map((v, i) => (v === null ? null : v < closes[i] ? 1 : v > closes[i] ? -1 : null));

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

describe('Parabolic SAR — a trailing stop that flips with the trend', () => {
  let runtime: PackRuntime;
  let psar: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    psar = await runtime.load('parabolic-sar');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  const chop = chopBars({ count: 300, intervalSec: 86_400, seed: 5 });

  it('starts under the first bar\'s low when the second bar closes higher', async () => {
    // Bar 1 closes above bar 0, so the trend starts up with the SAR at bar
    // 0's low (99). Bar 2 moves it 0.02 × (104 − 99) = 0.1 up, but it may not
    // sit above either of the last two lows, so it stays at 99. Bar 3 moves
    // it 0.04 × (106 − 99) = 0.28 to 99.28 (the step grew with bar 2's new
    // high).
    const rise = barsFrom([
      { open: 100, high: 101, low: 99, close: 100 },
      { open: 102, high: 104, low: 101.5, close: 103.5 },
      { open: 104, high: 106, low: 103.5, close: 105.5 },
      { open: 106, high: 108, low: 105.5, close: 107.5 },
    ]);
    const run = await psar.run(rise);
    const sar = run.plot('SAR');
    expect(sar[0]).toBeNull();
    expect(sar[1]).toBeCloseTo(99, 10);
    expect(sar[2]).toBeCloseTo(99, 10);
    expect(sar[3]).toBeCloseTo(99.28, 10);
  });

  it('matches the published definition on a choppy market', async () => {
    const run = await psar.run(chop);
    expect(closeSeries(run.plot('SAR'), parabolicSar(chop, 0.02, 0.02, 0.2))).toEqual({ ok: true });
    expect(run.shown('SAR')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });

  it('follows the start, increment and maximum a trader sets', async () => {
    const run = await psar.run(chop, { start: 0.01, increment: 0.015, maximum: 0.1 });
    expect(closeSeries(run.plot('SAR'), parabolicSar(chop, 0.01, 0.015, 0.1))).toEqual({ ok: true });
  });

  it('draws the SAR as dots, green under price in an up trend and red over it in a down trend', async () => {
    const run = await psar.run(chop);
    const ref = parabolicSar(chop, 0.02, 0.02, 0.2);
    const side = sideOf(ref, chop.map((b) => b.close));
    expect(side.filter((s) => s === 1).length).toBeGreaterThan(20);
    expect(side.filter((s) => s === -1).length).toBeGreaterThan(20);
    expect(closeSeries(dotPrices(run, 'Up-trend SAR'), ref.map((v, i) => (side[i] === 1 ? v : null)))).toEqual({ ok: true });
    expect(closeSeries(dotPrices(run, 'Down-trend SAR'), ref.map((v, i) => (side[i] === -1 ? v : null)))).toEqual({ ok: true });
    const shapes = run.snapshot.outputs.filter((o) => o.kind === 'serial.event').map((o) => [o.title, o.style.color]);
    expect(shapes).toEqual(expect.arrayContaining([['Up-trend SAR', '#26a69a'], ['Down-trend SAR', '#ef5350']]));
  });

  describe('flips', () => {
    const ref = parabolicSar(chop, 0.02, 0.02, 0.2);
    const side = sideOf(ref, chop.map((b) => b.close));
    const flipsTo = (to: 1 | -1) => barsWhere(side.map((s, i) => s === to && side[i - 1] === -to));

    it('raises an alert on every flip, up and down', async () => {
      const run = await psar.run(chop);
      expect(flipsTo(1).length).toBeGreaterThan(3);
      expect(barsWhere(run.alert('SAR flipped up'))).toEqual(flipsTo(1));
      expect(barsWhere(run.alert('SAR flipped down'))).toEqual(flipsTo(-1));
    });

    it('marks the flips only when the trader asks for flip markers', async () => {
      const plain = await psar.run(chop);
      expect(barsWhere(plain.markers('Flip up'))).toEqual([]);
      const marked = await psar.run(chop, { flips: true });
      expect(barsWhere(marked.markers('Flip up'))).toEqual(flipsTo(1));
      expect(barsWhere(marked.markers('Flip down'))).toEqual(flipsTo(-1));
    });
  });
});
