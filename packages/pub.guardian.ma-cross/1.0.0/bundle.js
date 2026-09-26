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
    indicator("MA Cross", { overlay: true });
    const maType = input.string("SMA", "Type", { id: "type", options: ["SMA", "EMA", "WMA", "RMA"] });
    const fastLength = input.int(9, "Fast length", { id: "fast-length", min: 1, max: 500 });
    const slowLength = input.int(21, "Slow length", { id: "slow-length", min: 1, max: 500 });
    const shade = input.bool(true, "Shade between the averages", { id: "shade" });
    const signals = input.bool(true, "Show cross labels", { id: "signals" });
    const fastColor = input.color("#38bdf8", "Fast MA", { id: "fast-color" });
    const slowColor = input.color("#f59e0b", "Slow MA", { id: "slow-color" });
    const upColor = input.color("#26a69a", "Golden cross", { id: "up-color" });
    const downColor = input.color("#ef5350", "Death cross", { id: "down-color" });
    const fast = maType === "EMA" ? ta.ema(close, fastLength) : maType === "WMA" ? ta.wma(close, fastLength) : maType === "RMA" ? ta.rma(close, fastLength) : ta.sma(close, fastLength);
    const slow = maType === "EMA" ? ta.ema(close, slowLength) : maType === "WMA" ? ta.wma(close, slowLength) : maType === "RMA" ? ta.rma(close, slowLength) : ta.sma(close, slowLength);
    const golden = ta.crossover(fast, slow);
    const death = ta.crossunder(fast, slow);
    const fastPlot = plot(fast, { title: "Fast MA", color: fastColor, linewidth: 2 });
    plot(slow, { title: "Slow MA", color: slowColor, linewidth: 2 });
    const bullEdge = plot(fast.gt(slow).iff(slow, na), { title: "Bullish shade edge", display: display.none });
    const bearEdge = plot(fast.lt(slow).iff(slow, na), { title: "Bearish shade edge", display: display.none });
    const shadeTransparency = shade ? 85 : 100;
    fill(fastPlot, bullEdge, { color: color.new(upColor, shadeTransparency) });
    fill(fastPlot, bearEdge, { color: color.new(downColor, shadeTransparency) });
    plot(fast.div(slow).sub(1).mul(100), { title: "Gap %", display: display.data_window, format: format.percent });
    plotshape(signals ? golden : false, {
      title: "Golden cross",
      shape: shape.labelup,
      location: location.belowbar,
      color: upColor,
      text: "Golden",
      textcolor: color.white,
      size: size.small
    });
    plotshape(signals ? death : false, {
      title: "Death cross",
      shape: shape.labeldown,
      location: location.abovebar,
      color: downColor,
      text: "Death",
      textcolor: color.white,
      size: size.small
    });
    alertcondition(golden, {
      id: "golden-cross",
      title: "Golden cross",
      message: "The fast average crossed above the slow average"
    });
    alertcondition(death, {
      id: "death-cross",
      title: "Death cross",
      message: "The fast average crossed below the slow average"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/e67a794221c8b4f6","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":28,"column":18},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":29,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":33,"column":18},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":3,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":34,"column":18},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":4,"kind":"fill","kindOrdinal":0,"source":{"file":"indicator.ts","line":36,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[0,2],"edgeKind":"line"},{"slot":5,"kind":"fill","kindOrdinal":1,"source":{"file":"indicator.ts","line":37,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[0,3],"edgeKind":"line"},{"slot":6,"kind":"plot","kindOrdinal":4,"source":{"file":"indicator.ts","line":39,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":7,"kind":"plotshape","kindOrdinal":0,"source":{"file":"indicator.ts","line":41,"column":1},"valueType":"boolean","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":8,"kind":"plotshape","kindOrdinal":1,"source":{"file":"indicator.ts","line":50,"column":1},"valueType":"boolean","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}}],"alertConditions":[{"id":"golden-cross","title":"Golden cross","message":"The fast average crossed above the slow average"},{"id":"death-cross","title":"Death cross","message":"The fast average crossed below the slow average"}]});
