import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, pathBars, realisticDaily, closeSeries, field, rma, type PackIndicator, type PackRuntime, type OHLCV, type Maybe } from 'guardian-gscript-toolchain';

/**
 * Wilder's RSI as the reference platform's RSI computes it:
 *   up   = rma(max(change(src), 0), length)
 *   down = rma(-min(change(src), 0), length)
 *   rsi  = down == 0 ? 100 : up == 0 ? 0 : 100 - 100 / (1 + up / down)
 * The first value is on bar `length` (the first change is on bar 1).
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
 * Pivots by the left/right rule: a pivot low is a bar whose value is strictly
 * below the `left` values before it and the `right` values after it, all of
 * them defined (a pivot high mirrors it). It is known on the bar `right` bars
 * later. The fixtures hold no ties, so no tie rule is assumed.
 */
function pivots(values: readonly Maybe[], left: number, right: number, beats: (a: number, b: number) => boolean): number[] {
  const found: number[] = [];
  for (let p = left; p + right < values.length; p++) {
    const v = values[p];
    if (v === null) continue;
    let ok = true;
    for (let k = p - left; k <= p + right && ok; k++) {
      const w = values[k];
      if (k !== p && (w === null || !beats(v, w))) ok = false;
    }
    if (ok) found.push(p);
  }
  return found;
}

type Kind = 'Bull' | 'Bear' | 'H Bull' | 'H Bear';
interface Divergence { kind: Kind; from: number; to: number; fromRsi: number; toRsi: number; at: number }

interface Options { length?: number; left?: number; right?: number; min?: number; max?: number }

/**
 * The reference platform's RSI Divergence Indicator, pivot by pivot. Each RSI
 * pivot, once confirmed `right` bars later, is compared with the RSI pivot of
 * the same side before it, when the bars between the previous pivot's
 * confirmation and this one's (both excluded: `barssince` of the previous
 * confirmation, counted from the bar after it) number from `min` to `max`.
 * Price is read at the two RSI pivot bars: the low for pivot lows, the high for
 * pivot highs.
 * - Regular bullish: price lower low, RSI higher low.
 * - Hidden bullish: price higher low, RSI lower low.
 * - Regular bearish: price higher high, RSI lower high.
 * - Hidden bearish: price lower high, RSI higher high.
 */
function divergences(bars: readonly OHLCV[], options: Options = {}, source = field(bars, 'close')): Divergence[] {
  const { length = 14, left = 5, right = 5, min = 5, max = 60 } = options;
  const osc = rsi(source, length);
  const found: Divergence[] = [];
  for (const side of ['low', 'high'] as const) {
    const at = pivots(osc, left, right, side === 'low' ? (a, b) => a < b : (a, b) => a > b);
    for (let k = 1; k < at.length; k++) {
      const [q, p] = [at[k - 1], at[k]];
      const between = p - q - 1;
      if (between < min || between > max) continue;
      const [qo, po] = [osc[q] as number, osc[p] as number];
      const [qp, pp] = [bars[q][side], bars[p][side]];
      let kind: Kind | null = null;
      if (side === 'low') {
        if (pp < qp && po > qo) kind = 'Bull';
        else if (pp > qp && po < qo) kind = 'H Bull';
      } else if (pp > qp && po < qo) kind = 'Bear';
      else if (pp < qp && po > qo) kind = 'H Bear';
      if (kind !== null) found.push({ kind, from: q, to: p, fromRsi: qo, toRsi: po, at: p + right });
    }
  }
  return found.sort((a, b) => a.at - b.at);
}

// ── Bars shaped to make each divergence ────────────────────────────────────

const path = (legs: readonly (readonly [number, number])[]) => legs.reduce<number[]>((closes, [count, step]) => {
  for (let k = 0; k < count; k++) closes.push(Math.round((closes[closes.length - 1] + step) * 1e4) / 1e4);
  return closes;
}, [100]);
/** `count` bars stepping `a`, `b`, `a`, `b`… */
const chop = (count: number, a: number, b: number) =>
  Array.from({ length: count }, (_, k) => [1, k % 2 ? b : a] as const);
const mirror = (legs: readonly (readonly [number, number])[]) => legs.map(([n, s]) => [n, -s] as const);
/** Twenty bars of ±1 chop first, so the RSI starts from the middle with both moves. */
const warm = chop(20, 1, -1);

/**
 * A sharp fall to bar 30, a bounce, then a slow grind to a lower low with small
 * up-ticks, and a rally. The RSI bottoms at bar 30 (about 15, low 79.5) and
 * again at bar 63 (about 29, low 75.3): price made a lower low, RSI a higher
 * one. 32 bars lie between the pivots; bar 68 confirms the second.
 */
const bullLegs = [...warm, [10, -2], [8, 1.5], ...chop(26, -1.8, 0.6), [14, 1.5]] as const;
/**
 * An up trend with a gentle pullback to bar 40 (RSI about 56, low 109.3), a
 * rally, and a sharp but shallow pullback to bar 57 (RSI about 56 but lower,
 * low 118.8): price made a higher low, RSI a lower one. Bar 62 confirms it.
 */
const hiddenBullLegs = [...warm, [10, 1.5], [6, -0.6], [4, -0.4], [12, 1.4], ...chop(6, -2.5, 0.1), [14, 1.5]] as const;
const bullish = pathBars(path(bullLegs));
const hiddenBullish = pathBars(path(hiddenBullLegs));
/** The same paths upside down: a regular and a hidden bearish divergence. */
const bearish = pathBars(path(mirror(bullLegs)));
const hiddenBearish = pathBars(path(mirror(hiddenBullLegs)));

/**
 * A realistic round trip: a seeded daily advance, then the same moves turned
 * over (each price p becomes top × first / p, so highs and lows swap) as a
 * decline from the top. Advances alone hold only bearish and hidden bullish
 * divergences; the decline brings the other two.
 */
function roundTrip(count: number, seed: number): OHLCV[] {
  const up = realisticDaily(count, seed);
  const k = up[up.length - 1].close * up[0].close;
  const down = up.slice(1).map((b) => ({ open: k / b.open, high: k / b.low, low: k / b.high, close: k / b.close, volume: b.volume }));
  return barsFrom([...up, ...down]);
}

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

const UP = '#26a69a';
const DOWN = '#ef5350';

describe('RSI Divergence — RSI with divergences between its pivots', () => {
  let runtime: PackRuntime;
  let div: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    div = await runtime.load('rsi-divergence');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  describe('the RSI line', () => {
    const bars = realisticDaily(400, 11);

    it('is Wilder’s RSI of the close over 14 bars, undrawn before bar 14', async () => {
      const run = await div.run(bars);
      const ref = rsi(field(bars, 'close'), 14);
      expect(ref.slice(0, 14).every((v) => v === null)).toBe(true);
      expect(closeSeries(run.plot('RSI'), ref)).toEqual({ ok: true });
    });

    it('follows the length and source a trader sets', async () => {
      const run = await div.run(bars, { 'rsi-length': 9, source: 'hl2' });
      const hl2 = bars.map((b) => (b.high + b.low) / 2);
      expect(closeSeries(run.plot('RSI'), rsi(hl2, 9))).toEqual({ ok: true });
    });

    it('draws the 70 / 50 / 30 levels and shades the band between 70 and 30', async () => {
      const run = await div.run(bars);
      expect(run.level('Overbought')).toBe(70);
      expect(run.level('Middle')).toBe(50);
      expect(run.level('Oversold')).toBe(30);
      expect(run.snapshot.outputs.filter((o) => o.kind === 'derived.fill')).toHaveLength(1);
      const moved = await div.run(bars, { overbought: 80, oversold: 20 });
      expect([moved.level('Overbought'), moved.level('Oversold')]).toEqual([80, 20]);
    });
  });

  /** What the pane draws: each divergence line with the label at its end. */
  const drawn = (run: Awaited<ReturnType<PackIndicator['run']>>) => run.drawings.lines.map((l, k) => ({
    kind: run.drawings.labels[k]?.text,
    from: l.sourceBarIndex1,
    to: l.sourceBarIndex2,
    fromRsi: l.price1,
    toRsi: l.price2,
  }));
  const expectedDrawn = (found: readonly Divergence[]) =>
    found.map(({ kind, from, to, fromRsi, toRsi }) => ({ kind, from, to, fromRsi, toRsi }));
  const near = (actual: ReturnType<typeof drawn>, expected: ReturnType<typeof expectedDrawn>) => {
    expect(actual.map(({ kind, from, to }) => ({ kind, from, to })))
      .toEqual(expected.map(({ kind, from, to }) => ({ kind, from, to })));
    actual.forEach((a, k) => {
      expect(a.fromRsi).toBeCloseTo(expected[k].fromRsi, 9);
      expect(a.toRsi).toBeCloseTo(expected[k].toRsi, 9);
    });
  };

  describe('the shaped markets', () => {
    it('hold one divergence each, by the reference', () => {
      const one = (bars: readonly OHLCV[]) => divergences(bars).map(({ kind, from, to, at }) => ({ kind, from, to, at }));
      expect(one(bullish)).toEqual([{ kind: 'Bull', from: 30, to: 63, at: 68 }]);
      expect(one(bearish)).toEqual([{ kind: 'Bear', from: 30, to: 63, at: 68 }]);
      expect(one(hiddenBullish)).toEqual([{ kind: 'H Bull', from: 40, to: 57, at: 62 }]);
      expect(one(hiddenBearish)).toEqual([{ kind: 'H Bear', from: 40, to: 57, at: 62 }]);
      // Price lower low, RSI higher low, as the worked comment says.
      const osc = rsi(field(bullish, 'close'), 14);
      expect([bullish[30].low, bullish[63].low]).toEqual([79.5, 75.3]);
      expect((osc[63] as number) > (osc[30] as number)).toBe(true);
    });
  });

  describe('regular divergences', () => {
    it('draws a bullish divergence as a line between the two RSI lows, labelled Bull under the second', async () => {
      const run = await div.run(bullish);
      const [ref] = divergences(bullish);
      near(drawn(run), expectedDrawn([ref]));
      const [line] = run.drawings.lines;
      expect([line.color, line.width, line.style]).toEqual([UP, 2, 'solid']);
      const [tag] = run.drawings.labels;
      expect([tag.sourceBarIndex, 'style' in tag ? tag.style : undefined, tag.color]).toEqual([63, 'label_up', UP]);
      expect(tag.y).toBeCloseTo(ref.toRsi, 9);
    });

    it('draws a bearish divergence between the two RSI highs, labelled Bear over the second', async () => {
      const run = await div.run(bearish);
      near(drawn(run), expectedDrawn(divergences(bearish)));
      expect(run.drawings.lines[0].color).toBe(DOWN);
      const [tag] = run.drawings.labels;
      expect(['style' in tag ? tag.style : undefined, tag.color]).toEqual(['label_down', DOWN]);
    });

    it('raises each alert on the bar that confirms the second pivot, five bars after it', async () => {
      const bull = await div.run(bullish);
      expect(barsWhere(bull.alert('Regular bullish divergence'))).toEqual([68]);
      expect(barsWhere(bull.alert('Regular bearish divergence'))).toEqual([]);
      const bear = await div.run(bearish);
      expect(barsWhere(bear.alert('Regular bearish divergence'))).toEqual([68]);
      expect(barsWhere(bear.alert('Regular bullish divergence'))).toEqual([]);
    });

    it('can leave either kind undrawn and still alert on it', async () => {
      const run = await div.run(bullish, { bull: false });
      expect(run.drawings.lines).toHaveLength(0);
      expect(run.drawings.labels).toHaveLength(0);
      expect(barsWhere(run.alert('Regular bullish divergence'))).toEqual([68]);
      expect((await div.run(bearish, { bear: false })).drawings.lines).toHaveLength(0);
    });

    it('does not mistake one divergence for the other kinds', async () => {
      const run = await div.run(bullish, { 'hidden-bull': true, 'hidden-bear': true });
      expect(run.drawings.labels.map((l) => l.text)).toEqual(['Bull']);
      for (const title of ['Hidden bullish divergence', 'Hidden bearish divergence', 'Regular bearish divergence']) {
        expect(barsWhere(run.alert(title))).toEqual([]);
      }
    });
  });

  describe('hidden divergences', () => {
    it('are off by default but still raise their alerts', async () => {
      const bull = await div.run(hiddenBullish);
      expect(bull.drawings.lines).toHaveLength(0);
      expect(barsWhere(bull.alert('Hidden bullish divergence'))).toEqual([62]);
      expect(barsWhere(bull.alert('Regular bullish divergence'))).toEqual([]);
      const bear = await div.run(hiddenBearish);
      expect(bear.drawings.lines).toHaveLength(0);
      expect(barsWhere(bear.alert('Hidden bearish divergence'))).toEqual([62]);
    });

    it('draw dashed between the pivots when switched on, labelled H Bull / H Bear', async () => {
      const bull = await div.run(hiddenBullish, { 'hidden-bull': true });
      near(drawn(bull), expectedDrawn(divergences(hiddenBullish)));
      expect([bull.drawings.lines[0].color, bull.drawings.lines[0].style]).toEqual([UP, 'dashed']);
      const bear = await div.run(hiddenBearish, { 'hidden-bear': true });
      near(drawn(bear), expectedDrawn(divergences(hiddenBearish)));
      expect([bear.drawings.lines[0].color, bear.drawings.lines[0].style]).toEqual([DOWN, 'dashed']);
    });
  });

  describe('the lookback range', () => {
    it('needs 5 to 60 bars between the previous pivot’s confirmation and this one', async () => {
      // 32 bars lie between the pivots at 30 and 63 (the reference counts them
      // from the bar after the previous pivot was confirmed to the bar before
      // this one was: the same 32).
      expect(divergences(bullish, { max: 31 })).toEqual([]);
      expect(divergences(bullish, { max: 32 })).toHaveLength(1);
      expect(divergences(bullish, { min: 33 })).toEqual([]);
      expect(divergences(bullish, { min: 32 })).toHaveLength(1);
      const alerts = async (settings: Record<string, number>) =>
        barsWhere((await div.run(bullish, settings)).alert('Regular bullish divergence'));
      expect(await alerts({ 'range-max': 31 })).toEqual([]);
      expect(await alerts({ 'range-max': 32 })).toEqual([68]);
      expect(await alerts({ 'range-min': 33 })).toEqual([]);
      expect(await alerts({ 'range-min': 32 })).toEqual([68]);
    });
  });

  describe('against the reference on a realistic market', () => {
    const bars = roundTrip(600, 5);
    const all = { 'hidden-bull': true, 'hidden-bear': true, keep: 500 };

    it('finds the same divergences of every kind, drawn and alerted', async () => {
      const ref = divergences(bars);
      for (const kind of ['Bull', 'Bear', 'H Bull', 'H Bear'] as const) {
        expect(ref.filter((d) => d.kind === kind).length, kind).toBeGreaterThanOrEqual(2);
      }
      const run = await div.run(bars, all);
      near(drawn(run), expectedDrawn(ref));
      const titles: Record<Kind, string> = {
        Bull: 'Regular bullish divergence',
        Bear: 'Regular bearish divergence',
        'H Bull': 'Hidden bullish divergence',
        'H Bear': 'Hidden bearish divergence',
      };
      for (const [kind, title] of Object.entries(titles)) {
        expect(barsWhere(run.alert(title)), title).toEqual(ref.filter((d) => d.kind === kind).map((d) => d.at));
      }
    });

    it('follows the RSI length, source, pivot lookbacks and range a trader sets', async () => {
      const settings = { 'rsi-length': 9, source: 'hl2', left: 3, right: 7, 'range-min': 2, 'range-max': 40 };
      const hl2 = bars.map((b) => (b.high + b.low) / 2);
      const ref = divergences(bars, { length: 9, left: 3, right: 7, min: 2, max: 40 }, hl2);
      expect(ref.length).toBeGreaterThan(5);
      expect(ref).not.toEqual(divergences(bars, { left: 3, right: 7, min: 2, max: 40 }, hl2));
      expect(ref).not.toEqual(divergences(bars, { length: 9, left: 7, right: 3, min: 2, max: 40 }, hl2));
      const run = await div.run(bars, { ...all, ...settings });
      near(drawn(run), expectedDrawn(ref));
    });

    it('draws only the most recent divergences, twenty by default, and alerts on all', async () => {
      const ref = divergences(bars).filter((d) => d.kind === 'Bull' || d.kind === 'Bear');
      expect(ref.length).toBeGreaterThan(20);
      near(drawn(await div.run(bars)), expectedDrawn(ref.slice(-20)));
      const three = await div.run(bars, { keep: 3 });
      near(drawn(three), expectedDrawn(ref.slice(-3)));
      expect(barsWhere(three.alert('Regular bullish divergence')))
        .toEqual(ref.filter((d) => d.kind === 'Bull').map((d) => d.at));
    });
  });
});
