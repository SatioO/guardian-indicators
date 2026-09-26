//@gscript=2
indicator('Chandelier Exit', { overlay: true });

const length = input.int(22, 'ATR period', { id: 'atr-period', min: 1, max: 500 });
const mult = input.float(3, 'ATR multiplier', { id: 'atr-mult', min: 0.1, step: 0.1 });
const useClose = input.bool(true, 'Use close price for extremums', { id: 'use-close' });
const labels = input.bool(true, 'Show buy/sell labels', { id: 'labels' });
const shade = input.bool(true, 'Shade the zone', { id: 'shade' });
const longColor = input.color('#26a69a', 'Long stop', { id: 'long-color' });
const shortColor = input.color('#ef5350', 'Short stop', { id: 'short-color' });

// Three ATRs below the highest close of the period, and above the lowest.
const offset = ta.atr(length).mul(mult);
const longBase = (useClose ? ta.highest(close, length) : ta.highest(high, length)).sub(offset);
const shortBase = (useClose ? ta.lowest(close, length) : ta.lowest(low, length)).add(offset);

// Each stop only ratchets in the trade's favour while price respects it; the
// direction flips when the close crosses the opposite stop. The first defined
// stop stands in for its own previous value.
const [longStop, shortStop, direction] = ta.scan([na, na, 1], (prev, bar, i) => {
  const [prevLong, prevShort, prevDir] = prev;
  const rawLong = longBase.get(i);
  const rawShort = shortBase.get(i);
  const longPrev = na(prevLong) ? rawLong : prevLong;
  const shortPrev = na(prevShort) ? rawShort : prevShort;
  const prevClose = i > 0 ? close.get(i - 1) : na;
  const long = prevClose > longPrev ? Math.max(rawLong, longPrev) : rawLong;
  const short = prevClose < shortPrev ? Math.min(rawShort, shortPrev) : rawShort;
  const dir = bar.close > shortPrev ? 1 : bar.close < longPrev ? -1 : prevDir;
  return [long, short, dir];
});

const isLong = direction.eq(1);
const isShort = direction.eq(-1);
const turnedLong = isLong.and(direction.offset(1).eq(-1));
const turnedShort = isShort.and(direction.offset(1).eq(1));
const activeLong = isLong.iff(longStop, na);
const activeShort = isShort.iff(shortStop, na);

const middle = plot(hl2, { title: 'Price middle', display: display.none });
const longLine = plot(activeLong, { title: 'Long stop', color: longColor, linewidth: 2, style: plot.style_stepline });
const shortLine = plot(activeShort, { title: 'Short stop', color: shortColor, linewidth: 2, style: plot.style_stepline });
fill(middle, longLine, { color: shade ? color.new(longColor, 90) : na });
fill(middle, shortLine, { color: shade ? color.new(shortColor, 90) : na });

plotshape(labels ? turnedLong.iff(longStop, na) : na, {
  title: 'Buy',
  shape: shape.labelup,
  location: location.absolute,
  color: longColor,
  text: 'Buy',
  textcolor: color.white,
  size: size.small,
});
plotshape(labels ? turnedShort.iff(shortStop, na) : na, {
  title: 'Sell',
  shape: shape.labeldown,
  location: location.absolute,
  color: shortColor,
  text: 'Sell',
  textcolor: color.white,
  size: size.small,
});
plot(direction, { title: 'Direction', display: display.data_window });

alertcondition(turnedLong, {
  id: 'turned-long',
  title: 'Chandelier turned long',
  message: 'The close crossed above the Chandelier short stop',
});
alertcondition(turnedShort, {
  id: 'turned-short',
  title: 'Chandelier turned short',
  message: 'The close crossed below the Chandelier long stop',
});
alertcondition(turnedLong.or(turnedShort), {
  id: 'direction-changed',
  title: 'Chandelier direction changed',
  message: 'Chandelier Exit changed direction',
});
