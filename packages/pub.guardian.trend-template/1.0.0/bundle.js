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
    indicator("Trend Template", { overlay: true });
    const benchmark = input.symbol("INDEX:NIFTY", "Benchmark", { id: "benchmark" });
    const risingBars = input.int(20, "SMA 200 rising over (bars)", { id: "rising-bars", min: 1, max: 200 });
    const aboveLowPct = input.float(30, "Above 52-week low by at least (%)", { id: "above-low", min: 0, step: 5 });
    const nearHighPct = input.float(25, "Within 52-week high by (%)", { id: "near-high", min: 0, max: 100, step: 5 });
    const yearBars = input.int(252, "Year (bars)", { id: "year", min: 20, max: 1e3 });
    const showAverages = input.bool(true, "Show the averages", { id: "averages" });
    const shade = input.bool(true, "Shade bars that pass", { id: "shade" });
    const showTable = input.bool(true, "Show the checklist", { id: "table" });
    const place = input.string("Top right", "Checklist position", {
      id: "position",
      options: ["Top right", "Top left", "Bottom right", "Bottom left"]
    });
    const passColor = input.color("#26a69a", "Passes", { id: "pass-color" });
    const failColor = input.color("#ef5350", "Fails", { id: "fail-color" });
    const fastColor = input.color("#38bdf8", "SMA 50", { id: "fast-color" });
    const midColor = input.color("#a78bfa", "SMA 150", { id: "mid-color" });
    const slowColor = input.color("#f59e0b", "SMA 200", { id: "slow-color" });
    const sma50 = ta.sma(close, 50);
    const sma150 = ta.sma(close, 150);
    const sma200 = ta.sma(close, 200);
    const yearHigh = ta.highest(high, yearBars);
    const yearLow = ta.lowest(low, yearBars);
    const index = request.security(benchmark, "", "close");
    const stockReturn = close.div(close.offset(yearBars));
    const indexReturn = index.div(index.offset(yearBars));
    const aboveLongAverages = close.gt(sma150).and(close.gt(sma200));
    const midAboveSlow = sma150.gt(sma200);
    const slowRising = sma200.gt(sma200.offset(risingBars));
    const fastAboveBoth = sma50.gt(sma150).and(sma50.gt(sma200));
    const aboveFast = close.gt(sma50);
    const offTheLow = close.gte(yearLow.mul(1 + aboveLowPct / 100));
    const nearTheHigh = close.gte(yearHigh.mul(1 - nearHighPct / 100));
    const beatsBenchmark = stockReturn.gt(indexReturn);
    const criteria = [aboveLongAverages, midAboveSlow, slowRising, fastAboveBoth, aboveFast, offTheLow, nearTheHigh, beatsBenchmark];
    const passCount = aboveLongAverages.iff(1, 0).add(midAboveSlow.iff(1, 0)).add(slowRising.iff(1, 0)).add(fastAboveBoth.iff(1, 0)).add(aboveFast.iff(1, 0)).add(offTheLow.iff(1, 0)).add(nearTheHigh.iff(1, 0)).add(beatsBenchmark.iff(1, 0));
    const allPass = passCount.eq(8);
    plot(showAverages ? sma50 : na, { title: "SMA 50", color: fastColor, linewidth: 1 });
    plot(showAverages ? sma150 : na, { title: "SMA 150", color: midColor, linewidth: 1 });
    plot(showAverages ? sma200 : na, { title: "SMA 200", color: slowColor, linewidth: 2 });
    plot(passCount, { title: "Criteria passed", display: display.data_window, precision: 0 });
    bgcolor(bars.map((_bar, i) => shade && allPass.get(i) ? color.new(passColor, 88) : na));
    alertcondition(allPass.and(passCount.offset(1).lt(8)), {
      id: "template-passed",
      title: "Trend template passed",
      message: "All eight trend template criteria now pass"
    });
    alertcondition(passCount.lt(8).and(passCount.offset(1).eq(8)), {
      id: "template-lost",
      title: "Trend template lost",
      message: "The trend template no longer passes"
    });
    if (showTable && bars.length > 0) {
      const last = bars.length - 1;
      const at = (series) => series.get(last);
      const change = (a, b) => (a / b - 1) * 100;
      const signed = (v) => Number.isFinite(v) ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` : "\u2014";
      const benchName = benchmark.includes(":") ? benchmark.slice(benchmark.indexOf(":") + 1) : benchmark;
      const yearLabel = yearBars === 252 ? "52-week" : `${yearBars}-bar`;
      const rows = [
        ["Close above SMA 150 and 200", Math.min(change(at(close), at(sma150)), change(at(close), at(sma200)))],
        ["SMA 150 above SMA 200", change(at(sma150), at(sma200))],
        [`SMA 200 rising (${risingBars} bars)`, change(at(sma200), sma200.get(last - risingBars))],
        ["SMA 50 above SMA 150 and 200", Math.min(change(at(sma50), at(sma150)), change(at(sma50), at(sma200)))],
        ["Close above SMA 50", change(at(close), at(sma50))],
        [`At least ${aboveLowPct}% above ${yearLabel} low`, change(at(close), at(yearLow))],
        [`Within ${nearHighPct}% of ${yearLabel} high`, change(at(close), at(yearHigh))],
        [`Beats ${benchName} over ${yearBars === 252 ? "12 months" : `${yearBars} bars`}`, change(at(stockReturn), at(indexReturn))]
      ];
      const positions = {
        "Top right": position.top_right,
        "Top left": position.top_left,
        "Bottom right": position.bottom_right,
        "Bottom left": position.bottom_left
      };
      const panel = table.new(positions[place] ?? position.top_right, 3, rows.length + 1);
      const passed = at(passCount);
      table.cell(panel, 0, 0, "Trend template", { bold: true });
      table.cell(panel, 1, 0, `${passed} / 8`, {
        bold: true,
        mono: true,
        textColor: passed === 8 ? passColor : passed >= 6 ? "#f59e0b" : failColor
      });
      table.cell(panel, 2, 0, "");
      rows.forEach(([text, detail], k) => {
        const known = Number.isFinite(detail);
        const ok = criteria[k].get(last);
        table.cell(panel, 0, k + 1, known ? ok ? "\u2713" : "\u2717" : "\u2014", {
          bold: true,
          textColor: known ? ok ? passColor : failColor : "#787b86"
        });
        table.cell(panel, 1, k + 1, text);
        table.cell(panel, 2, k + 1, signed(detail), { mono: true, textColor: known ? void 0 : "#787b86" });
      });
    }
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/eda335c8fd6a44fb","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":53,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":54,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":55,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":3,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":56,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":4,"kind":"bgcolor","kindOrdinal":0,"source":{"file":"indicator.ts","line":57,"column":1},"valueType":"color","qualifiers":{"colors":"series","target":"const"}}],"drawingContract":"g-script-v2","alertConditions":[{"id":"template-passed","title":"Trend template passed","message":"All eight trend template criteria now pass"},{"id":"template-lost","title":"Trend template lost","message":"The trend template no longer passes"}]});
