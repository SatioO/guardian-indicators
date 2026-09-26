//@gscript=2
indicator('Market Structure', { overlay: true, max_labels_count: 500, max_lines_count: 500 });

const left = input.int(5, 'Pivot left bars', { id: 'left', min: 1, max: 50 });
const right = input.int(5, 'Pivot right bars', { id: 'right', min: 1, max: 50 });
const keep = input.int(10, 'Structures shown', { id: 'keep', min: 1, max: 200 });
const showSwings = input.bool(true, 'Swing labels', { id: 'swings' });
const bullColor = input.color('#26a69a', 'Bullish structure', { id: 'bull-color' });
const bearColor = input.color('#ef5350', 'Bearish structure', { id: 'bear-color' });

// A swing is only known `right` bars after it happened. ta.pivothigh reports it
// on the swing bar itself, so shift it onto the bar that confirms it.
const swingHigh = ta.pivothigh(high, left, right).offset(right);
const swingLow = ta.pivotlow(low, left, right).offset(right);

// Bar by bar: the most recent confirmed swing high and low not yet broken, and
// whether this bar's close broke one. A newer swing replaces an unbroken older
// one; a broken swing is spent. Structure is +1 after a bullish break, −1 after
// a bearish one.
const [
  , , , , bullBreak, bullFrom, bullLevel, bearBreak, bearFrom, bearLevel, structure, lastHigh, lastLow,
] = ta.scan([NaN, NaN, NaN, NaN, 0, NaN, NaN, 0, NaN, NaN, 0, NaN, NaN], (prev, bar, i) => {
  let [activeHigh, activeHighBar, activeLow, activeLowBar] = prev;
  let [direction, recentHigh, recentLow] = prev.slice(10);
  const h = swingHigh.get(i);
  if (Number.isFinite(h)) {
    activeHigh = h;
    activeHighBar = i - right;
    recentHigh = h;
  }
  const l = swingLow.get(i);
  if (Number.isFinite(l)) {
    activeLow = l;
    activeLowBar = i - right;
    recentLow = l;
  }
  let [bull, fromHigh, brokenHigh, bear, fromLow, brokenLow] = [0, NaN, NaN, 0, NaN, NaN];
  if (bar.close > activeHigh) {
    [bull, fromHigh, brokenHigh] = [1, activeHighBar, activeHigh];
    [activeHigh, activeHighBar, direction] = [NaN, NaN, 1];
  }
  if (bar.close < activeLow) {
    [bear, fromLow, brokenLow] = [1, activeLowBar, activeLow];
    [activeLow, activeLowBar, direction] = [NaN, NaN, -1];
  }
  return [
    activeHigh, activeHighBar, activeLow, activeLowBar,
    bull, fromHigh, brokenHigh, bear, fromLow, brokenLow,
    direction, recentHigh, recentLow,
  ];
});

// Each swing against the one before it on the same side.
const swings = [];
let previousHigh = NaN;
let previousLow = NaN;
for (let i = 0; i < bars.length; i++) {
  const h = swingHigh.get(i);
  if (Number.isFinite(h)) {
    if (Number.isFinite(previousHigh)) {
      swings.push({ bar: i - right, price: h, text: h > previousHigh ? 'HH' : 'LH', isHigh: true });
    }
    previousHigh = h;
  }
  const l = swingLow.get(i);
  if (Number.isFinite(l)) {
    if (Number.isFinite(previousLow)) {
      swings.push({ bar: i - right, price: l, text: l > previousLow ? 'HL' : 'LL', isHigh: false });
    }
    previousLow = l;
  }
}

const breaks = [];
for (let i = 0; i < bars.length; i++) {
  if (bullBreak.get(i)) breaks.push({ from: bullFrom.get(i), to: i, level: bullLevel.get(i), bullish: true });
  if (bearBreak.get(i)) breaks.push({ from: bearFrom.get(i), to: i, level: bearLevel.get(i), bullish: false });
}

// Only the most recent structures are drawn; the alerts still see every break.
for (const swing of showSwings ? swings.slice(-keep) : []) {
  const bullish = swing.text === 'HH' || swing.text === 'HL';
  label.new(swing.bar, swing.price, swing.text, {
    style: swing.isHigh ? label.style_label_down : label.style_label_up,
    color: na,
    textColor: bullish ? bullColor : bearColor,
    size: size.small,
  });
}
for (const brk of breaks.slice(-keep)) {
  const tint = brk.bullish ? bullColor : bearColor;
  line.new(brk.from, brk.level, brk.to, brk.level, { color: tint, style: 'dashed' });
  label.new(Math.round((brk.from + brk.to) / 2), brk.level, 'BOS', {
    style: brk.bullish ? label.style_label_down : label.style_label_up,
    color: na,
    textColor: tint,
    size: size.tiny,
  });
}

plot(lastHigh, { title: 'Last swing high', display: display.data_window });
plot(lastLow, { title: 'Last swing low', display: display.data_window });
plot(structure, { title: 'Structure', display: display.data_window, precision: 0 });

alertcondition(bullBreak.gt(0), {
  id: 'bullish-bos',
  title: 'Bullish BOS',
  message: 'Price closed above the last swing high: bullish break of structure',
});
alertcondition(bearBreak.gt(0), {
  id: 'bearish-bos',
  title: 'Bearish BOS',
  message: 'Price closed below the last swing low: bearish break of structure',
});
