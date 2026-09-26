//@gscript=2
indicator('ADR%', { overlay: false, format: format.percent, precision: 2 });

const length = input.int(20, 'Length', { id: 'length', min: 1, max: 500 });
const method = input.string('High ÷ low', 'Method', {
  id: 'method',
  options: ['High ÷ low', 'Range ÷ close'],
});
const minimum = input.float(3.5, 'Minimum ADR%', { id: 'minimum', min: 0, step: 0.5 });
// Multiples of yesterday's ADR: tight can never reach past "the whole
// average" and expansion can never start below it, so a mis-set pair can't
// invert which colour a big move gets.
const tightAt = input.float(0.5, 'Tight day at or below (× ADR)', { id: 'tight-at', min: 0, max: 1, step: 0.1 });
const expansionAt = input.float(1.5, 'Expansion day at or above (× ADR)', { id: 'expansion-at', min: 1, step: 0.1 });
const activeColor = input.color('#38bdf8', 'ADR% above minimum', { id: 'active-color' });
const belowMinimumColor = input.color('#b2b5be', 'ADR% below minimum', { id: 'below-minimum-color' });
const tightColor = input.color('#a78bfa', 'Tight day', { id: 'tight-color' });
const expansionColor = input.color('#f59e0b', 'Expansion day', { id: 'expansion-color' });

const byClose = method === 'Range ÷ close';

// Each day's own range, in the same units as the average.
const dayRange = byClose
  ? high.sub(low).div(close).mul(100)
  : high.div(low).sub(1).mul(100);
const adr = byClose
  ? ta.sma(high, length).sub(ta.sma(low, length)).div(close).mul(100)
  : ta.sma(high.div(low), length).sub(1).mul(100);

// A day is judged against the average up to yesterday, so it never dilutes
// its own yardstick.
const yardstick = adr.offset(1);
const tight = dayRange.lte(yardstick.mul(tightAt));
const expansion = dayRange.gte(yardstick.mul(expansionAt));

const muted = '#787b86';
plot(dayRange, {
  title: 'Day range',
  style: plot.style_columns,
  color: bars.map((_bar, i) => {
    if (tight.get(i)) return color.new(tightColor, 25);
    if (expansion.get(i)) return color.new(expansionColor, 25);
    return color.new(muted, 70);
  }),
});
plot(adr, {
  title: 'ADR%',
  linewidth: 2,
  color: bars.map((_bar, i) => (adr.get(i) >= minimum ? activeColor : belowMinimumColor)),
});
hline(minimum, { title: 'Minimum ADR%', color: muted, style: 'dashed' });
plot(ta.sma(high.sub(low), length), {
  title: 'ADR (price)',
  display: display.data_window,
  format: format.price,
});

alertcondition(tight, {
  id: 'tight-day',
  title: 'Tight day',
  message: 'Range closed at or below the Tight day threshold (× ADR)',
});
alertcondition(expansion, {
  id: 'expansion-day',
  title: 'Expansion day',
  message: 'Range closed at or above the Expansion day threshold (× ADR)',
});
