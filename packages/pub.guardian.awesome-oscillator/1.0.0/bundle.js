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
    indicator("Awesome Oscillator", { overlay: false, precision: 2 });
    const fastLength = input.int(5, "Fast length", { id: "fast-length", min: 1, max: 200 });
    const slowLength = input.int(34, "Slow length", { id: "slow-length", min: 2, max: 500 });
    const risingColor = input.color("#26a69a", "Rising column", { id: "rising-color" });
    const fallingColor = input.color("#ef5350", "Falling column", { id: "falling-color" });
    const ao = ta.sma(hl2, fastLength).sub(ta.sma(hl2, slowLength));
    const change = ao.sub(ao.offset(1));
    plot(ao, {
      title: "AO",
      style: plot.style_columns,
      // Red when AO is no higher than the bar before; the first column, with
      // nothing before it, is green.
      color: bars.map((_bar, i) => change.get(i) <= 0 ? fallingColor : risingColor)
    });
    hline(0, { title: "Zero", color: "#787b86", style: "dashed" });
    plot(change, { title: "Change", display: display.data_window });
    alertcondition(ta.crossover(ao, 0), {
      id: "crossed-above-zero",
      title: "Crossed above zero",
      message: "Awesome Oscillator crossed above zero"
    });
    alertcondition(ta.crossunder(ao, 0), {
      id: "crossed-below-zero",
      title: "Crossed below zero",
      message: "Awesome Oscillator crossed below zero"
    });
    alertcondition(ta.crossover(change, 0), {
      id: "turned-rising",
      title: "Turned rising",
      message: "Awesome Oscillator columns turned rising"
    });
    alertcondition(ta.crossunder(change, 0), {
      id: "turned-falling",
      title: "Turned falling",
      message: "Awesome Oscillator columns turned falling"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/54e57ec9eaf408d2","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":13,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"columns","histBase":0},{"slot":1,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":20,"column":1},"valueType":"number","qualifiers":{"value":"const","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":2,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":24,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"crossed-above-zero","title":"Crossed above zero","message":"Awesome Oscillator crossed above zero"},{"id":"crossed-below-zero","title":"Crossed below zero","message":"Awesome Oscillator crossed below zero"},{"id":"turned-rising","title":"Turned rising","message":"Awesome Oscillator columns turned rising"},{"id":"turned-falling","title":"Turned falling","message":"Awesome Oscillator columns turned falling"}]});
