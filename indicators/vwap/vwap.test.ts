import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, realisticDaily, closeSeries, vwapModule, sourceValue, type PackIndicator, type PackRuntime, type Maybe, type SourceKey, type OHLCV } from 'guardian-gscript-toolchain';

const IST = 19_800;
const FIVE_MINUTES = 300;
/** 09:15 IST on 2023-11-14, as epoch seconds. */
const SESSION_OPEN = Date.UTC(2023, 10, 14, 3, 45) / 1000;

/**
 * `days` sessions of 5-minute bars from 09:15 to 15:30 IST (75 bars each),
 * shaped by a realistic random walk so every price and volume differs.
 */
function intradayBars(days: number, barsPerDay = 75): OHLCV[] {
  const shapes = realisticDaily(days * barsPerDay, 11);
  return shapes.map((b, i) => {
    const day = Math.floor(i / barsPerDay);
    const slot = i % barsPerDay;
    return { ...b, time: SESSION_OPEN + day * 86_400 + slot * FIVE_MINUTES } as OHLCV;
  });
}

/**
 * VWAP as the chart defines it: per IST calendar day, Σ(source × volume) ÷
 * Σ(volume) since the session's first bar; nothing while that volume is 0.
 */
function sessionVwap(bars: readonly OHLCV[], source: SourceKey): Maybe[] {
  let key = NaN;
  let pv = 0;
  let vol = 0;
  return bars.map((b) => {
    const day = Math.floor(((b.time as number) + IST) / 86_400);
    if (day !== key) { key = day; pv = 0; vol = 0; }
    pv += sourceValue(b, source) * b.volume;
    vol += b.volume;
    return vol > 0 ? pv / vol : null;
  });
}

/** The chart's built-in VWAP (the TypeScript module), one value per bar. */
function builtInVwap(bars: readonly OHLCV[]): Maybe[] {
  const spec = vwapModule.compute({ bars } as never, {} as never);
  const byTime = new Map<number, number>();
  for (const layer of spec.layers) {
    if (layer.kind === 'line') for (const p of layer.points) byTime.set(p.time as number, p.value);
  }
  return bars.map((b) => byTime.get(b.time as number) ?? null);
}

const barsWhere = (xs: readonly (boolean | null)[]) => xs.flatMap((x, i) => (x ? [i] : []));

describe('pack: vwap', () => {
  let runtime: PackRuntime;
  let ind: PackIndicator;

  beforeAll(async () => {
    runtime = await createTestRuntime();
    ind = await runtime.load('vwap');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  const bars = intradayBars(4);

  it('works two sessions by hand: a running average that starts again each IST day', async () => {
    // Typical price = close when high = low = close. Day 1: (10·100 + 20·300) / 400 = 17.5.
    // Day 2 starts afresh: 40, then (40·200 + 10·200) / 400 = 25.
    const flat = (time: number, price: number, volume: number) =>
      ({ time, open: price, high: price, low: price, close: price, volume }) as OHLCV;
    const run = await ind.run([
      flat(SESSION_OPEN, 10, 100),
      flat(SESSION_OPEN + FIVE_MINUTES, 20, 300),
      flat(SESSION_OPEN + 86_400, 40, 200),
      flat(SESSION_OPEN + 86_400 + FIVE_MINUTES, 10, 200),
    ], {}, { timeframe: '5' });
    expect(run.plot('VWAP')).toEqual([10, 17.5, 40, 25]);
  });

  it('matches the built-in VWAP bar for bar across several sessions', async () => {
    const run = await ind.run(bars, {}, { timeframe: '5' });
    expect(closeSeries(run.plot('VWAP'), sessionVwap(bars, 'hlc3'))).toEqual({ ok: true });
    expect(closeSeries(run.plot('VWAP'), builtInVwap(bars))).toEqual({ ok: true });
  });

  it('resets on the IST day, not the UTC day', async () => {
    // 05:00 IST is still the previous UTC day (23:30 UTC); a UTC reset would split it wrongly.
    const early = [0, 1, 2].map((k) => ({
      time: SESSION_OPEN - 4 * 3_600 - 15 * 60 + k * 3_600, open: 10 + k, high: 10 + k, low: 10 + k, close: 10 + k, volume: 100,
    })) as OHLCV[];
    const run = await ind.run(early, {}, { timeframe: '60' });
    expect(closeSeries(run.plot('VWAP'), builtInVwap(early))).toEqual({ ok: true });
    expect(run.plot('VWAP')).toEqual([10, 10.5, 11]);
  });

  it('draws nothing while the session has traded no volume, like the built-in', async () => {
    const quiet = bars.map((b, i) => (i % 75 < 3 ? { ...b, volume: 0 } : b));
    const run = await ind.run(quiet, {}, { timeframe: '5' });
    const values = run.plot('VWAP');
    expect([0, 1, 2, 75, 76, 77].map((i) => values[i])).toEqual([null, null, null, null, null, null]);
    expect(closeSeries(values, builtInVwap(quiet))).toEqual({ ok: true });
  });

  it('averages the source the trader picks', async () => {
    const run = await ind.run(bars, { source: 'close' }, { timeframe: '5' });
    expect(closeSeries(run.plot('VWAP'), sessionVwap(bars, 'close'))).toEqual({ ok: true });
  });

  it('shows on minute and hour charts only by default, like the built-in', () => {
    expect(ind.manifest.visibility).toEqual(vwapModule.manifest.visibility);
    expect(ind.manifest.placement).toBe('price');
  });

  it('draws one line in the built-in\'s colour and width, both adjustable', async () => {
    const plain = await ind.run(bars, {}, { timeframe: '5' });
    expect(plain.outputs()).toEqual([{ title: 'VWAP', kind: 'serial.numeric', visual: 'line' }]);
    expect(plain.snapshot.outputs.find((o) => o.title === 'VWAP')?.style).toMatchObject({ color: '#e879f9', lineWidth: 2 });
    const styled = await ind.run(bars, { color: '#ff0000', 'line-width': 3 }, { timeframe: '5' });
    expect(styled.snapshot.outputs.find((o) => o.title === 'VWAP')?.style).toMatchObject({ color: '#ff0000', lineWidth: 3 });
  });

  it('fires the cross alerts on the bar the close crosses VWAP', async () => {
    const closes = [10, 10, 10, 14, 14, 6];
    const run = await ind.run(closes.map((c, i) => ({
      time: SESSION_OPEN + i * FIVE_MINUTES, open: c, high: c, low: c, close: c, volume: 100,
    })) as OHLCV[], { source: 'close' }, { timeframe: '5' });
    // VWAP: 10, 10, 10, 11, 11.6, 10.67 — close crosses above at bar 3, below at bar 5.
    expect(barsWhere(run.alert('Close crossed above VWAP'))).toEqual([3]);
    expect(barsWhere(run.alert('Close crossed below VWAP'))).toEqual([5]);
  });
});
