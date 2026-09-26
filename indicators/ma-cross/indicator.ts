//@gscript=2
indicator('MA Cross', { overlay: true });

const maType = input.string('SMA', 'Type', { id: 'type', options: ['SMA', 'EMA', 'WMA', 'RMA'] });
const fastLength = input.int(9, 'Fast length', { id: 'fast-length', min: 1, max: 500 });
const slowLength = input.int(21, 'Slow length', { id: 'slow-length', min: 1, max: 500 });
const shade = input.bool(true, 'Shade between the averages', { id: 'shade' });
const signals = input.bool(true, 'Show cross labels', { id: 'signals' });
const fastColor = input.color('#38bdf8', 'Fast MA', { id: 'fast-color' });
const slowColor = input.color('#f59e0b', 'Slow MA', { id: 'slow-color' });
const upColor = input.color('#26a69a', 'Golden cross', { id: 'up-color' });
const downColor = input.color('#ef5350', 'Death cross', { id: 'down-color' });

const fast =
  maType === 'EMA' ? ta.ema(close, fastLength)
  : maType === 'WMA' ? ta.wma(close, fastLength)
  : maType === 'RMA' ? ta.rma(close, fastLength)
  : ta.sma(close, fastLength);
const slow =
  maType === 'EMA' ? ta.ema(close, slowLength)
  : maType === 'WMA' ? ta.wma(close, slowLength)
  : maType === 'RMA' ? ta.rma(close, slowLength)
  : ta.sma(close, slowLength);

const golden = ta.crossover(fast, slow);
const death = ta.crossunder(fast, slow);

const fastPlot = plot(fast, { title: 'Fast MA', color: fastColor, linewidth: 2 });
plot(slow, { title: 'Slow MA', color: slowColor, linewidth: 2 });

// A fill takes one colour, so each shade runs to a hidden copy of the slow
// average that exists only while the fast one is on that side of it.
const bullEdge = plot(fast.gt(slow).iff(slow, na), { title: 'Bullish shade edge', display: display.none });
const bearEdge = plot(fast.lt(slow).iff(slow, na), { title: 'Bearish shade edge', display: display.none });
const shadeTransparency = shade ? 85 : 100;
fill(fastPlot, bullEdge, { color: color.new(upColor, shadeTransparency) });
fill(fastPlot, bearEdge, { color: color.new(downColor, shadeTransparency) });

plot(fast.div(slow).sub(1).mul(100), { title: 'Gap %', display: display.data_window, format: format.percent });

plotshape(signals ? golden : false, {
  title: 'Golden cross',
  shape: shape.labelup,
  location: location.belowbar,
  color: upColor,
  text: 'Golden',
  textcolor: color.white,
  size: size.small,
});
plotshape(signals ? death : false, {
  title: 'Death cross',
  shape: shape.labeldown,
  location: location.abovebar,
  color: downColor,
  text: 'Death',
  textcolor: color.white,
  size: size.small,
});

alertcondition(golden, {
  id: 'golden-cross',
  title: 'Golden cross',
  message: 'The fast average crossed above the slow average',
});
alertcondition(death, {
  id: 'death-cross',
  title: 'Death cross',
  message: 'The fast average crossed below the slow average',
});
