//@gscript=2
indicator('Higher Timeframe MA', { overlay: true });

const TIMEFRAMES = [
  { value: '1D', label: 'Daily' },
  { value: 'W', label: 'Weekly' },
  { value: '1M', label: 'Monthly' },
];
const tf1 = input.timeframe('W', 'Timeframe', { id: 'timeframe', options: TIMEFRAMES });
const type1 = input.string('EMA', 'Type', { id: 'type', options: ['EMA', 'SMA'] });
const length1 = input.int(10, 'Length', { id: 'length', min: 1, max: 500 });
const color1 = input.color('#38bdf8', 'Average', { id: 'color' });
const showSecond = input.bool(false, 'Second average', { id: 'second' });
const tf2 = input.timeframe('W', 'Second timeframe', { id: 'second-timeframe', options: TIMEFRAMES });
const type2 = input.string('SMA', 'Second type', { id: 'second-type', options: ['EMA', 'SMA'] });
const length2 = input.int(30, 'Second length', { id: 'second-length', min: 1, max: 500 });
const color2 = input.color('#a78bfa', 'Second average colour', { id: 'second-color' });
const showLabels = input.bool(true, 'Label the averages', { id: 'labels' });

// The average runs on the other timeframe's own closes; each chart bar sees the
// latest higher-timeframe bar that had closed by then. Discovery re-runs this
// script once per other option of a select input (Timeframe/Second timeframe
// both are) and unions what each run's request.security calls declared, so
// every option this dropdown offers ends up requested without a separate,
// hand-written declaration.
const average1 = request.security('', tf1, (s) => {
  if (type1 === 'SMA') return s.ta.sma(s.close, length1);
  return s.ta.ema(s.close, length1);
});
const average2 = request.security('', tf2, (s) => {
  if (type2 === 'SMA') return s.ta.sma(s.close, length2);
  return s.ta.ema(s.close, length2);
});

plot(average1, { title: 'Higher-timeframe MA', style: plot.style_stepline, color: color1, linewidth: 2 });
plot(showSecond ? average2 : na, {
  title: 'Second higher-timeframe MA',
  style: plot.style_stepline,
  color: color2,
  linewidth: 2,
});
plot(close.sub(average1).div(average1).mul(100), {
  title: 'Close vs MA (%)',
  display: display.data_window,
  format: format.percent,
});

alertcondition(ta.crossover(close, average1), {
  id: 'crossed-above',
  title: 'Crossed above higher-timeframe MA',
  message: 'The close crossed above the higher-timeframe moving average',
});
alertcondition(ta.crossunder(close, average1), {
  id: 'crossed-below',
  title: 'Crossed below higher-timeframe MA',
  message: 'The close crossed below the higher-timeframe moving average',
});

// "W EMA 10" at the latest bar, so two averages on one chart are told apart.
const shortName = (tf: string) => (tf === '1D' ? 'D' : tf === '1M' ? 'M' : 'W');
if (showLabels && bars.length > 0) {
  const last = bars.length - 1;
  const tags = [
    [true, average1, `${shortName(tf1)} ${type1} ${length1}`, color1],
    [showSecond, average2, `${shortName(tf2)} ${type2} ${length2}`, color2],
  ];
  for (const [shown, series, text, tint] of tags) {
    const price = series.get(last);
    if (!shown || !Number.isFinite(price)) continue;
    label.new(last, price, text, { style: label.style_label_left, color: color.new(tint, 100), textColor: tint, size: size.small });
  }
}
