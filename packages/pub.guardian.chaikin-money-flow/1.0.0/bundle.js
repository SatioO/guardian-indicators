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
    indicator("Chaikin Money Flow", { overlay: false, precision: 3 });
    const length = input.int(20, "Length", { id: "length", min: 1, max: 500 });
    const guide = input.float(0.2, "Guide level", { id: "guide", min: 0, max: 1, step: 0.01 });
    const buyColor = input.color("#26a69a", "Positive flow", { id: "buy-color" });
    const sellColor = input.color("#ef5350", "Negative flow", { id: "sell-color" });
    const range = high.sub(low);
    const moneyFlowVolume = range.gt(0).iff(close.sub(low).sub(high.sub(close)).div(range).mul(volume), 0);
    const cmf = math.sum(moneyFlowVolume, length).div(math.sum(volume, length));
    const muted = "#787b86";
    plot(cmf, {
      title: "CMF",
      style: plot.style_columns,
      color: bars.map((_bar, i) => {
        const value = cmf.get(i);
        if (value > 0) return value >= guide ? buyColor : color.new(buyColor, 60);
        if (value < 0) return value <= -guide ? sellColor : color.new(sellColor, 60);
        return muted;
      })
    });
    hline(0, { title: "Zero", color: muted, style: "dashed" });
    hline(guide, { title: "Buying pressure", color: color.new(buyColor, 50), style: "dotted" });
    hline(-guide, { title: "Selling pressure", color: color.new(sellColor, 50), style: "dotted" });
    alertcondition(ta.crossover(cmf, 0), {
      id: "cmf-cross-up",
      title: "CMF crossed above zero",
      message: "Chaikin Money Flow turned positive"
    });
    alertcondition(ta.crossunder(cmf, 0), {
      id: "cmf-cross-down",
      title: "CMF crossed below zero",
      message: "Chaikin Money Flow turned negative"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/4cb15ef5ad08aa37","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":17,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"columns","histBase":0},{"slot":1,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":27,"column":1},"valueType":"number","qualifiers":{"value":"const","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":2,"kind":"hline","kindOrdinal":1,"source":{"file":"indicator.ts","line":28,"column":1},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"input","lineWidth":"const","lineStyle":"const"}},{"slot":3,"kind":"hline","kindOrdinal":2,"source":{"file":"indicator.ts","line":29,"column":1},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"input","lineWidth":"const","lineStyle":"const"}}],"alertConditions":[{"id":"cmf-cross-up","title":"CMF crossed above zero","message":"Chaikin Money Flow turned positive"},{"id":"cmf-cross-down","title":"CMF crossed below zero","message":"Chaikin Money Flow turned negative"}]});
