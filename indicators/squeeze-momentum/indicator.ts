//@gscript=2
indicator('Squeeze Momentum', { overlay: false, precision: 2 });

const bbLength = input.int(20, 'BB length', { id: 'bb-length', min: 1, max: 500 });
const bbMult = input.float(2, 'BB mult factor', { id: 'bb-mult', min: 0.1, max: 10, step: 0.1 });
const kcLength = input.int(20, 'KC length', { id: 'kc-length', min: 1, max: 500 });
const kcMult = input.float(1.5, 'KC mult factor', { id: 'kc-mult', min: 0.1, max: 10, step: 0.1 });
const useTrueRange = input.bool(true, 'Use true range (KC)', { id: 'use-true-range' });
const upColor = input.color('#26a69a', 'Momentum above zero', { id: 'up-color' });
const downColor = input.color('#ef5350', 'Momentum below zero', { id: 'down-color' });
const onColor = input.color('#787b86', 'Squeeze on', { id: 'on-color' });
const offColor = input.color('#26a69a', 'Squeeze off', { id: 'off-color' });

// Bollinger Bands on the close.
const bbBasis = ta.sma(close, bbLength);
const bbDev = ta.stdev(close, bbLength).mul(bbMult);
const upperBB = bbBasis.add(bbDev);
const lowerBB = bbBasis.sub(bbDev);

// Keltner Channels: a simple average of the close ± a simple average of the range.
const kcBasis = ta.sma(close, kcLength);
const range = useTrueRange ? ta.tr(false) : high.sub(low);
const rangeMa = ta.sma(range, kcLength);
const upperKC = kcBasis.add(rangeMa.mul(kcMult));
const lowerKC = kcBasis.sub(rangeMa.mul(kcMult));

// Squeeze on: the Bollinger Bands sit wholly inside the Keltner Channels.
// Off: either band has pushed back outside. Neither holds before both exist.
const squeezeOn = lowerBB.gt(lowerKC).and(upperBB.lt(upperKC));
const squeezeOff = lowerBB.lte(lowerKC).or(upperBB.gte(upperKC));
const fired = squeezeOff.and(squeezeOn.offset(1));

// Momentum: the close against the middle of its range and its average,
// smoothed by a linear regression.
const donchianMid = math.avg(ta.highest(high, kcLength), ta.lowest(low, kcLength));
const momentum = ta.linreg(close.sub(math.avg(donchianMid, kcBasis)), kcLength, 0);

plot(momentum, {
  title: 'Momentum',
  style: plot.style_columns,
  color: bars.map((_bar, i) => {
    const now = momentum.get(i);
    const before = i > 0 && !na(momentum.get(i - 1)) ? momentum.get(i - 1) : 0;
    if (now > 0) return now > before ? upColor : color.new(upColor, 55);
    return now < before ? downColor : color.new(downColor, 55);
  }),
});
plotshape(squeezeOn.iff(0, na), {
  title: 'Squeeze on',
  shape: shape.circle,
  location: location.absolute,
  color: onColor,
  size: size.tiny,
});
plotshape(squeezeOff.iff(0, na), {
  title: 'Squeeze off',
  shape: shape.circle,
  location: location.absolute,
  color: offColor,
  size: size.tiny,
});

alertcondition(fired, {
  id: 'squeeze-fired',
  title: 'Squeeze fired',
  message: 'The Bollinger Bands moved back outside the Keltner Channels: the squeeze fired',
});
