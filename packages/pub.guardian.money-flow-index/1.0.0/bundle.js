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
    indicator("Money Flow Index", { overlay: false, precision: 2 });
    const length = input.int(14, "Length", { id: "length", min: 1, max: 2e3 });
    const overboughtAt = input.int(80, "Overbought level", { id: "overbought", min: 50, max: 100 });
    const oversoldAt = input.int(20, "Oversold level", { id: "oversold", min: 0, max: 50 });
    const lineColor = input.color("#a78bfa", "MFI line", { id: "line-color" });
    const overboughtColor = input.color("#ef5350", "Overbought colour", { id: "overbought-color" });
    const oversoldColor = input.color("#26a69a", "Oversold colour", { id: "oversold-color" });
    const mfi = ta.mfi(hlc3, length);
    const overbought = mfi.gte(overboughtAt);
    const oversold = mfi.lte(oversoldAt);
    plot(mfi, {
      title: "MFI",
      linewidth: 2,
      color: bars.map((_bar, i) => {
        if (overbought.get(i)) return overboughtColor;
        if (oversold.get(i)) return oversoldColor;
        return lineColor;
      })
    });
    const guide = "#787b86";
    const upper = hline(overboughtAt, { title: "Overbought", color: guide, style: "dashed" });
    hline(50, { title: "Middle", color: color.new(guide, 50), style: "dotted" });
    const lower = hline(oversoldAt, { title: "Oversold", color: guide, style: "dashed" });
    fill(upper, lower, { color: color.new(lineColor, 90) });
    const ready = mfi.eq(mfi);
    const zone = ready.iff(overbought.iff(1, oversold.iff(-1, 0)), na);
    plot(zone, { title: "Zone", display: display.data_window });
    alertcondition(ta.crossunder(mfi, overboughtAt), {
      id: "left-overbought",
      title: "MFI left overbought",
      message: "Money Flow Index fell back out of the overbought zone"
    });
    alertcondition(ta.crossover(mfi, oversoldAt), {
      id: "left-oversold",
      title: "MFI left oversold",
      message: "Money Flow Index rose back out of the oversold zone"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/263a5aa6b7d3da48","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":16,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":27,"column":15},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":2,"kind":"hline","kindOrdinal":1,"source":{"file":"indicator.ts","line":28,"column":1},"valueType":"number","qualifiers":{"value":"const","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":3,"kind":"hline","kindOrdinal":2,"source":{"file":"indicator.ts","line":29,"column":15},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":4,"kind":"fill","kindOrdinal":0,"source":{"file":"indicator.ts","line":30,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[1,3],"edgeKind":"hline"},{"slot":5,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":36,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"left-overbought","title":"MFI left overbought","message":"Money Flow Index fell back out of the overbought zone"},{"id":"left-oversold","title":"MFI left oversold","message":"Money Flow Index rose back out of the oversold zone"}]});
