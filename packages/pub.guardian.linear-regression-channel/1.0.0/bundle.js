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
    indicator("Linear Regression Channel", { overlay: true });
    const length = input.int(100, "Length", { id: "length", min: 2, max: 5e3 });
    const source = input.source("close", "Source", { id: "source" });
    const upperDeviation = input.float(2, "Upper deviation", { id: "upper-deviation", min: 0, step: 0.1 });
    const lowerDeviation = input.float(2, "Lower deviation", { id: "lower-deviation", min: 0, step: 0.1 });
    const extendLeft = input.bool(false, "Extend lines left", { id: "extend-left" });
    const extendRight = input.bool(true, "Extend lines right", { id: "extend-right" });
    const showR = input.bool(true, "Show Pearson's R", { id: "show-r" });
    const shade = input.bool(true, "Shade the channel", { id: "shade" });
    const baseColor = input.color("#38bdf8", "Base line", { id: "base-color" });
    const upperColor = input.color("#ef5350", "Upper line", { id: "upper-color" });
    const lowerColor = input.color("#26a69a", "Lower line", { id: "lower-color" });
    const fittedEnd = ta.linreg(source, length, 0);
    const fittedStart = ta.linreg(source, length, length - 1);
    const slopePerBar = fittedEnd.sub(fittedStart).div(length - 1);
    const sigma = ta.stdev(source, length);
    const timeVariance = (length * length - 1) / 12;
    const residualVariance = sigma.mul(sigma).sub(slopePerBar.mul(slopePerBar).mul(timeVariance)).mul(length / (length - 1));
    const residualDeviation = math.sqrt(math.max(residualVariance, 0));
    const upperEdge = fittedEnd.add(residualDeviation.mul(upperDeviation));
    const lowerEdge = fittedEnd.sub(residualDeviation.mul(lowerDeviation));
    const last = bars.length - 1;
    const left = last - length + 1;
    const drawn = left >= 0;
    const startPrice = drawn ? fittedStart.get(last) : na;
    const endPrice = drawn ? fittedEnd.get(last) : na;
    const deviation = drawn ? residualDeviation.get(last) : na;
    const spread = drawn ? sigma.get(last) : na;
    const pearsonR = drawn ? spread > 0 ? slopePerBar.get(last) * Math.sqrt(timeVariance) / spread : 0 : na;
    let extendStyle = extend.none;
    if (extendLeft && extendRight) extendStyle = extend.both;
    else if (extendLeft) extendStyle = extend.left;
    else if (extendRight) extendStyle = extend.right;
    if (drawn) {
      const lowerStart = startPrice - lowerDeviation * deviation;
      line.new(left, startPrice + upperDeviation * deviation, last, endPrice + upperDeviation * deviation, {
        color: upperColor,
        extend: extendStyle
      });
      line.new(left, startPrice, last, endPrice, { color: baseColor, width: 2, extend: extendStyle });
      line.new(left, lowerStart, last, endPrice - lowerDeviation * deviation, {
        color: lowerColor,
        extend: extendStyle
      });
      if (showR) {
        label.new(left, lowerStart, `R ${pearsonR.toFixed(3)}`, {
          style: label.style_label_up,
          color: na,
          textColor: lowerColor,
          size: size.small
        });
      }
    }
    const slope = drawn ? slopePerBar.get(last) : na;
    const baseValues = bars.map((_bar, i) => drawn && i >= left ? startPrice + slope * (i - left) : na);
    const upperValues = bars.map((_bar, i) => drawn && i >= left ? startPrice + slope * (i - left) + upperDeviation * deviation : na);
    const lowerValues = bars.map((_bar, i) => drawn && i >= left ? startPrice + slope * (i - left) - lowerDeviation * deviation : na);
    const upperPlot = plot(upperValues, { title: "Channel upper", color: upperColor, display: display.data_window });
    const basePlot = plot(baseValues, { title: "Channel base", color: baseColor, display: display.data_window });
    const lowerPlot = plot(lowerValues, { title: "Channel lower", color: lowerColor, display: display.data_window });
    const rValues = bars.map((_bar, i) => drawn && i >= left ? pearsonR : na);
    plot(rValues, { title: "Pearson's R", display: display.data_window });
    const shadeTransparency = shade ? 92 : 100;
    fill(upperPlot, basePlot, { color: color.new(upperColor, shadeTransparency) });
    fill(basePlot, lowerPlot, { color: color.new(lowerColor, shadeTransparency) });
    alertcondition(ta.crossover(source, upperEdge), {
      id: "close-above-channel",
      title: "Close above channel",
      message: "Price closed above the upper line of the linear regression channel"
    });
    alertcondition(ta.crossunder(source, lowerEdge), {
      id: "close-below-channel",
      title: "Close below channel",
      message: "Price closed below the lower line of the linear regression channel"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/a71602ee24e50d37","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":83,"column":19},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":84,"column":18},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":85,"column":19},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":3,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":88,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":4,"kind":"fill","kindOrdinal":0,"source":{"file":"indicator.ts","line":91,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[0,1],"edgeKind":"line"},{"slot":5,"kind":"fill","kindOrdinal":1,"source":{"file":"indicator.ts","line":92,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[1,2],"edgeKind":"line"}],"drawingContract":"g-script-v2","alertConditions":[{"id":"close-above-channel","title":"Close above channel","message":"Price closed above the upper line of the linear regression channel"},{"id":"close-below-channel","title":"Close below channel","message":"Price closed below the lower line of the linear regression channel"}]});
