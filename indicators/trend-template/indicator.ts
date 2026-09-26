//@gscript=2
indicator('Trend Template', { overlay: true });

const benchmark = input.symbol('INDEX:NIFTY', 'Benchmark', { id: 'benchmark' });
const risingBars = input.int(20, 'SMA 200 rising over (bars)', { id: 'rising-bars', min: 1, max: 200 });
const aboveLowPct = input.float(30, 'Above 52-week low by at least (%)', { id: 'above-low', min: 0, step: 5 });
const nearHighPct = input.float(25, 'Within 52-week high by (%)', { id: 'near-high', min: 0, max: 100, step: 5 });
const yearBars = input.int(252, 'Year (bars)', { id: 'year', min: 20, max: 1000 });
const showAverages = input.bool(true, 'Show the averages', { id: 'averages' });
const shade = input.bool(true, 'Shade bars that pass', { id: 'shade' });
const showTable = input.bool(true, 'Show the checklist', { id: 'table' });
const place = input.string('Top right', 'Checklist position', {
  id: 'position',
  options: ['Top right', 'Top left', 'Bottom right', 'Bottom left'],
});
const passColor = input.color('#26a69a', 'Passes', { id: 'pass-color' });
const failColor = input.color('#ef5350', 'Fails', { id: 'fail-color' });
const fastColor = input.color('#38bdf8', 'SMA 50', { id: 'fast-color' });
const midColor = input.color('#a78bfa', 'SMA 150', { id: 'mid-color' });
const slowColor = input.color('#f59e0b', 'SMA 200', { id: 'slow-color' });

const sma50 = ta.sma(close, 50);
const sma150 = ta.sma(close, 150);
const sma200 = ta.sma(close, 200);
const yearHigh = ta.highest(high, yearBars);
const yearLow = ta.lowest(low, yearBars);

// Relative strength stands in for the RS rating: a year's return against the
// benchmark's over the same bars.
const index = request.security(benchmark, '', 'close');
const stockReturn = close.div(close.offset(yearBars));
const indexReturn = index.div(index.offset(yearBars));

const aboveLongAverages = close.gt(sma150).and(close.gt(sma200));
const midAboveSlow = sma150.gt(sma200);
const slowRising = sma200.gt(sma200.offset(risingBars));
const fastAboveBoth = sma50.gt(sma150).and(sma50.gt(sma200));
const aboveFast = close.gt(sma50);
const offTheLow = close.gte(yearLow.mul(1 + aboveLowPct / 100));
const nearTheHigh = close.gte(yearHigh.mul(1 - nearHighPct / 100));
const beatsBenchmark = stockReturn.gt(indexReturn);
const criteria = [aboveLongAverages, midAboveSlow, slowRising, fastAboveBoth, aboveFast, offTheLow, nearTheHigh, beatsBenchmark];
const passCount = aboveLongAverages.iff(1, 0)
  .add(midAboveSlow.iff(1, 0))
  .add(slowRising.iff(1, 0))
  .add(fastAboveBoth.iff(1, 0))
  .add(aboveFast.iff(1, 0))
  .add(offTheLow.iff(1, 0))
  .add(nearTheHigh.iff(1, 0))
  .add(beatsBenchmark.iff(1, 0));
const allPass = passCount.eq(8);

plot(showAverages ? sma50 : na, { title: 'SMA 50', color: fastColor, linewidth: 1 });
plot(showAverages ? sma150 : na, { title: 'SMA 150', color: midColor, linewidth: 1 });
plot(showAverages ? sma200 : na, { title: 'SMA 200', color: slowColor, linewidth: 2 });
plot(passCount, { title: 'Criteria passed', display: display.data_window, precision: 0 });
bgcolor(bars.map((_bar, i) => (shade && allPass.get(i) ? color.new(passColor, 88) : na)));

alertcondition(allPass.and(passCount.offset(1).lt(8)), {
  id: 'template-passed',
  title: 'Trend template passed',
  message: 'All eight trend template criteria now pass',
});
alertcondition(passCount.lt(8).and(passCount.offset(1).eq(8)), {
  id: 'template-lost',
  title: 'Trend template lost',
  message: 'The trend template no longer passes',
});

// ── The checklist, read at the latest bar ───────────────────────────────────
if (showTable && bars.length > 0) {
  const last = bars.length - 1;
  const at = (series) => series.get(last);
  const change = (a: number, b: number) => (a / b - 1) * 100;
  const signed = (v: number) => (Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—');
  const benchName = benchmark.includes(':') ? benchmark.slice(benchmark.indexOf(':') + 1) : benchmark;
  const yearLabel = yearBars === 252 ? '52-week' : `${yearBars}-bar`;
  const rows = [
    ['Close above SMA 150 and 200', Math.min(change(at(close), at(sma150)), change(at(close), at(sma200)))],
    ['SMA 150 above SMA 200', change(at(sma150), at(sma200))],
    [`SMA 200 rising (${risingBars} bars)`, change(at(sma200), sma200.get(last - risingBars))],
    ['SMA 50 above SMA 150 and 200', Math.min(change(at(sma50), at(sma150)), change(at(sma50), at(sma200)))],
    ['Close above SMA 50', change(at(close), at(sma50))],
    [`At least ${aboveLowPct}% above ${yearLabel} low`, change(at(close), at(yearLow))],
    [`Within ${nearHighPct}% of ${yearLabel} high`, change(at(close), at(yearHigh))],
    [`Beats ${benchName} over ${yearBars === 252 ? '12 months' : `${yearBars} bars`}`, change(at(stockReturn), at(indexReturn))],
  ];
  const positions = {
    'Top right': position.top_right,
    'Top left': position.top_left,
    'Bottom right': position.bottom_right,
    'Bottom left': position.bottom_left,
  };
  const panel = table.new(positions[place] ?? position.top_right, 3, rows.length + 1);
  const passed = at(passCount);
  table.cell(panel, 0, 0, 'Trend template', { bold: true });
  table.cell(panel, 1, 0, `${passed} / 8`, {
    bold: true,
    mono: true,
    textColor: passed === 8 ? passColor : passed >= 6 ? '#f59e0b' : failColor,
  });
  table.cell(panel, 2, 0, '');
  rows.forEach(([text, detail], k: number) => {
    const known = Number.isFinite(detail);
    const ok = criteria[k].get(last);
    table.cell(panel, 0, k + 1, known ? (ok ? '✓' : '✗') : '—', {
      bold: true,
      textColor: known ? (ok ? passColor : failColor) : '#787b86',
    });
    table.cell(panel, 1, k + 1, text);
    table.cell(panel, 2, k + 1, signed(detail), { mono: true, textColor: known ? undefined : '#787b86' });
  });
}
