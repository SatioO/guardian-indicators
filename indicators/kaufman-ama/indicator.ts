//@gscript=2
indicator('KAMA', { overlay: true });

const length = input.int(14, 'Length', { id: 'length', min: 1, max: 500 });
const fastLength = input.int(2, 'Fast length', { id: 'fast-length', min: 1, max: 500 });
const slowLength = input.int(30, 'Slow length', { id: 'slow-length', min: 1, max: 500 });
const source = input.source('close', 'Source', { id: 'source' });
const upColor = input.color('#26a69a', 'Rising', { id: 'up-color' });
const downColor = input.color('#ef5350', 'Falling', { id: 'down-color' });

const fastAlpha = 2 / (fastLength + 1);
const slowAlpha = 2 / (slowLength + 1);

// Efficiency: how far price got over the length against how far it travelled.
const move = math.abs(source.sub(source.offset(length)));
const path = math.sum(math.abs(source.sub(source.offset(1))), length);

// The average steps toward price at a rate between the slow and fast EMAs,
// set by the efficiency. It starts from the source on the first bar the
// efficiency exists.
const [kama, efficiency] = ta.scan([na, na], (prev, _bar, i) => {
  const m = move.get(i);
  const p = path.get(i);
  if (na(m) || na(p)) return [na, na];
  const er = p !== 0 ? m / p : 0;
  const sc = (er * (fastAlpha - slowAlpha) + slowAlpha) ** 2;
  const src = source.get(i);
  return [na(prev[0]) ? src : prev[0] + sc * (src - prev[0]), er];
});

const rising = kama.gt(kama.offset(1));
const falling = kama.lt(kama.offset(1));

plot(kama, {
  title: 'KAMA',
  linewidth: 2,
  color: bars.map((_bar, i) => {
    if (rising.get(i)) return upColor;
    if (falling.get(i)) return downColor;
    return '#787b86';
  }),
});
plot(efficiency, { title: 'Efficiency ratio', display: display.data_window, precision: 3 });

alertcondition(rising.and(falling.offset(1)), {
  id: 'turned-up',
  title: 'KAMA turned up',
  message: 'KAMA turned up',
});
alertcondition(falling.and(rising.offset(1)), {
  id: 'turned-down',
  title: 'KAMA turned down',
  message: 'KAMA turned down',
});
