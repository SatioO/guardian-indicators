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
    indicator("Parabolic SAR", { overlay: true });
    const start = input.float(0.02, "Start", { id: "start", min: 0, step: 0.01 });
    const increment = input.float(0.02, "Increment", { id: "increment", min: 0, step: 0.01 });
    const maximum = input.float(0.2, "Max value", { id: "maximum", min: 0, step: 0.01 });
    const flips = input.bool(false, "Show flip markers", { id: "flips" });
    const upColor = input.color("#26a69a", "Up trend", { id: "up-color" });
    const downColor = input.color("#ef5350", "Down trend", { id: "down-color" });
    const sar = ta.sar(start, increment, maximum);
    const isUp = sar.lt(close);
    const isDown = sar.gt(close);
    const flippedUp = isUp.and(isDown.offset(1));
    const flippedDown = isDown.and(isUp.offset(1));
    plotshape(isUp.iff(sar, na), {
      title: "Up-trend SAR",
      shape: shape.circle,
      location: location.absolute,
      color: upColor,
      size: size.tiny
    });
    plotshape(isDown.iff(sar, na), {
      title: "Down-trend SAR",
      shape: shape.circle,
      location: location.absolute,
      color: downColor,
      size: size.tiny
    });
    plotshape(flips ? flippedUp : false, {
      title: "Flip up",
      shape: shape.triangleup,
      location: location.belowbar,
      color: upColor,
      size: size.small
    });
    plotshape(flips ? flippedDown : false, {
      title: "Flip down",
      shape: shape.triangledown,
      location: location.abovebar,
      color: downColor,
      size: size.small
    });
    plot(sar, { title: "SAR", display: display.data_window });
    alertcondition(flippedUp, {
      id: "flip-up",
      title: "SAR flipped up",
      message: "Parabolic SAR flipped under price: the trend turned up"
    });
    alertcondition(flippedDown, {
      id: "flip-down",
      title: "SAR flipped down",
      message: "Parabolic SAR flipped over price: the trend turned down"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/c6a2d78b820ef1d8","declarations":[{"slot":0,"kind":"plotshape","kindOrdinal":0,"source":{"file":"indicator.ts","line":19,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":1,"kind":"plotshape","kindOrdinal":1,"source":{"file":"indicator.ts","line":26,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":2,"kind":"plotshape","kindOrdinal":2,"source":{"file":"indicator.ts","line":33,"column":1},"valueType":"boolean","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":3,"kind":"plotshape","kindOrdinal":3,"source":{"file":"indicator.ts","line":40,"column":1},"valueType":"boolean","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":4,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":47,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"flip-up","title":"SAR flipped up","message":"Parabolic SAR flipped under price: the trend turned up"},{"id":"flip-down","title":"SAR flipped down","message":"Parabolic SAR flipped over price: the trend turned down"}]});
