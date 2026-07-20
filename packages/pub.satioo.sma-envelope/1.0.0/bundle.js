// SMA Envelope — self-contained compute (no SDK needed). Assigns globalThis.compute,
// the guest contract the sandbox VM evaluates.
globalThis.compute = function (input) {
  var bars = (input && input.bars) || [];
  var length = 20;
  var pct = 2;
  var basis = [];
  var upper = [];
  var lower = [];
  for (var i = length - 1; i < bars.length; i++) {
    var sum = 0;
    for (var j = i - length + 1; j <= i; j++) sum += bars[j].close;
    var m = sum / length;
    var t = bars[i].time;
    basis.push({ time: t, value: m });
    upper.push({ time: t, value: m * (1 + pct / 100) });
    lower.push({ time: t, value: m * (1 - pct / 100) });
  }
  return {
    layers: [
      { kind: 'line', id: 'basis', pane: 'price', points: basis, style: { color: '#38bdf8', lineWidth: 1 } },
      { kind: 'line', id: 'upper', pane: 'price', points: upper, style: { color: '#22c55e', lineWidth: 1 } },
      { kind: 'line', id: 'lower', pane: 'price', points: lower, style: { color: '#ef4444', lineWidth: 1 } },
    ],
  };
};
