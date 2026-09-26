//@gscript=2
indicator('Elder Impulse System', { overlay: true });

const emaLength = input.int(13, 'EMA length', { id: 'ema-length', min: 1, max: 500 });
const fastLength = input.int(12, 'MACD fast length', { id: 'fast', min: 1, max: 500 });
const slowLength = input.int(26, 'MACD slow length', { id: 'slow', min: 1, max: 500 });
const signalLength = input.int(9, 'MACD signal length', { id: 'signal', min: 1, max: 500 });
const colorBars = input.bool(true, 'Colour the bars', { id: 'color-bars' });
const showEma = input.bool(true, 'Show the EMA', { id: 'show-ema' });
const bullColor = input.color('#26a69a', 'Green impulse', { id: 'bull-color' });
const bearColor = input.color('#ef5350', 'Red impulse', { id: 'bear-color' });
const neutralColor = input.color('#38bdf8', 'Blue impulse', { id: 'neutral-color' });
const emaColor = input.color('#f59e0b', 'EMA', { id: 'ema-color' });

// Inertia (the EMA's slope) and power (the MACD histogram's slope).
const trend = ta.ema(close, emaLength);
const [, , histogram] = ta.macd(close, fastLength, slowLength, signalLength);
const trendSlope = ta.change(trend);
const powerSlope = ta.change(histogram);

// na is the only value not equal to itself: the impulse is unknown until both
// slopes exist (bar 34 with the default lengths).
const known = trendSlope.eq(trendSlope).and(powerSlope.eq(powerSlope));
const bull = trendSlope.gt(0).and(powerSlope.gt(0));
const bear = trendSlope.lt(0).and(powerSlope.lt(0));
const impulse = known.iff(bull.iff(1, bear.iff(-1, 0)), na);

barcolor(bars.map((_bar, i) => {
  if (!colorBars || !known.get(i)) return null;
  if (bull.get(i)) return bullColor;
  if (bear.get(i)) return bearColor;
  return neutralColor;
}));
plot(showEma ? trend : na, { title: 'Impulse EMA', color: emaColor, linewidth: 2 });
plot(impulse, { title: 'Impulse', display: display.data_window, precision: 0 });
plot(histogram, { title: 'MACD histogram', display: display.data_window });

const turnedGreen = impulse.eq(1).and(impulse.offset(1).lt(1));
const turnedRed = impulse.eq(-1).and(impulse.offset(1).gt(-1));
alertcondition(turnedGreen, {
  id: 'turned-green',
  title: 'Turned green',
  message: 'Elder impulse turned green: trend and momentum both rising',
});
alertcondition(turnedRed, {
  id: 'turned-red',
  title: 'Turned red',
  message: 'Elder impulse turned red: trend and momentum both falling',
});
