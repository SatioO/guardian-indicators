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
    indicator("MA Extension", { overlay: false, precision: 2 });
    const maType = input.string("EMA", "Average type", { id: "ma-type", options: ["EMA", "SMA", "WMA"] });
    const length = input.int(21, "Average length", { id: "length", min: 1, max: 500 });
    const measure = input.string("Percent", "Measure", { id: "measure", options: ["Percent", "ATRs"] });
    const atrLength = input.int(14, "ATR length", { id: "atr-length", min: 1, max: 200 });
    const extendedPct = input.float(8, "Extended above (%)", { id: "extended-pct", min: 0, step: 0.5 });
    const stretchedPct = input.float(-8, "Stretched below (%)", { id: "stretched-pct", max: 0, step: 0.5 });
    const extendedAtr = input.float(3, "Extended above (ATRs)", { id: "extended-atr", min: 0, step: 0.25 });
    const stretchedAtr = input.float(-3, "Stretched below (ATRs)", { id: "stretched-atr", max: 0, step: 0.25 });
    const aboveColor = input.color("#26a69a", "Above the average", { id: "above-color" });
    const belowColor = input.color("#ef5350", "Below the average", { id: "below-color" });
    const extendedColor = input.color("#f59e0b", "Extended", { id: "extended-color" });
    const stretchedColor = input.color("#38bdf8", "Stretched", { id: "stretched-color" });
    const average = maType === "SMA" ? ta.sma(close, length) : maType === "WMA" ? ta.wma(close, length) : ta.ema(close, length);
    const distance = close.sub(average);
    const inPercent = distance.div(average).mul(100);
    const inAtrs = distance.div(ta.atr(atrLength));
    const byAtr = measure === "ATRs";
    const extension = byAtr ? inAtrs : inPercent;
    const extendedAt = byAtr ? extendedAtr : extendedPct;
    const stretchedAt = byAtr ? stretchedAtr : stretchedPct;
    const guides = "#787b86";
    hline(0, { title: "Zero", color: color.new(guides, 50), style: "solid" });
    hline(extendedAt, { title: "Extended level", color: color.new(extendedColor, 30), style: "dashed" });
    hline(stretchedAt, { title: "Stretched level", color: color.new(stretchedColor, 30), style: "dashed" });
    plot(extension, {
      title: "Extension",
      style: plot.style_columns,
      color: bars.map((_bar, i) => {
        const value = extension.get(i);
        if (value > extendedAt) return extendedColor;
        if (value < stretchedAt) return stretchedColor;
        return value >= 0 ? color.new(aboveColor, 45) : color.new(belowColor, 45);
      })
    });
    plot(average, { title: "Average", display: display.data_window, format: format.price });
    plot(inPercent, { title: "Extension (%)", display: display.data_window });
    plot(inAtrs, { title: "Extension (ATRs)", display: display.data_window });
    alertcondition(ta.crossover(extension, extendedAt), {
      id: "became-extended",
      title: "Became extended",
      message: "Price moved beyond the extended level above its average"
    });
    alertcondition(ta.crossunder(extension, stretchedAt), {
      id: "became-stretched",
      title: "Became stretched",
      message: "Price stretched beyond the stretched level below its average"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/dae92e8297419229","declarations":[{"slot":0,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":32,"column":1},"valueType":"number","qualifiers":{"value":"const","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":1,"kind":"hline","kindOrdinal":1,"source":{"file":"indicator.ts","line":33,"column":1},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"input","lineWidth":"const","lineStyle":"const"}},{"slot":2,"kind":"hline","kindOrdinal":2,"source":{"file":"indicator.ts","line":34,"column":1},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"input","lineWidth":"const","lineStyle":"const"}},{"slot":3,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":36,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"columns","histBase":0},{"slot":4,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":47,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":5,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":48,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":6,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":49,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"became-extended","title":"Became extended","message":"Price moved beyond the extended level above its average"},{"id":"became-stretched","title":"Became stretched","message":"Price stretched beyond the stretched level below its average"}]});
