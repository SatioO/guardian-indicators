//@gscript=2
indicator('ATR%', { overlay: false, format: format.percent, precision: 2 });

const length = input.int(14, 'Length', { id: 'length', min: 1, max: 500 });
const smoothing = input.string('RMA', 'Smoothing', {
  id: 'smoothing',
  options: ['RMA', 'SMA', 'EMA', 'WMA'],
});
const averageLength = input.int(50, 'Average length', { id: 'average-length', min: 1, max: 500 });
const lineColor = input.color('#38bdf8', 'ATR%', { id: 'line-color' });
const expandingColor = input.color('#f59e0b', 'ATR% above its average', { id: 'expanding-color' });

// True range reaches back to the previous close, so an overnight gap counts.
const trueRange = ta.tr(true);
const atr = smoothing === 'SMA'
  ? ta.sma(trueRange, length)
  : smoothing === 'EMA'
    ? ta.ema(trueRange, length)
    : smoothing === 'WMA'
      ? ta.wma(trueRange, length)
      : ta.rma(trueRange, length);
const atrPercent = atr.div(close).mul(100);

// The stock's usual volatility, to tell expansion from contraction.
const average = ta.sma(atrPercent, averageLength);
const expanding = atrPercent.gt(average);

plot(average, { title: 'ATR% average', color: color.new('#787b86', 20) });
plot(atrPercent, {
  title: 'ATR%',
  linewidth: 2,
  color: bars.map((_bar, i) => (expanding.get(i) ? expandingColor : lineColor)),
});
plot(atr, { title: 'ATR (price)', display: display.data_window, format: format.price });

alertcondition(ta.crossover(atrPercent, average), {
  id: 'volatility-expanding',
  title: 'Volatility expanding',
  message: 'ATR% crossed above its average',
});
