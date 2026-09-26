//@gscript=2
indicator('Swing Dashboard', { overlay: true });

const benchmark = input.symbol('INDEX:NIFTY', 'Benchmark', { id: 'benchmark' });
const place = input.string('Top right', 'Position', {
  id: 'position',
  options: ['Top right', 'Top left', 'Bottom right', 'Bottom left'],
});
const adrLength = input.int(20, 'ADR length', { id: 'adr-length', min: 1, max: 200 });
const atrLength = input.int(14, 'ATR length', { id: 'atr-length', min: 1, max: 200 });
const volumeLength = input.int(50, 'Volume average length', { id: 'volume-length', min: 2, max: 500 });
const minAdr = input.float(3.5, 'Minimum ADR%', { id: 'min-adr', min: 0, step: 0.5 });
const minTurnover = input.float(10, 'Minimum turnover (₹ Cr)', { id: 'min-turnover', min: 0, step: 1 });
const surgeAt = input.float(1.5, 'Volume surge at (× average)', { id: 'surge-at', min: 1, step: 0.1 });
const dryUpAt = input.float(0.5, 'Volume dry-up at (× average)', { id: 'dry-up-at', min: 0, max: 1, step: 0.05 });
const upColor = input.color('#26a69a', 'Good', { id: 'up-color' });
const downColor = input.color('#ef5350', 'Poor', { id: 'down-color' });
const surgeColor = input.color('#f59e0b', 'Volume surge', { id: 'surge-color' });
const dryUpColor = input.color('#38bdf8', 'Volume dry-up', { id: 'dry-up-color' });

const YEAR = 252;
const QUARTER = 63;

// ── The numbers, as whole-history series (each is in the Data Window too) ──
const adr = ta.sma(high.div(low), adrLength).sub(1).mul(100);
const atrPct = ta.atr(atrLength).div(close).mul(100);
const rvol = volume.div(ta.sma(volume, volumeLength).offset(1));
const offHigh = close.div(ta.highest(high, YEAR)).sub(1).mul(100);
const aboveLow = close.div(ta.lowest(low, YEAR)).sub(1).mul(100);
const turnoverCr = ta.sma(close.mul(volume), volumeLength).div(10000000);
const upClose = close.gt(close.offset(1));
const downClose = close.lt(close.offset(1));
const upVolume = ta.sma(upClose.iff(volume, 0), volumeLength);
const downVolume = ta.sma(downClose.iff(volume, 0), volumeLength);
const upDown = upVolume.div(downVolume);
const from50 = close.div(ta.sma(close, 50)).sub(1).mul(100);
const index = request.security(benchmark, '', 'close');
const vsIndex = close.div(close.offset(QUARTER)).div(index.div(index.offset(QUARTER))).sub(1).mul(100);
const dryUp = rvol.lte(dryUpAt);
const volumeSurge = rvol.gte(surgeAt);
const quietAccumulation = dryUp.and(upDown.gte(1));

plot(adr, { title: 'ADR%', display: display.data_window, format: format.percent });
plot(atrPct, { title: 'ATR%', display: display.data_window, format: format.percent });
plot(rvol, { title: 'RVOL', display: display.data_window });
plot(offHigh, { title: '% off 52-week high', display: display.data_window, format: format.percent });
plot(aboveLow, { title: '% above 52-week low', display: display.data_window, format: format.percent });
plot(turnoverCr, { title: 'Avg turnover (₹ Cr)', display: display.data_window });
plot(upDown, { title: 'Up/down volume ratio', display: display.data_window });
plot(from50, { title: '% from 50 SMA', display: display.data_window, format: format.percent });
plot(vsIndex, { title: '3M vs benchmark (%)', display: display.data_window, format: format.percent });

alertcondition(quietAccumulation, {
  id: 'quiet-accumulation',
  title: 'Quiet accumulation',
  message: 'Volume dry-up at or below the Volume dry-up threshold, with up/down volume at or above 1',
});
alertcondition(volumeSurge, {
  id: 'volume-surge',
  title: 'Volume surge',
  message: 'RVOL reached the Volume surge at threshold',
});

// ── The table, read at the latest bar ───────────────────────────────────────
/** Indian digit grouping with one decimal: 1,23,456.7 */
const grouped = (value: number) => {
  const [whole, fraction] = value.toFixed(1).split('.');
  const head = whole.slice(0, -3);
  return `${head ? `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${whole.slice(-3)}` : whole}.${fraction}`;
};
const money = (crore: number) => (crore >= 1 ? `₹ ${grouped(crore)} Cr` : `₹ ${grouped(crore * 100)} L`);
const percent = (v: number) => `${v.toFixed(2)}%`;
const signed = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
const byGood = (good: boolean) => (good ? upColor : downColor);

if (bars.length > 0) {
  const last = bars.length - 1;
  const benchName = benchmark.includes(':') ? benchmark.slice(benchmark.indexOf(':') + 1) : benchmark;
  const muted = '#787b86';
  // A window with real up-close volume and NO down-close volume at all is the
  // most one-sided reading the ratio can describe (division alone gives
  // +Infinity, which the table would otherwise read as "not enough history").
  // Map it to a finite sentinel so it renders as an unmistakable extreme, "∞",
  // coloured the same as any other reading at or above 1 — never a dash.
  const BULLISH_EXTREME = Number.MAX_VALUE;
  const upDownLast = (() => {
    const up = upVolume.get(last);
    const down = downVolume.get(last);
    return down === 0 && up > 0 ? BULLISH_EXTREME : upDown.get(last);
  })();
  // [label, value at the latest bar, text, colour]
  const rows = [
    [`ADR% (${adrLength})`, adr.get(last), percent, (v: number) => (v >= minAdr ? upColor : muted)],
    [`ATR% (${atrLength})`, atrPct.get(last), percent, () => undefined],
    [`RVOL (${volumeLength})`, rvol.get(last), (v: number) => `${v.toFixed(2)}×`,
      (v: number) => (v >= surgeAt ? surgeColor : v <= dryUpAt ? dryUpColor : undefined)],
    ['Off 52-week high', offHigh.get(last), signed, (v: number) => byGood(v >= -25)],
    ['Above 52-week low', aboveLow.get(last), signed, (v: number) => byGood(v >= 30)],
    [`Avg turnover (${volumeLength})`, turnoverCr.get(last), money, (v: number) => byGood(v >= minTurnover)],
    [`Up/down volume (${volumeLength})`, upDownLast, (v: number) => (v === BULLISH_EXTREME ? '∞' : v.toFixed(2)),
      (v: number) => byGood(v === BULLISH_EXTREME || v >= 1)],
    ['From 50 SMA', from50.get(last), signed, (v: number) => byGood(v >= 0)],
    [`3M vs ${benchName}`, vsIndex.get(last), signed, (v: number) => byGood(v >= 0)],
  ];
  const positions = {
    'Top right': position.top_right,
    'Top left': position.top_left,
    'Bottom right': position.bottom_right,
    'Bottom left': position.bottom_left,
  };
  const panel = table.new(positions[place] ?? position.top_right, 2, rows.length + 1);
  table.cell(panel, 0, 0, 'Swing dashboard', { bold: true });
  table.cell(panel, 1, 0, '');
  rows.forEach(([name, value, text, tint], k: number) => {
    const known = Number.isFinite(value);
    table.cell(panel, 0, k + 1, name);
    table.cell(panel, 1, k + 1, known ? text(value) : '—', { mono: true, textColor: known ? tint(value) : muted });
  });
}
