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
    indicator("Stochastic RSI", { overlay: false, precision: 2 });
    const smoothK = input.int(3, "K", { id: "k", min: 1, max: 50 });
    const smoothD = input.int(3, "D", { id: "d", min: 1, max: 50 });
    const rsiLength = input.int(14, "RSI length", { id: "rsi-length", min: 1, max: 200 });
    const stochLength = input.int(14, "Stochastic length", { id: "stoch-length", min: 1, max: 200 });
    const src = input.source("close", "RSI source", { id: "source" });
    const upperLevel = input.float(80, "Upper band", { id: "upper", min: 50, max: 100, step: 5 });
    const lowerLevel = input.float(20, "Lower band", { id: "lower", min: 0, max: 50, step: 5 });
    const markCrosses = input.bool(true, "Mark crosses in the zones", { id: "mark-crosses" });
    const kColor = input.color("#38bdf8", "K line", { id: "k-color" });
    const dColor = input.color("#f59e0b", "D line", { id: "d-color" });
    const bullColor = input.color("#26a69a", "Bullish cross", { id: "bull-color" });
    const bearColor = input.color("#ef5350", "Bearish cross", { id: "bear-color" });
    const rsiValue = ta.rsi(src, rsiLength);
    const k = ta.sma(ta.stoch(rsiValue, rsiValue, rsiValue, stochLength), smoothK);
    const d = ta.sma(k, smoothD);
    const bullishCross = ta.crossover(k, d).and(d.lte(lowerLevel));
    const bearishCross = ta.crossunder(k, d).and(d.gte(upperLevel));
    const guide = "#787b86";
    const upper = hline(upperLevel, { title: "Upper band", color: guide, style: "dashed" });
    hline(50, { title: "Middle", color: color.new(guide, 50), style: "dotted" });
    const lower = hline(lowerLevel, { title: "Lower band", color: guide, style: "dashed" });
    fill(upper, lower, { color: color.new(kColor, 90) });
    plot(k, { title: "K", color: kColor, linewidth: 2 });
    plot(d, { title: "D", color: dColor, linewidth: 1 });
    plot(rsiValue, { title: "RSI", display: display.data_window });
    plotshape(markCrosses ? bullishCross.iff(k, na) : na, {
      title: "Bullish cross in oversold",
      shape: shape.circle,
      location: location.absolute,
      color: bullColor,
      size: size.tiny
    });
    plotshape(markCrosses ? bearishCross.iff(k, na) : na, {
      title: "Bearish cross in overbought",
      shape: shape.circle,
      location: location.absolute,
      color: bearColor,
      size: size.tiny
    });
    alertcondition(bullishCross, {
      id: "bullish-cross-oversold",
      title: "Bullish cross in oversold",
      message: "Stochastic RSI K crossed above D in the oversold zone"
    });
    alertcondition(bearishCross, {
      id: "bearish-cross-overbought",
      title: "Bearish cross in overbought",
      message: "Stochastic RSI K crossed below D in the overbought zone"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/efcb91c33f0cd98a","declarations":[{"slot":0,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":28,"column":15},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":1,"kind":"hline","kindOrdinal":1,"source":{"file":"indicator.ts","line":29,"column":1},"valueType":"number","qualifiers":{"value":"const","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":2,"kind":"hline","kindOrdinal":2,"source":{"file":"indicator.ts","line":30,"column":15},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":3,"kind":"fill","kindOrdinal":0,"source":{"file":"indicator.ts","line":31,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[0,2],"edgeKind":"hline"},{"slot":4,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":33,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":5,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":34,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":6,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":35,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":7,"kind":"plotshape","kindOrdinal":0,"source":{"file":"indicator.ts","line":37,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":8,"kind":"plotshape","kindOrdinal":1,"source":{"file":"indicator.ts","line":44,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}}],"alertConditions":[{"id":"bullish-cross-oversold","title":"Bullish cross in oversold","message":"Stochastic RSI K crossed above D in the oversold zone"},{"id":"bearish-cross-overbought","title":"Bearish cross in overbought","message":"Stochastic RSI K crossed below D in the overbought zone"}]});
