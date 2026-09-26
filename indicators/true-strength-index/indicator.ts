//@gscript=2
indicator('True Strength Index', { overlay: false, precision: 2 });

const longLength = input.int(25, 'Long length', { id: 'long-length', min: 1, max: 200 });
const shortLength = input.int(13, 'Short length', { id: 'short-length', min: 1, max: 200 });
const signalLength = input.int(13, 'Signal length', { id: 'signal-length', min: 1, max: 200 });
const tsiColor = input.color('#38bdf8', 'TSI line', { id: 'tsi-color' });
const signalColor = input.color('#f59e0b', 'Signal line', { id: 'signal-color' });

// The bar-to-bar change smoothed twice (long, then short EMA), divided by the
// same smoothing of its absolute size. G Script's ta.tsi already returns the
// ×100 value, so it reads from −100 to +100.
const tsi = ta.tsi(close, shortLength, longLength);
const signal = ta.ema(tsi, signalLength);

hline(0, { title: 'Zero', color: '#787b86', style: 'dashed' });
plot(tsi, { title: 'TSI', color: tsiColor, linewidth: 2 });
plot(signal, { title: 'Signal', color: signalColor, linewidth: 1 });
plot(tsi.sub(signal), { title: 'TSI minus signal', display: display.data_window });

alertcondition(ta.crossover(tsi, signal), {
  id: 'crossed-above-signal',
  title: 'Crossed above signal',
  message: 'TSI crossed above its signal line',
});
alertcondition(ta.crossunder(tsi, signal), {
  id: 'crossed-below-signal',
  title: 'Crossed below signal',
  message: 'TSI crossed below its signal line',
});
alertcondition(ta.crossover(tsi, 0), {
  id: 'crossed-above-zero',
  title: 'Crossed above zero',
  message: 'TSI crossed above zero',
});
alertcondition(ta.crossunder(tsi, 0), {
  id: 'crossed-below-zero',
  title: 'Crossed below zero',
  message: 'TSI crossed below zero',
});
