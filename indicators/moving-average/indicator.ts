//@gscript=2
indicator('Moving Average', { overlay: true });

const maType = input.string('EMA', 'Type', {
  id: 'type',
  options: ['SMA', 'EMA', 'WMA', 'HMA', 'RMA', 'VWMA', 'ALMA', 'DEMA', 'TEMA', 'LSMA'],
});
const length = input.int(21, 'Length', { id: 'length', min: 1, max: 500 });
const src = input.source('close', 'Source', { id: 'source' });
const shift = input.int(0, 'Offset', { id: 'offset', min: -500, max: 500 });
const almaOffset = input.float(0.85, 'ALMA offset', { id: 'alma-offset', min: 0, max: 1, step: 0.05, group: 'ALMA' });
const almaSigma = input.float(6, 'ALMA sigma', { id: 'alma-sigma', min: 0.5, step: 0.5, group: 'ALMA' });
const upColor = input.color('#26a69a', 'Rising', { id: 'up-color' });
const downColor = input.color('#ef5350', 'Falling', { id: 'down-color' });

// DEMA and TEMA stack exponential averages of exponential averages.
const e1 = ta.ema(src, length);
const e2 = ta.ema(e1, length);
const e3 = ta.ema(e2, length);

const average =
  maType === 'SMA' ? ta.sma(src, length)
  : maType === 'WMA' ? ta.wma(src, length)
  : maType === 'HMA' ? ta.hma(src, length)
  : maType === 'RMA' ? ta.rma(src, length)
  : maType === 'VWMA' ? ta.vwma(src, length)
  : maType === 'ALMA' ? ta.alma(src, length, almaOffset, almaSigma)
  : maType === 'DEMA' ? e1.mul(2).sub(e2)
  : maType === 'TEMA' ? e1.mul(3).sub(e2.mul(3)).add(e3)
  : maType === 'LSMA' ? ta.linreg(src, length, 0)
  : e1;

// +1 while the average rises, −1 while it falls; a flat stretch keeps the
// last direction so the line does not flicker.
const previous = average.offset(1);
const slope = ta.scan(0, (prev, _bar, i) => {
  const change = average.get(i) - previous.get(i);
  if (change > 0) return 1;
  if (change < 0) return -1;
  return prev;
});

plot(average, {
  title: 'Moving average',
  linewidth: 2,
  offset: shift,
  color: bars.map((_bar, i) => (slope.get(i) < 0 ? downColor : upColor)),
});

alertcondition(ta.crossover(close, average), {
  id: 'cross-above',
  title: 'Close crossed above the average',
  message: 'The close crossed above the moving average',
});
alertcondition(ta.crossunder(close, average), {
  id: 'cross-below',
  title: 'Close crossed below the average',
  message: 'The close crossed below the moving average',
});
