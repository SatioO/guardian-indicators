//@gscript=2
indicator('Money Flow Index', { overlay: false, precision: 2 });

const length = input.int(14, 'Length', { id: 'length', min: 1, max: 2000 });
const overboughtAt = input.int(80, 'Overbought level', { id: 'overbought', min: 50, max: 100 });
const oversoldAt = input.int(20, 'Oversold level', { id: 'oversold', min: 0, max: 50 });
const lineColor = input.color('#a78bfa', 'MFI line', { id: 'line-color' });
const overboughtColor = input.color('#ef5350', 'Overbought colour', { id: 'overbought-color' });
const oversoldColor = input.color('#26a69a', 'Oversold colour', { id: 'oversold-color' });

// The typical price's flow (hlc3 × volume) on up bars against down bars.
const mfi = ta.mfi(hlc3, length);
const overbought = mfi.gte(overboughtAt);
const oversold = mfi.lte(oversoldAt);

plot(mfi, {
  title: 'MFI',
  linewidth: 2,
  color: bars.map((_bar, i) => {
    if (overbought.get(i)) return overboughtColor;
    if (oversold.get(i)) return oversoldColor;
    return lineColor;
  }),
});

const guide = '#787b86';
const upper = hline(overboughtAt, { title: 'Overbought', color: guide, style: 'dashed' });
hline(50, { title: 'Middle', color: color.new(guide, 50), style: 'dotted' });
const lower = hline(oversoldAt, { title: 'Oversold', color: guide, style: 'dashed' });
fill(upper, lower, { color: color.new(lineColor, 90) });

// Zone state as a plain number for the Data Window: 1 overbought, −1 oversold,
// 0 between; na wherever MFI itself has not warmed up yet.
const ready = mfi.eq(mfi);
const zone = ready.iff(overbought.iff(1, oversold.iff(-1, 0)), na);
plot(zone, { title: 'Zone', display: display.data_window });

alertcondition(ta.crossunder(mfi, overboughtAt), {
  id: 'left-overbought',
  title: 'MFI left overbought',
  message: 'Money Flow Index fell back out of the overbought zone',
});
alertcondition(ta.crossover(mfi, oversoldAt), {
  id: 'left-oversold',
  title: 'MFI left oversold',
  message: 'Money Flow Index rose back out of the oversold zone',
});
