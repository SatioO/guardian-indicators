//@gscript=2
indicator('CCI', { overlay: false, precision: 2 });

const length = input.int(20, 'Length', { id: 'length', min: 1, max: 500 });
const src = input.source('close', 'Source', { id: 'source' });
const upperLevel = input.float(100, 'Upper band', { id: 'upper', min: 0, step: 10 });
const lowerLevel = input.float(-100, 'Lower band', { id: 'lower', max: 0, step: 10 });
const smoothing = input.string('None', 'Smoothing', {
  id: 'smoothing',
  options: ['None', 'SMA', 'EMA', 'SMMA (RMA)', 'WMA'],
});
const smoothingLength = input.int(14, 'Smoothing length', { id: 'smoothing-length', min: 1, max: 100 });
const lineColor = input.color('#38bdf8', 'CCI line', { id: 'line-color' });
const aboveColor = input.color('#26a69a', 'Above the upper band', { id: 'above-color' });
const belowColor = input.color('#ef5350', 'Below the lower band', { id: 'below-color' });
const smoothingColor = input.color('#f59e0b', 'Smoothing line', { id: 'smoothing-color' });

// Distance of the typical price from its average, in units of 0.015 × the
// mean absolute deviation, so most readings fall between −100 and +100.
const cci = ta.cci(src, length);

// An optional average of CCI itself, off by default.
const smoothed = smoothing === 'SMA' ? ta.sma(cci, smoothingLength)
  : smoothing === 'EMA' ? ta.ema(cci, smoothingLength)
    : smoothing === 'SMMA (RMA)' ? ta.rma(cci, smoothingLength)
      : smoothing === 'WMA' ? ta.wma(cci, smoothingLength)
        : na;

const guide = '#787b86';
const upper = hline(upperLevel, { title: 'Upper band', color: guide, style: 'dashed' });
hline(0, { title: 'Zero', color: color.new(guide, 50), style: 'dotted' });
const lower = hline(lowerLevel, { title: 'Lower band', color: guide, style: 'dashed' });
fill(upper, lower, { color: color.new(lineColor, 90) });

plot(cci, {
  title: 'CCI',
  linewidth: 2,
  color: bars.map((_bar, i) => {
    const value = cci.get(i);
    if (value > upperLevel) return aboveColor;
    if (value < lowerLevel) return belowColor;
    return lineColor;
  }),
});
plot(smoothed, { title: 'CCI smoothing', color: smoothingColor });

alertcondition(ta.crossover(cci, upperLevel), {
  id: 'crossed-above-upper',
  title: 'Crossed above upper band',
  message: 'CCI crossed above its upper band',
});
alertcondition(ta.crossunder(cci, lowerLevel), {
  id: 'crossed-below-lower',
  title: 'Crossed below lower band',
  message: 'CCI crossed below its lower band',
});
alertcondition(ta.crossover(cci, 0), {
  id: 'crossed-above-zero',
  title: 'Crossed above zero',
  message: 'CCI crossed above zero',
});
alertcondition(ta.crossunder(cci, 0), {
  id: 'crossed-below-zero',
  title: 'Crossed below zero',
  message: 'CCI crossed below zero',
});
