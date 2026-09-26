import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestRuntime, barsFrom, flatRangeBars, realisticDaily, closeSeries, field, map, sma, zip, type PackIndicator, type PackRuntime } from 'guardian-gscript-toolchain';

describe('ADR% — average daily range as a percent', () => {
  let runtime: PackRuntime;
  let adr: PackIndicator;
  beforeAll(async () => {
    runtime = await createTestRuntime();
    adr = await runtime.load('adr-percent');
  }, 120_000);
  afterAll(() => runtime?.dispose());

  it('reads 2% on bars that always span 100 → 102', async () => {
    const run = await adr.run(flatRangeBars(40, 100, 102));
    const values = run.plot('ADR%');
    // Nothing until the 20-bar window fills, then exactly 2%.
    expect(values.slice(0, 19)).toEqual(new Array(19).fill(null));
    for (const value of values.slice(19)) expect(value).toBeCloseTo(2, 10);
  });

  it('averages the high ÷ low ratio over the Length a trader sets', async () => {
    const bars = realisticDaily();
    const run = await adr.run(bars, { length: 10 });
    const ratio = zip(field(bars, 'high'), field(bars, 'low'), (h, l) => h / l);
    const expected = map(sma(ratio, 10), (avg) => 100 * (avg - 1));
    expect(closeSeries(run.plot('ADR%'), expected)).toEqual({ ok: true });
  });

  it('can measure the averaged range against the close instead', async () => {
    const bars = realisticDaily();
    const run = await adr.run(bars, { method: 'Range ÷ close' });
    const range = zip(sma(field(bars, 'high'), 20), sma(field(bars, 'low'), 20), (h, l) => h - l);
    const expected = zip(range, field(bars, 'close'), (r, c) => (100 * r) / c);
    expect(closeSeries(run.plot('ADR%'), expected)).toEqual({ ok: true });
  });

  it("draws each day's own range against the close in Range ÷ close mode, from a hand-worked bar", async () => {
    // high 102, low 100, close 101: (102 - 100) / 101 * 100 = 1.980198...%,
    // not the High ÷ low day range (which would read 2%).
    const bars = barsFrom([{ open: 100, high: 102, low: 100, close: 101 }]);
    const run = await adr.run(bars, { method: 'Range ÷ close' });
    expect(run.plot('Day range')[0]).toBeCloseTo((200 / 101), 10);
  });

  it('averages the true high-to-low span for ADR (price), independent of Method', async () => {
    const bars = realisticDaily();
    const run = await adr.run(bars, { length: 10 });
    const span = zip(field(bars, 'high'), field(bars, 'low'), (h, l) => h - l);
    const expected = sma(span, 10);
    expect(closeSeries(run.plot('ADR (price)'), expected)).toEqual({ ok: true });
  });

  describe('each day against the average', () => {
    // 25 ordinary 2% days, then a 0.5% day (tight), a 6% day (expansion), and
    // ordinary days again. Days are judged against YESTERDAY's ADR, so the
    // day being judged never dilutes its own yardstick.
    const shapes = [
      ...Array.from({ length: 25 }, () => ({ open: 101, high: 102, low: 100, close: 101 })),
      { open: 100.2, high: 100.5, low: 100, close: 100.3 },
      { open: 101, high: 106, low: 100, close: 105 },
      ...Array.from({ length: 3 }, () => ({ open: 101, high: 102, low: 100, close: 101 })),
    ];
    const bars = barsFrom(shapes);

    it("draws every day's own range behind the average", async () => {
      const run = await adr.run(bars);
      const day = run.plot('Day range');
      expect(day[0]).toBeCloseTo(2, 10);
      expect(day[25]).toBeCloseTo(0.5, 10);
      expect(day[26]).toBeCloseTo(6, 10);
      expect(run.outputs().find((o) => o.title === 'Day range')?.visual).toBe('columns');
    });

    it('marks a tight day and an expansion day in their exact house colours', async () => {
      const run = await adr.run(bars);
      const colors = run.plotColors('Day range');
      // tightColor '#a78bfa' at 25% opacity, expansionColor '#f59e0b' at 25%,
      // the ordinary column '#787b86' at 70% (30% opaque) — color.new's
      // transparency is the percentage that stays SEE-THROUGH, so alpha = 1 - t/100.
      expect(colors[24]).toBe('rgba(120, 123, 134, 0.3)'); // ordinary
      expect(colors[25]).toBe('rgba(167, 139, 250, 0.75)'); // tight
      expect(colors[26]).toBe('rgba(245, 158, 11, 0.75)'); // expansion
      expect(colors[28]).toBe(colors[24]);
    });

    it('raises the tight-day alert on the contraction, and the expansion-day alert on the other one', async () => {
      const run = await adr.run(bars);
      const tightFired = run.alert('Tight day').flatMap((hit, bar) => (hit ? [bar] : []));
      const expansionFired = run.alert('Expansion day').flatMap((hit, bar) => (hit ? [bar] : []));
      expect(tightFired).toEqual([25]);
      expect(expansionFired).toEqual([26]);
    });

    it('lights the ADR% line in the exact house colours, on either side of the minimum', async () => {
      const quiet = await adr.run(bars); // ADR ≈ 2%, below the 3.5% default
      const active = await adr.run(bars, { minimum: 1.5 });
      expect(quiet.level('Minimum ADR%')).toBe(3.5);
      expect(active.level('Minimum ADR%')).toBe(1.5);
      expect(quiet.plotColors('ADR%')[24]).toBe('#b2b5be'); // below minimum
      expect(active.plotColors('ADR%')[24]).toBe('#38bdf8'); // at/above minimum
    });

    it('shows the average range in rupees in the Data Window, off the pane', async () => {
      const run = await adr.run(bars);
      expect(run.plot('ADR (price)')[24]).toBeCloseTo(2, 10);
      expect(run.shown('ADR (price)')).toEqual({ pane: false, dataWindow: true, statusLine: false });
    });
  });

  describe('the tight/expansion boundary, pinned exactly', () => {
    // Length 1 makes ADR equal that single bar's own ratio, with no averaging
    // to round away: 200 → 100 gives an exact 100% ADR, so the next bar's
    // yardstick (yesterday's ADR, via offset(1)) is exactly 100, and a day
    // designed to land exactly on tightAt × 100 or expansionAt × 100 pins the
    // 0.5 / 1.5 defaults and the at-or-below / at-or-above (inclusive) rule
    // together — dropping the offset(1) yardstick (using the day's own,
    // undiluted-at-length-1 ADR instead) would flip both of these.
    const trailer = [{ open: 101, high: 102, low: 100, close: 101 }, { open: 101, high: 102, low: 100, close: 101 }];

    it('a day at exactly 0.5 × yesterday\'s ADR is tight (the boundary is inclusive)', async () => {
      const bars = barsFrom([
        { open: 150, high: 200, low: 100, close: 150 }, // ratio 2.0 → ADR 100%
        { open: 125, high: 150, low: 100, close: 125 }, // ratio 1.5 → day range 50% = 0.5 × 100
        ...trailer,
      ]);
      const run = await adr.run(bars, { length: 1 });
      expect(run.plot('Day range')[1]).toBeCloseTo(50, 9);
      expect(run.plot('ADR%')[0]).toBeCloseTo(100, 9); // yesterday's yardstick
      expect(run.alert('Tight day')[1]).toBe(true);
      expect(run.plotColors('Day range')[1]).toBe('rgba(167, 139, 250, 0.75)');
    });

    it('a day at exactly 1.5 × yesterday\'s ADR is an expansion (the boundary is inclusive)', async () => {
      const bars = barsFrom([
        { open: 150, high: 200, low: 100, close: 150 }, // ratio 2.0 → ADR 100%
        { open: 175, high: 250, low: 100, close: 175 }, // ratio 2.5 → day range 150% = 1.5 × 100
        ...trailer,
      ]);
      const run = await adr.run(bars, { length: 1 });
      expect(run.plot('Day range')[1]).toBeCloseTo(150, 9);
      expect(run.plot('ADR%')[0]).toBeCloseTo(100, 9);
      expect(run.alert('Expansion day')[1]).toBe(true);
      expect(run.plotColors('Day range')[1]).toBe('rgba(245, 158, 11, 0.75)');
    });
  });

  it('offers exactly the two methods, high ÷ low first', () => {
    const method = adr.manifest.inputs?.find((i) => i.key === 'input@method');
    expect(method).toMatchObject({ kind: 'select', default: 'High ÷ low' });
    expect(method?.kind === 'select' && method.options.map((o) => o.value))
      .toEqual(['High ÷ low', 'Range ÷ close']);
  });

  it('keeps the tight and expansion thresholds from crossing (tight can\'t reach past 1×, expansion can\'t start below it)', () => {
    const tightAt = adr.manifest.inputs?.find((i) => i.key === 'input@tight-at');
    const expansionAt = adr.manifest.inputs?.find((i) => i.key === 'input@expansion-at');
    expect(tightAt).toMatchObject({ kind: 'number', default: 0.5, min: 0, max: 1 });
    expect(expansionAt).toMatchObject({ kind: 'number', default: 1.5, min: 1 });
  });

  it('exposes a colour input for the ADR% line below the minimum, distinct from the guide line', () => {
    const belowMinimum = adr.manifest.inputs?.find((i) => i.key === 'input@below-minimum-color');
    expect(belowMinimum).toMatchObject({ kind: 'color', label: 'ADR% below minimum', default: '#b2b5be' });
  });
});
