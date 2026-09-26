//@gscript=2
indicator('EMA', { overlay: true });

// Same inputs and defaults as the chart's built-in EMA, so a copy of either
// draws the same line.
const period = input.int(9, 'Period', { id: 'period', min: 1, max: 500 });
const src = input.source('close', 'Source', { id: 'source' });
const lineColor = input.color('#38bdf8', 'Color', { id: 'color' });
const width = input.int(1, 'Line width', { id: 'line-width', min: 1, max: 4 });

// ta.ema seeds with the simple average of the first `period` values, then
// ema = src × α + ema[1] × (1 − α) with α = 2 / (period + 1).
const average = ta.ema(src, period);

plot(average, { title: 'EMA', color: lineColor, linewidth: width });

alertcondition(ta.crossover(close, average), {
  id: 'cross-above',
  title: 'Close crossed above the EMA',
  message: 'The close crossed above the EMA',
});
alertcondition(ta.crossunder(close, average), {
  id: 'cross-below',
  title: 'Close crossed below the EMA',
  message: 'The close crossed below the EMA',
});
