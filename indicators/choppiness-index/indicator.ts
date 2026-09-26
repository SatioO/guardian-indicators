//@gscript=2
indicator('Choppiness Index', { overlay: false, precision: 2 });

const length = input.int(14, 'Length', { id: 'length', min: 2, max: 500 });
// Bounded either side of the middle band (50): choppy can never reach past it
// and trending can never start above it, so a mis-set pair can't invert which
// colour a reading gets.
const choppyAbove = input.float(61.8, 'Choppy above', { id: 'choppy-above', min: 50, max: 100, step: 0.1 });
const trendingBelow = input.float(38.2, 'Trending below', { id: 'trending-below', min: 0, max: 50, step: 0.1 });
const lineColor = input.color('#38bdf8', 'CHOP', { id: 'line-color' });
const choppyColor = input.color('#f59e0b', 'Choppy', { id: 'choppy-color' });
const trendingColor = input.color('#a78bfa', 'Trending', { id: 'trending-color' });
const zoneColor = input.color('#38bdf8', 'Band zone', { id: 'zone-color' });

// The distance price travelled bar by bar against the ground it covered: near
// 100 when it went nowhere, near 0 when every bar pushed the same way.
const pathTravelled = math.sum(ta.atr(1), length);
const range = ta.highest(high, length).sub(ta.lowest(low, length));
const chop = math.log10(pathTravelled.div(range)).mul(100 / math.log10(length));

const choppy = chop.gt(choppyAbove);
const trending = chop.lt(trendingBelow);

const guide = '#787b86';
const upper = hline(choppyAbove, { title: 'Choppy above', color: guide, style: 'dashed' });
hline(50, { title: 'Middle band', color: color.new(guide, 50), style: 'dotted' });
const lower = hline(trendingBelow, { title: 'Trending below', color: guide, style: 'dashed' });
fill(upper, lower, { color: color.new(zoneColor, 90) });

plot(chop, {
  title: 'CHOP',
  linewidth: 2,
  color: bars.map((_bar, i) => {
    if (choppy.get(i)) return choppyColor;
    if (trending.get(i)) return trendingColor;
    return lineColor;
  }),
});

alertcondition(ta.crossunder(chop, trendingBelow), {
  id: 'trend-started',
  title: 'Trend started',
  message: 'The Choppiness Index dropped below the trending band',
});
alertcondition(ta.crossover(chop, choppyAbove), {
  id: 'turned-choppy',
  title: 'Market turned choppy',
  message: 'The Choppiness Index rose above the choppy band',
});
