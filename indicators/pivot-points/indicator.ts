//@gscript=2
indicator('Pivot Points Standard', { overlay: true, max_lines_count: 500, max_labels_count: 500 });

const kind = input.string('Traditional', 'Type', {
  id: 'type',
  options: ['Traditional', 'Fibonacci', 'Woodie', 'Classic', 'DM', 'Camarilla'],
});
const anchor = input.string('Auto', 'Pivots timeframe', { id: 'timeframe', options: ['Auto', 'Daily', 'Weekly', 'Monthly'] });
const periodsBack = input.int(15, 'Number of pivots back', { id: 'periods', min: 1, max: 40 });
const showLabels = input.bool(true, 'Show labels', { id: 'labels' });
const showPrices = input.bool(true, 'Show prices', { id: 'prices' });
const lineWidth = input.int(1, 'Line width', { id: 'width', min: 1, max: 4 });
const pivotColor = input.color('#f59e0b', 'Pivot', { id: 'pivot-color' });
const resistanceColor = input.color('#ef5350', 'Resistance', { id: 'resistance-color' });
const supportColor = input.color('#26a69a', 'Support', { id: 'support-color' });

// ── Which period the pivots come from ───────────────────────────────────────
// Ranks: 0 intraday, 1 day, 2 week, 3 month. Auto is one step above the chart.
const chartRank = timeframe.isintraday ? 0 : timeframe.isdaily ? 1 : timeframe.isweekly ? 2 : 3;
const anchorRank = anchor === 'Daily' ? 1 : anchor === 'Weekly' ? 2 : anchor === 'Monthly' ? 3 : chartRank + 1;
const active = anchorRank > chartRank && anchorRank <= 3;

// Every period is requested on every run: the calls are the data declaration,
// so switching the timeframe input or the chart never asks for undeclared data.
const periodData = (tf: string) => ({
  high: request.security('', tf, 'high'),
  low: request.security('', tf, 'low'),
  close: request.security('', tf, 'close'),
  open: request.security('', tf, 'open'),
});
const byRank = [null, periodData('1D'), periodData('W'), periodData('1M')];
const prior = active ? byRank[anchorRank] : null;

// ── IST calendar periods on the chart's own bars ───────────────────────────
const IST = 19800;
const dayKey = (t: number) => Math.floor((t + IST) / 86400);
const weekKey = (t: number) => { const d = dayKey(t); return d - ((d + 3) % 7); }; // Monday-based
const monthKey = (t: number) => { const w = new Date((t + IST) * 1000); return w.getUTCFullYear() * 12 + w.getUTCMonth(); };
const keyOf = anchorRank === 1 ? dayKey : anchorRank === 2 ? weekKey : monthKey;

// First chart bar of every period. A requested series only sees closed periods,
// so on that bar it holds exactly the period before; later bars of the period
// keep those levels even if one of them closes the period itself.
const starts: number[] = [];
if (active) {
  let lastKey = NaN;
  for (let i = 0; i < bars.length; i++) {
    const key = keyOf(bars[i].time);
    if (key !== lastKey) starts.push(i);
    lastKey = key;
  }
}

// ── The published formulas ──────────────────────────────────────────────────
const SLOTS = ['P', 'R1', 'S1', 'R2', 'S2', 'R3', 'S3', 'R4', 'S4', 'R5', 'S5'];
/** Levels in SLOTS order; NaN where the type has no such level. */
const levelsFor = (h: number, l: number, c: number, o: number, currentOpen: number): number[] => {
  const r = h - l;
  if (kind === 'DM') {
    const x = o === c ? h + l + 2 * c : c > o ? 2 * h + l + c : 2 * l + h + c;
    return [x / 4, x / 2 - l, x / 2 - h, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN];
  }
  if (kind === 'Woodie') {
    const p = (h + l + 2 * currentOpen) / 4;
    const r3 = h + 2 * (p - l);
    const s3 = l - 2 * (h - p);
    return [p, 2 * p - l, 2 * p - h, p + r, p - r, r3, s3, r3 + r, s3 - r, NaN, NaN];
  }
  const p = (h + l + c) / 3;
  if (kind === 'Fibonacci') {
    return [p, p + 0.382 * r, p - 0.382 * r, p + 0.618 * r, p - 0.618 * r, p + r, p - r, NaN, NaN, NaN, NaN];
  }
  if (kind === 'Classic') {
    return [p, 2 * p - l, 2 * p - h, p + r, p - r, p + 2 * r, p - 2 * r, p + 3 * r, p - 3 * r, NaN, NaN];
  }
  if (kind === 'Camarilla') {
    const r5 = (h / l) * c;
    return [
      p,
      c + (1.1 * r) / 12, c - (1.1 * r) / 12,
      c + (1.1 * r) / 6, c - (1.1 * r) / 6,
      c + (1.1 * r) / 4, c - (1.1 * r) / 4,
      c + (1.1 * r) / 2, c - (1.1 * r) / 2,
      r5, c - (r5 - c),
    ];
  }
  return [
    p, 2 * p - l, 2 * p - h, p + r, p - r,
    2 * p + (h - 2 * l), 2 * p - (2 * h - l),
    3 * p + (h - 3 * l), 3 * p - (3 * h - l),
    4 * p + (h - 4 * l), 4 * p - (4 * h - l),
  ];
};

// One set of levels per period, and each bar's level in SLOTS order.
const periodLevels = starts.map((s: number) => levelsFor(
  prior.high.get(s), prior.low.get(s), prior.close.get(s), prior.open.get(s), open.get(s),
));
const perBar = SLOTS.map(() => new Array(bars.length).fill(NaN));
starts.forEach((s: number, k: number) => {
  const end = k + 1 < starts.length ? starts[k + 1] : bars.length;
  const levels = periodLevels[k];
  for (let slot = 0; slot < SLOTS.length; slot++) {
    for (let i = s; i < end; i++) perBar[slot][i] = levels[slot];
  }
});
const levelAt = (slot: number) => (_prev: number, _bar, i: number) => perBar[slot][i];

plot(ta.scan(NaN, levelAt(0)), { title: 'P', display: display.data_window, format: format.price });
plot(ta.scan(NaN, levelAt(1)), { title: 'R1', display: display.data_window, format: format.price });
plot(ta.scan(NaN, levelAt(2)), { title: 'S1', display: display.data_window, format: format.price });
plot(ta.scan(NaN, levelAt(3)), { title: 'R2', display: display.data_window, format: format.price });
plot(ta.scan(NaN, levelAt(4)), { title: 'S2', display: display.data_window, format: format.price });
plot(ta.scan(NaN, levelAt(5)), { title: 'R3', display: display.data_window, format: format.price });
plot(ta.scan(NaN, levelAt(6)), { title: 'S3', display: display.data_window, format: format.price });
plot(ta.scan(NaN, levelAt(7)), { title: 'R4', display: display.data_window, format: format.price });
plot(ta.scan(NaN, levelAt(8)), { title: 'S4', display: display.data_window, format: format.price });
plot(ta.scan(NaN, levelAt(9)), { title: 'R5', display: display.data_window, format: format.price });
plot(ta.scan(NaN, levelAt(10)), { title: 'S5', display: display.data_window, format: format.price });

// ── Drawing: the last N periods, one segment per level, labelled at the left ─
/** 1,23,456.70 — Indian digit grouping, two decimals. */
const inr = (value: number) => {
  const [whole, fraction] = Math.abs(value).toFixed(2).split('.');
  const head = whole.slice(0, -3);
  const grouped = head ? `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${whole.slice(-3)}` : whole;
  return `${value < 0 ? '-' : ''}${grouped}.${fraction}`;
};
const tintOf = (slot: number) => (slot === 0 ? pivotColor : slot % 2 === 1 ? resistanceColor : supportColor);
const first = Math.max(0, starts.length - periodsBack);
for (let k: number = first; k < starts.length; k++) {
  const start = starts[k];
  const latest = k === starts.length - 1;
  const end = latest ? bars.length - 1 : starts[k + 1] - 1;
  const levels = periodLevels[k];
  for (let slot = 0; slot < SLOTS.length; slot++) {
    const price = levels[slot];
    if (!Number.isFinite(price)) continue;
    const tint = tintOf(slot);
    line.new(start, price, end, price, { color: tint, width: lineWidth, extend: latest ? extend.right : extend.none });
    if (showLabels) {
      label.new(start, price, showPrices ? `${SLOTS[slot]} (${inr(price)})` : SLOTS[slot], {
        style: label.style_label_right,
        color: color.new(tint, 100),
        textColor: tint,
        size: size.small,
      });
    }
  }
}
