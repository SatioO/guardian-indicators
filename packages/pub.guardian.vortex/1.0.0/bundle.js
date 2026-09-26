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
    indicator("Vortex Indicator", { overlay: false, precision: 2 });
    const length = input.int(14, "Length", { id: "length", min: 2, max: 500 });
    const shade = input.bool(true, "Shade the leader", { id: "shade" });
    const marks = input.bool(true, "Mark crosses", { id: "marks" });
    const plusColor = input.color("#26a69a", "VI+", { id: "plus-color" });
    const minusColor = input.color("#ef5350", "VI\u2212", { id: "minus-color" });
    const trSum = math.sum(ta.tr(true), length);
    const viPlus = math.sum(math.abs(high.sub(low.offset(1))), length).div(trSum);
    const viMinus = math.sum(math.abs(low.sub(high.offset(1))), length).div(trSum);
    const plusLeads = viPlus.gte(viMinus);
    const minusLeads = viPlus.lt(viMinus);
    const bullishCross = ta.crossover(viPlus, viMinus);
    const bearishCross = ta.crossunder(viPlus, viMinus);
    const minusLine = plot(viMinus, { title: "VI\u2212", color: minusColor, linewidth: 2 });
    plot(viPlus, { title: "VI+", color: plusColor, linewidth: 2 });
    const plusLeading = plot(plusLeads.iff(viPlus, na), { title: "VI+ leading", display: display.none });
    const minusLeading = plot(minusLeads.iff(viPlus, na), { title: "VI\u2212 leading", display: display.none });
    fill(plusLeading, minusLine, { color: shade ? color.new(plusColor, 88) : na });
    fill(minusLeading, minusLine, { color: shade ? color.new(minusColor, 88) : na });
    hline(1, { title: "Level 1.0", color: "#787b86", style: "dashed" });
    plotshape(marks ? bullishCross.iff(viPlus, na) : na, {
      title: "Bullish cross mark",
      shape: shape.circle,
      location: location.absolute,
      color: plusColor,
      size: size.tiny
    });
    plotshape(marks ? bearishCross.iff(viPlus, na) : na, {
      title: "Bearish cross mark",
      shape: shape.circle,
      location: location.absolute,
      color: minusColor,
      size: size.tiny
    });
    plot(viPlus.sub(viMinus), { title: "VI spread", display: display.data_window });
    alertcondition(bullishCross, {
      id: "bullish-cross",
      title: "Bullish cross",
      message: "VI+ crossed above VI\u2212"
    });
    alertcondition(bearishCross, {
      id: "bearish-cross",
      title: "Bearish cross",
      message: "VI+ crossed below VI\u2212"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/709f801b1d9f4574","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":22,"column":19},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":23,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":24,"column":21},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":3,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":25,"column":22},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":4,"kind":"fill","kindOrdinal":0,"source":{"file":"indicator.ts","line":26,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[2,0],"edgeKind":"line"},{"slot":5,"kind":"fill","kindOrdinal":1,"source":{"file":"indicator.ts","line":27,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[3,0],"edgeKind":"line"},{"slot":6,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":28,"column":1},"valueType":"number","qualifiers":{"value":"const","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":7,"kind":"plotshape","kindOrdinal":0,"source":{"file":"indicator.ts","line":30,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":8,"kind":"plotshape","kindOrdinal":1,"source":{"file":"indicator.ts","line":37,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":9,"kind":"plot","kindOrdinal":4,"source":{"file":"indicator.ts","line":44,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"bullish-cross","title":"Bullish cross","message":"VI+ crossed above VI−"},{"id":"bearish-cross","title":"Bearish cross","message":"VI+ crossed below VI−"}]});
