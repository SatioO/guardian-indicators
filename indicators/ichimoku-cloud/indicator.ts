//@gscript=2
indicator('Ichimoku Cloud', { overlay: true });

const conversionLength = input.int(9, 'Conversion line length', { id: 'conversion-length', min: 1, max: 500 });
const baseLength = input.int(26, 'Base line length', { id: 'base-length', min: 1, max: 500 });
const spanBLength = input.int(52, 'Leading span B length', { id: 'span-b-length', min: 1, max: 500 });
const displacement = input.int(26, 'Displacement', { id: 'displacement', min: 1, max: 500 });
const conversionColor = input.color('#38bdf8', 'Conversion line', { id: 'conversion-color' });
const baseColor = input.color('#f59e0b', 'Base line', { id: 'base-color' });
const laggingColor = input.color('#a78bfa', 'Lagging span', { id: 'lagging-color' });
const bullColor = input.color('#26a69a', 'Bullish cloud', { id: 'bull-color' });
const bearColor = input.color('#ef5350', 'Bearish cloud', { id: 'bear-color' });

// The midpoint of the highest high and lowest low over the last `n` bars.
const conversion = ta.highest(high, conversionLength).add(ta.lowest(low, conversionLength)).div(2);
const base = ta.highest(high, baseLength).add(ta.lowest(low, baseLength)).div(2);
const leadA = conversion.add(base).div(2);
const leadB = ta.highest(high, spanBLength).add(ta.lowest(low, spanBLength)).div(2);

// The spans are drawn ahead of the bar that computed them, the lagging span
// behind it, by displacement − 1 bars (the current bar counts as the first).
const ahead = displacement - 1;

plot(conversion, { title: 'Conversion line', color: conversionColor });
plot(base, { title: 'Base line', color: baseColor });
plot(close, { title: 'Lagging span', color: laggingColor, offset: -ahead });
const spanA = plot(leadA, { title: 'Leading span A', color: color.new(bullColor, 40), offset: ahead });
plot(leadB, { title: 'Leading span B', color: color.new(bearColor, 40), offset: ahead });

// A fill takes one colour, so each shade runs from span A to a hidden copy of
// span B that exists only while A is on that side of it.
const bullEdge = plot(leadA.gt(leadB).iff(leadB, na), {
  title: 'Bullish cloud edge',
  offset: ahead,
  display: display.none,
});
const bearEdge = plot(leadA.lt(leadB).iff(leadB, na), {
  title: 'Bearish cloud edge',
  offset: ahead,
  display: display.none,
});
fill(spanA, bullEdge, { color: color.new(bullColor, 90) });
fill(spanA, bearEdge, { color: color.new(bearColor, 90) });

// The cloud drawn over this bar was computed `ahead` bars ago.
const cloudA = leadA.offset(ahead);
const cloudB = leadB.offset(ahead);
const cloudTop = cloudA.gt(cloudB).iff(cloudA, cloudB);
const cloudBottom = cloudA.lt(cloudB).iff(cloudA, cloudB);

alertcondition(ta.crossover(close, cloudTop), {
  id: 'above-cloud',
  title: 'Close crossed above the cloud',
  message: 'The close crossed above the Ichimoku cloud',
});
alertcondition(ta.crossunder(close, cloudBottom), {
  id: 'below-cloud',
  title: 'Close crossed below the cloud',
  message: 'The close crossed below the Ichimoku cloud',
});
alertcondition(ta.crossover(conversion, base), {
  id: 'tk-cross-up',
  title: 'Conversion crossed above base',
  message: 'The Ichimoku conversion line crossed above the base line',
});
alertcondition(ta.crossunder(conversion, base), {
  id: 'tk-cross-down',
  title: 'Conversion crossed below base',
  message: 'The Ichimoku conversion line crossed below the base line',
});
