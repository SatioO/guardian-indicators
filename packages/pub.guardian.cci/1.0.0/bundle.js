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
    indicator("CCI", { overlay: false, precision: 2 });
    const length = input.int(20, "Length", { id: "length", min: 1, max: 500 });
    const src = input.source("close", "Source", { id: "source" });
    const upperLevel = input.float(100, "Upper band", { id: "upper", min: 0, step: 10 });
    const lowerLevel = input.float(-100, "Lower band", { id: "lower", max: 0, step: 10 });
    const smoothing = input.string("None", "Smoothing", {
      id: "smoothing",
      options: ["None", "SMA", "EMA", "SMMA (RMA)", "WMA"]
    });
    const smoothingLength = input.int(14, "Smoothing length", { id: "smoothing-length", min: 1, max: 100 });
    const lineColor = input.color("#38bdf8", "CCI line", { id: "line-color" });
    const aboveColor = input.color("#26a69a", "Above the upper band", { id: "above-color" });
    const belowColor = input.color("#ef5350", "Below the lower band", { id: "below-color" });
    const smoothingColor = input.color("#f59e0b", "Smoothing line", { id: "smoothing-color" });
    const cci = ta.cci(src, length);
    const smoothed = smoothing === "SMA" ? ta.sma(cci, smoothingLength) : smoothing === "EMA" ? ta.ema(cci, smoothingLength) : smoothing === "SMMA (RMA)" ? ta.rma(cci, smoothingLength) : smoothing === "WMA" ? ta.wma(cci, smoothingLength) : na;
    const guide = "#787b86";
    const upper = hline(upperLevel, { title: "Upper band", color: guide, style: "dashed" });
    hline(0, { title: "Zero", color: color.new(guide, 50), style: "dotted" });
    const lower = hline(lowerLevel, { title: "Lower band", color: guide, style: "dashed" });
    fill(upper, lower, { color: color.new(lineColor, 90) });
    plot(cci, {
      title: "CCI",
      linewidth: 2,
      color: bars.map((_bar, i) => {
        const value = cci.get(i);
        if (value > upperLevel) return aboveColor;
        if (value < lowerLevel) return belowColor;
        return lineColor;
      })
    });
    plot(smoothed, { title: "CCI smoothing", color: smoothingColor });
    alertcondition(ta.crossover(cci, upperLevel), {
      id: "crossed-above-upper",
      title: "Crossed above upper band",
      message: "CCI crossed above its upper band"
    });
    alertcondition(ta.crossunder(cci, lowerLevel), {
      id: "crossed-below-lower",
      title: "Crossed below lower band",
      message: "CCI crossed below its lower band"
    });
    alertcondition(ta.crossover(cci, 0), {
      id: "crossed-above-zero",
      title: "Crossed above zero",
      message: "CCI crossed above zero"
    });
    alertcondition(ta.crossunder(cci, 0), {
      id: "crossed-below-zero",
      title: "Crossed below zero",
      message: "CCI crossed below zero"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/6177b53cbbb334d3","declarations":[{"slot":0,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":30,"column":15},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":1,"kind":"hline","kindOrdinal":1,"source":{"file":"indicator.ts","line":31,"column":1},"valueType":"number","qualifiers":{"value":"const","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":2,"kind":"hline","kindOrdinal":2,"source":{"file":"indicator.ts","line":32,"column":15},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":3,"kind":"fill","kindOrdinal":0,"source":{"file":"indicator.ts","line":33,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[0,2],"edgeKind":"hline"},{"slot":4,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":35,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":5,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":45,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"crossed-above-upper","title":"Crossed above upper band","message":"CCI crossed above its upper band"},{"id":"crossed-below-lower","title":"Crossed below lower band","message":"CCI crossed below its lower band"},{"id":"crossed-above-zero","title":"Crossed above zero","message":"CCI crossed above zero"},{"id":"crossed-below-zero","title":"Crossed below zero","message":"CCI crossed below zero"}]});
