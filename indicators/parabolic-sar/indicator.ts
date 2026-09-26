//@gscript=2
indicator('Parabolic SAR', { overlay: true });

const start = input.float(0.02, 'Start', { id: 'start', min: 0, step: 0.01 });
const increment = input.float(0.02, 'Increment', { id: 'increment', min: 0, step: 0.01 });
const maximum = input.float(0.2, 'Max value', { id: 'maximum', min: 0, step: 0.01 });
const flips = input.bool(false, 'Show flip markers', { id: 'flips' });
const upColor = input.color('#26a69a', 'Up trend', { id: 'up-color' });
const downColor = input.color('#ef5350', 'Down trend', { id: 'down-color' });

const sar = ta.sar(start, increment, maximum);

// Under the close the SAR trails an up trend; over it, a down trend.
const isUp = sar.lt(close);
const isDown = sar.gt(close);
const flippedUp = isUp.and(isDown.offset(1));
const flippedDown = isDown.and(isUp.offset(1));

plotshape(isUp.iff(sar, na), {
  title: 'Up-trend SAR',
  shape: shape.circle,
  location: location.absolute,
  color: upColor,
  size: size.tiny,
});
plotshape(isDown.iff(sar, na), {
  title: 'Down-trend SAR',
  shape: shape.circle,
  location: location.absolute,
  color: downColor,
  size: size.tiny,
});
plotshape(flips ? flippedUp : false, {
  title: 'Flip up',
  shape: shape.triangleup,
  location: location.belowbar,
  color: upColor,
  size: size.small,
});
plotshape(flips ? flippedDown : false, {
  title: 'Flip down',
  shape: shape.triangledown,
  location: location.abovebar,
  color: downColor,
  size: size.small,
});
plot(sar, { title: 'SAR', display: display.data_window });

alertcondition(flippedUp, {
  id: 'flip-up',
  title: 'SAR flipped up',
  message: 'Parabolic SAR flipped under price: the trend turned up',
});
alertcondition(flippedDown, {
  id: 'flip-down',
  title: 'SAR flipped down',
  message: 'Parabolic SAR flipped over price: the trend turned down',
});
