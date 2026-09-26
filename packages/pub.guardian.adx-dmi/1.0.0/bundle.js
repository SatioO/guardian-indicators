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
    indicator("ADX and DMI", { overlay: false, precision: 2 });
    const diLength = input.int(14, "DI length", { id: "di-length", min: 1, max: 500 });
    const adxSmoothing = input.int(14, "ADX smoothing", { id: "adx-smoothing", min: 1, max: 500 });
    const keyLevel = input.float(25, "Key level", { id: "key-level", min: 0, max: 100, step: 1 });
    const plusColor = input.color("#26a69a", "+DI", { id: "plus-color" });
    const minusColor = input.color("#ef5350", "\u2212DI", { id: "minus-color" });
    const adxColor = input.color("#38bdf8", "ADX", { id: "adx-color" });
    const [plusDi, minusDi, adx] = ta.dmi(diLength, adxSmoothing);
    plot(plusDi, { title: "+DI", color: plusColor });
    plot(minusDi, { title: "\u2212DI", color: minusColor });
    plot(adx, {
      title: "ADX",
      linewidth: 2,
      // Full strength while the trend is strong enough to trade, faded below.
      color: bars.map((_bar, i) => adx.get(i) >= keyLevel ? adxColor : color.new(adxColor, 60))
    });
    hline(keyLevel, { title: "Key level", color: "#787b86", style: "dashed" });
    plot(plusDi.sub(minusDi), { title: "DI spread", display: display.data_window });
    alertcondition(ta.crossover(plusDi, minusDi), {
      id: "bullish-di-cross",
      title: "Bullish DI cross",
      message: "+DI crossed above \u2212DI"
    });
    alertcondition(ta.crossunder(plusDi, minusDi), {
      id: "bearish-di-cross",
      title: "Bearish DI cross",
      message: "+DI crossed below \u2212DI"
    });
    alertcondition(ta.crossover(adx, keyLevel), {
      id: "adx-above-key-level",
      title: "ADX above key level",
      message: "ADX rose above the key level: the trend is gaining strength"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/5bd4bd02f21ff51f","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":15,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":16,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":17,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":3,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":23,"column":1},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":4,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":24,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"bullish-di-cross","title":"Bullish DI cross","message":"+DI crossed above −DI"},{"id":"bearish-di-cross","title":"Bearish DI cross","message":"+DI crossed below −DI"},{"id":"adx-above-key-level","title":"ADX above key level","message":"ADX rose above the key level: the trend is gaining strength"}]});
