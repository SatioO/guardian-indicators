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
    indicator("Connors RSI", { overlay: false, precision: 2 });
    const rsiLength = input.int(3, "RSI length", { id: "rsi-length", min: 1, max: 100 });
    const streakLength = input.int(2, "Up/down length", { id: "streak-length", min: 1, max: 100 });
    const rankLength = input.int(100, "ROC length", { id: "rank-length", min: 1, max: 500 });
    const upperLevel = input.float(90, "Upper band", { id: "upper", min: 50, max: 100, step: 5 });
    const lowerLevel = input.float(10, "Lower band", { id: "lower", min: 0, max: 50, step: 5 });
    const lineColor = input.color("#38bdf8", "CRSI line", { id: "line-color" });
    const highColor = input.color("#26a69a", "Above the upper band", { id: "high-color" });
    const lowColor = input.color("#ef5350", "Below the lower band", { id: "low-color" });
    const streak = ta.scan(0, (prev, bar2, i) => {
      const before = i > 0 ? close.get(i - 1) : na;
      if (bar2.close === before) return 0;
      if (bar2.close > before) return prev <= 0 ? 1 : prev + 1;
      return prev >= 0 ? -1 : prev - 1;
    });
    const priceRsi = ta.rsi(close, rsiLength);
    const streakRsi = ta.rsi(streak, streakLength);
    const rank = ta.percentrank(ta.roc(close, 1), rankLength);
    const crsi = priceRsi.add(streakRsi).add(rank).div(3);
    const guide = "#787b86";
    const upper = hline(upperLevel, { title: "Upper band", color: guide, style: "dashed" });
    hline(50, { title: "Middle", color: color.new(guide, 50), style: "dotted" });
    const lower = hline(lowerLevel, { title: "Lower band", color: guide, style: "dashed" });
    fill(upper, lower, { color: color.new(lineColor, 90) });
    plot(crsi, {
      title: "CRSI",
      linewidth: 2,
      color: bars.map((_bar, i) => {
        const value = crsi.get(i);
        if (value > upperLevel) return highColor;
        if (value < lowerLevel) return lowColor;
        return lineColor;
      })
    });
    plot(priceRsi, { title: "Price RSI", display: display.data_window });
    plot(streakRsi, { title: "Streak RSI", display: display.data_window });
    plot(rank, { title: "Percent rank", display: display.data_window });
    plot(streak, { title: "Streak", display: display.data_window, precision: 0 });
    alertcondition(ta.crossover(crsi, upperLevel), {
      id: "crossed-above-upper",
      title: "Crossed above upper band",
      message: "Connors RSI crossed above its upper band"
    });
    alertcondition(ta.crossunder(crsi, lowerLevel), {
      id: "crossed-below-lower",
      title: "Crossed below lower band",
      message: "Connors RSI crossed below its lower band"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/e2489dda2f9ba4c9","declarations":[{"slot":0,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":30,"column":15},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":1,"kind":"hline","kindOrdinal":1,"source":{"file":"indicator.ts","line":31,"column":1},"valueType":"number","qualifiers":{"value":"const","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":2,"kind":"hline","kindOrdinal":2,"source":{"file":"indicator.ts","line":32,"column":15},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":3,"kind":"fill","kindOrdinal":0,"source":{"file":"indicator.ts","line":33,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[0,2],"edgeKind":"hline"},{"slot":4,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":35,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":5,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":45,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":6,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":46,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":7,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":47,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":8,"kind":"plot","kindOrdinal":4,"source":{"file":"indicator.ts","line":48,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"crossed-above-upper","title":"Crossed above upper band","message":"Connors RSI crossed above its upper band"},{"id":"crossed-below-lower","title":"Crossed below lower band","message":"Connors RSI crossed below its lower band"}]});
