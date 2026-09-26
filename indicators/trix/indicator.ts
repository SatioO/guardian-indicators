//@gscript=2
indicator('TRIX', { overlay: false, precision: 2 });

const length = input.int(18, 'Length', { id: 'length', min: 1, max: 200 });
const showSignal = input.bool(true, 'Show signal line', { id: 'show-signal' });
const signalLength = input.int(9, 'Signal length', { id: 'signal-length', min: 1, max: 100 });
const trixColor = input.color('#38bdf8', 'TRIX line', { id: 'trix-color' });
const signalColor = input.color('#f59e0b', 'Signal line', { id: 'signal-color' });

// The one-bar change of a triple-smoothed natural log of the close, × 10,000:
// the smoothed rate of change in hundredths of a percent.
const smoothed = ta.ema(ta.ema(ta.ema(math.log(close), length), length), length);
const trix = ta.change(smoothed).mul(10000);
const signal = ta.ema(trix, signalLength);

hline(0, { title: 'Zero', color: '#787b86', style: 'dashed' });
plot(trix, { title: 'TRIX', color: trixColor, linewidth: 2 });
plot(showSignal ? signal : na, { title: 'Signal', color: signalColor, linewidth: 1 });

alertcondition(ta.crossover(trix, 0), {
  id: 'crossed-above-zero',
  title: 'Crossed above zero',
  message: 'TRIX crossed above zero',
});
alertcondition(ta.crossunder(trix, 0), {
  id: 'crossed-below-zero',
  title: 'Crossed below zero',
  message: 'TRIX crossed below zero',
});
alertcondition(ta.crossover(trix, signal), {
  id: 'crossed-above-signal',
  title: 'Crossed above signal',
  message: 'TRIX crossed above its signal line',
});
alertcondition(ta.crossunder(trix, signal), {
  id: 'crossed-below-signal',
  title: 'Crossed below signal',
  message: 'TRIX crossed below its signal line',
});
