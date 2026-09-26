//@gscript=2
indicator('Relative Volume', { overlay: false, precision: 2 });

const length = input.int(50, 'Average length', { id: 'length', min: 1, max: 500 });
const surgeAt = input.float(2, 'Surge at (× average)', { id: 'surge-at', min: 0, step: 0.1 });
const upColor = input.color('#26a69a', 'Up bar', { id: 'up-color' });
const downColor = input.color('#ef5350', 'Down bar', { id: 'down-color' });
const surgeLineColor = input.color('#f59e0b', 'Surge level', { id: 'surge-color' });

// Each bar's volume as a multiple of the average of the last `length` bars.
const average = ta.sma(volume, length);
const rvol = volume.div(average);
const surge = rvol.gte(surgeAt);
const upBar = close.gte(open);

plot(rvol, {
  title: 'RVOL',
  style: plot.style_columns,
  color: bars.map((_bar, i) => {
    const base = upBar.get(i) ? upColor : downColor;
    return surge.get(i) ? base : color.new(base, 65);
  }),
});
hline(1, { title: 'Normal volume', color: '#787b86', style: 'dashed' });
hline(surgeAt, { title: 'Surge level', color: color.new(surgeLineColor, 30), style: 'dotted' });
plot(average, { title: 'Average volume', display: display.data_window, format: format.volume });

// Split by direction so a trader can be paged on buying surges without
// noise from selling surges, and vice versa — matching the pack's own
// convention for indicators that carry a bullish/bearish distinction.
alertcondition(surge.and(upBar), {
  id: 'bullish-volume-surge',
  title: 'Bullish volume surge',
  message: 'Volume reached the surge multiple of its average on an up bar',
});
alertcondition(surge.and(upBar.not()), {
  id: 'bearish-volume-surge',
  title: 'Bearish volume surge',
  message: 'Volume reached the surge multiple of its average on a down bar',
});
