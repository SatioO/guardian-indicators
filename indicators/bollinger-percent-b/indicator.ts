//@gscript=2
indicator('Bollinger %B', { overlay: false, precision: 2 });

const length = input.int(20, 'Length', { id: 'length', min: 1, max: 500 });
const source = input.source('close', 'Source', { id: 'source' });
const mult = input.float(2, 'StdDev', { id: 'mult', min: 0.001, max: 50, step: 0.1 });
const lineColor = input.color('#38bdf8', '%B', { id: 'line-color' });
const aboveColor = input.color('#26a69a', 'Above the upper band', { id: 'above-color' });
const belowColor = input.color('#ef5350', 'Below the lower band', { id: 'below-color' });
const zoneColor = input.color('#38bdf8', 'Band zone', { id: 'zone-color' });

const [, upper, lower] = ta.bb(source, length, mult);

// 1 at the upper band, 0 at the lower, 0.5 on the basis. Bands with no width
// (a flat stretch) leave %B undrawn rather than dividing by zero.
const percentB = source.sub(lower).div(upper.sub(lower));
const outsideAbove = percentB.gt(1);
const outsideBelow = percentB.lt(0);

const guide = '#787b86';
const top = hline(1, { title: 'Upper band', color: guide, style: 'dashed' });
hline(0.5, { title: 'Middle band', color: color.new(guide, 50), style: 'dotted' });
const bottom = hline(0, { title: 'Lower band', color: guide, style: 'dashed' });
fill(top, bottom, { color: color.new(zoneColor, 90) });

plot(percentB, {
  title: '%B',
  linewidth: 2,
  color: bars.map((_bar, i) => {
    if (outsideAbove.get(i)) return aboveColor;
    if (outsideBelow.get(i)) return belowColor;
    return lineColor;
  }),
});
plot(upper, { title: 'Upper band (price)', display: display.data_window, format: format.price });
plot(lower, { title: 'Lower band (price)', display: display.data_window, format: format.price });

alertcondition(ta.crossover(percentB, 1), {
  id: 'close-above-upper',
  title: 'Close above the upper band',
  message: 'The close broke above the upper Bollinger Band (%B above 1)',
});
alertcondition(ta.crossunder(percentB, 0), {
  id: 'close-below-lower',
  title: 'Close below the lower band',
  message: 'The close broke below the lower Bollinger Band (%B below 0)',
});
