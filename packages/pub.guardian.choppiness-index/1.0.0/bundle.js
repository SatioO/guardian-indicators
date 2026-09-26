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
    indicator("Choppiness Index", { overlay: false, precision: 2 });
    const length = input.int(14, "Length", { id: "length", min: 2, max: 500 });
    const choppyAbove = input.float(61.8, "Choppy above", { id: "choppy-above", min: 50, max: 100, step: 0.1 });
    const trendingBelow = input.float(38.2, "Trending below", { id: "trending-below", min: 0, max: 50, step: 0.1 });
    const lineColor = input.color("#38bdf8", "CHOP", { id: "line-color" });
    const choppyColor = input.color("#f59e0b", "Choppy", { id: "choppy-color" });
    const trendingColor = input.color("#a78bfa", "Trending", { id: "trending-color" });
    const zoneColor = input.color("#38bdf8", "Band zone", { id: "zone-color" });
    const pathTravelled = math.sum(ta.atr(1), length);
    const range = ta.highest(high, length).sub(ta.lowest(low, length));
    const chop = math.log10(pathTravelled.div(range)).mul(100 / math.log10(length));
    const choppy = chop.gt(choppyAbove);
    const trending = chop.lt(trendingBelow);
    const guide = "#787b86";
    const upper = hline(choppyAbove, { title: "Choppy above", color: guide, style: "dashed" });
    hline(50, { title: "Middle band", color: color.new(guide, 50), style: "dotted" });
    const lower = hline(trendingBelow, { title: "Trending below", color: guide, style: "dashed" });
    fill(upper, lower, { color: color.new(zoneColor, 90) });
    plot(chop, {
      title: "CHOP",
      linewidth: 2,
      color: bars.map((_bar, i) => {
        if (choppy.get(i)) return choppyColor;
        if (trending.get(i)) return trendingColor;
        return lineColor;
      })
    });
    alertcondition(ta.crossunder(chop, trendingBelow), {
      id: "trend-started",
      title: "Trend started",
      message: "The Choppiness Index dropped below the trending band"
    });
    alertcondition(ta.crossover(chop, choppyAbove), {
      id: "turned-choppy",
      title: "Market turned choppy",
      message: "The Choppiness Index rose above the choppy band"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/7dcb2dee34367e38","declarations":[{"slot":0,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":25,"column":15},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":1,"kind":"hline","kindOrdinal":1,"source":{"file":"indicator.ts","line":26,"column":1},"valueType":"number","qualifiers":{"value":"const","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":2,"kind":"hline","kindOrdinal":2,"source":{"file":"indicator.ts","line":27,"column":15},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":3,"kind":"fill","kindOrdinal":0,"source":{"file":"indicator.ts","line":28,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[0,2],"edgeKind":"hline"},{"slot":4,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":30,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"trend-started","title":"Trend started","message":"The Choppiness Index dropped below the trending band"},{"id":"turned-choppy","title":"Market turned choppy","message":"The Choppiness Index rose above the choppy band"}]});
