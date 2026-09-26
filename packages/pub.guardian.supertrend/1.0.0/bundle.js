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
    indicator("Supertrend", { overlay: true });
    const atrLength = input.int(10, "ATR length", { id: "atr-length", min: 1, max: 200 });
    const factor = input.float(3, "Factor", { id: "factor", min: 0.1, step: 0.1 });
    const signals = input.bool(true, "Show buy/sell signals", { id: "signals" });
    const shade = input.bool(true, "Shade the trend", { id: "shade" });
    const upColor = input.color("#26a69a", "Up trend", { id: "up-color" });
    const downColor = input.color("#ef5350", "Down trend", { id: "down-color" });
    const [trendLine, direction] = ta.supertrend(factor, atrLength);
    const isUp = direction.lt(0);
    const isDown = direction.gt(0);
    const turnedUp = isUp.and(direction.offset(1).gt(0));
    const turnedDown = isDown.and(direction.offset(1).lt(0));
    const upLine = isUp.iff(trendLine, na);
    const downLine = isDown.iff(trendLine, na);
    const middle = plot(hl2, { title: "Price middle", display: display.none });
    const up = plot(upLine, { title: "Up trend", color: upColor, linewidth: 2 });
    const down = plot(downLine, { title: "Down trend", color: downColor, linewidth: 2 });
    fill(middle, up, { color: shade ? color.new(upColor, 88) : na });
    fill(middle, down, { color: shade ? color.new(downColor, 88) : na });
    plotshape(signals ? turnedUp : false, {
      title: "Buy",
      shape: shape.labelup,
      location: location.belowbar,
      color: upColor,
      text: "Buy",
      textcolor: color.white,
      size: size.small
    });
    plotshape(signals ? turnedDown : false, {
      title: "Sell",
      shape: shape.labeldown,
      location: location.abovebar,
      color: downColor,
      text: "Sell",
      textcolor: color.white,
      size: size.small
    });
    plot(direction, { title: "Direction", display: display.data_window });
    const stopDistancePct = math.abs(close.sub(trendLine)).div(close).mul(100);
    plot(stopDistancePct, { title: "Stop distance %", display: display.data_window });
    alertcondition(turnedUp, {
      id: "trend-up",
      title: "Trend turned up",
      message: "Supertrend turned up"
    });
    alertcondition(turnedDown, {
      id: "trend-down",
      title: "Trend turned down",
      message: "Supertrend turned down"
    });
    alertcondition(turnedUp.or(turnedDown), {
      id: "trend-change",
      title: "Trend changed",
      message: "Supertrend changed direction"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/ecfa8c604bdfa119","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":22,"column":16},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":23,"column":12},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":24,"column":14},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":3,"kind":"fill","kindOrdinal":0,"source":{"file":"indicator.ts","line":25,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[0,1],"edgeKind":"line"},{"slot":4,"kind":"fill","kindOrdinal":1,"source":{"file":"indicator.ts","line":26,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[0,2],"edgeKind":"line"},{"slot":5,"kind":"plotshape","kindOrdinal":0,"source":{"file":"indicator.ts","line":28,"column":1},"valueType":"boolean","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":6,"kind":"plotshape","kindOrdinal":1,"source":{"file":"indicator.ts","line":37,"column":1},"valueType":"boolean","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":7,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":46,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":8,"kind":"plot","kindOrdinal":4,"source":{"file":"indicator.ts","line":49,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"trend-up","title":"Trend turned up","message":"Supertrend turned up"},{"id":"trend-down","title":"Trend turned down","message":"Supertrend turned down"},{"id":"trend-change","title":"Trend changed","message":"Supertrend changed direction"}]});
