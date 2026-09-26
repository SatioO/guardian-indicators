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
    indicator("Donchian Channels", { overlay: true });
    const length = input.int(20, "Length", { id: "length", min: 1, max: 500 });
    const shift = input.int(0, "Offset", { id: "offset", min: -500, max: 500 });
    const signals = input.bool(true, "Show breakout markers", { id: "signals" });
    const bandColor = input.color("#38bdf8", "Bands", { id: "band-color" });
    const basisColor = input.color("#f59e0b", "Basis", { id: "basis-color" });
    const upColor = input.color("#26a69a", "Breakout", { id: "up-color" });
    const downColor = input.color("#ef5350", "Breakdown", { id: "down-color" });
    const upper = ta.highest(high, length);
    const lower = ta.lowest(low, length);
    const basis = upper.add(lower).div(2);
    const breakout = ta.crossover(close, upper.offset(1));
    const breakdown = ta.crossunder(close, lower.offset(1));
    const upperPlot = plot(upper, { title: "Upper band", color: bandColor, offset: shift });
    plot(basis, { title: "Basis", color: basisColor, offset: shift });
    const lowerPlot = plot(lower, { title: "Lower band", color: bandColor, offset: shift });
    fill(upperPlot, lowerPlot, { color: color.new(bandColor, 90) });
    plotshape(signals ? breakout : false, {
      title: "Breakout",
      shape: shape.triangleup,
      location: location.belowbar,
      color: upColor,
      size: size.small
    });
    plotshape(signals ? breakdown : false, {
      title: "Breakdown",
      shape: shape.triangledown,
      location: location.abovebar,
      color: downColor,
      size: size.small
    });
    alertcondition(breakout, {
      id: "breakout",
      title: "Breakout",
      message: "The close broke above the previous Donchian upper band"
    });
    alertcondition(breakdown, {
      id: "breakdown",
      title: "Breakdown",
      message: "The close broke below the previous Donchian lower band"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/e83217e44c1732be","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":22,"column":19},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"input","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":23,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"input","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":24,"column":19},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"input","forceOverlay":"const"},"style":"line","histBase":0},{"slot":3,"kind":"fill","kindOrdinal":0,"source":{"file":"indicator.ts","line":25,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[0,2],"edgeKind":"line"},{"slot":4,"kind":"plotshape","kindOrdinal":0,"source":{"file":"indicator.ts","line":27,"column":1},"valueType":"boolean","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":5,"kind":"plotshape","kindOrdinal":1,"source":{"file":"indicator.ts","line":34,"column":1},"valueType":"boolean","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}}],"alertConditions":[{"id":"breakout","title":"Breakout","message":"The close broke above the previous Donchian upper band"},{"id":"breakdown","title":"Breakdown","message":"The close broke below the previous Donchian lower band"}]});
