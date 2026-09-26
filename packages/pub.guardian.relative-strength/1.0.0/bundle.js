var __pineMod = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // folder:indicator.ts
  var indicator_exports = {};
  __export(indicator_exports, {
    __gScriptRunV2: () => __gScriptRunV2
  });
  function __gScriptRunV2(__gScriptInternalContextV1) {
    var close = __gScriptInternalContextV1.g.close, open = __gScriptInternalContextV1.g.open, high = __gScriptInternalContextV1.g.high, low = __gScriptInternalContextV1.g.low, volume = __gScriptInternalContextV1.g.volume, hl2 = __gScriptInternalContextV1.g.hl2, hlc3 = __gScriptInternalContextV1.g.hlc3, ohlc4 = __gScriptInternalContextV1.g.ohlc4, hlcc4 = __gScriptInternalContextV1.g.hlcc4, time = __gScriptInternalContextV1.g.time, bar_index = __gScriptInternalContextV1.g.bar_index, bars = __gScriptInternalContextV1.g.bars, bar = __gScriptInternalContextV1.g.bar, barstate = __gScriptInternalContextV1.g.barstate;
    var indicator = __gScriptInternalContextV1.api.indicator, plot = __gScriptInternalContextV1.api.plot, hline = __gScriptInternalContextV1.api.hline, fill = __gScriptInternalContextV1.api.fill, bgcolor = __gScriptInternalContextV1.api.bgcolor, barcolor = __gScriptInternalContextV1.api.barcolor, plotshape = __gScriptInternalContextV1.api.plotshape, plotchar = __gScriptInternalContextV1.api.plotchar, plotcandle = __gScriptInternalContextV1.api.plotcandle, label = __gScriptInternalContextV1.api.label, box = __gScriptInternalContextV1.api.box, line = __gScriptInternalContextV1.api.line, table = __gScriptInternalContextV1.api.table, position = __gScriptInternalContextV1.api.position, syminfo = __gScriptInternalContextV1.api.syminfo, shape = __gScriptInternalContextV1.api.shape, location = __gScriptInternalContextV1.api.location, size = __gScriptInternalContextV1.api.size, display = __gScriptInternalContextV1.api.display, format = __gScriptInternalContextV1.api.format, extend = __gScriptInternalContextV1.api.extend, request = __gScriptInternalContextV1.api.request, timeframe = __gScriptInternalContextV1.api.timeframe, input = __gScriptInternalContextV1.api.input, color = __gScriptInternalContextV1.api.color, math = __gScriptInternalContextV1.api.math, ta = __gScriptInternalContextV1.api.ta, na = __gScriptInternalContextV1.api.na, nz = __gScriptInternalContextV1.api.nz, str = __gScriptInternalContextV1.api.str, matrix = __gScriptInternalContextV1.api.matrix, array = __gScriptInternalContextV1.api.array;
    var profile = __gScriptInternalContextV1.api.profile, alertcondition = __gScriptInternalContextV1.api.alertcondition, order = __gScriptInternalContextV1.api.order;
    indicator("Relative Strength", { overlay: false, precision: 2 });
    const benchmark = input.symbol("INDEX:NIFTY", "Benchmark", { id: "benchmark" });
    const averageLength = input.int(50, "Average length", { id: "average-length", min: 1, max: 500 });
    const lookback = input.int(252, "New-high lookback (bars)", { id: "lookback", min: 2, max: 1e3 });
    const showTable = input.bool(true, "Show performance table", { id: "table" });
    const lineColor = input.color("#38bdf8", "RS line", { id: "line-color" });
    const highColor = input.color("#a78bfa", "RS new high", { id: "high-color" });
    const index = request.security(benchmark, "", "close");
    const rs = ta.rs(close, index);
    const average = ta.sma(rs, averageLength);
    const rsHigh = rs.gte(ta.highest(rs, lookback));
    const priceHigh = close.gte(ta.highest(close, lookback));
    const rsLeads = rsHigh.and(priceHigh.not());
    hline(100, { title: "Baseline", color: "#787b86", style: "dashed" });
    plot(average, { title: "RS average", color: color.new("#787b86", 20), linewidth: 1 });
    plot(rs, { title: "RS line", color: lineColor, linewidth: 2 });
    plot(rs.sub(average), { title: "RS spread", display: display.data_window });
    plotshape(rsHigh.iff(rs, na), {
      title: "RS new high",
      shape: shape.circle,
      location: location.absolute,
      color: color.new(highColor, 40),
      size: size.tiny
    });
    plotshape(rsLeads.iff(rs, na), {
      title: "RS leads price",
      shape: shape.circle,
      location: location.absolute,
      color: highColor,
      size: size.small
    });
    alertcondition(rsHigh, {
      id: "rs-new-high",
      title: "RS new high",
      message: "The RS line made a new high"
    });
    alertcondition(rsLeads, {
      id: "rs-leads-price",
      title: "RS new high before price",
      message: "The RS line made a new high before the price did"
    });
    if (showTable) {
      const last = bars.length - 1;
      const panel = table.new(position.top_right, 2, 5);
      table.cell(panel, 0, 0, `vs ${benchmark}`, { bold: true });
      table.cell(panel, 1, 0, "");
      const periods = [["1M", 21], ["3M", 63], ["6M", 126], ["12M", 252]];
      periods.forEach(([name, span], row) => {
        const then = last - span;
        const change = then >= 0 ? (rs.get(last) / rs.get(then) - 1) * 100 : NaN;
        const known = Number.isFinite(change);
        table.cell(panel, 0, row + 1, name);
        table.cell(panel, 1, row + 1, known ? `${change >= 0 ? "+" : ""}${change.toFixed(1)}%` : "\u2014", {
          textColor: !known ? "#787b86" : change >= 0 ? "#26a69a" : "#ef5350",
          mono: true
        });
      });
    }
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/001d308000e1de09","declarations":[{"slot":0,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":21,"column":1},"valueType":"number","qualifiers":{"value":"const","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":1,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":22,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":23,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":3,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":24,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":4,"kind":"plotshape","kindOrdinal":0,"source":{"file":"indicator.ts","line":25,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":5,"kind":"plotshape","kindOrdinal":1,"source":{"file":"indicator.ts","line":32,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}}],"drawingContract":"g-script-v2","alertConditions":[{"id":"rs-new-high","title":"RS new high","message":"The RS line made a new high"},{"id":"rs-leads-price","title":"RS new high before price","message":"The RS line made a new high before the price did"}]});
