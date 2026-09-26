//@gscript=2
indicator('Aroon', { overlay: false, precision: 2 });

const length = input.int(14, 'Length', { id: 'length', min: 1, max: 500 });
const showOscillator = input.bool(false, 'Show oscillator', { id: 'oscillator' });
const strongTrendLevel = input.int(70, 'Strong trend level', { id: 'strong-trend-level', min: 0, max: 100 });
const weakTrendLevel = input.int(30, 'Weak trend level', { id: 'weak-trend-level', min: 0, max: 100 });
const upColor = input.color('#26a69a', 'Aroon Up', { id: 'up-color' });
const downColor = input.color('#ef5350', 'Aroon Down', { id: 'down-color' });
const guide = '#787b86';

// G Script's ta.highestbars counts bars BACK as a positive number (0 = this
// bar, `length` = the oldest bar of the length + 1 window).
const barsSinceHigh = ta.highestbars(high, length + 1);
const barsSinceLow = ta.lowestbars(low, length + 1);
const up = barsSinceHigh.mul(-1).add(length).mul(100 / length);
const down = barsSinceLow.mul(-1).add(length).mul(100 / length);
const oscillator = up.sub(down);

plot(showOscillator ? oscillator : na, {
  title: 'Aroon Oscillator',
  style: plot.style_columns,
  color: bars.map((_bar, i) => {
    const value = oscillator.get(i);
    if (value > 0) return color.new(upColor, 60);
    if (value < 0) return color.new(downColor, 60);
    return color.new(guide, 60);
  }),
});
plot(up, { title: 'Aroon Up', color: upColor, linewidth: 2 });
plot(down, { title: 'Aroon Down', color: downColor, linewidth: 2 });
hline(strongTrendLevel, { title: 'Strong trend level', color: guide, style: 'dashed' });
hline(weakTrendLevel, { title: 'Weak trend level', color: guide, style: 'dashed' });
plot(barsSinceHigh, { title: 'Bars since high', display: display.data_window, precision: 0 });
plot(barsSinceLow, { title: 'Bars since low', display: display.data_window, precision: 0 });

alertcondition(ta.crossover(up, down), {
  id: 'bullish-cross',
  title: 'Bullish cross',
  message: 'Aroon Up crossed above Aroon Down',
});
alertcondition(ta.crossunder(up, down), {
  id: 'bearish-cross',
  title: 'Bearish cross',
  message: 'Aroon Up crossed below Aroon Down',
});
