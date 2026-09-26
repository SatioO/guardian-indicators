//@gscript=2
indicator('Relative Strength', { overlay: false, precision: 2 });

const benchmark = input.symbol('INDEX:NIFTY', 'Benchmark', { id: 'benchmark' });
const averageLength = input.int(50, 'Average length', { id: 'average-length', min: 1, max: 500 });
const lookback = input.int(252, 'New-high lookback (bars)', { id: 'lookback', min: 2, max: 1000 });
const showTable = input.bool(true, 'Show performance table', { id: 'table' });
const lineColor = input.color('#38bdf8', 'RS line', { id: 'line-color' });
const highColor = input.color('#a78bfa', 'RS new high', { id: 'high-color' });

// 100 on the first bar both series have data; above 100 once the stock has
// outperformed the benchmark since then.
const index = request.security(benchmark, '', 'close');
const rs = ta.rs(close, index);
const average = ta.sma(rs, averageLength);

const rsHigh = rs.gte(ta.highest(rs, lookback));
const priceHigh = close.gte(ta.highest(close, lookback));
const rsLeads = rsHigh.and(priceHigh.not());

hline(100, { title: 'Baseline', color: '#787b86', style: 'dashed' });
plot(average, { title: 'RS average', color: color.new('#787b86', 20), linewidth: 1 });
plot(rs, { title: 'RS line', color: lineColor, linewidth: 2 });
plot(rs.sub(average), { title: 'RS spread', display: display.data_window });
plotshape(rsHigh.iff(rs, na), {
  title: 'RS new high',
  shape: shape.circle,
  location: location.absolute,
  color: color.new(highColor, 40),
  size: size.tiny,
});
plotshape(rsLeads.iff(rs, na), {
  title: 'RS leads price',
  shape: shape.circle,
  location: location.absolute,
  color: highColor,
  size: size.small,
});

alertcondition(rsHigh, {
  id: 'rs-new-high',
  title: 'RS new high',
  message: 'The RS line made a new high',
});
alertcondition(rsLeads, {
  id: 'rs-leads-price',
  title: 'RS new high before price',
  message: 'The RS line made a new high before the price did',
});

// Outperformance of the benchmark over the last 1, 3, 6 and 12 months.
if (showTable) {
  const last = bars.length - 1;
  const panel = table.new(position.top_right, 2, 5);
  table.cell(panel, 0, 0, `vs ${benchmark}`, { bold: true });
  table.cell(panel, 1, 0, '');
  const periods = [['1M', 21], ['3M', 63], ['6M', 126], ['12M', 252]];
  periods.forEach(([name, span], row) => {
    const then = last - span;
    const change = then >= 0 ? (rs.get(last) / rs.get(then) - 1) * 100 : NaN;
    const known = Number.isFinite(change);
    table.cell(panel, 0, row + 1, name);
    table.cell(panel, 1, row + 1, known ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : '—', {
      textColor: !known ? '#787b86' : change >= 0 ? '#26a69a' : '#ef5350',
      mono: true,
    });
  });
}
