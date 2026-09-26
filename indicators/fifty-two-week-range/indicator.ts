//@gscript=2
indicator('52-Week Range', { overlay: false, format: format.percent, precision: 2 });

const length = input.int(252, 'Lookback (bars)', { id: 'length', min: 2, max: 1000 });
const nearHigh = input.float(-25, 'Near-high guide (%)', { id: 'near-high', max: 0, step: 1 });
const aboveLow = input.float(30, 'Above-low guide (%)', { id: 'above-low', min: 0, step: 1 });
const shadeZone = input.bool(true, 'Shade the near-high zone', { id: 'shade' });
const highColor = input.color('#38bdf8', 'Off the high', { id: 'high-color' });
const lowColor = input.color('#26a69a', 'Above the low', { id: 'low-color' });
const newHighColor = input.color('#a78bfa', 'New high', { id: 'new-high-color' });
const newLowColor = input.color('#ef5350', 'New low', { id: 'new-low-color' });

// The year's range, the current bar included (252 bars ≈ 52 weeks of sessions).
const yearHigh = ta.highest(high, length);
const yearLow = ta.lowest(low, length);
const offHigh = close.div(yearHigh).sub(1).mul(100);
const aboveYearLow = close.div(yearLow).sub(1).mul(100);

// A new high clears every high of the rest of the window.
const newHigh = high.gt(ta.highest(high, length - 1).offset(1));
const newLow = low.lt(ta.lowest(low, length - 1).offset(1));

const guides = '#787b86';
const zero = hline(0, { title: 'Zero', color: color.new(guides, 50), style: 'solid' });
const nearGuide = hline(nearHigh, { title: 'Near-high guide', color: guides, style: 'dashed' });
hline(aboveLow, { title: 'Above-low guide', color: guides, style: 'dashed' });
// Fully transparent when switched off: a fill given na refuses to run.
fill(zero, nearGuide, { color: color.new(highColor, shadeZone ? 90 : 100) });

plot(offHigh, {
  title: '% off 52-week high',
  linewidth: 2,
  color: bars.map((_bar, i) => (offHigh.get(i) >= nearHigh ? highColor : color.new(highColor, 65))),
});
plot(aboveYearLow, {
  title: '% above 52-week low',
  linewidth: 2,
  color: bars.map((_bar, i) => (aboveYearLow.get(i) >= aboveLow ? lowColor : color.new(lowColor, 65))),
});
// Offset from zero so a bar that is both a new high and a new low (a wide-range
// bar that clears the window's high and undercuts its low) still shows two
// distinguishable dots instead of one hiding the other at the same spot.
plotshape(newHigh.iff(5, na), {
  title: 'New 52-week high',
  shape: shape.circle,
  location: location.absolute,
  color: newHighColor,
  size: size.tiny,
});
plotshape(newLow.iff(-5, na), {
  title: 'New 52-week low',
  shape: shape.circle,
  location: location.absolute,
  color: newLowColor,
  size: size.tiny,
});

plot(yearHigh, { title: '52-week high', display: display.data_window, format: format.price });
plot(yearLow, { title: '52-week low', display: display.data_window, format: format.price });
plot(close.sub(yearLow).div(yearHigh.sub(yearLow)).mul(100), {
  title: 'Position in range',
  display: display.data_window,
});

alertcondition(newHigh, {
  id: 'new-52-week-high',
  title: 'New 52-week high',
  message: 'Price made a new 52-week high',
});
alertcondition(newLow, {
  id: 'new-52-week-low',
  title: 'New 52-week low',
  message: 'Price made a new 52-week low',
});
