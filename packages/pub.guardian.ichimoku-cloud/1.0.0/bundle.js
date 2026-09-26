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
    indicator("Ichimoku Cloud", { overlay: true });
    const conversionLength = input.int(9, "Conversion line length", { id: "conversion-length", min: 1, max: 500 });
    const baseLength = input.int(26, "Base line length", { id: "base-length", min: 1, max: 500 });
    const spanBLength = input.int(52, "Leading span B length", { id: "span-b-length", min: 1, max: 500 });
    const displacement = input.int(26, "Displacement", { id: "displacement", min: 1, max: 500 });
    const conversionColor = input.color("#38bdf8", "Conversion line", { id: "conversion-color" });
    const baseColor = input.color("#f59e0b", "Base line", { id: "base-color" });
    const laggingColor = input.color("#a78bfa", "Lagging span", { id: "lagging-color" });
    const bullColor = input.color("#26a69a", "Bullish cloud", { id: "bull-color" });
    const bearColor = input.color("#ef5350", "Bearish cloud", { id: "bear-color" });
    const conversion = ta.highest(high, conversionLength).add(ta.lowest(low, conversionLength)).div(2);
    const base = ta.highest(high, baseLength).add(ta.lowest(low, baseLength)).div(2);
    const leadA = conversion.add(base).div(2);
    const leadB = ta.highest(high, spanBLength).add(ta.lowest(low, spanBLength)).div(2);
    const ahead = displacement - 1;
    plot(conversion, { title: "Conversion line", color: conversionColor });
    plot(base, { title: "Base line", color: baseColor });
    plot(close, { title: "Lagging span", color: laggingColor, offset: -ahead });
    const spanA = plot(leadA, { title: "Leading span A", color: color.new(bullColor, 40), offset: ahead });
    plot(leadB, { title: "Leading span B", color: color.new(bearColor, 40), offset: ahead });
    const bullEdge = plot(leadA.gt(leadB).iff(leadB, na), {
      title: "Bullish cloud edge",
      offset: ahead,
      display: display.none
    });
    const bearEdge = plot(leadA.lt(leadB).iff(leadB, na), {
      title: "Bearish cloud edge",
      offset: ahead,
      display: display.none
    });
    fill(spanA, bullEdge, { color: color.new(bullColor, 90) });
    fill(spanA, bearEdge, { color: color.new(bearColor, 90) });
    const cloudA = leadA.offset(ahead);
    const cloudB = leadB.offset(ahead);
    const cloudTop = cloudA.gt(cloudB).iff(cloudA, cloudB);
    const cloudBottom = cloudA.lt(cloudB).iff(cloudA, cloudB);
    alertcondition(ta.crossover(close, cloudTop), {
      id: "above-cloud",
      title: "Close crossed above the cloud",
      message: "The close crossed above the Ichimoku cloud"
    });
    alertcondition(ta.crossunder(close, cloudBottom), {
      id: "below-cloud",
      title: "Close crossed below the cloud",
      message: "The close crossed below the Ichimoku cloud"
    });
    alertcondition(ta.crossover(conversion, base), {
      id: "tk-cross-up",
      title: "Conversion crossed above base",
      message: "The Ichimoku conversion line crossed above the base line"
    });
    alertcondition(ta.crossunder(conversion, base), {
      id: "tk-cross-down",
      title: "Conversion crossed below base",
      message: "The Ichimoku conversion line crossed below the base line"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/4e74ca005ad6c170","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":24,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":25,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":26,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"input","forceOverlay":"const"},"style":"line","histBase":0},{"slot":3,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":27,"column":15},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"input","forceOverlay":"const"},"style":"line","histBase":0},{"slot":4,"kind":"plot","kindOrdinal":4,"source":{"file":"indicator.ts","line":28,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"input","forceOverlay":"const"},"style":"line","histBase":0},{"slot":5,"kind":"plot","kindOrdinal":5,"source":{"file":"indicator.ts","line":32,"column":18},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"input","forceOverlay":"const"},"style":"line","histBase":0},{"slot":6,"kind":"plot","kindOrdinal":6,"source":{"file":"indicator.ts","line":37,"column":18},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"input","forceOverlay":"const"},"style":"line","histBase":0},{"slot":7,"kind":"fill","kindOrdinal":0,"source":{"file":"indicator.ts","line":42,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[3,5],"edgeKind":"line"},{"slot":8,"kind":"fill","kindOrdinal":1,"source":{"file":"indicator.ts","line":43,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[3,6],"edgeKind":"line"}],"alertConditions":[{"id":"above-cloud","title":"Close crossed above the cloud","message":"The close crossed above the Ichimoku cloud"},{"id":"below-cloud","title":"Close crossed below the cloud","message":"The close crossed below the Ichimoku cloud"},{"id":"tk-cross-up","title":"Conversion crossed above base","message":"The Ichimoku conversion line crossed above the base line"},{"id":"tk-cross-down","title":"Conversion crossed below base","message":"The Ichimoku conversion line crossed below the base line"}]});
