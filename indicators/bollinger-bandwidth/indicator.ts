//@gscript=2
indicator('Bollinger BandWidth', { overlay: false, precision: 2 });

const length = input.int(20, 'Length', { id: 'length', min: 1, max: 500 });
const source = input.source('close', 'Source', { id: 'source' });
const mult = input.float(2, 'StdDev', { id: 'mult', min: 0.001, max: 50, step: 0.1 });
const expansionLength = input.int(125, 'Highest expansion length', { id: 'expansion-length', min: 1, max: 1000 });
const contractionLength = input.int(125, 'Lowest contraction length', { id: 'contraction-length', min: 1, max: 1000 });
const lineColor = input.color('#38bdf8', 'BBW', { id: 'line-color' });
const expansionColor = input.color('#ef5350', 'Highest expansion', { id: 'expansion-color' });
const contractionColor = input.color('#26a69a', 'Lowest contraction', { id: 'contraction-color' });
const squeezeColor = input.color('#a78bfa', 'Squeeze', { id: 'squeeze-color' });

// Band width as a percent of the basis: (upper − lower) / basis × 100.
const width = ta.bbw(source, length, mult);
const highestExpansion = ta.highest(width, expansionLength);
const lowestContraction = ta.lowest(width, contractionLength);

// The same Bollinger Bands the width is built from, for the Data Window.
const [basis, upper, lower] = ta.bb(source, length, mult);

// The bands are the narrowest they have been over the contraction length.
const squeeze = width.lte(lowestContraction);

plot(highestExpansion, { title: 'Highest expansion', color: color.new(expansionColor, 30) });
plot(lowestContraction, { title: 'Lowest contraction', color: color.new(contractionColor, 30) });
plot(width, { title: 'BBW', color: lineColor, linewidth: 2 });
plot(basis, { title: 'Basis (price)', display: display.data_window, format: format.price });
plot(upper, { title: 'Upper band (price)', display: display.data_window, format: format.price });
plot(lower, { title: 'Lower band (price)', display: display.data_window, format: format.price });
plotshape(squeeze.iff(width, na), {
  title: 'Squeeze',
  shape: shape.circle,
  location: location.absolute,
  color: squeezeColor,
  size: size.tiny,
});

alertcondition(squeeze, {
  id: 'squeeze',
  title: 'Squeeze',
  message: 'Bollinger BandWidth is at its lowest of the contraction length',
});
