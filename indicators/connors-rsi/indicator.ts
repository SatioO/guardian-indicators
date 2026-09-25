//@gscript=2
indicator('Connors RSI', { overlay: false, precision: 2 });

const rsiLength = input.int(3, 'RSI length', { id: 'rsi-length', min: 1, max: 100 });
const streakLength = input.int(2, 'Up/down length', { id: 'streak-length', min: 1, max: 100 });
const rankLength = input.int(100, 'ROC length', { id: 'rank-length', min: 1, max: 500 });
const upperLevel = input.float(90, 'Upper band', { id: 'upper', min: 50, max: 100, step: 5 });
const lowerLevel = input.float(10, 'Lower band', { id: 'lower', min: 0, max: 50, step: 5 });
const lineColor = input.color('#38bdf8', 'CRSI line', { id: 'line-color' });
const highColor = input.color('#26a69a', 'Above the upper band', { id: 'high-color' });
const lowColor = input.color('#ef5350', 'Below the lower band', { id: 'low-color' });

// Consecutive closes in one direction: +1, +2, … up, −1, −2, … down, 0 on an
// unchanged close. The first bar has no previous close; neither test passes
// and it counts as −1, as the reference study counts it.
const streak = ta.scan(0, (prev, bar, i) => {
  const before = i > 0 ? close.get(i - 1) : na;
  if (bar.close === before) return 0;
  if (bar.close > before) return prev <= 0 ? 1 : prev + 1;
  return prev >= 0 ? -1 : prev - 1;
});

const priceRsi = ta.rsi(close, rsiLength);
const streakRsi = ta.rsi(streak, streakLength);
// Percent of the last `rankLength` one-bar changes at or below today's.
const rank = ta.percentrank(ta.roc(close, 1), rankLength);
const crsi = priceRsi.add(streakRsi).add(rank).div(3);

const guide = '#787b86';
const upper = hline(upperLevel, { title: 'Upper band', color: guide, style: 'dashed' });
hline(50, { title: 'Middle', color: color.new(guide, 50), style: 'dotted' });
const lower = hline(lowerLevel, { title: 'Lower band', color: guide, style: 'dashed' });
fill(upper, lower, { color: color.new(lineColor, 90) });

plot(crsi, {
  title: 'CRSI',
  linewidth: 2,
  color: bars.map((_bar, i) => {
    const value = crsi.get(i);
    if (value > upperLevel) return highColor;
    if (value < lowerLevel) return lowColor;
    return lineColor;
  }),
});
plot(priceRsi, { title: 'Price RSI', display: display.data_window });
plot(streakRsi, { title: 'Streak RSI', display: display.data_window });
plot(rank, { title: 'Percent rank', display: display.data_window });
plot(streak, { title: 'Streak', display: display.data_window, precision: 0 });

alertcondition(ta.crossover(crsi, upperLevel), {
  id: 'crossed-above-upper',
  title: 'Crossed above upper band',
  message: 'Connors RSI crossed above its upper band',
});
alertcondition(ta.crossunder(crsi, lowerLevel), {
  id: 'crossed-below-lower',
  title: 'Crossed below lower band',
  message: 'Connors RSI crossed below its lower band',
});
