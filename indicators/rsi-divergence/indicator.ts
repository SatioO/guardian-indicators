//@gscript=2
indicator('RSI Divergence', { overlay: false, precision: 2, max_lines_count: 500, max_labels_count: 500 });

const rsiLength = input.int(14, 'RSI length', { id: 'rsi-length', min: 1, max: 200 });
const src = input.source('close', 'RSI source', { id: 'source' });
const left = input.int(5, 'Pivot lookback left', { id: 'left', min: 1, max: 50 });
const right = input.int(5, 'Pivot lookback right', { id: 'right', min: 1, max: 50 });
const rangeMin = input.int(5, 'Min of lookback range', { id: 'range-min', min: 0, max: 500 });
const rangeMax = input.int(60, 'Max of lookback range', { id: 'range-max', min: 1, max: 500 });
const showBull = input.bool(true, 'Regular bullish', { id: 'bull' });
const showHiddenBull = input.bool(false, 'Hidden bullish', { id: 'hidden-bull' });
const showBear = input.bool(true, 'Regular bearish', { id: 'bear' });
const showHiddenBear = input.bool(false, 'Hidden bearish', { id: 'hidden-bear' });
const keep = input.int(20, 'Divergences shown', { id: 'keep', min: 1, max: 250 });
const overbought = input.float(70, 'Overbought', { id: 'overbought', min: 50, max: 100, step: 5 });
const oversold = input.float(30, 'Oversold', { id: 'oversold', min: 0, max: 50, step: 5 });
const rsiColor = input.color('#a78bfa', 'RSI line', { id: 'rsi-color' });
const bullColor = input.color('#26a69a', 'Bullish divergence', { id: 'bull-color' });
const bearColor = input.color('#ef5350', 'Bearish divergence', { id: 'bear-color' });

const rsiValue = ta.rsi(src, rsiLength);

// An RSI pivot is known only `right` bars after it: ta.pivotlow reports it on
// the pivot bar itself, so shift it onto the bar that confirms it, together
// with the price at the pivot bar.
const pivotLowRsi = ta.pivotlow(rsiValue, left, right).offset(right);
const pivotHighRsi = ta.pivothigh(rsiValue, left, right).offset(right);
const lowThen = low.offset(right);
const highThen = high.offset(right);
// A pivot counts only once the RSI is defined across its whole window, so the
// warm-up never makes a pivot out of missing values.
const windowStart = rsiValue.offset(left + right);

// Each confirmed pivot against the previous one on its side, when the bars
// since that one was confirmed (from the bar after it) fall inside the range.
// Kind: 1 = regular, 2 = hidden, 0 = none; `from` is the previous pivot's bar.
const [
  , , , , , ,
  lowKind, lowFrom, lowFromRsi, highKind, highFrom, highFromRsi,
] = ta.scan([NaN, NaN, NaN, NaN, NaN, NaN, 0, NaN, NaN, 0, NaN, NaN], (prev, _bar, i) => {
  let [lastLowRsi, lastLow, lastLowAt, lastHighRsi, lastHigh, lastHighAt] = prev;
  let [lk, lf, lfr, hk, hf, hfr] = [0, NaN, NaN, 0, NaN, NaN];
  const ready = Number.isFinite(windowStart.get(i));
  const pl = pivotLowRsi.get(i);
  if (ready && Number.isFinite(pl)) {
    const price = lowThen.get(i);
    const since = i - lastLowAt - 1;
    if (since >= rangeMin && since <= rangeMax) {
      if (price < lastLow && pl > lastLowRsi) lk = 1;
      else if (price > lastLow && pl < lastLowRsi) lk = 2;
      if (lk > 0) [lf, lfr] = [lastLowAt - right, lastLowRsi];
    }
    [lastLowRsi, lastLow, lastLowAt] = [pl, price, i];
  }
  const ph = pivotHighRsi.get(i);
  if (ready && Number.isFinite(ph)) {
    const price = highThen.get(i);
    const since = i - lastHighAt - 1;
    if (since >= rangeMin && since <= rangeMax) {
      if (price > lastHigh && ph < lastHighRsi) hk = 1;
      else if (price < lastHigh && ph > lastHighRsi) hk = 2;
      if (hk > 0) [hf, hfr] = [lastHighAt - right, lastHighRsi];
    }
    [lastHighRsi, lastHigh, lastHighAt] = [ph, price, i];
  }
  return [lastLowRsi, lastLow, lastLowAt, lastHighRsi, lastHigh, lastHighAt, lk, lf, lfr, hk, hf, hfr];
});

const guide = '#787b86';
const upper = hline(overbought, { title: 'Overbought', color: guide, style: 'dashed' });
hline(50, { title: 'Middle', color: color.new(guide, 50), style: 'dotted' });
const lower = hline(oversold, { title: 'Oversold', color: guide, style: 'dashed' });
fill(upper, lower, { color: color.new(rsiColor, 90) });

plot(rsiValue, { title: 'RSI', color: rsiColor, linewidth: 2 });

// Divergences in the order they were confirmed; only the most recent are drawn.
const found = [];
for (let i = 0; i < bars.length; i++) {
  const lk = lowKind.get(i);
  if ((lk === 1 && showBull) || (lk === 2 && showHiddenBull)) {
    found.push({ from: lowFrom.get(i), fromRsi: lowFromRsi.get(i), to: i - right, bullish: true, hidden: lk === 2 });
  }
  const hk = highKind.get(i);
  if ((hk === 1 && showBear) || (hk === 2 && showHiddenBear)) {
    found.push({ from: highFrom.get(i), fromRsi: highFromRsi.get(i), to: i - right, bullish: false, hidden: hk === 2 });
  }
}
for (const d of found.slice(-keep)) {
  const tint = d.bullish ? bullColor : bearColor;
  const toRsi = rsiValue.get(d.to);
  line.new(d.from, d.fromRsi, d.to, toRsi, { color: tint, width: d.hidden ? 1 : 2, style: d.hidden ? 'dashed' : 'solid' });
  label.new(d.to, toRsi, `${d.hidden ? 'H ' : ''}${d.bullish ? 'Bull' : 'Bear'}`, {
    style: d.bullish ? label.style_label_up : label.style_label_down,
    color: tint,
    textColor: '#ffffff',
    size: size.small,
  });
}

alertcondition(lowKind.eq(1), {
  id: 'regular-bullish',
  title: 'Regular bullish divergence',
  message: 'RSI regular bullish divergence: price made a lower low, RSI a higher low',
});
alertcondition(lowKind.eq(2), {
  id: 'hidden-bullish',
  title: 'Hidden bullish divergence',
  message: 'RSI hidden bullish divergence: price made a higher low, RSI a lower low',
});
alertcondition(highKind.eq(1), {
  id: 'regular-bearish',
  title: 'Regular bearish divergence',
  message: 'RSI regular bearish divergence: price made a higher high, RSI a lower high',
});
alertcondition(highKind.eq(2), {
  id: 'hidden-bearish',
  title: 'Hidden bearish divergence',
  message: 'RSI hidden bearish divergence: price made a lower high, RSI a higher high',
});
