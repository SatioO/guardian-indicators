import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, closeSeries, field, sma, zip, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/*
 * Reference contract — the classic Squeeze Momentum study:
 *
 *   Bollinger:  basis = SMA(close, 20), dev = 2.0 × stdev(close, 20) (population)
 *   Keltner:    ma = SMA(close, 20), range = true range (or high − low),
 *               rangeMa = SMA(range, 20), bands = ma ± 1.5 × rangeMa
 *   squeeze on  = lowerBB > lowerKC and upperBB < upperKC  (Bollinger inside Keltner)
 *   squeeze off = defined and not on; it FIRES on the bar it goes on → off
 *   momentum = linreg(close − avg(avg(highest(high, 20), lowest(low, 20)),
 *                                  SMA(close, 20)), 20, 0)
 *   colours: above 0 — rising (> previous, previous na counts as 0) bright
 *            green, otherwise dark green; at or below 0 — falling (< previous)
 *            bright red, otherwise dark red
 *
 * The widely shared original multiplies the Bollinger deviation by the Keltner
 * factor (1.5); this pack uses the 2.0 its inputs name. The true range is the
 * reference's `tr`, undefined on the first bar (no previous close), so the
 * Keltner average and the squeeze state start on bar 20. linreg(src, n, 0) is
 * the least-squares line through the last n values (oldest at x = 0) read at
 * the newest bar, x = n − 1.
 */

type Range = 'true' | 'bar';

function stdevPopulation(values: readonly Maybe[], length: number): Maybe[] {
  return values.map((_, i) => {
    if (i + 1 < length) return null;
    const window = values.slice(i - length + 1, i + 1);
    if (window.some((v) => v === null)) return null;
    const xs = window as number[];
    const mean = xs.reduce((a, b) => a + b, 0) / length;
    return Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / length);
  });
}

/** The reference's `tr`: undefined on the first bar, which has no previous close. */
const trueRangeOrNa = (bars: readonly OHLCV[]): Maybe[] => bars.map((bar, i) => {
  if (i === 0) return null;
  const prev = bars[i - 1].close;
  return Math.max(bar.high - bar.low, Math.abs(bar.high - prev), Math.abs(bar.low - prev));
});

function windowExtreme(values: readonly number[], length: number, pick: (...xs: number[]) => number): Maybe[] {
  return values.map((_, i) => (i + 1 < length ? null : pick(...values.slice(i - length + 1, i + 1))));
}

/** Least-squares line through the last `length` values, read at the newest bar. */
function linreg(values: readonly Maybe[], length: number): Maybe[] {
  return values.map((_, i) => {
    if (i + 1 < length) return null;
    const ys = values.slice(i - length + 1, i + 1);
    if (ys.some((v) => v === null)) return null;
    let sx = 0;
    let sy = 0;
    let sxy = 0;
    let sxx = 0;
    ys.forEach((y, x) => {
      sx += x;
      sy += y!;
      sxy += x * y!;
      sxx += x * x;
    });
    const slope = (length * sxy - sx * sy) / (length * sxx - sx * sx);
    const intercept = (sy - slope * sx) / length;
    return intercept + slope * (length - 1);
  });
}

interface Squeeze {
  on: (boolean | null)[];
  momentum: Maybe[];
}

function squeeze(bars: readonly OHLCV[], opts = { bbLength: 20, bbMult: 2, kcLength: 20, kcMult: 1.5, range: 'true' as Range }): Squeeze {
  const close = field(bars, 'close');
  const basis = sma(close, opts.bbLength);
  const dev = stdevPopulation(close, opts.bbLength);
  const ma = sma(close, opts.kcLength);
  const range = opts.range === 'true' ? trueRangeOrNa(bars) : bars.map((b) => b.high - b.low);
  const rangeMa = sma(range, opts.kcLength);
  const on = bars.map((_, i) => {
    const [b, d, m, r] = [basis[i], dev[i], ma[i], rangeMa[i]];
    if (b === null || d === null || m === null || r === null) return null;
    return b - opts.bbMult * d > m - opts.kcMult * r && b + opts.bbMult * d < m + opts.kcMult * r;
  });
  const hi = windowExtreme(field(bars, 'high'), opts.kcLength, Math.max);
  const lo = windowExtreme(field(bars, 'low'), opts.kcLength, Math.min);
  const mid = zip(zip(hi, lo, (h, l) => (h + l) / 2), ma, (a, b) => (a + b) / 2);
  const momentum = linreg(zip(close, mid, (c, m) => c - m), opts.kcLength);
  return { on, momentum };
}

type Shade = 'rising-above' | 'falling-above' | 'falling-below' | 'rising-below';

function shades(momentum: readonly Maybe[]): (Shade | null)[] {
  return momentum.map((v, i) => {
    if (v === null) return null;
    const prev = momentum[i - 1] ?? 0;
    if (v > 0) return v > prev ? 'rising-above' : 'falling-above';
    return v < prev ? 'falling-below' : 'rising-below';
  });
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

/**
 * Marker bars from bar 20 on. Bar 19 is left to the known-issue test at the end
 * of this file: the language draws a squeeze state there one bar early.
 */
const fromBar20 = (values: readonly boolean[]) => barsWhere(values).filter((bar) => bar >= 20);

/** A deterministic random walk whose swing size changes in waves. */
function walk(count: number, seed: number): number[] {
  let s = seed;
  const rnd = () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return s / 0x100000000;
  };
  const closes = [400];
  for (let i = 1; i < count; i++) {
    const swing = 0.008 + 0.03 * Math.abs(Math.sin(i / 45));
    closes.push(closes[i - 1] * Math.exp((rnd() - 0.48) * swing));
  }
  return closes;
}

const market = pathBars(walk(500, 17), 1.2);

describe('Squeeze Momentum — Bollinger inside Keltner, with a momentum histogram', () => {
  let runtime: PackRuntime;
  let sqz: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    sqz = await runtime.load('squeeze-momentum');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads a constant 9.75 on a steady climb of one rupee a bar', async () => {
    // Close c rises 1 a bar and each bar wicks 0.5 past its open and close.
    // From bar 20 on: highest high = c + 0.5, lowest low = c − 20 − 0.5, so
    // their middle is c − 10; SMA(close, 20) = c − 9.5; the average of the two
    // is c − 9.75, so close minus it (the linreg's source) is 9.75 on every
    // bar from bar 20 on — except bar 19, where pathBars gives bar 0 a
    // symmetric wick (open = close there), so its high and low both sit
    // inside the bar-20-on window's extremes; the source is 9.5 on bar 19,
    // not 9.75. The first full 20-bar linreg window (source bars 19–38) is on
    // bar 38: a regression through nineteen 9.75s and one 9.5 (at the oldest
    // point), evaluated at the newest point, comes out at 9.771428571428572 —
    // only bar 39 on is a window of 9.75s throughout.
    const run = await sqz.run(pathBars(Array.from({ length: 60 }, (_, i) => 100 + i), 0.5));
    const values = run.plot('Momentum');
    expect(values.slice(0, 38)).toEqual(new Array(38).fill(null));
    expect(values[38]).toBeCloseTo(9.771428571428572, 9);
    for (const value of values.slice(39)) expect(value).toBeCloseTo(9.75, 9);
  });

  const ref = squeeze(market);

  it('matches the published momentum formula', async () => {
    const run = await sqz.run(market);
    expect(closeSeries(run.plot('Momentum'), ref.momentum)).toEqual({ ok: true });
  });

  it('draws momentum as columns in four shades: rising and falling, above and below zero', async () => {
    const run = await sqz.run(market);
    expect(run.outputs().find((o) => o.title === 'Momentum')?.visual).toBe('columns');
    const colors = run.plotColors('Momentum');
    const shade = shades(ref.momentum);
    const byShade = new Map<Shade, Set<string | null>>();
    shade.forEach((s, i) => {
      if (s !== null) byShade.set(s, (byShade.get(s) ?? new Set()).add(colors[i]));
    });
    // Every shade occurs, each is drawn in exactly one colour, and all four differ.
    expect([...byShade.keys()].sort()).toEqual(['falling-above', 'falling-below', 'rising-above', 'rising-below']);
    for (const set of byShade.values()) expect(set.size).toBe(1);
    expect(new Set([...byShade.values()].map((set) => [...set][0])).size).toBe(4);
  });

  describe('the squeeze', () => {
    const defined = ref.on.map((v) => v !== null);
    const onBars = barsWhere(ref.on);
    const offBars = barsWhere(ref.on.map((v, i) => defined[i] && !v));
    const fired = barsWhere(ref.on.map((v, i) => i > 0 && ref.on[i - 1] === true && v === false));

    it('dots the zero line while it is on, and in another colour while it is off', async () => {
      const run = await sqz.run(market);
      expect(onBars.length).toBeGreaterThan(0);
      expect(offBars.length).toBeGreaterThan(0);
      expect(fromBar20(run.markers('Squeeze on'))).toEqual(onBars);
      expect(fromBar20(run.markers('Squeeze off'))).toEqual(offBars);
      const on = run.snapshot.outputs.find((o) => o.title === 'Squeeze on');
      const off = run.snapshot.outputs.find((o) => o.title === 'Squeeze off');
      expect(on?.style.location).toBe('absolute');
      expect(on?.style.color).not.toBe(off?.style.color);
      // Every dot sits on the zero line.
      for (const output of [on, off]) {
        const events = output?.payload?.kind === 'serial.event' ? output.payload.events : undefined;
        const prices = events?.encoding === 'dense' ? events.values : events?.encoding === 'sparse' ? events.values : [];
        expect(new Set(prices.filter((v) => typeof v === 'number'))).toEqual(new Set([0]));
      }
    });

    it('raises the alert on the bar the squeeze fires', async () => {
      const run = await sqz.run(market);
      expect(fired.length).toBeGreaterThan(0);
      expect(barsWhere(run.alert('Squeeze fired'))).toEqual(fired);
    });

    it('fires on the breakout bar after a quiet stretch', async () => {
      // Forty quiet bars: closes alternate 100 and 100.2 with 1-rupee wicks, so
      // the closes barely vary (Bollinger ±0.2) while each bar still spans
      // about 2.2 (Keltner ±3.3): the squeeze is on. Bar 40 jumps to 110: the
      // closes' deviation leaps to about 2.1 (Bollinger ±4.2) while the average
      // range only reaches about 2.6 (Keltner ±3.9) — Bollinger breaks outside
      // and the squeeze fires on that very bar.
      const quiet = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 100 : 100.2));
      const bars = pathBars([...quiet, 110, 120, 130, 140], 1);
      const run = await sqz.run(bars);
      expect(fromBar20(run.markers('Squeeze on'))).toEqual(Array.from({ length: 20 }, (_, k) => 20 + k));
      expect(barsWhere(run.alert('Squeeze fired'))).toEqual([40]);
    });

    it('follows the Bollinger and Keltner settings a trader sets', async () => {
      const settings = { 'bb-length': 14, 'bb-mult': 1.8, 'kc-length': 24, 'kc-mult': 1.2, 'use-true-range': false };
      const run = await sqz.run(market, settings);
      const custom = squeeze(market, { bbLength: 14, bbMult: 1.8, kcLength: 24, kcMult: 1.2, range: 'bar' });
      expect(fromBar20(run.markers('Squeeze on'))).toEqual(barsWhere(custom.on));
      expect(closeSeries(run.plot('Momentum'), custom.momentum)).toEqual({ ok: true });
    });

    // Was ta.tr(false) reading high − low on the first bar instead of na, so
    // the Keltner average and the squeeze state started one bar early —
    // fixed in v2.
    it('draws no squeeze state before the Keltner average exists (bar 20)', async () => {
      const run = await sqz.run(market);
      const first = Math.min(...barsWhere(run.markers('Squeeze on')), ...barsWhere(run.markers('Squeeze off')));
      expect(first).toBe(20);
    });
  });
});
