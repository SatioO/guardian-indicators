//@gscript=2
indicator('Vortex Indicator', { overlay: false, precision: 2 });

const length = input.int(14, 'Length', { id: 'length', min: 2, max: 500 });
const shade = input.bool(true, 'Shade the leader', { id: 'shade' });
const marks = input.bool(true, 'Mark crosses', { id: 'marks' });
const plusColor = input.color('#26a69a', 'VI+', { id: 'plus-color' });
const minusColor = input.color('#ef5350', 'VI−', { id: 'minus-color' });

// Upward movement is today's high against yesterday's low, downward movement
// today's low against yesterday's high; both are measured against the true
// range over the same bars.
const trSum = math.sum(ta.tr(true), length);
const viPlus = math.sum(math.abs(high.sub(low.offset(1))), length).div(trSum);
const viMinus = math.sum(math.abs(low.sub(high.offset(1))), length).div(trSum);

const plusLeads = viPlus.gte(viMinus);
const minusLeads = viPlus.lt(viMinus);
const bullishCross = ta.crossover(viPlus, viMinus);
const bearishCross = ta.crossunder(viPlus, viMinus);

const minusLine = plot(viMinus, { title: 'VI−', color: minusColor, linewidth: 2 });
plot(viPlus, { title: 'VI+', color: plusColor, linewidth: 2 });
const plusLeading = plot(plusLeads.iff(viPlus, na), { title: 'VI+ leading', display: display.none });
const minusLeading = plot(minusLeads.iff(viPlus, na), { title: 'VI− leading', display: display.none });
fill(plusLeading, minusLine, { color: shade ? color.new(plusColor, 88) : na });
fill(minusLeading, minusLine, { color: shade ? color.new(minusColor, 88) : na });
hline(1, { title: 'Level 1.0', color: '#787b86', style: 'dashed' });

plotshape(marks ? bullishCross.iff(viPlus, na) : na, {
  title: 'Bullish cross mark',
  shape: shape.circle,
  location: location.absolute,
  color: plusColor,
  size: size.tiny,
});
plotshape(marks ? bearishCross.iff(viPlus, na) : na, {
  title: 'Bearish cross mark',
  shape: shape.circle,
  location: location.absolute,
  color: minusColor,
  size: size.tiny,
});
plot(viPlus.sub(viMinus), { title: 'VI spread', display: display.data_window });

alertcondition(bullishCross, {
  id: 'bullish-cross',
  title: 'Bullish cross',
  message: 'VI+ crossed above VI−',
});
alertcondition(bearishCross, {
  id: 'bearish-cross',
  title: 'Bearish cross',
  message: 'VI+ crossed below VI−',
});
