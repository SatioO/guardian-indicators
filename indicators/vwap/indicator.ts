//@gscript=2
indicator('VWAP', { overlay: true });

// Same line as the chart's built-in VWAP by default: the typical price
// weighted by volume, starting afresh on each IST trading day.
const src = input.source('hlc3', 'Source', { id: 'source' });
const lineColor = input.color('#e879f9', 'Color', { id: 'color' });
const width = input.int(2, 'Line width', { id: 'line-width', min: 1, max: 4 });

// ── Sessions, in IST ────────────────────────────────────────────────────────
const IST = 19800;
const dayKeys = bars.map((b) => Math.floor((b.time + IST) / 86400));

// Running Σ(source × volume) and Σ(volume) since the session began; both
// reset on the first bar of each new IST calendar day.
const [sumPriceVolume, sumVolume] = ta.scan([0, 0], (prev, bar, i: number) => {
  const fresh = i === 0 || dayKeys[i] !== dayKeys[i - 1];
  const priceVolume = (fresh ? 0 : prev[0]) + src.get(i) * bar.volume;
  const vol = (fresh ? 0 : prev[1]) + bar.volume;
  return [priceVolume, vol];
});

// Nothing is drawn while the session has traded no volume.
const vwapLine = sumVolume.gt(0).iff(sumPriceVolume.div(sumVolume), na);

plot(vwapLine, { title: 'VWAP', color: lineColor, linewidth: width });

alertcondition(ta.crossover(close, vwapLine), {
  id: 'cross-above',
  title: 'Close crossed above VWAP',
  message: 'The close crossed above VWAP',
});
alertcondition(ta.crossunder(close, vwapLine), {
  id: 'cross-below',
  title: 'Close crossed below VWAP',
  message: 'The close crossed below VWAP',
});
