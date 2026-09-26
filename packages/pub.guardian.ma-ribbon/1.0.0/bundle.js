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
    indicator("MA Ribbon", { overlay: true });
    const maType = input.string("SMA", "Type", { id: "type", options: ["SMA", "EMA"] });
    const fastLength = input.int(20, "Fast length", { id: "fast-length", min: 1, max: 500 });
    const mediumLength = input.int(50, "Medium length", { id: "medium-length", min: 1, max: 500 });
    const slowLength = input.int(100, "Slow length", { id: "slow-length", min: 1, max: 500 });
    const longLength = input.int(200, "Long length", { id: "long-length", min: 1, max: 1e3 });
    const fastColor = input.color("#38bdf8", "Fast MA", { id: "fast-color" });
    const mediumColor = input.color("#a78bfa", "Medium MA", { id: "medium-color" });
    const slowColor = input.color("#f59e0b", "Slow MA", { id: "slow-color" });
    const longColor = input.color("#787b86", "Long MA", { id: "long-color" });
    const shade = input.bool(true, "Shade stacked ribbon", { id: "shade" });
    const bullColor = input.color("#26a69a", "Bullish stack", { id: "bull-color" });
    const bearColor = input.color("#ef5350", "Bearish stack", { id: "bear-color" });
    const exponential = maType === "EMA";
    const fast = exponential ? ta.ema(close, fastLength) : ta.sma(close, fastLength);
    const medium = exponential ? ta.ema(close, mediumLength) : ta.sma(close, mediumLength);
    const slow = exponential ? ta.ema(close, slowLength) : ta.sma(close, slowLength);
    const long = exponential ? ta.ema(close, longLength) : ta.sma(close, longLength);
    const bullish = fast.gt(medium).and(medium.gt(slow)).and(slow.gt(long));
    const bearish = fast.lt(medium).and(medium.lt(slow)).and(slow.lt(long));
    const fastPlot = plot(fast, { title: "Fast MA", color: fastColor });
    plot(medium, { title: "Medium MA", color: mediumColor });
    plot(slow, { title: "Slow MA", color: slowColor });
    plot(long, { title: "Long MA", color: longColor, linewidth: 2 });
    const bullEdge = plot(bullish.iff(long, na), { title: "Bullish stack edge", display: display.none });
    const bearEdge = plot(bearish.iff(long, na), { title: "Bearish stack edge", display: display.none });
    const shadeTransparency = shade ? 85 : 100;
    fill(fastPlot, bullEdge, { color: color.new(bullColor, shadeTransparency) });
    fill(fastPlot, bearEdge, { color: color.new(bearColor, shadeTransparency) });
    const ready = fast.eq(fast).and(medium.eq(medium)).and(slow.eq(slow)).and(long.eq(long));
    plot(ready.iff(bullish.iff(1, bearish.iff(-1, 0)), na), { title: "Stack", display: display.data_window });
    const bullFormed = bullish.and(bullish.offset(1).not());
    const bearFormed = bearish.and(bearish.offset(1).not());
    const bullLost = bullish.not().and(bullish.offset(1));
    const bearLost = bearish.not().and(bearish.offset(1));
    alertcondition(bullFormed, {
      id: "bullish-stack",
      title: "Bullish stack formed",
      message: "The averages stacked bullishly: fast above medium above slow above long"
    });
    alertcondition(bearFormed, {
      id: "bearish-stack",
      title: "Bearish stack formed",
      message: "The averages stacked bearishly: fast below medium below slow below long"
    });
    alertcondition(bullLost, {
      id: "bullish-stack-lost",
      title: "Bullish stack lost",
      message: "The bullish stack broke: the averages are no longer stacked fast above medium above slow above long"
    });
    alertcondition(bearLost, {
      id: "bearish-stack-lost",
      title: "Bearish stack lost",
      message: "The bearish stack broke: the averages are no longer stacked fast below medium below slow below long"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/996da3842d734a88","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":26,"column":18},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":27,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":28,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":3,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":29,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":4,"kind":"plot","kindOrdinal":4,"source":{"file":"indicator.ts","line":33,"column":18},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":5,"kind":"plot","kindOrdinal":5,"source":{"file":"indicator.ts","line":34,"column":18},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":6,"kind":"fill","kindOrdinal":0,"source":{"file":"indicator.ts","line":36,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[0,4],"edgeKind":"line"},{"slot":7,"kind":"fill","kindOrdinal":1,"source":{"file":"indicator.ts","line":37,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[0,5],"edgeKind":"line"},{"slot":8,"kind":"plot","kindOrdinal":6,"source":{"file":"indicator.ts","line":42,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"bullish-stack","title":"Bullish stack formed","message":"The averages stacked bullishly: fast above medium above slow above long"},{"id":"bearish-stack","title":"Bearish stack formed","message":"The averages stacked bearishly: fast below medium below slow below long"},{"id":"bullish-stack-lost","title":"Bullish stack lost","message":"The bullish stack broke: the averages are no longer stacked fast above medium above slow above long"},{"id":"bearish-stack-lost","title":"Bearish stack lost","message":"The bearish stack broke: the averages are no longer stacked fast below medium below slow below long"}]});
