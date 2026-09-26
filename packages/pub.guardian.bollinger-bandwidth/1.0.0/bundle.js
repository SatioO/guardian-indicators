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
    indicator("Bollinger BandWidth", { overlay: false, precision: 2 });
    const length = input.int(20, "Length", { id: "length", min: 1, max: 500 });
    const source = input.source("close", "Source", { id: "source" });
    const mult = input.float(2, "StdDev", { id: "mult", min: 1e-3, max: 50, step: 0.1 });
    const expansionLength = input.int(125, "Highest expansion length", { id: "expansion-length", min: 1, max: 1e3 });
    const contractionLength = input.int(125, "Lowest contraction length", { id: "contraction-length", min: 1, max: 1e3 });
    const lineColor = input.color("#38bdf8", "BBW", { id: "line-color" });
    const expansionColor = input.color("#ef5350", "Highest expansion", { id: "expansion-color" });
    const contractionColor = input.color("#26a69a", "Lowest contraction", { id: "contraction-color" });
    const squeezeColor = input.color("#a78bfa", "Squeeze", { id: "squeeze-color" });
    const width = ta.bbw(source, length, mult);
    const highestExpansion = ta.highest(width, expansionLength);
    const lowestContraction = ta.lowest(width, contractionLength);
    const [basis, upper, lower] = ta.bb(source, length, mult);
    const squeeze = width.lte(lowestContraction);
    plot(highestExpansion, { title: "Highest expansion", color: color.new(expansionColor, 30) });
    plot(lowestContraction, { title: "Lowest contraction", color: color.new(contractionColor, 30) });
    plot(width, { title: "BBW", color: lineColor, linewidth: 2 });
    plot(basis, { title: "Basis (price)", display: display.data_window, format: format.price });
    plot(upper, { title: "Upper band (price)", display: display.data_window, format: format.price });
    plot(lower, { title: "Lower band (price)", display: display.data_window, format: format.price });
    plotshape(squeeze.iff(width, na), {
      title: "Squeeze",
      shape: shape.circle,
      location: location.absolute,
      color: squeezeColor,
      size: size.tiny
    });
    alertcondition(squeeze, {
      id: "squeeze",
      title: "Squeeze",
      message: "Bollinger BandWidth is at its lowest of the contraction length"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/e59c70de8b4417b5","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":25,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":26,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":27,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":3,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":28,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":4,"kind":"plot","kindOrdinal":4,"source":{"file":"indicator.ts","line":29,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":5,"kind":"plot","kindOrdinal":5,"source":{"file":"indicator.ts","line":30,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":6,"kind":"plotshape","kindOrdinal":0,"source":{"file":"indicator.ts","line":31,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}}],"alertConditions":[{"id":"squeeze","title":"Squeeze","message":"Bollinger BandWidth is at its lowest of the contraction length"}]});
