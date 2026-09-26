//@gscript=2
indicator('Williams %R', { overlay: false, precision: 2 });

const length = input.int(14, 'Length', { id: 'length', min: 1, max: 500 });
const overbought = input.float(-20, 'Overbought level', { id: 'overbought', min: -100, max: 0, step: 5 });
const oversold = input.float(-80, 'Oversold level', { id: 'oversold', min: -100, max: 0, step: 5 });
const markExits = input.bool(true, 'Mark zone exits', { id: 'mark-exits' });
const lineColor = input.color('#a78bfa', '%R line', { id: 'line-color' });
const highColor = input.color('#26a69a', 'Overbought', { id: 'high-color' });
const lowColor = input.color('#ef5350', 'Oversold', { id: 'low-color' });

// 0 when the close is the highest high of the window, −100 at the lowest low.
const percentR = ta.wpr(length);

const leftOverbought = ta.crossunder(percentR, overbought);
const leftOversold = ta.crossover(percentR, oversold);

const guide = '#787b86';
const upper = hline(overbought, { title: 'Overbought', color: guide, style: 'dashed' });
hline(-50, { title: 'Middle', color: color.new(guide, 50), style: 'dotted' });
const lower = hline(oversold, { title: 'Oversold', color: guide, style: 'dashed' });
fill(upper, lower, { color: color.new(lineColor, 90) });

plot(percentR, {
  title: '%R',
  linewidth: 2,
  color: bars.map((_bar, i) => {
    const value = percentR.get(i);
    if (value >= overbought) return highColor;
    if (value <= oversold) return lowColor;
    return lineColor;
  }),
});

plotshape(markExits ? leftOverbought.iff(percentR, na) : na, {
  title: 'Left overbought',
  shape: shape.circle,
  location: location.absolute,
  color: highColor,
  size: size.tiny,
});
plotshape(markExits ? leftOversold.iff(percentR, na) : na, {
  title: 'Left oversold',
  shape: shape.circle,
  location: location.absolute,
  color: lowColor,
  size: size.tiny,
});

alertcondition(leftOverbought, {
  id: 'left-overbought',
  title: 'Left overbought',
  message: 'Williams %R fell out of the overbought zone',
});
alertcondition(leftOversold, {
  id: 'left-oversold',
  title: 'Left oversold',
  message: 'Williams %R rose out of the oversold zone',
});
