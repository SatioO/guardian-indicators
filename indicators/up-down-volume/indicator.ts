//@gscript=2
indicator('Up/Down Volume Ratio', { overlay: false, precision: 2 });

const length = input.int(50, 'Length', { id: 'length', min: 1, max: 500 });
const accumulationAt = input.float(1.5, 'Accumulation at or above', { id: 'accumulation-at', min: 0, step: 0.1 });
const distributionAt = input.float(0.7, 'Distribution at or below', { id: 'distribution-at', min: 0, step: 0.1 });
const accumulationColor = input.color('#26a69a', 'Accumulation', { id: 'accumulation-color' });
const distributionColor = input.color('#ef5350', 'Distribution', { id: 'distribution-color' });
const lineColor = input.color('#38bdf8', 'Ratio line', { id: 'line-color' });

// Volume on up-close days against volume on down-close days. An unchanged
// close, and the first bar (no previous close), count for neither side.
const move = ta.change(close);
const upVolume = move.gt(0).iff(volume, 0);
const downVolume = move.lt(0).iff(volume, 0);
const ratio = math.sum(upVolume, length).div(math.sum(downVolume, length));

const accumulation = ratio.gte(accumulationAt);
const distribution = ratio.lte(distributionAt);
const intoAccumulation = accumulation.and(ratio.offset(1).lt(accumulationAt));
const intoDistribution = distribution.and(ratio.offset(1).gt(distributionAt));

plot(ratio, {
  title: 'U/D ratio',
  linewidth: 2,
  color: bars.map((_bar, i) => {
    if (accumulation.get(i)) return accumulationColor;
    if (distribution.get(i)) return distributionColor;
    return lineColor;
  }),
});
const guide = '#787b86';
hline(1, { title: 'Balanced', color: guide, style: 'dashed' });
hline(accumulationAt, { title: 'Accumulation level', color: color.new(accumulationColor, 40), style: 'dotted' });
hline(distributionAt, { title: 'Distribution level', color: color.new(distributionColor, 40), style: 'dotted' });

// The raw magnitudes behind the ratio, for the Data Window only: whether a
// reading comes from thin or heavy volume.
plot(math.sum(upVolume, length), { title: 'Up volume', display: display.data_window, format: format.volume });
plot(math.sum(downVolume, length), { title: 'Down volume', display: display.data_window, format: format.volume });

alertcondition(intoAccumulation, {
  id: 'entered-accumulation',
  title: 'Entered accumulation',
  message: 'The up/down volume ratio rose into accumulation',
});
alertcondition(intoDistribution, {
  id: 'entered-distribution',
  title: 'Entered distribution',
  message: 'The up/down volume ratio fell into distribution',
});
