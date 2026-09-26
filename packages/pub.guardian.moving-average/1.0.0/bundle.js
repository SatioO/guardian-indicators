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
    indicator("Moving Average", { overlay: true });
    const maType = input.string("EMA", "Type", {
      id: "type",
      options: ["SMA", "EMA", "WMA", "HMA", "RMA", "VWMA", "ALMA", "DEMA", "TEMA", "LSMA"]
    });
    const length = input.int(21, "Length", { id: "length", min: 1, max: 500 });
    const src = input.source("close", "Source", { id: "source" });
    const shift = input.int(0, "Offset", { id: "offset", min: -500, max: 500 });
    const almaOffset = input.float(0.85, "ALMA offset", { id: "alma-offset", min: 0, max: 1, step: 0.05, group: "ALMA" });
    const almaSigma = input.float(6, "ALMA sigma", { id: "alma-sigma", min: 0.5, step: 0.5, group: "ALMA" });
    const upColor = input.color("#26a69a", "Rising", { id: "up-color" });
    const downColor = input.color("#ef5350", "Falling", { id: "down-color" });
    const e1 = ta.ema(src, length);
    const e2 = ta.ema(e1, length);
    const e3 = ta.ema(e2, length);
    const average = maType === "SMA" ? ta.sma(src, length) : maType === "WMA" ? ta.wma(src, length) : maType === "HMA" ? ta.hma(src, length) : maType === "RMA" ? ta.rma(src, length) : maType === "VWMA" ? ta.vwma(src, length) : maType === "ALMA" ? ta.alma(src, length, almaOffset, almaSigma) : maType === "DEMA" ? e1.mul(2).sub(e2) : maType === "TEMA" ? e1.mul(3).sub(e2.mul(3)).add(e3) : maType === "LSMA" ? ta.linreg(src, length, 0) : e1;
    const previous = average.offset(1);
    const slope = ta.scan(0, (prev, _bar, i) => {
      const change = average.get(i) - previous.get(i);
      if (change > 0) return 1;
      if (change < 0) return -1;
      return prev;
    });
    plot(average, {
      title: "Moving average",
      linewidth: 2,
      offset: shift,
      color: bars.map((_bar, i) => slope.get(i) < 0 ? downColor : upColor)
    });
    alertcondition(ta.crossover(close, average), {
      id: "cross-above",
      title: "Close crossed above the average",
      message: "The close crossed above the moving average"
    });
    alertcondition(ta.crossunder(close, average), {
      id: "cross-below",
      title: "Close crossed below the average",
      message: "The close crossed below the moving average"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/6cc698a9aee305bc","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":43,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"input","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"cross-above","title":"Close crossed above the average","message":"The close crossed above the moving average"},{"id":"cross-below","title":"Close crossed below the average","message":"The close crossed below the moving average"}]});
