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
    indicator("Aroon", { overlay: false, precision: 2 });
    const length = input.int(14, "Length", { id: "length", min: 1, max: 500 });
    const showOscillator = input.bool(false, "Show oscillator", { id: "oscillator" });
    const strongTrendLevel = input.int(70, "Strong trend level", { id: "strong-trend-level", min: 0, max: 100 });
    const weakTrendLevel = input.int(30, "Weak trend level", { id: "weak-trend-level", min: 0, max: 100 });
    const upColor = input.color("#26a69a", "Aroon Up", { id: "up-color" });
    const downColor = input.color("#ef5350", "Aroon Down", { id: "down-color" });
    const guide = "#787b86";
    const barsSinceHigh = ta.highestbars(high, length + 1);
    const barsSinceLow = ta.lowestbars(low, length + 1);
    const up = barsSinceHigh.mul(-1).add(length).mul(100 / length);
    const down = barsSinceLow.mul(-1).add(length).mul(100 / length);
    const oscillator = up.sub(down);
    plot(showOscillator ? oscillator : na, {
      title: "Aroon Oscillator",
      style: plot.style_columns,
      color: bars.map((_bar, i) => {
        const value = oscillator.get(i);
        if (value > 0) return color.new(upColor, 60);
        if (value < 0) return color.new(downColor, 60);
        return color.new(guide, 60);
      })
    });
    plot(up, { title: "Aroon Up", color: upColor, linewidth: 2 });
    plot(down, { title: "Aroon Down", color: downColor, linewidth: 2 });
    hline(strongTrendLevel, { title: "Strong trend level", color: guide, style: "dashed" });
    hline(weakTrendLevel, { title: "Weak trend level", color: guide, style: "dashed" });
    plot(barsSinceHigh, { title: "Bars since high", display: display.data_window, precision: 0 });
    plot(barsSinceLow, { title: "Bars since low", display: display.data_window, precision: 0 });
    alertcondition(ta.crossover(up, down), {
      id: "bullish-cross",
      title: "Bullish cross",
      message: "Aroon Up crossed above Aroon Down"
    });
    alertcondition(ta.crossunder(up, down), {
      id: "bearish-cross",
      title: "Bearish cross",
      message: "Aroon Up crossed below Aroon Down"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/665749b9017aac74","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":20,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"columns","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":30,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":31,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":3,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":32,"column":1},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":4,"kind":"hline","kindOrdinal":1,"source":{"file":"indicator.ts","line":33,"column":1},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":5,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":34,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":6,"kind":"plot","kindOrdinal":4,"source":{"file":"indicator.ts","line":35,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"bullish-cross","title":"Bullish cross","message":"Aroon Up crossed above Aroon Down"},{"id":"bearish-cross","title":"Bearish cross","message":"Aroon Up crossed below Aroon Down"}]});
