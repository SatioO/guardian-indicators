import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, pathBars, realisticDaily, closeSeries, field, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * The reference platform's `highestbars(src, n)`: the offset of the highest
 * value in the last n bars, counted NEGATIVE — 0 is this bar, −(n−1) the oldest.
 * `lowestbars` mirrors it. Missing until n bars exist. The fixtures below never
 * hold two equal extremes in one window, so no tie rule is assumed.
 */
function extremeBars(values: readonly number[], n: number, pick: (a: number, b: number) => boolean): Maybe[] {
  return values.map((_, i) => {
    if (i + 1 < n) return null;
    let best = i;
    for (let k = i - n + 1; k <= i; k++) if (pick(values[k], values[best])) best = k;
    return -(i - best);
  });
}

/**
 * The reference platform's Aroon (length 14):
 *   up   = 100 · (highestbars(high, length + 1) + length) / length
 *   down = 100 · (lowestbars(low,  length + 1) + length) / length
 * so 100 on the bar of a new high (low) and 0 when it is `length` bars old.
 */
function aroon(bars: readonly OHLCV[], length: number): { up: Maybe[]; down: Maybe[] } {
  const hb = extremeBars(field(bars, 'high'), length + 1, (a, b) => a > b);
  const lb = extremeBars(field(bars, 'low'), length + 1, (a, b) => a < b);
  return {
    up: hb.map((o) => (o === null ? null : (100 * (o + length)) / length)),
    down: lb.map((o) => (o === null ? null : (100 * (o + length)) / length)),
  };
}

/** Bars where `a` crosses above (up) or below (down) `b`. */
function crossings(a: readonly Maybe[], b: readonly Maybe[]): { up: number[]; down: number[] } {
  const up: number[] = [];
  const down: number[] = [];
  for (let i = 1; i < a.length; i++) {
    const [a0, b0, a1, b1] = [a[i], b[i], a[i - 1], b[i - 1]];
    if (a0 === null || b0 === null || a1 === null || b1 === null) continue;
    if (a0 > b0 && a1 <= b1) up.push(i);
    if (a0 < b0 && a1 >= b1) down.push(i);
  }
  return { up, down };
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

/**
 * A slow slide (every high and low a little under the last) with one spike
 * high on bar 20. Each bar's low is the lowest of its window, so Aroon Down
 * reads 100 throughout; Aroon Up reads 0 until the spike, 100 on it, then falls
 * by 100/14 a bar until the spike is 14 bars old.
 */
const spike = barsFrom(Array.from({ length: 40 }, (_, i) => {
  const low = 198 - 0.1 * i;
  return { open: low + 1, high: i === 20 ? 210 : low + 2, low, close: low + 1 };
}));

/** A market that swings every few weeks, so the lines cross often. */
const swings = pathBars(Array.from({ length: 300 }, (_, i) => 200 + 15 * Math.sin(i / 8) + 3 * Math.sin(i * 1.7)), 1);

describe('Aroon — how long since the high and the low', () => {
  let runtime: PackRuntime;
  let ar: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    ar = await runtime.load('aroon');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('draws Aroon Up and Aroon Down as the reference defines them, from bar 14', async () => {
    const bars = realisticDaily();
    const run = await ar.run(bars);
    const ref = aroon(bars, 14);
    expect(closeSeries(run.plot('Aroon Up'), ref.up)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Aroon Down'), ref.down)).toEqual({ ok: true });
  });

  it('reads 100 on the bar of a new high and falls 100/14 a bar after it, worked by hand', async () => {
    const run = await ar.run(spike);
    const up = run.plot('Aroon Up');
    expect(up.slice(0, 14)).toEqual(new Array(14).fill(null));
    expect(up.slice(14, 20)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(up[20]).toBe(100);
    expect(up[27]).toBeCloseTo(50, 12);
    expect(up[34]).toBeCloseTo(0, 12);
    expect(up[35]).toBeCloseTo(0, 12);
    for (const v of run.plot('Aroon Down').slice(14)) expect(v).toBe(100);
  });

  it('follows the Length a trader sets', async () => {
    const bars = realisticDaily();
    const run = await ar.run(bars, { length: 25 });
    const ref = aroon(bars, 25);
    expect(closeSeries(run.plot('Aroon Up'), ref.up)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Aroon Down'), ref.down)).toEqual({ ok: true });
  });

  it('counts the bars since the high and the low in the Data Window', async () => {
    const run = await ar.run(spike);
    expect(run.plot('Bars since high')[27]).toBe(7);
    expect(run.plot('Bars since low')[27]).toBe(0);
    expect(run.shown('Bars since high')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    expect(run.shown('Bars since low')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });

  describe('oscillator', () => {
    it('draws Up − Down as columns when the oscillator is switched on', async () => {
      const bars = realisticDaily();
      const run = await ar.run(bars, { oscillator: true });
      const ref = aroon(bars, 14);
      const osc = ref.up.map((u, i) => (u === null ? null : u - (ref.down[i] as number)));
      expect(closeSeries(run.plot('Aroon Oscillator'), osc)).toEqual({ ok: true });
      expect(run.outputs().find((o) => o.title === 'Aroon Oscillator')?.visual).toBe('columns');
    });

    it('colours the oscillator by which side leads', async () => {
      const run = await ar.run(spike, { oscillator: true });
      const colors = run.plotColors('Aroon Oscillator');
      expect(colors[20]).not.toBe(colors[27]); // 0 (a tie) against −50
      expect(run.plot('Aroon Oscillator')[27]).toBeCloseTo(-50, 12);
    });

    it('stays off the pane by default', async () => {
      const run = await ar.run(realisticDaily());
      expect(run.plot('Aroon Oscillator').every((v) => v === null)).toBe(true);
    });
  });

  it('raises the cross alerts on the bars Aroon Up and Aroon Down cross', async () => {
    const run = await ar.run(swings);
    const ref = aroon(swings, 14);
    const expected = crossings(ref.up, ref.down);
    expect(expected.up.length).toBeGreaterThan(2);
    expect(expected.down.length).toBeGreaterThan(2);
    expect(barsWhere(run.alert('Bullish cross'))).toEqual(expected.up);
    expect(barsWhere(run.alert('Bearish cross'))).toEqual(expected.down);
  });

  it('draws dashed guides at 70 and 30 by default', async () => {
    const run = await ar.run(spike);
    expect(run.level('Strong trend level')).toBe(70);
    expect(run.level('Weak trend level')).toBe(30);
  });

  it('follows the trend levels a trader sets', async () => {
    const run = await ar.run(spike, { 'strong-trend-level': 80, 'weak-trend-level': 20 });
    expect(run.level('Strong trend level')).toBe(80);
    expect(run.level('Weak trend level')).toBe(20);
  });
});
