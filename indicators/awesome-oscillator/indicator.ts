//@gscript=2
indicator('Awesome Oscillator', { overlay: false, precision: 2 });

const fastLength = input.int(5, 'Fast length', { id: 'fast-length', min: 1, max: 200 });
const slowLength = input.int(34, 'Slow length', { id: 'slow-length', min: 2, max: 500 });
const risingColor = input.color('#26a69a', 'Rising column', { id: 'rising-color' });
const fallingColor = input.color('#ef5350', 'Falling column', { id: 'falling-color' });

// Fast minus slow simple average of the bar's median price, (high + low) / 2.
const ao = ta.sma(hl2, fastLength).sub(ta.sma(hl2, slowLength));
const change = ao.sub(ao.offset(1));

plot(ao, {
  title: 'AO',
  style: plot.style_columns,
  // Red when AO is no higher than the bar before; the first column, with
  // nothing before it, is green.
  color: bars.map((_bar, i) => (change.get(i) <= 0 ? fallingColor : risingColor)),
});
hline(0, { title: 'Zero', color: '#787b86', style: 'dashed' });
// The bar-to-bar change that decides each column's colour and drives the
// turned-rising/turned-falling alerts below — surfaced for inspection since
// it is never otherwise drawn.
plot(change, { title: 'Change', display: display.data_window });

alertcondition(ta.crossover(ao, 0), {
  id: 'crossed-above-zero',
  title: 'Crossed above zero',
  message: 'Awesome Oscillator crossed above zero',
});
alertcondition(ta.crossunder(ao, 0), {
  id: 'crossed-below-zero',
  title: 'Crossed below zero',
  message: 'Awesome Oscillator crossed below zero',
});
// Named by direction, not colour: Rising column / Falling column are
// user-configurable, so an alert can't assume they stay green/red.
alertcondition(ta.crossover(change, 0), {
  id: 'turned-rising',
  title: 'Turned rising',
  message: 'Awesome Oscillator columns turned rising',
});
alertcondition(ta.crossunder(change, 0), {
  id: 'turned-falling',
  title: 'Turned falling',
  message: 'Awesome Oscillator columns turned falling',
});
