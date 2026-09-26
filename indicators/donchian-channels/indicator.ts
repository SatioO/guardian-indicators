//@gscript=2
indicator('Donchian Channels', { overlay: true });

const length = input.int(20, 'Length', { id: 'length', min: 1, max: 500 });
const shift = input.int(0, 'Offset', { id: 'offset', min: -500, max: 500 });
const signals = input.bool(true, 'Show breakout markers', { id: 'signals' });
const bandColor = input.color('#38bdf8', 'Bands', { id: 'band-color' });
const basisColor = input.color('#f59e0b', 'Basis', { id: 'basis-color' });
const upColor = input.color('#26a69a', 'Breakout', { id: 'up-color' });
const downColor = input.color('#ef5350', 'Breakdown', { id: 'down-color' });

const upper = ta.highest(high, length);
const lower = ta.lowest(low, length);
const basis = upper.add(lower).div(2);

// A breakout is the first close above the PREVIOUS bar's upper band — a new
// closing high for the period; a breakdown the first close under the
// previous bar's lower band.
const breakout = ta.crossover(close, upper.offset(1));
const breakdown = ta.crossunder(close, lower.offset(1));

const upperPlot = plot(upper, { title: 'Upper band', color: bandColor, offset: shift });
plot(basis, { title: 'Basis', color: basisColor, offset: shift });
const lowerPlot = plot(lower, { title: 'Lower band', color: bandColor, offset: shift });
fill(upperPlot, lowerPlot, { color: color.new(bandColor, 90) });

plotshape(signals ? breakout : false, {
  title: 'Breakout',
  shape: shape.triangleup,
  location: location.belowbar,
  color: upColor,
  size: size.small,
});
plotshape(signals ? breakdown : false, {
  title: 'Breakdown',
  shape: shape.triangledown,
  location: location.abovebar,
  color: downColor,
  size: size.small,
});

alertcondition(breakout, {
  id: 'breakout',
  title: 'Breakout',
  message: 'The close broke above the previous Donchian upper band',
});
alertcondition(breakdown, {
  id: 'breakdown',
  title: 'Breakdown',
  message: 'The close broke below the previous Donchian lower band',
});
