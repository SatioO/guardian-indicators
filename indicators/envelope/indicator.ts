//@gscript=2
indicator('Envelope', { overlay: true });

const length = input.int(20, 'Length', { id: 'length', min: 1, max: 500 });
const percent = input.float(10, 'Percent', { id: 'percent', min: 0, step: 0.5 });
const src = input.source('close', 'Source', { id: 'source' });
const exponential = input.bool(false, 'Exponential', { id: 'exponential' });
const bandColor = input.color('#38bdf8', 'Bands', { id: 'band-color' });
const basisColor = input.color('#f59e0b', 'Basis', { id: 'basis-color' });
const shade = input.bool(true, 'Fill the envelope', { id: 'shade' });

const basis = exponential ? ta.ema(src, length) : ta.sma(src, length);
const upper = basis.mul(1 + percent / 100);
const lower = basis.mul(1 - percent / 100);

const upperPlot = plot(upper, { title: 'Upper band', color: bandColor });
plot(basis, { title: 'Basis', color: basisColor });
const lowerPlot = plot(lower, { title: 'Lower band', color: bandColor });
fill(upperPlot, lowerPlot, { color: color.new(bandColor, shade ? 90 : 100) });
plot(close.div(basis).sub(1).mul(100), {
  title: 'Distance from basis %',
  display: display.data_window,
  format: format.percent,
});

alertcondition(ta.crossover(close, upper), {
  id: 'above-upper',
  title: 'Close above upper band',
  message: 'The close moved above the upper envelope band',
});
alertcondition(ta.crossunder(close, lower), {
  id: 'below-lower',
  title: 'Close below lower band',
  message: 'The close moved below the lower envelope band',
});
