//@gscript=2
indicator('Accumulation/Distribution', { overlay: false, format: format.volume });

const signalLength = input.int(21, 'Signal length', { id: 'signal-length', min: 1, max: 500 });
const aboveColor = input.color('#26a69a', 'A/D above signal', { id: 'above-color' });
const belowColor = input.color('#ef5350', 'A/D below signal', { id: 'below-color' });
const signalColor = input.color('#f59e0b', 'Signal', { id: 'signal-color' });

// Each bar adds its volume weighted by where it closed in its range: all of it
// at the high, none of it mid-range, minus all of it at the low.
const ad = ta.accdist;
const signal = ta.ema(ad, signalLength);
const crossedUp = ta.crossover(ad, signal);
const crossedDown = ta.crossunder(ad, signal);

const neutral = '#38bdf8';
plot(ad, {
  title: 'A/D',
  linewidth: 2,
  color: bars.map((_bar, i) => {
    const level = signal.get(i);
    if (!Number.isFinite(level)) return neutral;
    return ad.get(i) >= level ? aboveColor : belowColor;
  }),
});
plot(signal, { title: 'Signal', color: color.new(signalColor, 10), linewidth: 1 });

alertcondition(crossedUp, {
  id: 'ad-cross-up',
  title: 'A/D crossed above signal',
  message: 'The Accumulation/Distribution line crossed above its signal line',
});
alertcondition(crossedDown, {
  id: 'ad-cross-down',
  title: 'A/D crossed below signal',
  message: 'The Accumulation/Distribution line crossed below its signal line',
});
