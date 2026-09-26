//@gscript=2
indicator('On Balance Volume', { overlay: false, format: format.volume });

const signalLength = input.int(21, 'Signal length', { id: 'signal-length', min: 1, max: 500 });
const aboveColor = input.color('#26a69a', 'OBV above signal', { id: 'above-color' });
const belowColor = input.color('#ef5350', 'OBV below signal', { id: 'below-color' });
const signalColor = input.color('#f59e0b', 'Signal', { id: 'signal-color' });

// Up-close volume added, down-close volume subtracted; 0 on the first bar.
const obv = ta.obv;
const signal = ta.ema(obv, signalLength);
const crossedUp = ta.crossover(obv, signal);
const crossedDown = ta.crossunder(obv, signal);

const neutral = '#38bdf8';
plot(obv, {
  title: 'OBV',
  linewidth: 2,
  color: bars.map((_bar, i) => {
    const level = signal.get(i);
    if (!Number.isFinite(level)) return neutral;
    return obv.get(i) >= level ? aboveColor : belowColor;
  }),
});
plot(signal, { title: 'Signal', color: color.new(signalColor, 10), linewidth: 1 });

alertcondition(crossedUp, {
  id: 'obv-cross-up',
  title: 'OBV crossed above signal',
  message: 'On Balance Volume crossed above its signal line',
});
alertcondition(crossedDown, {
  id: 'obv-cross-down',
  title: 'OBV crossed below signal',
  message: 'On Balance Volume crossed below its signal line',
});
