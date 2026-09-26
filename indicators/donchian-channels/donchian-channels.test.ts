import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, realisticDaily, closeSeries, field, zip, type PackIndicator, type PackRuntime, type Maybe } from 'guardian-gscript-toolchain';

/**
 * The reference platform's Donchian Channels, length 20:
 *   upper = highest high of the last 20 bars, lower = lowest low,
 *   basis = (upper + lower) / 2.
 * The breakout rule the pack adds: a close above the PREVIOUS bar's upper
 * band (a new 20-bar high close), on the first bar it happens — the close
 * was at or below the band the bar before. Breakdowns mirror it.
 */

function highest(values: readonly number[], length: number): Maybe[] {
  return values.map((_, i) => (i + 1 < length ? null : Math.max(...values.slice(i - length + 1, i + 1))));
}

function lowest(values: readonly number[], length: number): Maybe[] {
  return values.map((_, i) => (i + 1 < length ? null : Math.min(...values.slice(i - length + 1, i + 1))));
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

describe('Donchian Channels — the highest high and lowest low', () => {
  let runtime: PackRuntime;
  let dc: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    dc = await runtime.load('donchian-channels');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  const bars = realisticDaily();

  it('draws the 20-bar highest high, lowest low and their midpoint by default', async () => {
    const run = await dc.run(bars);
    const upper = highest(field(bars, 'high'), 20);
    const lower = lowest(field(bars, 'low'), 20);
    expect(closeSeries(run.plot('Upper band'), upper)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Lower band'), lower)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Basis'), zip(upper, lower, (u, l) => (u + l) / 2))).toEqual({ ok: true });
  });

  it('follows the length a trader sets, and shifts every line by the offset', async () => {
    const run = await dc.run(bars, { length: 55, offset: 2 });
    expect(closeSeries(run.plot('Upper band'), highest(field(bars, 'high'), 55))).toEqual({ ok: true });
    expect(closeSeries(run.plot('Lower band'), lowest(field(bars, 'low'), 55))).toEqual({ ok: true });
    const offsets = ['Upper band', 'Basis', 'Lower band']
      .map((t) => run.snapshot.outputs.find((o) => o.title === t)?.offsetBars);
    expect(offsets).toEqual([2, 2, 2]);
  });

  it('fills the channel between the bands', async () => {
    const run = await dc.run(bars);
    const titleOf = (key: string) => run.snapshot.outputs.find((o) => o.key === key)?.title;
    const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
    expect(fills.map((f) => [f.style.color, f.dependencies.map(titleOf)]))
      .toEqual([['rgba(56, 189, 248, 0.1)', ['Upper band', 'Lower band']]]);
  });

  describe('breakouts', () => {
    // Thirty quiet bars spanning 100–102. Bar 30 closes at 103, over the
    // previous bar's upper band of 102: a breakout. Bar 31 closes higher
    // still, but the close was already above the band, so it is the same
    // breakout. Quiet again from bar 32; bar 60 closes at 97, under the
    // previous bar's lower band of 100: a breakdown.
    const quiet = { open: 101, high: 102, low: 100, close: 101 };
    const shaped = barsFrom([
      ...new Array(30).fill(quiet),
      { open: 101, high: 103.5, low: 100.5, close: 103 },
      { open: 103, high: 104.5, low: 102.5, close: 104 },
      ...new Array(28).fill(quiet),
      { open: 101, high: 101.5, low: 96.5, close: 97 },
      ...new Array(10).fill(quiet),
    ]);

    it('marks the first close beyond the previous bar\'s band, up and down', async () => {
      const run = await dc.run(shaped);
      expect(barsWhere(run.markers('Breakout'))).toEqual([30]);
      expect(barsWhere(run.markers('Breakdown'))).toEqual([60]);
    });

    it('raises the breakout and breakdown alerts on the same bars', async () => {
      const run = await dc.run(shaped);
      expect(barsWhere(run.alert('Breakout'))).toEqual([30]);
      expect(barsWhere(run.alert('Breakdown'))).toEqual([60]);
    });

    it('can hide the markers and keep the alerts', async () => {
      const run = await dc.run(shaped, { signals: false });
      expect(barsWhere(run.markers('Breakout'))).toEqual([]);
      expect(barsWhere(run.alert('Breakout'))).toEqual([30]);
      expect(barsWhere(run.markers('Breakdown'))).toEqual([]);
      expect(barsWhere(run.alert('Breakdown'))).toEqual([60]);
    });
  });

  it('matches the breakout rule on a real series', async () => {
    // Swinging closes so the channel is broken both ways many times.
    const swings = barsFrom(Array.from({ length: 300 }, (_, i) => {
      const c = 100 + 10 * Math.sin(i / 11) + 4 * Math.sin(i / 3.1);
      return { open: c - 0.3, high: c + 1, low: c - 1, close: c };
    }));
    const run = await dc.run(swings);
    const closes = field(swings, 'close');
    const upper = highest(field(swings, 'high'), 20);
    const lower = lowest(field(swings, 'low'), 20);
    const rule = (band: Maybe[], side: 'up' | 'down') => closes.flatMap((c, i) => {
      if (i < 2 || band[i - 1] === null || band[i - 2] === null) return [];
      const [prev, prev2] = [band[i - 1] as number, band[i - 2] as number];
      const beyond = side === 'up' ? c > prev : c < prev;
      const wasBeyond = side === 'up' ? closes[i - 1] > prev2 : closes[i - 1] < prev2;
      return beyond && !wasBeyond ? [i] : [];
    });
    expect(rule(upper, 'up').length).toBeGreaterThan(2);
    expect(rule(lower, 'down').length).toBeGreaterThan(2);
    expect(barsWhere(run.markers('Breakout'))).toEqual(rule(upper, 'up'));
    expect(barsWhere(run.markers('Breakdown'))).toEqual(rule(lower, 'down'));
  });
});
