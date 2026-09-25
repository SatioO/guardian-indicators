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
    indicator("Historical Volatility", { overlay: false, precision: 2 });
    const length = input.int(10, "Length", { id: "length", min: 2, max: 500 });
    const daysPerYear = input.int(252, "Days per year", { id: "days-per-year", min: 1, max: 366 });
    const rankLookback = input.int(252, "Rank lookback (bars)", { id: "rank-lookback", min: 2, max: 1e3 });
    const lowRank = input.float(10, "Low rank at or below", { id: "low-rank", min: 0, max: 100, step: 5 });
    const highRank = input.float(90, "High rank at or above", { id: "high-rank", min: 0, max: 100, step: 5 });
    const lineColor = input.color("#38bdf8", "HV", { id: "line-color" });
    const lowColor = input.color("#a78bfa", "HV at a low rank", { id: "low-color" });
    const highColor = input.color("#f59e0b", "HV at a high rank", { id: "high-color" });
    const returns = math.log(close.div(close.offset(1)));
    const hv = ta.stdev(returns, length).mul(100 * math.sqrt(daysPerYear));
    const rank = ta.percentrank(hv, rankLookback);
    const atLow = rank.lte(lowRank);
    const atHigh = rank.gte(highRank);
    plot(hv, {
      title: "HV",
      linewidth: 2,
      color: bars.map((_bar, i) => {
        if (atLow.get(i)) return lowColor;
        if (atHigh.get(i)) return highColor;
        return lineColor;
      })
    });
    plot(rank, { title: "HV rank", display: display.data_window, precision: 0 });
    alertcondition(atLow.and(rank.offset(1).gt(lowRank)), {
      id: "hv-yearly-low",
      title: "Volatility at a yearly low",
      message: "Historical volatility dropped into the bottom of its one-year range"
    });
    alertcondition(atHigh.and(rank.offset(1).lt(highRank)), {
      id: "hv-yearly-high",
      title: "Volatility at a yearly high",
      message: "Historical volatility rose into the top of its one-year range"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/4b96e7b7455f9b60","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":22,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":31,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"hv-yearly-low","title":"Volatility at a yearly low","message":"Historical volatility dropped into the bottom of its one-year range"},{"id":"hv-yearly-high","title":"Volatility at a yearly high","message":"Historical volatility rose into the top of its one-year range"}]});
