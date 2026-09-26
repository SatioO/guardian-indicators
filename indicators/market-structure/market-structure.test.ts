import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, realisticDaily, type PackIndicator, type PackRuntime, type OHLCV } from 'guardian-gscript-toolchain';

const barsWhere = (values: readonly (boolean | null)[]) =>
  values.flatMap((hit, bar) => (hit ? [bar] : []));

/**
 * A zigzag worked by hand. Every bar is a doji at its close with a half-point
 * wick either side, so highs and lows follow the closes and no two neighbours
 * tie. Legs: up to 116 (bar 8), down to 104 (bar 14), up to 124 (bar 24), down
 * to 112 (bar 30), up to 132 (bar 40), down to 104 (bar 54), up to 116 (bar 60).
 *
 * With 5 bars either side, the swing highs are bars 8, 24, 40 (116.5, 124.5,
 * 132.5) and the swing lows bars 14, 30, 54 (103.5, 111.5, 103.5); each is known
 * only 5 bars later, on bars 13, 29, 45 and 19, 35, 59.
 * - 24 is a higher high, 40 a higher high; 30 a higher low, 54 a lower low. The
 *   first swing of each side has nothing to compare with and starts the count.
 * - Bullish breaks: the first close above 116.5 after bar 13 is bar 21 (118);
 *   above 124.5 after bar 29 is bar 37 (126). 132.5 is never broken.
 * - Bearish break: 103.5 (known on 19) is replaced by 111.5 on bar 35 before any
 *   close under it; the first close below 111.5 is bar 51 (110).
 */
const legs: [number, number][] = [[8, 2], [6, -2], [10, 2], [6, -2], [10, 2], [14, -2], [6, 2]];
const zigzagCloses = legs.reduce<number[]>((closes, [bars, step]) => {
  for (let k = 0; k < bars; k++) closes.push(closes[closes.length - 1] + step);
  return closes;
}, [100]);
const zigzag = barsFrom(zigzagCloses.map((c) => ({ open: c, high: c + 0.5, low: c - 0.5, close: c })));

/**
 * The reference for swings: a pivot high is a bar whose high is strictly above
 * the highs of the `left` bars before it and the `right` bars after it (a pivot
 * low mirrors it). As on the reference platform, it becomes known on the bar
 * `right` bars after it. The fixtures hold no ties, so no tie rule is assumed.
 */
function pivots(values: readonly number[], left: number, right: number, beats: (a: number, b: number) => boolean): number[] {
  const found: number[] = [];
  for (let p = left; p + right < values.length; p++) {
    let ok = true;
    for (let k = p - left; k <= p + right && ok; k++) if (k !== p && !beats(values[p], values[k])) ok = false;
    if (ok) found.push(p);
  }
  return found;
}

interface Swing { bar: number; text: string; y: number }
interface Break { from: number; to: number; level: number; bullish: boolean }

/**
 * Market structure from the pivots, bar by bar: each confirmed swing is named
 * against the previous one on its side (HH/LH, HL/LL; the first starts the
 * count) and becomes the level to break, replacing an unbroken older one. The
 * first close beyond it is a break of structure, after which it is spent.
 */
function structure(bars: readonly OHLCV[], left: number, right: number): { swings: Swing[]; breaks: Break[] } {
  const high = bars.map((b) => b.high);
  const low = bars.map((b) => b.low);
  const highAt = new Set(pivots(high, left, right, (a, b) => a > b).map((p) => p + right));
  const lowAt = new Set(pivots(low, left, right, (a, b) => a < b).map((p) => p + right));
  const swings: Swing[] = [];
  const breaks: Break[] = [];
  let lastHigh: number | null = null;
  let lastLow: number | null = null;
  let activeHigh: { bar: number; level: number } | null = null;
  let activeLow: { bar: number; level: number } | null = null;
  bars.forEach((bar, t) => {
    if (highAt.has(t)) {
      const p = t - right;
      if (lastHigh !== null) swings.push({ bar: p, text: high[p] > lastHigh ? 'HH' : 'LH', y: high[p] });
      lastHigh = high[p];
      activeHigh = { bar: p, level: high[p] };
    }
    if (lowAt.has(t)) {
      const p = t - right;
      if (lastLow !== null) swings.push({ bar: p, text: low[p] > lastLow ? 'HL' : 'LL', y: low[p] });
      lastLow = low[p];
      activeLow = { bar: p, level: low[p] };
    }
    if (activeHigh !== null && bar.close > activeHigh.level) {
      breaks.push({ from: activeHigh.bar, to: t, level: activeHigh.level, bullish: true });
      activeHigh = null;
    }
    if (activeLow !== null && bar.close < activeLow.level) {
      breaks.push({ from: activeLow.bar, to: t, level: activeLow.level, bullish: false });
      activeLow = null;
    }
  });
  return { swings, breaks };
}

/**
 * Doji bars along a swinging path with uneven wicks, so no two highs or lows tie.
 * A fast swing (about 22 bars a cycle) rides a slow one (about 250 bars), so the
 * swings climb and fall in turn and break each other both ways; a stationary
 * wave alone never closes beyond its last swing.
 */
const swinging = barsFrom(Array.from({ length: 400 }, (_, i) => {
  const c = 200 + 20 * Math.sin(i / 40) + 8 * Math.sin(i / 3.5) + 2 * Math.sin(i * 1.7);
  return { open: c, high: c + 0.6 + 0.4 * Math.sin(i * 2.3), low: c - 0.6 - 0.4 * Math.cos(i * 1.9), close: c };
}));

describe('Market Structure — swings and breaks of structure', () => {
  let runtime: PackRuntime;
  let ms: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    ms = await runtime.load('market-structure');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('builds the worked zigzag as expected', () => {
    expect(zigzagCloses).toHaveLength(61);
    expect([zigzagCloses[8], zigzagCloses[14], zigzagCloses[24], zigzagCloses[30], zigzagCloses[40], zigzagCloses[54]])
      .toEqual([116, 104, 124, 112, 132, 104]);
  });

  it('knows each swing only on the bar that confirms it, five bars after the swing', async () => {
    const run = await ms.run(zigzag);
    const high = run.plot('Last swing high');
    const low = run.plot('Last swing low');
    expect(high.slice(0, 13).every((v) => v === null)).toBe(true);
    expect([high[13], high[28], high[29], high[44], high[45]]).toEqual([116.5, 116.5, 124.5, 124.5, 132.5]);
    expect(low.slice(0, 19).every((v) => v === null)).toBe(true);
    expect([low[19], low[34], low[35], low[58], low[59]]).toEqual([103.5, 103.5, 111.5, 111.5, 103.5]);
    expect(run.shown('Last swing high')).toEqual({ pane: false, dataWindow: true, statusLine: false });
  });

  it('labels each swing after the first: higher or lower high above the bar, higher or lower low below it', async () => {
    const run = await ms.run(zigzag);
    const swings = run.drawings.labels
      .filter((l) => ['HH', 'LH', 'HL', 'LL'].includes(l.text))
      .map((l) => ({ bar: l.sourceBarIndex, text: l.text, y: l.y, style: 'style' in l ? l.style : undefined }));
    expect(swings).toEqual([
      { bar: 24, text: 'HH', y: 124.5, style: 'label_down' },
      { bar: 30, text: 'HL', y: 111.5, style: 'label_up' },
      { bar: 40, text: 'HH', y: 132.5, style: 'label_down' },
      { bar: 54, text: 'LL', y: 103.5, style: 'label_up' },
    ]);
  });

  it('colours bullish swings (HH, HL) and bearish swings (LH, LL) apart', async () => {
    const run = await ms.run(zigzag);
    const colorOf = (text: string) => run.drawings.labels.find((l) => l.text === text)?.textColor;
    expect(colorOf('HH')).toBe('#26a69a');
    expect(colorOf('HL')).toBe('#26a69a');
    expect(colorOf('LL')).toBe('#ef5350');
  });

  describe('breaks of structure', () => {
    it('draws each break as a line from the swing to the bar whose close broke it', async () => {
      const run = await ms.run(zigzag);
      expect(run.drawings.lines.map((l) => [l.sourceBarIndex1, l.price1, l.sourceBarIndex2, l.price2, l.color])).toEqual([
        [8, 116.5, 21, 116.5, '#26a69a'],
        [24, 124.5, 37, 124.5, '#26a69a'],
        [30, 111.5, 51, 111.5, '#ef5350'],
      ]);
      expect(run.drawings.lines.every((l) => l.style === 'dashed')).toBe(true);
    });

    it('names each break over the middle of its line, above a bullish one and below a bearish one', async () => {
      const run = await ms.run(zigzag);
      const tags = run.drawings.labels.filter((l) => l.text === 'BOS');
      expect(tags.map((l) => [l.sourceBarIndex, l.y, 'style' in l ? l.style : undefined, l.textColor])).toEqual([
        [15, 116.5, 'label_down', '#26a69a'],
        [31, 124.5, 'label_down', '#26a69a'],
        [41, 111.5, 'label_up', '#ef5350'],
      ]);
    });

    it('raises the bullish and bearish break alerts on the breaking bars', async () => {
      const run = await ms.run(zigzag);
      expect(barsWhere(run.alert('Bullish BOS'))).toEqual([21, 37]);
      expect(barsWhere(run.alert('Bearish BOS'))).toEqual([51]);
    });

    it('reads the structure +1 after a bullish break and −1 after a bearish one, in the Data Window', async () => {
      const structure = (await ms.run(zigzag)).plot('Structure');
      expect(structure.slice(0, 21).every((v) => v === 0)).toBe(true);
      expect(structure.slice(21, 51).every((v) => v === 1)).toBe(true);
      expect(structure.slice(51).every((v) => v === -1)).toBe(true);
    });
  });

  describe('against the reference', () => {
    const drawn = (run: Awaited<ReturnType<PackIndicator['run']>>) => ({
      swings: run.drawings.labels
        .filter((l) => l.text !== 'BOS')
        .map((l) => ({ bar: l.sourceBarIndex, text: l.text, y: l.y })),
      breaks: run.drawings.lines.map((l) => ({
        from: l.sourceBarIndex1, to: l.sourceBarIndex2, level: l.price1, bullish: l.color === '#26a69a',
      })),
    });

    it('finds the same swings and breaks as the reference on a swinging market', async () => {
      const ref = structure(swinging, 5, 5);
      expect(ref.swings.length).toBeGreaterThan(20);
      expect(ref.breaks.filter((b) => b.bullish).length).toBeGreaterThan(3);
      expect(ref.breaks.filter((b) => !b.bullish).length).toBeGreaterThan(3);
      const run = await ms.run(swinging, { keep: 50 });
      expect(drawn(run)).toEqual({ swings: ref.swings.slice(-50), breaks: ref.breaks.slice(-50) });
      const bullish = ref.breaks.filter((b) => b.bullish).map((b) => b.to);
      const bearish = ref.breaks.filter((b) => !b.bullish).map((b) => b.to);
      expect(barsWhere(run.alert('Bullish BOS'))).toEqual(bullish);
      expect(barsWhere(run.alert('Bearish BOS'))).toEqual(bearish);
    });

    it('follows the pivot lengths a trader sets, on a trending market', async () => {
      // Six bars before and three after: on a rising market the swing highs
      // confirm early and are broken again and again. Swapping the two lengths,
      // or keeping the defaults, finds a different structure.
      const bars = realisticDaily();
      const ref = structure(bars, 6, 3);
      expect(ref.breaks.length).toBeGreaterThan(3);
      expect(ref).not.toEqual(structure(bars, 3, 6));
      expect(ref).not.toEqual(structure(bars, 5, 5));
      const run = await ms.run(bars, { left: 6, right: 3, keep: 50 });
      expect(drawn(run)).toEqual({ swings: ref.swings.slice(-50), breaks: ref.breaks.slice(-50) });
    });

    it('draws only the most recent structures, ten by default', async () => {
      const ref = structure(swinging, 5, 5);
      const run = await ms.run(swinging);
      expect(drawn(run)).toEqual({ swings: ref.swings.slice(-10), breaks: ref.breaks.slice(-10) });
      expect(run.drawings.labels.filter((l) => l.text === 'BOS')).toHaveLength(10);
      const three = await ms.run(swinging, { keep: 3 });
      expect(drawn(three)).toEqual({ swings: ref.swings.slice(-3), breaks: ref.breaks.slice(-3) });
      // Alerts are not limited by what is drawn.
      expect(barsWhere(three.alert('Bullish BOS'))).toEqual(ref.breaks.filter((b) => b.bullish).map((b) => b.to));
    });

    it('can leave the swing labels off and keep the breaks', async () => {
      const run = await ms.run(zigzag, { swings: false });
      expect(run.drawings.labels.map((l) => l.text)).toEqual(['BOS', 'BOS', 'BOS']);
      expect(run.drawings.lines).toHaveLength(3);
    });
  });
});
