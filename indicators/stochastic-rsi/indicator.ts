//@gscript=2
indicator('Stochastic RSI', { overlay: false, precision: 2 });

const smoothK = input.int(3, 'K', { id: 'k', min: 1, max: 50 });
const smoothD = input.int(3, 'D', { id: 'd', min: 1, max: 50 });
const rsiLength = input.int(14, 'RSI length', { id: 'rsi-length', min: 1, max: 200 });
const stochLength = input.int(14, 'Stochastic length', { id: 'stoch-length', min: 1, max: 200 });
const src = input.source('close', 'RSI source', { id: 'source' });
const upperLevel = input.float(80, 'Upper band', { id: 'upper', min: 50, max: 100, step: 5 });
const lowerLevel = input.float(20, 'Lower band', { id: 'lower', min: 0, max: 50, step: 5 });
const markCrosses = input.bool(true, 'Mark crosses in the zones', { id: 'mark-crosses' });
const kColor = input.color('#38bdf8', 'K line', { id: 'k-color' });
const dColor = input.color('#f59e0b', 'D line', { id: 'd-color' });
const bullColor = input.color('#26a69a', 'Bullish cross', { id: 'bull-color' });
const bearColor = input.color('#ef5350', 'Bearish cross', { id: 'bear-color' });

// Stochastic applied to RSI: where RSI sits in its own range over the last
// `stochLength` bars, smoothed into K, and K smoothed again into D.
const rsiValue = ta.rsi(src, rsiLength);
const k = ta.sma(ta.stoch(rsiValue, rsiValue, rsiValue, stochLength), smoothK);
const d = ta.sma(k, smoothD);

// A cross counts in a zone when D, the slower line, is inside it.
const bullishCross = ta.crossover(k, d).and(d.lte(lowerLevel));
const bearishCross = ta.crossunder(k, d).and(d.gte(upperLevel));

const guide = '#787b86';
const upper = hline(upperLevel, { title: 'Upper band', color: guide, style: 'dashed' });
hline(50, { title: 'Middle', color: color.new(guide, 50), style: 'dotted' });
const lower = hline(lowerLevel, { title: 'Lower band', color: guide, style: 'dashed' });
fill(upper, lower, { color: color.new(kColor, 90) });

plot(k, { title: 'K', color: kColor, linewidth: 2 });
plot(d, { title: 'D', color: dColor, linewidth: 1 });
plot(rsiValue, { title: 'RSI', display: display.data_window });

plotshape(markCrosses ? bullishCross.iff(k, na) : na, {
  title: 'Bullish cross in oversold',
  shape: shape.circle,
  location: location.absolute,
  color: bullColor,
  size: size.tiny,
});
plotshape(markCrosses ? bearishCross.iff(k, na) : na, {
  title: 'Bearish cross in overbought',
  shape: shape.circle,
  location: location.absolute,
  color: bearColor,
  size: size.tiny,
});

alertcondition(bullishCross, {
  id: 'bullish-cross-oversold',
  title: 'Bullish cross in oversold',
  message: 'Stochastic RSI K crossed above D in the oversold zone',
});
alertcondition(bearishCross, {
  id: 'bearish-cross-overbought',
  title: 'Bearish cross in overbought',
  message: 'Stochastic RSI K crossed below D in the overbought zone',
});
