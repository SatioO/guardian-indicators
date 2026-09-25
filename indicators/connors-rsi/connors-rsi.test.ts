import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, realisticDaily, closeSeries, field, rma, type PackIndicator, type PackRuntime, type Maybe } from 'guardian-gscript-toolchain';

/**
 * Wilder's RSI as the reference platform's RSI study computes it:
 *   up   = rma(max(change(src), 0), length)
 *   down = rma(-min(change(src), 0), length)
 *   rsi  = down == 0 ? 100 : up == 0 ? 0 : 100 - 100 / (1 + up / down)
 */
function rsi(values: readonly number[], length: number): Maybe[] {
  const change = values.map((v, i) => (i === 0 ? null : v - values[i - 1]));
  const up = rma(change.map((c) => (c === null ? null : Math.max(c, 0))), length);
  const down = rma(change.map((c) => (c === null ? null : -Math.min(c, 0))), length);
  return up.map((u, i) => {
    const dn = down[i];
    if (u === null || dn === null) return null;
    if (dn === 0) return 100;
    if (u === 0) return 0;
    return 100 - 100 / (1 + u / dn);
  });
}

/**
 * The reference platform's up/down streak:
 *   ud := s == s[1] ? 0 : s > s[1] ? (nz(ud[1]) <= 0 ? 1 : nz(ud[1]) + 1)
 *                                  : (nz(ud[1]) >= 0 ? -1 : nz(ud[1]) - 1)
 * On the first bar there is no s[1], neither test passes, and it reads −1.
 */
function streakOf(values: readonly number[]): number[] {
  const out: number[] = [];
  let prev = 0;
  values.forEach((v, i) => {
    const before = i > 0 ? values[i - 1] : NaN;
    let next: number;
    if (v === before) next = 0;
    else if (v > before) next = prev <= 0 ? 1 : prev + 1;
    else next = prev >= 0 ? -1 : prev - 1;
    out.push(next);
    prev = next;
  });
  return out;
}

/**
 * Percent of the `length` PRECEDING values that are less than or equal to the
 * current one; undefined while any of them (or the current value) is missing.
 */
function percentRank(values: readonly Maybe[], length: number): Maybe[] {
  return values.map((v, i) => {
    if (v === null || i < length) return null;
    let count = 0;
    for (let k = i - length; k < i; k++) {
      const w = values[k];
      if (w === null) return null;
      if (w <= v) count += 1;
    }
    return (100 * count) / length;
  });
}

/**
 * The reference platform's Connors RSI (RSI length 3, up/down length 2, ROC
 * length 100, source close):
 *   crsi = avg(rsi(close, 3), rsi(updown(close), 2), percentrank(roc(close, 1), 100))
 */
function connorsRef(values: readonly number[], rsiLength = 3, streakLength = 2, rankLength = 100) {
  const priceRsi = rsi(values, rsiLength);
  const streak = streakOf(values);
  const streakRsi = rsi(streak, streakLength);
  const roc = values.map((v, i) => (i === 0 ? null : (100 * (v - values[i - 1])) / values[i - 1]));
  const rank = percentRank(roc, rankLength);
  const crsi = priceRsi.map((a, i) => {
    const b = streakRsi[i];
    const c = rank[i];
    return a === null || b === null || c === null ? null : (a + b + c) / 3;
  });
  return { crsi, priceRsi, streak, streakRsi, rank };
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

/** Bars where `values` crosses the fixed `level` in `dir`. */
function crossesLevel(values: readonly Maybe[], level: number, dir: 'above' | 'below'): number[] {
  return values.flatMap((v, i) => {
    const prev = i > 0 ? values[i - 1] : null;
    if (v === null || prev === null) return [];
    return (dir === 'above' ? v > level && prev <= level : v < level && prev >= level) ? [i] : [];
  });
}

describe('Connors RSI — price RSI, streak RSI and percent rank of the day’s change', () => {
  let runtime: PackRuntime;
  let crsi: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    crsi = await runtime.load('connors-rsi');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads 100 on an accelerating rise and 0 on an accelerating fall', async () => {
    // log(close) = ±0.0001·i², so every close is further from the last than the
    // one before was. Rising: RSI(3) has no losses (100); the up streak grows
    // every bar, so RSI(2) of it has no losses (100); each day's change beats
    // all 100 before it (percent rank 100). Falling: all three read 0.
    // The percent rank needs 100 earlier one-bar changes, so nothing is drawn
    // before bar 101.
    const rise = await crsi.run(pathBars(Array.from({ length: 120 }, (_, i) => 100 * Math.exp(0.0001 * i * i)), 0.01));
    const up = rise.plot('CRSI');
    expect(up.slice(0, 101)).toEqual(new Array(101).fill(null));
    for (const v of up.slice(101)) expect(v).toBeCloseTo(100, 9);

    const fall = await crsi.run(pathBars(Array.from({ length: 120 }, (_, i) => 100 * Math.exp(-0.0001 * i * i)), 0.001));
    for (const v of fall.plot('CRSI').slice(101)) expect(v).toBeCloseTo(0, 9);
  });

  it('counts the streak of up and down closes, resetting on an unchanged close', async () => {
    // 100, 101, 102, 102, 101, 100, 99, 100: the first bar has no previous
    // close and reads −1 (as the reference counts it), then +1, +2, 0 on the
    // unchanged close, −1, −2, −3, and +1 on the turn.
    const run = await crsi.run(pathBars([100, 101, 102, 102, 101, 100, 99, 100]));
    expect(run.plot('Streak')).toEqual([-1, 1, 2, 0, -1, -2, -3, 1]);
    expect(run.shown('Streak')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });

  it('matches the published formula and its three parts on a realistic series', async () => {
    const bars = realisticDaily();
    const run = await crsi.run(bars);
    const ref = connorsRef(field(bars, 'close'));
    expect(closeSeries(run.plot('CRSI'), ref.crsi)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Price RSI'), ref.priceRsi)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Streak RSI'), ref.streakRsi)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Percent rank'), ref.rank)).toEqual({ ok: true });
  });

  it('follows the three lengths a trader sets', async () => {
    const bars = realisticDaily();
    const run = await crsi.run(bars, { 'rsi-length': 5, 'streak-length': 3, 'rank-length': 50 });
    expect(closeSeries(run.plot('CRSI'), connorsRef(field(bars, 'close'), 5, 3, 50).crsi)).toEqual({ ok: true });
  });

  describe('bands', () => {
    const bars = realisticDaily(600, 7);
    const ref = connorsRef(field(bars, 'close'));

    it('draws the 90 / 50 / 10 bands and shades between the outer two', async () => {
      const run = await crsi.run(bars);
      expect(run.level('Upper band')).toBe(90);
      expect(run.level('Middle')).toBe(50);
      expect(run.level('Lower band')).toBe(10);
      const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
      expect(fills).toHaveLength(1);
      expect(fills[0].style.color).toBe('rgba(56, 189, 248, 0.1)');
    });

    it('colours the line above the upper band and below the lower band', async () => {
      const run = await crsi.run(bars);
      const colors = run.plotColors('CRSI');
      const side = (v: Maybe) => (v === null ? null : v > 90 ? 'high' : v < 10 ? 'low' : 'mid');
      const sides = ref.crsi.map(side);
      const pick = (s: string) => colors[sides.indexOf(s as 'high')];
      expect(new Set([pick('high'), pick('low'), pick('mid')]).size).toBe(3);
      sides.forEach((s, i) => {
        if (s !== null) expect(colors[i], `bar ${i}`).toBe(pick(s));
      });
    });

    it('alerts when CRSI crosses above the upper band or below the lower band', async () => {
      const run = await crsi.run(bars);
      const up = crossesLevel(ref.crsi, 90, 'above');
      const down = crossesLevel(ref.crsi, 10, 'below');
      expect(up.length).toBeGreaterThan(0);
      expect(down.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('Crossed above upper band'))).toEqual(up);
      expect(barsWhere(run.alert('Crossed below lower band'))).toEqual(down);
    });

    it('moves the bands where a trader sets them', async () => {
      const run = await crsi.run(bars, { upper: 95, lower: 5 });
      expect(run.level('Upper band')).toBe(95);
      expect(run.level('Lower band')).toBe(5);
      expect(barsWhere(run.alert('Crossed below lower band'))).toEqual(crossesLevel(ref.crsi, 5, 'below'));
    });
  });
});
