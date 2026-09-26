//@gscript=2
indicator('Heikin Ashi', { overlay: false, format: format.price });

const strong = input.bool(true, 'Single out strong candles', { id: 'strong' });
const upColor = input.color('#26a69a', 'Up candle', { id: 'up-color' });
const downColor = input.color('#ef5350', 'Down candle', { id: 'down-color' });

const haClose = ohlc4;
// Each open is the midpoint of the previous Heikin Ashi candle's body; the
// first bar has no previous candle, so it opens midway through its own body.
const haOpen = ta.scan(0, (prev, bar, i) =>
  (i === 0 ? (bar.open + bar.close) / 2 : (prev + haClose.get(i - 1)) / 2));
const haHigh = ta.max(high, ta.max(haOpen, haClose));
const haLow = ta.min(low, ta.min(haOpen, haClose));

const isUp = haClose.gte(haOpen);
// A strong candle has no wick against its trend: an up candle that never
// traded below its open, a down candle that never traded above it.
const isStrong = isUp.iff(haLow.gte(haOpen), haHigh.lte(haOpen));
// A turn needs a previous candle, so neither fires on the first bar.
const wasUp = haClose.offset(1).gte(haOpen.offset(1));
const wasDown = haClose.offset(1).lt(haOpen.offset(1));
const turnedUp = isUp.and(wasDown);
const turnedDown = isUp.not().and(wasUp);

const candleColors = bars.map((_bar, i) => {
  const base = isUp.get(i) ? upColor : downColor;
  return !strong || isStrong.get(i) ? base : color.new(base, 45);
});
plotcandle(haOpen, haHigh, haLow, haClose, {
  title: 'Heikin Ashi',
  color: candleColors,
  wickColor: candleColors,
  borderColor: candleColors,
});

// Consecutive candles of one colour: +3 is the third up candle in a row.
const run = ta.scan(0, (prev, _bar, i) =>
  (isUp.get(i) ? (prev > 0 ? prev + 1 : 1) : (prev < 0 ? prev - 1 : -1)));
plot(run, { title: 'Candles in a row', display: display.data_window, precision: 0 });

alertcondition(turnedUp, {
  id: 'turned-up',
  title: 'Turned up',
  message: 'Heikin Ashi candles turned up',
});
alertcondition(turnedDown, {
  id: 'turned-down',
  title: 'Turned down',
  message: 'Heikin Ashi candles turned down',
});
