//@gscript=2
indicator('Keltner Channels', { overlay: true });

const length = input.int(20, 'Length', { id: 'length', min: 1, max: 500 });
const mult = input.float(2, 'Multiplier', { id: 'multiplier', min: 0.1, step: 0.1 });
const src = input.source('close', 'Source', { id: 'source' });
const exponential = input.bool(true, 'Use exponential MA', { id: 'exponential' });
const bandsStyle = input.string('Average True Range', 'Bands style', {
  id: 'bands-style',
  options: ['Average True Range', 'True Range', 'Range'],
});
const atrLength = input.int(10, 'ATR length', { id: 'atr-length', min: 1, max: 500 });
const bandColor = input.color('#38bdf8', 'Bands', { id: 'band-color' });
const basisColor = input.color('#f59e0b', 'Basis', { id: 'basis-color' });
const shade = input.bool(true, 'Fill the channel', { id: 'shade' });

const basis = exponential ? ta.ema(src, length) : ta.sma(src, length);
const bandRange =
  bandsStyle === 'True Range' ? ta.tr(true)
  : bandsStyle === 'Range' ? ta.rma(high.sub(low), length)
  : ta.atr(atrLength);
const upper = basis.add(bandRange.mul(mult));
const lower = basis.sub(bandRange.mul(mult));

const upperPlot = plot(upper, { title: 'Upper band', color: bandColor });
plot(basis, { title: 'Basis', color: basisColor });
const lowerPlot = plot(lower, { title: 'Lower band', color: bandColor });
fill(upperPlot, lowerPlot, { color: color.new(bandColor, shade ? 90 : 100) });
plot(upper.sub(lower).div(basis).mul(100), {
  title: 'Band width %',
  display: display.data_window,
  format: format.percent,
});

alertcondition(ta.crossover(close, upper), {
  id: 'break-above',
  title: 'Close above upper band',
  message: 'The close broke out above the upper Keltner band',
});
alertcondition(ta.crossunder(close, lower), {
  id: 'break-below',
  title: 'Close below lower band',
  message: 'The close broke down below the lower Keltner band',
});
