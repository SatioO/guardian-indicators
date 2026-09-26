//@gscript=2
indicator('ADX and DMI', { overlay: false, precision: 2 });

const diLength = input.int(14, 'DI length', { id: 'di-length', min: 1, max: 500 });
const adxSmoothing = input.int(14, 'ADX smoothing', { id: 'adx-smoothing', min: 1, max: 500 });
const keyLevel = input.float(25, 'Key level', { id: 'key-level', min: 0, max: 100, step: 1 });
const plusColor = input.color('#26a69a', '+DI', { id: 'plus-color' });
const minusColor = input.color('#ef5350', '−DI', { id: 'minus-color' });
const adxColor = input.color('#38bdf8', 'ADX', { id: 'adx-color' });

// +DI and −DI say which side moved further; ADX says how strongly, whichever
// side it is.
const [plusDi, minusDi, adx] = ta.dmi(diLength, adxSmoothing);

plot(plusDi, { title: '+DI', color: plusColor });
plot(minusDi, { title: '−DI', color: minusColor });
plot(adx, {
  title: 'ADX',
  linewidth: 2,
  // Full strength while the trend is strong enough to trade, faded below.
  color: bars.map((_bar, i) => (adx.get(i) >= keyLevel ? adxColor : color.new(adxColor, 60))),
});
hline(keyLevel, { title: 'Key level', color: '#787b86', style: 'dashed' });
plot(plusDi.sub(minusDi), { title: 'DI spread', display: display.data_window });

alertcondition(ta.crossover(plusDi, minusDi), {
  id: 'bullish-di-cross',
  title: 'Bullish DI cross',
  message: '+DI crossed above −DI',
});
alertcondition(ta.crossunder(plusDi, minusDi), {
  id: 'bearish-di-cross',
  title: 'Bearish DI cross',
  message: '+DI crossed below −DI',
});
alertcondition(ta.crossover(adx, keyLevel), {
  id: 'adx-above-key-level',
  title: 'ADX above key level',
  message: 'ADX rose above the key level: the trend is gaining strength',
});
