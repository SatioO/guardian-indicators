import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, atr, closeSeries, gapBars, type PackIndicator, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/*
 * Reference contract — Chandelier Exit as the reference platform's community
 * standard publishes it (ATR period 22, multiplier 3.0, close price for the
 * extremums):
 *
 *   offset    = 3 × ATR(22)                          (Wilder's ATR)
 *   longStop  = highest(close, 22) − offset; once the previous close is above
 *               the previous long stop, it only ratchets up: max(new, previous)
 *   shortStop = lowest(close, 22) + offset; once the previous close is below
 *               the previous short stop, it only ratchets down: min(new, previous)
 *   (the "previous" stop on the first defined bar is the stop itself)
 *   direction starts long (+1); it turns long when the close is above the
 *   previous short stop, short (−1) when the close is below the previous long
 *   stop, and otherwise carries.
 *
 * Only the active stop is drawn (long stop while long, short stop while
 * short); Buy marks a flip to long and Sell a flip to short. With "use close"
 * off, the extremums are highest(high) and lowest(low).
 */

function highestOrLowest(values: readonly number[], length: number, pick: (...xs: number[]) => number): Maybe[] {
  return values.map((_, i) => (i + 1 < length ? null : pick(...values.slice(i - length + 1, i + 1))));
}

interface Chandelier { longStop: Maybe[]; shortStop: Maybe[]; direction: number[] }

function chandelier(bars: readonly OHLCV[], length = 22, mult = 3, useClose = true): Chandelier {
  const a = atr(bars, length);
  const hi = highestOrLowest(bars.map((b) => (useClose ? b.close : b.high)), length, Math.max);
  const lo = highestOrLowest(bars.map((b) => (useClose ? b.close : b.low)), length, Math.min);
  const longStop: Maybe[] = [];
  const shortStop: Maybe[] = [];
  const direction: number[] = [];
  let dir = 1;
  bars.forEach((bar, i) => {
    const offset = a[i];
    const rawLong = hi[i] === null || offset === null ? null : hi[i]! - mult * offset;
    const rawShort = lo[i] === null || offset === null ? null : lo[i]! + mult * offset;
    const longPrev = longStop[i - 1] ?? rawLong;
    const shortPrev = shortStop[i - 1] ?? rawShort;
    const prevClose = i > 0 ? bars[i - 1].close : null;
    let long = rawLong;
    if (rawLong !== null && longPrev !== null && prevClose !== null && prevClose > longPrev) long = Math.max(rawLong, longPrev);
    let short = rawShort;
    if (rawShort !== null && shortPrev !== null && prevClose !== null && prevClose < shortPrev) short = Math.min(rawShort, shortPrev);
    if (shortPrev !== null && bar.close > shortPrev) dir = 1;
    else if (longPrev !== null && bar.close < longPrev) dir = -1;
    longStop.push(long);
    shortStop.push(short);
    direction.push(dir);
  });
  return { longStop, shortStop, direction };
}

const active = (ref: Chandelier, side: 1 | -1) =>
  (side === 1 ? ref.longStop : ref.shortStop).map((v, i) => (ref.direction[i] === side ? v : null));

function flips(direction: readonly number[]): { buy: number[]; sell: number[] } {
  const buy: number[] = [];
  const sell: number[] = [];
  for (let i = 1; i < direction.length; i++) {
    if (direction[i - 1] === -1 && direction[i] === 1) buy.push(i);
    if (direction[i - 1] === 1 && direction[i] === -1) sell.push(i);
  }
  return { buy, sell };
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

// A rally, a slide, a base and a second rally: the exit flips both ways.
const swings = pathBars([
  ...Array.from({ length: 40 }, (_, i) => 200 + i * 2),
  ...Array.from({ length: 35 }, (_, i) => 278 - i * 3),
  ...Array.from({ length: 20 }, (_, i) => 176 + (i % 2) * 2),
  ...Array.from({ length: 40 }, (_, i) => 178 + i * 2.5),
], 1.5);

/** A daily series with an overnight gap every 15 bars. */
const gappy = gapBars({ count: 400, seed: 8, intervalSec: 86_400, startPrice: 150 });

describe('Chandelier Exit — an ATR trailing stop hung from the highest close', () => {
  let runtime: PackRuntime;
  let ce: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    ce = await runtime.load('chandelier-exit');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('hangs the first long stop three ATRs under the highest close, on bar 22', async () => {
    // A climb of one rupee a bar with half-rupee wicks: the first bar spans 1,
    // every later bar has a true range of 2. On bar 21 the 22-bar ATR is the
    // plain average (1 + 21 × 2) / 22 = 43 / 22 and the highest close is 121.
    const bars = pathBars(Array.from({ length: 30 }, (_, i) => 100 + i), 0.5);
    const run = await ce.run(bars);
    const long = run.plot('Long stop');
    expect(long.slice(0, 21)).toEqual(new Array(21).fill(null));
    expect(long[21]).toBeCloseTo(121 - (3 * 43) / 22, 10);
  });

  const ref = chandelier(swings);

  it('draws only the active stop: under price while long, over it while short', async () => {
    const run = await ce.run(swings);
    expect(closeSeries(run.plot('Long stop'), active(ref, 1))).toEqual({ ok: true });
    expect(closeSeries(run.plot('Short stop'), active(ref, -1))).toEqual({ ok: true });
    // Never both on the same bar.
    const long = run.plot('Long stop');
    const short = run.plot('Short stop');
    expect(long.some((v, i) => v !== null && short[i] !== null)).toBe(false);
  });

  it('ratchets the long stop up and never down while the close holds above it', async () => {
    const run = await ce.run(swings);
    const long = run.plot('Long stop');
    // The first rally: long from bar 21 until the slide flips it.
    const flip = flips(ref.direction).sell[0];
    expect(flip).toBeGreaterThan(40);
    for (let i = 22; i < flip; i++) expect(long[i]!).toBeGreaterThanOrEqual(long[i - 1]!);
  });

  it('marks every flip with a Buy or Sell label at the new stop', async () => {
    const run = await ce.run(swings);
    const expected = flips(ref.direction);
    expect(expected.buy.length).toBeGreaterThan(0);
    expect(expected.sell.length).toBeGreaterThan(0);
    expect(barsWhere(run.markers('Buy'))).toEqual(expected.buy);
    expect(barsWhere(run.markers('Sell'))).toEqual(expected.sell);
  });

  it('hides the labels when a trader switches them off', async () => {
    const run = await ce.run(swings, { labels: false });
    expect(barsWhere(run.markers('Buy'))).toEqual([]);
    expect(barsWhere(run.markers('Sell'))).toEqual([]);
  });

  it('raises the exit alerts on the flip bars', async () => {
    const run = await ce.run(swings);
    const expected = flips(ref.direction);
    expect(barsWhere(run.alert('Chandelier turned long'))).toEqual(expected.buy);
    expect(barsWhere(run.alert('Chandelier turned short'))).toEqual(expected.sell);
    expect(barsWhere(run.alert('Chandelier direction changed')))
      .toEqual([...expected.buy, ...expected.sell].sort((a, b) => a - b));
  });

  it('follows the ATR period, multiplier and extremum source a trader sets', async () => {
    const run = await ce.run(swings, { 'atr-period': 14, 'atr-mult': 2, 'use-close': false });
    const custom = chandelier(swings, 14, 2, false);
    expect(closeSeries(run.plot('Long stop'), active(custom, 1))).toEqual({ ok: true });
    expect(closeSeries(run.plot('Short stop'), active(custom, -1))).toEqual({ ok: true });
  });

  it('reports the direction in the Data Window only', async () => {
    const run = await ce.run(swings);
    expect(closeSeries(run.plot('Direction'), ref.direction)).toEqual({ ok: true });
    expect(run.shown('Direction')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });

  it('shades between price and the active stop, green long and red short', async () => {
    const run = await ce.run(swings);
    const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
    expect(fills.map((o) => o.style.color)).toEqual(['rgba(38, 166, 154, 0.1)', 'rgba(239, 83, 80, 0.1)']);
  });

  it('keeps drawing the stop line when the shading is turned off', async () => {
    const run = await ce.run(swings, { shade: false });
    const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
    expect(fills.map((o) => o.style.color)).toEqual(['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)']);
    expect(run.plot('Long stop').some((v) => v !== null)).toBe(true);
  });

  it('sits each Buy and Sell label on the stop it flips to', async () => {
    const run = await ce.run(swings);
    const { buy, sell } = flips(ref.direction);
    const at = (title: string) => {
      const output = run.snapshot.outputs.find((o) => o.title === title && o.kind === 'serial.event');
      const events = output?.payload?.kind === 'serial.event' ? output.payload.events : undefined;
      if (events?.encoding !== 'dense') throw new Error(`no dense prices for '${title}'`);
      return events.values.flatMap((v) => (typeof v === 'number' ? [v] : []));
    };
    expect(closeSeries(at('Buy'), buy.map((i) => ref.longStop[i]))).toEqual({ ok: true });
    expect(closeSeries(at('Sell'), sell.map((i) => ref.shortStop[i]))).toEqual({ ok: true });
  });

  it('matches the published definition on a gapping daily series', async () => {
    const run = await ce.run(gappy);
    const gapRef = chandelier(gappy);
    expect(closeSeries(run.plot('Long stop'), active(gapRef, 1))).toEqual({ ok: true });
    expect(closeSeries(run.plot('Short stop'), active(gapRef, -1))).toEqual({ ok: true });
  });
});
