//@gscript=2
indicator('Supertrend', { overlay: true });

const atrLength = input.int(10, 'ATR length', { id: 'atr-length', min: 1, max: 200 });
const factor = input.float(3, 'Factor', { id: 'factor', min: 0.1, step: 0.1 });
const signals = input.bool(true, 'Show buy/sell signals', { id: 'signals' });
const shade = input.bool(true, 'Shade the trend', { id: 'shade' });
const upColor = input.color('#26a69a', 'Up trend', { id: 'up-color' });
const downColor = input.color('#ef5350', 'Down trend', { id: 'down-color' });

const [trendLine, direction] = ta.supertrend(factor, atrLength);

// Direction −1 is an up trend (the line trails below price), +1 a down trend.
const isUp = direction.lt(0);
const isDown = direction.gt(0);
const turnedUp = isUp.and(direction.offset(1).gt(0));
const turnedDown = isDown.and(direction.offset(1).lt(0));

const upLine = isUp.iff(trendLine, na);
const downLine = isDown.iff(trendLine, na);

const middle = plot(hl2, { title: 'Price middle', display: display.none });
const up = plot(upLine, { title: 'Up trend', color: upColor, linewidth: 2 });
const down = plot(downLine, { title: 'Down trend', color: downColor, linewidth: 2 });
fill(middle, up, { color: shade ? color.new(upColor, 88) : na });
fill(middle, down, { color: shade ? color.new(downColor, 88) : na });

plotshape(signals ? turnedUp : false, {
  title: 'Buy',
  shape: shape.labelup,
  location: location.belowbar,
  color: upColor,
  text: 'Buy',
  textcolor: color.white,
  size: size.small,
});
plotshape(signals ? turnedDown : false, {
  title: 'Sell',
  shape: shape.labeldown,
  location: location.abovebar,
  color: downColor,
  text: 'Sell',
  textcolor: color.white,
  size: size.small,
});
plot(direction, { title: 'Direction', display: display.data_window });
// Gap between close and the trailing line, in the units a trader sizes a stop with.
const stopDistancePct = math.abs(close.sub(trendLine)).div(close).mul(100);
plot(stopDistancePct, { title: 'Stop distance %', display: display.data_window });

alertcondition(turnedUp, {
  id: 'trend-up',
  title: 'Trend turned up',
  message: 'Supertrend turned up',
});
alertcondition(turnedDown, {
  id: 'trend-down',
  title: 'Trend turned down',
  message: 'Supertrend turned down',
});
alertcondition(turnedUp.or(turnedDown), {
  id: 'trend-change',
  title: 'Trend changed',
  message: 'Supertrend changed direction',
});
