//@gscript=2
indicator('MA Ribbon', { overlay: true });

const maType = input.string('SMA', 'Type', { id: 'type', options: ['SMA', 'EMA'] });
const fastLength = input.int(20, 'Fast length', { id: 'fast-length', min: 1, max: 500 });
const mediumLength = input.int(50, 'Medium length', { id: 'medium-length', min: 1, max: 500 });
const slowLength = input.int(100, 'Slow length', { id: 'slow-length', min: 1, max: 500 });
const longLength = input.int(200, 'Long length', { id: 'long-length', min: 1, max: 1000 });
const fastColor = input.color('#38bdf8', 'Fast MA', { id: 'fast-color' });
const mediumColor = input.color('#a78bfa', 'Medium MA', { id: 'medium-color' });
const slowColor = input.color('#f59e0b', 'Slow MA', { id: 'slow-color' });
const longColor = input.color('#787b86', 'Long MA', { id: 'long-color' });
const shade = input.bool(true, 'Shade stacked ribbon', { id: 'shade' });
const bullColor = input.color('#26a69a', 'Bullish stack', { id: 'bull-color' });
const bearColor = input.color('#ef5350', 'Bearish stack', { id: 'bear-color' });

const exponential = maType === 'EMA';
const fast = exponential ? ta.ema(close, fastLength) : ta.sma(close, fastLength);
const medium = exponential ? ta.ema(close, mediumLength) : ta.sma(close, mediumLength);
const slow = exponential ? ta.ema(close, slowLength) : ta.sma(close, slowLength);
const long = exponential ? ta.ema(close, longLength) : ta.sma(close, longLength);

const bullish = fast.gt(medium).and(medium.gt(slow)).and(slow.gt(long));
const bearish = fast.lt(medium).and(medium.lt(slow)).and(slow.lt(long));

const fastPlot = plot(fast, { title: 'Fast MA', color: fastColor });
plot(medium, { title: 'Medium MA', color: mediumColor });
plot(slow, { title: 'Slow MA', color: slowColor });
plot(long, { title: 'Long MA', color: longColor, linewidth: 2 });

// A fill takes one colour, so each shade runs to a hidden copy of the long
// average that exists only while the ribbon is stacked that way.
const bullEdge = plot(bullish.iff(long, na), { title: 'Bullish stack edge', display: display.none });
const bearEdge = plot(bearish.iff(long, na), { title: 'Bearish stack edge', display: display.none });
const shadeTransparency = shade ? 85 : 100;
fill(fastPlot, bullEdge, { color: color.new(bullColor, shadeTransparency) });
fill(fastPlot, bearEdge, { color: color.new(bearColor, shadeTransparency) });

// +1 bullish, −1 bearish, 0 mixed; nothing until all four averages exist
// (whichever length is longest — the four lengths have no ordering constraint).
const ready = fast.eq(fast).and(medium.eq(medium)).and(slow.eq(slow)).and(long.eq(long));
plot(ready.iff(bullish.iff(1, bearish.iff(-1, 0)), na), { title: 'Stack', display: display.data_window });

const bullFormed = bullish.and(bullish.offset(1).not());
const bearFormed = bearish.and(bearish.offset(1).not());
const bullLost = bullish.not().and(bullish.offset(1));
const bearLost = bearish.not().and(bearish.offset(1));
alertcondition(bullFormed, {
  id: 'bullish-stack',
  title: 'Bullish stack formed',
  message: 'The averages stacked bullishly: fast above medium above slow above long',
});
alertcondition(bearFormed, {
  id: 'bearish-stack',
  title: 'Bearish stack formed',
  message: 'The averages stacked bearishly: fast below medium below slow below long',
});
alertcondition(bullLost, {
  id: 'bullish-stack-lost',
  title: 'Bullish stack lost',
  message: 'The bullish stack broke: the averages are no longer stacked fast above medium above slow above long',
});
alertcondition(bearLost, {
  id: 'bearish-stack-lost',
  title: 'Bearish stack lost',
  message: 'The bearish stack broke: the averages are no longer stacked fast below medium below slow below long',
});
