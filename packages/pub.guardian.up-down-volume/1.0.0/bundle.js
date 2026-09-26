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
    indicator("Up/Down Volume Ratio", { overlay: false, precision: 2 });
    const length = input.int(50, "Length", { id: "length", min: 1, max: 500 });
    const accumulationAt = input.float(1.5, "Accumulation at or above", { id: "accumulation-at", min: 0, step: 0.1 });
    const distributionAt = input.float(0.7, "Distribution at or below", { id: "distribution-at", min: 0, step: 0.1 });
    const accumulationColor = input.color("#26a69a", "Accumulation", { id: "accumulation-color" });
    const distributionColor = input.color("#ef5350", "Distribution", { id: "distribution-color" });
    const lineColor = input.color("#38bdf8", "Ratio line", { id: "line-color" });
    const move = ta.change(close);
    const upVolume = move.gt(0).iff(volume, 0);
    const downVolume = move.lt(0).iff(volume, 0);
    const ratio = math.sum(upVolume, length).div(math.sum(downVolume, length));
    const accumulation = ratio.gte(accumulationAt);
    const distribution = ratio.lte(distributionAt);
    const intoAccumulation = accumulation.and(ratio.offset(1).lt(accumulationAt));
    const intoDistribution = distribution.and(ratio.offset(1).gt(distributionAt));
    plot(ratio, {
      title: "U/D ratio",
      linewidth: 2,
      color: bars.map((_bar, i) => {
        if (accumulation.get(i)) return accumulationColor;
        if (distribution.get(i)) return distributionColor;
        return lineColor;
      })
    });
    const guide = "#787b86";
    hline(1, { title: "Balanced", color: guide, style: "dashed" });
    hline(accumulationAt, { title: "Accumulation level", color: color.new(accumulationColor, 40), style: "dotted" });
    hline(distributionAt, { title: "Distribution level", color: color.new(distributionColor, 40), style: "dotted" });
    plot(math.sum(upVolume, length), { title: "Up volume", display: display.data_window, format: format.volume });
    plot(math.sum(downVolume, length), { title: "Down volume", display: display.data_window, format: format.volume });
    alertcondition(intoAccumulation, {
      id: "entered-accumulation",
      title: "Entered accumulation",
      message: "The up/down volume ratio rose into accumulation"
    });
    alertcondition(intoDistribution, {
      id: "entered-distribution",
      title: "Entered distribution",
      message: "The up/down volume ratio fell into distribution"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/1c532aa83f9a41ad","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":23,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":33,"column":1},"valueType":"number","qualifiers":{"value":"const","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":2,"kind":"hline","kindOrdinal":1,"source":{"file":"indicator.ts","line":34,"column":1},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"input","lineWidth":"const","lineStyle":"const"}},{"slot":3,"kind":"hline","kindOrdinal":2,"source":{"file":"indicator.ts","line":35,"column":1},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"input","lineWidth":"const","lineStyle":"const"}},{"slot":4,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":39,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":5,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":40,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"entered-accumulation","title":"Entered accumulation","message":"The up/down volume ratio rose into accumulation"},{"id":"entered-distribution","title":"Entered distribution","message":"The up/down volume ratio fell into distribution"}]});
