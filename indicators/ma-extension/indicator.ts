//@gscript=2
indicator('MA Extension', { overlay: false, precision: 2 });

const maType = input.string('EMA', 'Average type', { id: 'ma-type', options: ['EMA', 'SMA', 'WMA'] });
const length = input.int(21, 'Average length', { id: 'length', min: 1, max: 500 });
const measure = input.string('Percent', 'Measure', { id: 'measure', options: ['Percent', 'ATRs'] });
const atrLength = input.int(14, 'ATR length', { id: 'atr-length', min: 1, max: 200 });
const extendedPct = input.float(8, 'Extended above (%)', { id: 'extended-pct', min: 0, step: 0.5 });
const stretchedPct = input.float(-8, 'Stretched below (%)', { id: 'stretched-pct', max: 0, step: 0.5 });
const extendedAtr = input.float(3, 'Extended above (ATRs)', { id: 'extended-atr', min: 0, step: 0.25 });
const stretchedAtr = input.float(-3, 'Stretched below (ATRs)', { id: 'stretched-atr', max: 0, step: 0.25 });
const aboveColor = input.color('#26a69a', 'Above the average', { id: 'above-color' });
const belowColor = input.color('#ef5350', 'Below the average', { id: 'below-color' });
const extendedColor = input.color('#f59e0b', 'Extended', { id: 'extended-color' });
const stretchedColor = input.color('#38bdf8', 'Stretched', { id: 'stretched-color' });

const average = maType === 'SMA'
  ? ta.sma(close, length)
  : maType === 'WMA'
    ? ta.wma(close, length)
    : ta.ema(close, length);
const distance = close.sub(average);
const inPercent = distance.div(average).mul(100);
const inAtrs = distance.div(ta.atr(atrLength));

const byAtr = measure === 'ATRs';
const extension = byAtr ? inAtrs : inPercent;
const extendedAt = byAtr ? extendedAtr : extendedPct;
const stretchedAt = byAtr ? stretchedAtr : stretchedPct;

const guides = '#787b86';
hline(0, { title: 'Zero', color: color.new(guides, 50), style: 'solid' });
hline(extendedAt, { title: 'Extended level', color: color.new(extendedColor, 30), style: 'dashed' });
hline(stretchedAt, { title: 'Stretched level', color: color.new(stretchedColor, 30), style: 'dashed' });

plot(extension, {
  title: 'Extension',
  style: plot.style_columns,
  color: bars.map((_bar, i) => {
    const value = extension.get(i);
    if (value > extendedAt) return extendedColor;
    if (value < stretchedAt) return stretchedColor;
    return value >= 0 ? color.new(aboveColor, 45) : color.new(belowColor, 45);
  }),
});

plot(average, { title: 'Average', display: display.data_window, format: format.price });
plot(inPercent, { title: 'Extension (%)', display: display.data_window });
plot(inAtrs, { title: 'Extension (ATRs)', display: display.data_window });

alertcondition(ta.crossover(extension, extendedAt), {
  id: 'became-extended',
  title: 'Became extended',
  message: 'Price moved beyond the extended level above its average',
});
alertcondition(ta.crossunder(extension, stretchedAt), {
  id: 'became-stretched',
  title: 'Became stretched',
  message: 'Price stretched beyond the stretched level below its average',
});
