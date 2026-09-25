//@gscript=2
indicator('Chaikin Money Flow', { overlay: false, precision: 3 });

const length = input.int(20, 'Length', { id: 'length', min: 1, max: 500 });
const guide = input.float(0.2, 'Guide level', { id: 'guide', min: 0, max: 1, step: 0.01 });
const buyColor = input.color('#26a69a', 'Positive flow', { id: 'buy-color' });
const sellColor = input.color('#ef5350', 'Negative flow', { id: 'sell-color' });

// Money-flow volume: the bar's volume weighted by where it closed in its
// range (+1 at the high, −1 at the low). A bar with no range adds no flow,
// but its volume still counts below the line.
const range = high.sub(low);
const moneyFlowVolume = range.gt(0).iff(close.sub(low).sub(high.sub(close)).div(range).mul(volume), 0);
const cmf = math.sum(moneyFlowVolume, length).div(math.sum(volume, length));

const muted = '#787b86';
plot(cmf, {
  title: 'CMF',
  style: plot.style_columns,
  color: bars.map((_bar, i) => {
    const value = cmf.get(i);
    if (value > 0) return value >= guide ? buyColor : color.new(buyColor, 60);
    if (value < 0) return value <= -guide ? sellColor : color.new(sellColor, 60);
    return muted;
  }),
});
hline(0, { title: 'Zero', color: muted, style: 'dashed' });
hline(guide, { title: 'Buying pressure', color: color.new(buyColor, 50), style: 'dotted' });
hline(-guide, { title: 'Selling pressure', color: color.new(sellColor, 50), style: 'dotted' });

alertcondition(ta.crossover(cmf, 0), {
  id: 'cmf-cross-up',
  title: 'CMF crossed above zero',
  message: 'Chaikin Money Flow turned positive',
});
alertcondition(ta.crossunder(cmf, 0), {
  id: 'cmf-cross-down',
  title: 'CMF crossed below zero',
  message: 'Chaikin Money Flow turned negative',
});
