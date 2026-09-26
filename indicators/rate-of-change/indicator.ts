//@gscript=2
indicator('Rate of Change', { overlay: false, format: format.percent, precision: 2 });

const length = input.int(9, 'Length', { id: 'length', min: 1, max: 500 });
const src = input.source('close', 'Source', { id: 'source' });
const upColor = input.color('#26a69a', 'Above zero', { id: 'up-color' });
const downColor = input.color('#ef5350', 'Below zero', { id: 'down-color' });

// Percent change of the source against its value `length` bars ago.
const roc = ta.roc(src, length);

plot(roc, {
  title: 'ROC',
  linewidth: 2,
  color: bars.map((_bar, i) => (roc.get(i) >= 0 ? upColor : downColor)),
});
hline(0, { title: 'Zero', color: '#787b86', style: 'dashed' });
plot(src.sub(src.offset(length)), {
  title: 'Change',
  display: display.data_window,
  format: format.price,
});

alertcondition(ta.crossover(roc, 0), {
  id: 'crossed-above-zero',
  title: 'Crossed above zero',
  message: 'Rate of Change crossed above zero',
});
alertcondition(ta.crossunder(roc, 0), {
  id: 'crossed-below-zero',
  title: 'Crossed below zero',
  message: 'Rate of Change crossed below zero',
});
