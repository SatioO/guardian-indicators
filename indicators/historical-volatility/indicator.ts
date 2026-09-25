//@gscript=2
indicator('Historical Volatility', { overlay: false, precision: 2 });

const length = input.int(10, 'Length', { id: 'length', min: 2, max: 500 });
const daysPerYear = input.int(252, 'Days per year', { id: 'days-per-year', min: 1, max: 366 });
const rankLookback = input.int(252, 'Rank lookback (bars)', { id: 'rank-lookback', min: 2, max: 1000 });
const lowRank = input.float(10, 'Low rank at or below', { id: 'low-rank', min: 0, max: 100, step: 5 });
const highRank = input.float(90, 'High rank at or above', { id: 'high-rank', min: 0, max: 100, step: 5 });
const lineColor = input.color('#38bdf8', 'HV', { id: 'line-color' });
const lowColor = input.color('#a78bfa', 'HV at a low rank', { id: 'low-color' });
const highColor = input.color('#f59e0b', 'HV at a high rank', { id: 'high-color' });

// Close-to-close log returns, annualised as if every bar were one trading day.
const returns = math.log(close.div(close.offset(1)));
const hv = ta.stdev(returns, length).mul(100 * math.sqrt(daysPerYear));

// Where today's HV sits among the previous year of readings: 0 is the calmest.
const rank = ta.percentrank(hv, rankLookback);
const atLow = rank.lte(lowRank);
const atHigh = rank.gte(highRank);

plot(hv, {
  title: 'HV',
  linewidth: 2,
  color: bars.map((_bar, i) => {
    if (atLow.get(i)) return lowColor;
    if (atHigh.get(i)) return highColor;
    return lineColor;
  }),
});
plot(rank, { title: 'HV rank', display: display.data_window, precision: 0 });

// Only a drop from a known reading above the band counts as a new low.
alertcondition(atLow.and(rank.offset(1).gt(lowRank)), {
  id: 'hv-yearly-low',
  title: 'Volatility at a yearly low',
  message: 'Historical volatility dropped into the bottom of its one-year range',
});
// Only a rise from a known reading below the band counts as a new high.
alertcondition(atHigh.and(rank.offset(1).lt(highRank)), {
  id: 'hv-yearly-high',
  title: 'Volatility at a yearly high',
  message: 'Historical volatility rose into the top of its one-year range',
});
