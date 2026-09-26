//@gscript=2
indicator('Klinger Oscillator', { overlay: false, format: format.volume });

const fastLength = input.int(34, 'Fast length', { id: 'fast-length', min: 1, max: 500 });
const slowLength = input.int(55, 'Slow length', { id: 'slow-length', min: 1, max: 500 });
const signalLength = input.int(13, 'Signal length', { id: 'signal-length', min: 1, max: 500 });
const lineColor = input.color('#38bdf8', 'KVO line', { id: 'line-color' });
const signalColor = input.color('#f59e0b', 'Signal line', { id: 'signal-color' });
const upColor = input.color('#26a69a', 'Histogram above zero', { id: 'up-color' });
const downColor = input.color('#ef5350', 'Histogram below zero', { id: 'down-color' });

// Each bar's volume, signed by the direction of its typical price (hlc3).
const signedVolume = ta.change(hlc3).gte(0).iff(volume, volume.neg());
const kvo = ta.ema(signedVolume, fastLength).sub(ta.ema(signedVolume, slowLength));
const signal = ta.ema(kvo, signalLength);
const histogram = kvo.sub(signal);

plot(histogram, {
  title: 'KVO histogram',
  style: plot.style_columns,
  color: bars.map((_bar, i) => (histogram.get(i) >= 0 ? color.new(upColor, 50) : color.new(downColor, 50))),
});
hline(0, { title: 'Zero', color: '#787b86', style: 'dashed' });
plot(kvo, { title: 'KVO', color: lineColor, linewidth: 2 });
plot(signal, { title: 'Signal', color: signalColor, linewidth: 1 });
plot(signedVolume, { title: 'Signed volume', display: display.data_window, format: format.volume });

alertcondition(ta.crossover(kvo, signal), {
  id: 'kvo-cross-up',
  title: 'KVO crossed above signal',
  message: 'The Klinger Oscillator crossed above its signal line',
});
alertcondition(ta.crossunder(kvo, signal), {
  id: 'kvo-cross-down',
  title: 'KVO crossed below signal',
  message: 'The Klinger Oscillator crossed below its signal line',
});
