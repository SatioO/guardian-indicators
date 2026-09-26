import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, flatRangeBars, realisticDaily, closeSeries, field, zip, type PackIndicator, type PackRun, type PackRuntime, type Maybe, type OHLCV } from 'guardian-gscript-toolchain';

/**
 * The reference platform's Ichimoku Cloud, defaults 9 / 26 / 52 / 26:
 *   donchian(n)    = (highest high of n bars + lowest low of n bars) / 2
 *   conversion     = donchian(9), base = donchian(26)
 *   leading span A = (conversion + base) / 2, drawn displacement − 1 = 25 bars ahead
 *   leading span B = donchian(52), drawn 25 bars ahead
 *   lagging span   = close, drawn 25 bars back
 *   cloud: between the leading spans, green where A > B, red where A < B.
 */
function donchian(bars: readonly OHLCV[], length: number): Maybe[] {
  return bars.map((_, i) => {
    if (i + 1 < length) return null;
    const window = bars.slice(i - length + 1, i + 1);
    return (Math.max(...window.map((b) => b.high)) + Math.min(...window.map((b) => b.low))) / 2;
  });
}

function ichimoku(bars: readonly OHLCV[], conv = 9, base = 26, spanB = 52) {
  const conversion = donchian(bars, conv);
  const baseLine = donchian(bars, base);
  return {
    conversion,
    base: baseLine,
    leadA: zip(conversion, baseLine, (c, b) => (c + b) / 2),
    leadB: donchian(bars, spanB),
  };
}

const offsetOf = (run: PackRun, title: string) =>
  run.snapshot.outputs.find((o) => o.title === title)?.offsetBars;

describe('Ichimoku Cloud — five lines and a cloud drawn ahead of price', () => {
  let runtime: PackRuntime;
  let ichi: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    ichi = await runtime.load('ichimoku-cloud');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  const bars = realisticDaily(400);

  it('reads 101 for every line on bars that always span 100 → 102', async () => {
    const run = await ichi.run(flatRangeBars(80, 100, 102));
    const firstDrawn = (title: string) => run.plot(title).findIndex((v) => v !== null);
    expect(firstDrawn('Conversion line')).toBe(8);
    expect(firstDrawn('Base line')).toBe(25);
    expect(firstDrawn('Leading span A')).toBe(25);
    expect(firstDrawn('Leading span B')).toBe(51);
    for (const title of ['Conversion line', 'Base line', 'Leading span A', 'Leading span B']) {
      for (const v of run.plot(title).filter((x) => x !== null)) expect(v).toBeCloseTo(101, 10);
    }
  });

  it('draws the conversion, base and leading-span values of the published definition', async () => {
    const run = await ichi.run(bars);
    const ref = ichimoku(bars);
    expect(closeSeries(run.plot('Conversion line'), ref.conversion)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Base line'), ref.base)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Leading span A'), ref.leadA)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Leading span B'), ref.leadB)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Lagging span'), field(bars, 'close'))).toEqual({ ok: true });
  });

  it('draws the leading spans 25 bars ahead and the lagging span 25 bars back', async () => {
    const run = await ichi.run(bars);
    expect(offsetOf(run, 'Leading span A')).toBe(25);
    expect(offsetOf(run, 'Leading span B')).toBe(25);
    expect(offsetOf(run, 'Lagging span')).toBe(-25);
    expect(offsetOf(run, 'Conversion line')).toBe(0);
    expect(offsetOf(run, 'Base line')).toBe(0);
    // The chart must make room for the cloud 25 bars past the last bar.
    expect(run.snapshot.futureBarDemand).toBe(25);
  });

  it('follows the lengths and displacement a trader sets', async () => {
    const run = await ichi.run(bars, {
      'conversion-length': 7, 'base-length': 22, 'span-b-length': 44, displacement: 22,
    });
    const ref = ichimoku(bars, 7, 22, 44);
    expect(closeSeries(run.plot('Conversion line'), ref.conversion)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Base line'), ref.base)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Leading span A'), ref.leadA)).toEqual({ ok: true });
    expect(closeSeries(run.plot('Leading span B'), ref.leadB)).toEqual({ ok: true });
    expect([offsetOf(run, 'Leading span A'), offsetOf(run, 'Leading span B'), offsetOf(run, 'Lagging span')])
      .toEqual([21, 21, -21]);
  });

  describe('the cloud', () => {
    // Sixty bars spanning 100–102, then sixty spanning 110–112. On bar 60
    // every window spans 100 → 112, so every line reads 106 and span A
    // equals span B. The conversion line (9 bars) leaves first: on bar 68
    // its window is all new bars and it reads 111, lifting span A to
    // (111 + 106) / 2 = 108.5 over span B's 106 — the cloud turns green.
    // Before that every line is equal and there is no cloud at all.
    const step = barsFrom([
      ...new Array(60).fill({ open: 101, high: 102, low: 100, close: 101 }),
      ...new Array(60).fill({ open: 111, high: 112, low: 110, close: 111 }),
    ]);
    const ref = ichimoku(step);
    const aboveB = ref.leadA.map((a, i) => (a !== null && ref.leadB[i] !== null && a > (ref.leadB[i] as number)));
    const belowB = ref.leadA.map((a, i) => (a !== null && ref.leadB[i] !== null && a < (ref.leadB[i] as number)));

    // The mirror of `step`: sixty bars at 110–112, then sixty at 100–102.
    // By the same reasoning, on bar 68 the conversion line's now-all-new
    // window reads 101, pulling span A to (101 + 106) / 2 = 103.5 under
    // span B's 106 — the cloud turns red instead of green.
    const stepDown = barsFrom([
      ...new Array(60).fill({ open: 111, high: 112, low: 110, close: 111 }),
      ...new Array(60).fill({ open: 101, high: 102, low: 100, close: 101 }),
    ]);
    const refDown = ichimoku(stepDown);
    const aboveBDown = refDown.leadA.map((a, i) =>
      (a !== null && refDown.leadB[i] !== null && a > (refDown.leadB[i] as number)));
    const belowBDown = refDown.leadA.map((a, i) =>
      (a !== null && refDown.leadB[i] !== null && a < (refDown.leadB[i] as number)));

    it('reads the step the way the definition does', async () => {
      const run = await ichi.run(step);
      expect(run.plot('Conversion line')[60]).toBeCloseTo(106, 10);
      expect(run.plot('Conversion line')[67]).toBeCloseTo(106, 10);
      expect(run.plot('Conversion line')[68]).toBeCloseTo(111, 10);
      expect(run.plot('Leading span A')[68]).toBeCloseTo(108.5, 10);
      expect(run.plot('Leading span B')[68]).toBeCloseTo(106, 10);
      expect(aboveB.indexOf(true)).toBe(68);
      expect(belowB.some(Boolean)).toBe(false);
    });

    it('reads the mirrored step-down the way the definition does', async () => {
      const run = await ichi.run(stepDown);
      expect(run.plot('Conversion line')[60]).toBeCloseTo(106, 10);
      expect(run.plot('Conversion line')[67]).toBeCloseTo(106, 10);
      expect(run.plot('Conversion line')[68]).toBeCloseTo(101, 10);
      expect(run.plot('Leading span A')[68]).toBeCloseTo(103.5, 10);
      expect(run.plot('Leading span B')[68]).toBeCloseTo(106, 10);
      expect(belowBDown.indexOf(true)).toBe(68);
      expect(aboveBDown.some(Boolean)).toBe(false);
    });

    it('shades green where span A is above span B and red where it is below, 25 bars ahead', async () => {
      const run = await ichi.run(bars);
      const real = ichimoku(bars);
      const titleOf = (key: string) => run.snapshot.outputs.find((o) => o.key === key)?.title;
      const fills = run.snapshot.outputs.filter((o) => o.kind === 'derived.fill');
      expect(fills.map((f) => [f.style.color, f.dependencies.map(titleOf)])).toEqual([
        ['rgba(38, 166, 154, 0.1)', ['Leading span A', 'Bullish cloud edge']],
        ['rgba(239, 83, 80, 0.1)', ['Leading span A', 'Bearish cloud edge']],
      ]);
      const where = (flags: (a: number, b: number) => boolean) => real.leadB.map((b, i) => {
        const a = real.leadA[i];
        return a !== null && b !== null && flags(a, b) ? b : null;
      });
      expect(closeSeries(run.plot('Bullish cloud edge'), where((a, b) => a > b))).toEqual({ ok: true });
      expect(closeSeries(run.plot('Bearish cloud edge'), where((a, b) => a < b))).toEqual({ ok: true });
      expect(offsetOf(run, 'Bullish cloud edge')).toBe(25);
      expect(offsetOf(run, 'Bearish cloud edge')).toBe(25);
      expect(run.shown('Bullish cloud edge').pane).toBe(false);
      expect(run.shown('Bearish cloud edge').pane).toBe(false);
    });

    it('shades red with real, non-null values where span A is below span B', async () => {
      const run = await ichi.run(stepDown);
      // Guard that this fixture genuinely drives the bearish branch — the
      // step fixture above never does, so without this guard the closeSeries
      // check below could pass by comparing null against null.
      expect(belowBDown.some(Boolean)).toBe(true);
      const where = (flags: (a: number, b: number) => boolean) => refDown.leadB.map((b, i) => {
        const a = refDown.leadA[i];
        return a !== null && b !== null && flags(a, b) ? b : null;
      });
      expect(closeSeries(run.plot('Bearish cloud edge'), where((a, b) => a < b))).toEqual({ ok: true });
      expect(closeSeries(run.plot('Bullish cloud edge'), where((a, b) => a > b))).toEqual({ ok: true });
    });

    it('leaves the cloud unshaded before the step, where span A equals span B', async () => {
      const run = await ichi.run(step);
      const bull = run.plot('Bullish cloud edge');
      const bear = run.plot('Bearish cloud edge');
      expect(bull.map((v) => v !== null)).toEqual(aboveB);
      expect(bear.map((v) => v !== null)).toEqual(belowB);
    });
  });

  describe('alerts', () => {
    // 120 quiet bars at 101 (range 100–102), then 30 at 111 (110–112) — and
    // the mirror image. The cloud drawn over bar 120 was computed on bar 95,
    // when every line read 101; the close of 111 jumps through it. The
    // conversion line clears the base line on bar 128, once its nine-bar
    // window holds only new bars (111 against 106).
    const quiet = (c: number) => ({ open: c, high: c + 1, low: c - 1, close: c });
    const up = barsFrom([...new Array(120).fill(quiet(101)), ...new Array(30).fill(quiet(111))]);
    const down = barsFrom([...new Array(120).fill(quiet(111)), ...new Array(30).fill(quiet(101))]);
    const barsWhere = (values: readonly (boolean | null)[]) =>
      values.flatMap((hit, bar) => (hit ? [bar] : []));

    it('alerts when the close crosses above or below the cloud drawn over its bar', async () => {
      const rise = await ichi.run(up);
      const fall = await ichi.run(down);
      expect(barsWhere(rise.alert('Close crossed above the cloud'))).toEqual([120]);
      expect(barsWhere(rise.alert('Close crossed below the cloud'))).toEqual([]);
      expect(barsWhere(fall.alert('Close crossed below the cloud'))).toEqual([120]);
      expect(barsWhere(fall.alert('Close crossed above the cloud'))).toEqual([]);
    });

    it('alerts when the conversion line crosses the base line', async () => {
      const rise = await ichi.run(up);
      const fall = await ichi.run(down);
      expect(barsWhere(rise.alert('Conversion crossed above base'))).toEqual([128]);
      expect(barsWhere(fall.alert('Conversion crossed below base'))).toEqual([128]);
    });

    it('judges the close against the cloud drawn over it, on a swinging series', async () => {
      const swings = barsFrom(Array.from({ length: 400 }, (_, i) => {
        const c = 100 + 12 * Math.sin(i / 17) + 4 * Math.sin(i / 5);
        return { open: c, high: c + 1.5, low: c - 1.5, close: c };
      }));
      const run = await ichi.run(swings);
      const ref = ichimoku(swings);
      // The cloud over bar i is the one computed 25 bars earlier.
      const shown = (series: Maybe[]) => series.map((_, i) => (i >= 25 ? series[i - 25] : null));
      const [a, b] = [shown(ref.leadA), shown(ref.leadB)];
      const top = zip(a, b, Math.max);
      const bottom = zip(a, b, Math.min);
      const closes = field(swings, 'close');
      const crossed = (edge: Maybe[], side: 'above' | 'below') => closes.flatMap((c, i) => {
        const [now, prev] = [edge[i], edge[i - 1]];
        if (i === 0 || now === null || prev === null) return [];
        return (side === 'above' ? c > now && closes[i - 1] <= prev : c < now && closes[i - 1] >= prev) ? [i] : [];
      });
      expect(crossed(top, 'above').length).toBeGreaterThan(1);
      expect(crossed(bottom, 'below').length).toBeGreaterThan(1);
      expect(barsWhere(run.alert('Close crossed above the cloud'))).toEqual(crossed(top, 'above'));
      expect(barsWhere(run.alert('Close crossed below the cloud'))).toEqual(crossed(bottom, 'below'));
    });
  });
});
