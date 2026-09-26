import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, pathBars, closeSeries, type PackIndicator, type PackRuntime, type Maybe } from 'guardian-gscript-toolchain';

/*
 * Reference contract — Kaufman's Adaptive Moving Average as the reference
 * platform defines it (length 14, fast 2, slow 30, source close):
 *
 *   ER   = |src − src[14]| / Σ |src − src[1]| over 14 bars   (0 when the sum is 0)
 *   fast = 2 / (2 + 1)       slow = 2 / (30 + 1)
 *   SC   = (ER × (fast − slow) + slow)²
 *   KAMA = KAMA[1] + SC × (src − KAMA[1])
 *
 * Warm-up: nothing is drawn until the efficiency ratio exists, on bar 14 (the
 * 15th bar). There the previous KAMA does not exist yet, and the reference
 * falls back to the source (`nz(kama[1], src)`), so the first KAMA is that
 * bar's close. The line is coloured by its slope.
 */

function kama(src: readonly number[], length: number, fast: number, slow: number): { line: Maybe[]; er: Maybe[] } {
  const fastAlpha = 2 / (fast + 1);
  const slowAlpha = 2 / (slow + 1);
  const line: Maybe[] = [];
  const er: Maybe[] = [];
  let prev: number | null = null;
  src.forEach((x, i) => {
    if (i < length) {
      line.push(null);
      er.push(null);
      return;
    }
    const move = Math.abs(x - src[i - length]);
    let path = 0;
    for (let k = i - length + 1; k <= i; k++) path += Math.abs(src[k] - src[k - 1]);
    const ratio = path !== 0 ? move / path : 0;
    const sc = (ratio * (fastAlpha - slowAlpha) + slowAlpha) ** 2;
    prev = prev === null ? x : prev + sc * (x - prev);
    line.push(prev);
    er.push(ratio);
  });
  return { line, er };
}

describe("Kaufman's Adaptive Moving Average — fast in a trend, still in a range", () => {
  let runtime: PackRuntime;
  let ama: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    ama = await runtime.load('kaufman-ama');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('starts at the close on bar 14 and chases a clean trend at the fast rate', async () => {
    // Closes climb 1 a bar: every step goes the same way, so ER = 1 and
    // SC = (2/3)² = 4/9. The first KAMA is bar 14's close, 114; on bar 15 it
    // closes 4/9 of the gap to 115, ending 5/9 short of it.
    const run = await ama.run(pathBars(Array.from({ length: 30 }, (_, i) => 100 + i)));
    const values = run.plot('KAMA');
    expect(values.slice(0, 14)).toEqual(new Array(14).fill(null));
    expect(values[14]).toBeCloseTo(114, 10);
    expect(values[15]).toBeCloseTo(115 - 5 / 9, 10);
  });

  it('barely moves in a see-saw, where the efficiency ratio is 0', async () => {
    // Closes alternate 100 and 101: after 14 bars price is back where it
    // started, so ER = 0 and SC = (2/31)². From the 100 close on bar 14, bar 15
    // moves only (2/31)² of the way to 101.
    const run = await ama.run(pathBars(Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 100 : 101))));
    const values = run.plot('KAMA');
    expect(values[14]).toBeCloseTo(100, 10);
    expect(values[15]).toBeCloseTo(100 + (2 / 31) ** 2, 10);
    expect(run.plot('Efficiency ratio')[20]).toBeCloseTo(0, 10);
  });

  describe('on a trending, choppy daily series', () => {
    const closes = Array.from({ length: 400 }, (_, i) => 300 + i * 0.4 + 12 * Math.sin(i / 9) + 4 * Math.sin(i * 1.7));
    const bars = pathBars(closes, 1);
    const ref = kama(closes, 14, 2, 30);

    it('matches the published definition', async () => {
      const run = await ama.run(bars);
      expect(closeSeries(run.plot('KAMA'), ref.line)).toEqual({ ok: true });
    });

    it('follows the Length, fast and slow lengths and Source a trader sets', async () => {
      const run = await ama.run(bars, { length: 10, 'fast-length': 3, 'slow-length': 20, source: 'hl2' });
      const hl2 = bars.map((bar) => (bar.high + bar.low) / 2);
      expect(closeSeries(run.plot('KAMA'), kama(hl2, 10, 3, 20).line)).toEqual({ ok: true });
    });

    it('shows the efficiency ratio in the Data Window, off the chart', async () => {
      const run = await ama.run(bars);
      expect(closeSeries(run.plot('Efficiency ratio'), ref.er)).toEqual({ ok: true });
      expect(run.shown('Efficiency ratio')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    });

    const slope = ref.line.map((v, i) => {
      const prev = ref.line[i - 1];
      if (v === null || prev === null || prev === undefined) return 0;
      return Math.sign(v - prev);
    });

    it('colours the line green while it rises and red while it falls', async () => {
      const run = await ama.run(bars);
      const colors = run.plotColors('KAMA');
      const rising = slope.flatMap((d, i) => (d > 0 ? [i] : []));
      const falling = slope.flatMap((d, i) => (d < 0 ? [i] : []));
      expect(rising.length).toBeGreaterThan(0);
      expect(falling.length).toBeGreaterThan(0);
      expect(new Set(rising.map((i) => colors[i]))).toEqual(new Set(['#26a69a']));
      expect(new Set(falling.map((i) => colors[i]))).toEqual(new Set(['#ef5350']));
    });

    it('raises alerts on the bar the line turns up or down', async () => {
      const run = await ama.run(bars);
      const turned = (to: number) => slope.flatMap((d, i) => (d === to && slope[i - 1] === -to ? [i] : []));
      const up = turned(1);
      const down = turned(-1);
      expect(up.length).toBeGreaterThan(0);
      expect(down.length).toBeGreaterThan(0);
      const barsWhere = (values: readonly (boolean | null)[]) => values.flatMap((hit, bar) => (hit ? [bar] : []));
      expect(barsWhere(run.alert('KAMA turned up'))).toEqual(up);
      expect(barsWhere(run.alert('KAMA turned down'))).toEqual(down);
    });
  });

  it('uses the reference defaults: 14, 2 and 30 on the close', () => {
    const defaults = Object.fromEntries(
      (ama.manifest.inputs ?? []).map((i) => [i.key, 'default' in i ? i.default : undefined]),
    );
    expect(defaults).toMatchObject({
      'input@length': 14,
      'input@fast-length': 2,
      'input@slow-length': 30,
      'input@source': 'close',
    });
  });
});
