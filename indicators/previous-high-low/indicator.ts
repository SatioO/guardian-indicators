//@gscript=2
indicator('Previous High and Low', { overlay: true, max_labels_count: 20 });

const showDay = input.bool(true, 'Previous day high/low', { id: 'day' });
const showDayClose = input.bool(true, 'Previous day close', { id: 'day-close' });
const showWeek = input.bool(true, 'Previous week high/low', { id: 'week' });
const showMonth = input.bool(true, 'Previous month high/low', { id: 'month' });
const showLabels = input.bool(true, 'Label the levels', { id: 'labels' });
const markBreaks = input.bool(true, 'Mark the first break of the day', { id: 'breaks' });
const dayColor = input.color('#38bdf8', 'Day', { id: 'day-color' });
const closeColor = input.color('#787b86', 'Day close', { id: 'close-color' });
const weekColor = input.color('#a78bfa', 'Week', { id: 'week-color' });
const monthColor = input.color('#f59e0b', 'Month', { id: 'month-color' });

// ── Calendar periods, in IST ────────────────────────────────────────────────
const IST = 19800;
const dayKey = (t: number) => Math.floor((t + IST) / 86400);
const weekKey = (t: number) => { const d = dayKey(t); return d - ((d + 3) % 7); }; // Monday-based
const monthKey = (t: number) => { const w = new Date((t + IST) * 1000); return w.getUTCFullYear() * 12 + w.getUTCMonth(); };
const dayKeys = bars.map((b) => dayKey(b.time));
const weekKeys = bars.map((b) => weekKey(b.time));
const monthKeys = bars.map((b) => monthKey(b.time));

// Chart timeframe against the level's: 0 intraday, 1 day, 2 week, 3 month.
const chartRank = timeframe.isintraday ? 0 : timeframe.isdaily ? 1 : timeframe.isweekly ? 2 : 3;

// Every period is requested on every run: the calls are the data declaration.
const day = {
  high: request.security('', '1D', 'high'),
  low: request.security('', '1D', 'low'),
  close: request.security('', '1D', 'close'),
};
const week = { high: request.security('', 'W', 'high'), low: request.security('', 'W', 'low') };
const month = { high: request.security('', '1M', 'high'), low: request.security('', '1M', 'low') };

/**
 * The previous completed period's value on every bar of the current one, as a
 * scan step. A requested series only sees closed periods, so on the FIRST bar
 * of a period it holds the one before; that value is carried to the period's
 * last bar (which may itself close the period, and would otherwise see it).
 * On a chart of the level's own timeframe the previous period is the previous
 * bar; on a higher one the level is not drawn.
 */
const previousPeriod = (rank: number, keys: number[], requested, own) => (prev: number, _bar, i: number) => {
  if (chartRank > rank) return NaN;
  if (chartRank === rank) return i === 0 ? NaN : own.get(i - 1);
  return i === 0 || keys[i] !== keys[i - 1] ? requested.get(i) : prev;
};

const pdh = ta.scan(NaN, previousPeriod(1, dayKeys, day.high, high));
const pdl = ta.scan(NaN, previousPeriod(1, dayKeys, day.low, low));
const pdc = ta.scan(NaN, previousPeriod(1, dayKeys, day.close, close));
const pwh = ta.scan(NaN, previousPeriod(2, weekKeys, week.high, high));
const pwl = ta.scan(NaN, previousPeriod(2, weekKeys, week.low, low));
const pmh = ta.scan(NaN, previousPeriod(3, monthKeys, month.high, high));
const pml = ta.scan(NaN, previousPeriod(3, monthKeys, month.low, low));

plot(showDay ? pdh : na, { style: plot.style_stepline, title: 'Previous day high', color: dayColor });
plot(showDay ? pdl : na, { style: plot.style_stepline, title: 'Previous day low', color: dayColor });
plot(showDayClose ? pdc : na, { style: plot.style_stepline, title: 'Previous day close', color: closeColor });
plot(showWeek ? pwh : na, { style: plot.style_stepline, title: 'Previous week high', color: weekColor });
plot(showWeek ? pwl : na, { style: plot.style_stepline, title: 'Previous week low', color: weekColor });
plot(showMonth ? pmh : na, { style: plot.style_stepline, title: 'Previous month high', color: monthColor });
plot(showMonth ? pml : na, { style: plot.style_stepline, title: 'Previous month low', color: monthColor });

// ── The first trade through yesterday's high or low in each session ────────
const [brokeHigh, brokeLow] = ta.scan([0, 0, NaN, NaN], (prev, bar, i: number) => {
  const fresh = i === 0 || dayKeys[i] !== dayKeys[i - 1];
  const highBefore = fresh ? NaN : prev[2];
  const lowBefore = fresh ? NaN : prev[3];
  const level = pdh.get(i);
  const floor = pdl.get(i);
  return [
    bar.high > level && !(highBefore > level) ? 1 : 0,
    bar.low < floor && !(lowBefore < floor) ? 1 : 0,
    Number.isNaN(highBefore) ? bar.high : Math.max(highBefore, bar.high),
    Number.isNaN(lowBefore) ? bar.low : Math.min(lowBefore, bar.low),
  ];
});
const brokeAbove = brokeHigh.gt(0);
const brokeBelow = brokeLow.gt(0);

plotshape(markBreaks && showDay ? brokeAbove : false, {
  title: 'Previous day high break',
  shape: shape.triangleup,
  location: location.belowbar,
  color: dayColor,
  size: size.tiny,
});
plotshape(markBreaks && showDay ? brokeBelow : false, {
  title: 'Previous day low break',
  shape: shape.triangledown,
  location: location.abovebar,
  color: dayColor,
  size: size.tiny,
});

alertcondition(markBreaks && showDay ? brokeAbove : false, {
  id: 'broke-previous-day-high',
  title: 'Broke previous day high',
  message: "Price traded above the previous day's high",
});
alertcondition(markBreaks && showDay ? brokeBelow : false, {
  id: 'broke-previous-day-low',
  title: 'Broke previous day low',
  message: "Price traded below the previous day's low",
});

// ── Labels at the latest bar ────────────────────────────────────────────────
/** 1,40,000.00 — Indian digit grouping, two decimals. */
const inr = (value: number) => {
  const [whole, fraction] = Math.abs(value).toFixed(2).split('.');
  const head = whole.slice(0, -3);
  const grouped = head ? `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${whole.slice(-3)}` : whole;
  return `${value < 0 ? '-' : ''}${grouped}.${fraction}`;
};
if (showLabels && bars.length > 0) {
  const last = bars.length - 1;
  const tags = [
    [showDay, pdh, 'PDH', dayColor],
    [showDay, pdl, 'PDL', dayColor],
    [showDayClose, pdc, 'PDC', closeColor],
    [showWeek, pwh, 'PWH', weekColor],
    [showWeek, pwl, 'PWL', weekColor],
    [showMonth, pmh, 'PMH', monthColor],
    [showMonth, pml, 'PML', monthColor],
  ];
  for (const [shown, series, tag, tint] of tags) {
    const price = series.get(last);
    if (!shown || !Number.isFinite(price)) continue;
    label.new(last, price, `${tag} ${inr(price)}`, {
      style: label.style_label_left,
      color: color.new(tint, 100),
      textColor: tint,
      size: size.small,
    });
  }
}
