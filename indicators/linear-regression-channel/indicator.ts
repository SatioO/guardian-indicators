//@gscript=2
indicator('Linear Regression Channel', { overlay: true });

const length = input.int(100, 'Length', { id: 'length', min: 2, max: 5000 });
const source = input.source('close', 'Source', { id: 'source' });
const upperDeviation = input.float(2, 'Upper deviation', { id: 'upper-deviation', min: 0, step: 0.1 });
const lowerDeviation = input.float(2, 'Lower deviation', { id: 'lower-deviation', min: 0, step: 0.1 });
const extendLeft = input.bool(false, 'Extend lines left', { id: 'extend-left' });
const extendRight = input.bool(true, 'Extend lines right', { id: 'extend-right' });
const showR = input.bool(true, "Show Pearson's R", { id: 'show-r' });
const shade = input.bool(true, 'Shade the channel', { id: 'shade' });
const baseColor = input.color('#38bdf8', 'Base line', { id: 'base-color' });
const upperColor = input.color('#ef5350', 'Upper line', { id: 'upper-color' });
const lowerColor = input.color('#26a69a', 'Lower line', { id: 'lower-color' });

// The fit over the `length` bars ending on each bar. ta.linreg reads the fitted
// line `offset` bars back from that bar, so its two ends give the slope b. For a
// least-squares line the residuals' variance is σy² − b²·σx², where σx² =
// (n² − 1)/12 is the variance of the bar numbers 0 … n − 1; the channel uses
// their SAMPLE deviation (divisor n − 1), as the reference does. Pearson's R is
// b·σx/σy.
const fittedEnd = ta.linreg(source, length, 0);
const fittedStart = ta.linreg(source, length, length - 1);
const slopePerBar = fittedEnd.sub(fittedStart).div(length - 1);
const sigma = ta.stdev(source, length);
const timeVariance = (length * length - 1) / 12;
const residualVariance = sigma.mul(sigma).sub(slopePerBar.mul(slopePerBar).mul(timeVariance)).mul(length / (length - 1));
const residualDeviation = math.sqrt(math.max(residualVariance, 0));

// The channel as it stood on each bar: a close breaking out of it is the alert.
const upperEdge = fittedEnd.add(residualDeviation.mul(upperDeviation));
const lowerEdge = fittedEnd.sub(residualDeviation.mul(lowerDeviation));

// The channel drawn on the chart is the one fitted to the last `length` bars.
const last = bars.length - 1;
const left = last - length + 1;
const drawn = left >= 0;
const startPrice = drawn ? fittedStart.get(last) : na;
const endPrice = drawn ? fittedEnd.get(last) : na;
const deviation = drawn ? residualDeviation.get(last) : na;
const spread = drawn ? sigma.get(last) : na;
const pearsonR = drawn ? (spread > 0 ? (slopePerBar.get(last) * Math.sqrt(timeVariance)) / spread : 0) : na;

let extendStyle = extend.none;
if (extendLeft && extendRight) extendStyle = extend.both;
else if (extendLeft) extendStyle = extend.left;
else if (extendRight) extendStyle = extend.right;

if (drawn) {
  const lowerStart = startPrice - lowerDeviation * deviation;
  line.new(left, startPrice + upperDeviation * deviation, last, endPrice + upperDeviation * deviation, {
    color: upperColor,
    extend: extendStyle,
  });
  line.new(left, startPrice, last, endPrice, { color: baseColor, width: 2, extend: extendStyle });
  line.new(left, lowerStart, last, endPrice - lowerDeviation * deviation, {
    color: lowerColor,
    extend: extendStyle,
  });
  // R of the prices against the fitted line: how straight the trend is, and in
  // which direction — -1 to 1, carrying the sign of the slope. Computed here
  // regardless of the label toggle so it can also be read from the Data Window.
  if (showR) {
    label.new(left, lowerStart, `R ${pearsonR.toFixed(3)}`, {
      style: label.style_label_up,
      color: na,
      textColor: lowerColor,
      size: size.small,
    });
  }
}

// The same channel bar by bar across its window, for the Data Window and the
// shading. (The arithmetic is written out in each callback: calling a helper
// function from a plotted array's callback sends the script off the native
// output route — a language finding.)
const slope = drawn ? slopePerBar.get(last) : na;
const baseValues = bars.map((_bar, i) => (drawn && i >= left ? startPrice + slope * (i - left) : na));
const upperValues = bars.map((_bar, i) =>
  (drawn && i >= left ? startPrice + slope * (i - left) + upperDeviation * deviation : na));
const lowerValues = bars.map((_bar, i) =>
  (drawn && i >= left ? startPrice + slope * (i - left) - lowerDeviation * deviation : na));
const upperPlot = plot(upperValues, { title: 'Channel upper', color: upperColor, display: display.data_window });
const basePlot = plot(baseValues, { title: 'Channel base', color: baseColor, display: display.data_window });
const lowerPlot = plot(lowerValues, { title: 'Channel lower', color: lowerColor, display: display.data_window });
// Always readable in the Data Window, independent of the "Show Pearson's R" label toggle.
const rValues = bars.map((_bar, i) => (drawn && i >= left ? pearsonR : na));
plot(rValues, { title: "Pearson's R", display: display.data_window });
// Transparency 100 rather than na when unshaded: fill() refuses an na colour.
const shadeTransparency = shade ? 92 : 100;
fill(upperPlot, basePlot, { color: color.new(upperColor, shadeTransparency) });
fill(basePlot, lowerPlot, { color: color.new(lowerColor, shadeTransparency) });

alertcondition(ta.crossover(source, upperEdge), {
  id: 'close-above-channel',
  title: 'Close above channel',
  message: 'Price closed above the upper line of the linear regression channel',
});
alertcondition(ta.crossunder(source, lowerEdge), {
  id: 'close-below-channel',
  title: 'Close below channel',
  message: 'Price closed below the lower line of the linear regression channel',
});
