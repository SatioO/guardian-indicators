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
    indicator("True Strength Index", { overlay: false, precision: 2 });
    const longLength = input.int(25, "Long length", { id: "long-length", min: 1, max: 200 });
    const shortLength = input.int(13, "Short length", { id: "short-length", min: 1, max: 200 });
    const signalLength = input.int(13, "Signal length", { id: "signal-length", min: 1, max: 200 });
    const tsiColor = input.color("#38bdf8", "TSI line", { id: "tsi-color" });
    const signalColor = input.color("#f59e0b", "Signal line", { id: "signal-color" });
    const tsi = ta.tsi(close, shortLength, longLength);
    const signal = ta.ema(tsi, signalLength);
    hline(0, { title: "Zero", color: "#787b86", style: "dashed" });
    plot(tsi, { title: "TSI", color: tsiColor, linewidth: 2 });
    plot(signal, { title: "Signal", color: signalColor, linewidth: 1 });
    plot(tsi.sub(signal), { title: "TSI minus signal", display: display.data_window });
    alertcondition(ta.crossover(tsi, signal), {
      id: "crossed-above-signal",
      title: "Crossed above signal",
      message: "TSI crossed above its signal line"
    });
    alertcondition(ta.crossunder(tsi, signal), {
      id: "crossed-below-signal",
      title: "Crossed below signal",
      message: "TSI crossed below its signal line"
    });
    alertcondition(ta.crossover(tsi, 0), {
      id: "crossed-above-zero",
      title: "Crossed above zero",
      message: "TSI crossed above zero"
    });
    alertcondition(ta.crossunder(tsi, 0), {
      id: "crossed-below-zero",
      title: "Crossed below zero",
      message: "TSI crossed below zero"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/bb4643c8571a850c","declarations":[{"slot":0,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":16,"column":1},"valueType":"number","qualifiers":{"value":"const","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":1,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":17,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":18,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":3,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":19,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"crossed-above-signal","title":"Crossed above signal","message":"TSI crossed above its signal line"},{"id":"crossed-below-signal","title":"Crossed below signal","message":"TSI crossed below its signal line"},{"id":"crossed-above-zero","title":"Crossed above zero","message":"TSI crossed above zero"},{"id":"crossed-below-zero","title":"Crossed below zero","message":"TSI crossed below zero"}]});
