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
    indicator("52-Week Range", { overlay: false, format: format.percent, precision: 2 });
    const length = input.int(252, "Lookback (bars)", { id: "length", min: 2, max: 1e3 });
    const nearHigh = input.float(-25, "Near-high guide (%)", { id: "near-high", max: 0, step: 1 });
    const aboveLow = input.float(30, "Above-low guide (%)", { id: "above-low", min: 0, step: 1 });
    const shadeZone = input.bool(true, "Shade the near-high zone", { id: "shade" });
    const highColor = input.color("#38bdf8", "Off the high", { id: "high-color" });
    const lowColor = input.color("#26a69a", "Above the low", { id: "low-color" });
    const newHighColor = input.color("#a78bfa", "New high", { id: "new-high-color" });
    const newLowColor = input.color("#ef5350", "New low", { id: "new-low-color" });
    const yearHigh = ta.highest(high, length);
    const yearLow = ta.lowest(low, length);
    const offHigh = close.div(yearHigh).sub(1).mul(100);
    const aboveYearLow = close.div(yearLow).sub(1).mul(100);
    const newHigh = high.gt(ta.highest(high, length - 1).offset(1));
    const newLow = low.lt(ta.lowest(low, length - 1).offset(1));
    const guides = "#787b86";
    const zero = hline(0, { title: "Zero", color: color.new(guides, 50), style: "solid" });
    const nearGuide = hline(nearHigh, { title: "Near-high guide", color: guides, style: "dashed" });
    hline(aboveLow, { title: "Above-low guide", color: guides, style: "dashed" });
    fill(zero, nearGuide, { color: color.new(highColor, shadeZone ? 90 : 100) });
    plot(offHigh, {
      title: "% off 52-week high",
      linewidth: 2,
      color: bars.map((_bar, i) => offHigh.get(i) >= nearHigh ? highColor : color.new(highColor, 65))
    });
    plot(aboveYearLow, {
      title: "% above 52-week low",
      linewidth: 2,
      color: bars.map((_bar, i) => aboveYearLow.get(i) >= aboveLow ? lowColor : color.new(lowColor, 65))
    });
    plotshape(newHigh.iff(5, na), {
      title: "New 52-week high",
      shape: shape.circle,
      location: location.absolute,
      color: newHighColor,
      size: size.tiny
    });
    plotshape(newLow.iff(-5, na), {
      title: "New 52-week low",
      shape: shape.circle,
      location: location.absolute,
      color: newLowColor,
      size: size.tiny
    });
    plot(yearHigh, { title: "52-week high", display: display.data_window, format: format.price });
    plot(yearLow, { title: "52-week low", display: display.data_window, format: format.price });
    plot(close.sub(yearLow).div(yearHigh.sub(yearLow)).mul(100), {
      title: "Position in range",
      display: display.data_window
    });
    alertcondition(newHigh, {
      id: "new-52-week-high",
      title: "New 52-week high",
      message: "Price made a new 52-week high"
    });
    alertcondition(newLow, {
      id: "new-52-week-low",
      title: "New 52-week low",
      message: "Price made a new 52-week low"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/657b53082a2dc8d1","declarations":[{"slot":0,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":24,"column":14},"valueType":"number","qualifiers":{"value":"const","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":1,"kind":"hline","kindOrdinal":1,"source":{"file":"indicator.ts","line":25,"column":19},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":2,"kind":"hline","kindOrdinal":2,"source":{"file":"indicator.ts","line":26,"column":1},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":3,"kind":"fill","kindOrdinal":0,"source":{"file":"indicator.ts","line":28,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[0,1],"edgeKind":"hline"},{"slot":4,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":30,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":5,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":35,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":6,"kind":"plotshape","kindOrdinal":0,"source":{"file":"indicator.ts","line":43,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":7,"kind":"plotshape","kindOrdinal":1,"source":{"file":"indicator.ts","line":50,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":8,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":58,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":9,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":59,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":10,"kind":"plot","kindOrdinal":4,"source":{"file":"indicator.ts","line":60,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"new-52-week-high","title":"New 52-week high","message":"Price made a new 52-week high"},{"id":"new-52-week-low","title":"New 52-week low","message":"Price made a new 52-week low"}]});
