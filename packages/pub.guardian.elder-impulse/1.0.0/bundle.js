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
    indicator("Elder Impulse System", { overlay: true });
    const emaLength = input.int(13, "EMA length", { id: "ema-length", min: 1, max: 500 });
    const fastLength = input.int(12, "MACD fast length", { id: "fast", min: 1, max: 500 });
    const slowLength = input.int(26, "MACD slow length", { id: "slow", min: 1, max: 500 });
    const signalLength = input.int(9, "MACD signal length", { id: "signal", min: 1, max: 500 });
    const colorBars = input.bool(true, "Colour the bars", { id: "color-bars" });
    const showEma = input.bool(true, "Show the EMA", { id: "show-ema" });
    const bullColor = input.color("#26a69a", "Green impulse", { id: "bull-color" });
    const bearColor = input.color("#ef5350", "Red impulse", { id: "bear-color" });
    const neutralColor = input.color("#38bdf8", "Blue impulse", { id: "neutral-color" });
    const emaColor = input.color("#f59e0b", "EMA", { id: "ema-color" });
    const trend = ta.ema(close, emaLength);
    const [, , histogram] = ta.macd(close, fastLength, slowLength, signalLength);
    const trendSlope = ta.change(trend);
    const powerSlope = ta.change(histogram);
    const known = trendSlope.eq(trendSlope).and(powerSlope.eq(powerSlope));
    const bull = trendSlope.gt(0).and(powerSlope.gt(0));
    const bear = trendSlope.lt(0).and(powerSlope.lt(0));
    const impulse = known.iff(bull.iff(1, bear.iff(-1, 0)), na);
    barcolor(bars.map((_bar, i) => {
      if (!colorBars || !known.get(i)) return null;
      if (bull.get(i)) return bullColor;
      if (bear.get(i)) return bearColor;
      return neutralColor;
    }));
    plot(showEma ? trend : na, { title: "Impulse EMA", color: emaColor, linewidth: 2 });
    plot(impulse, { title: "Impulse", display: display.data_window, precision: 0 });
    plot(histogram, { title: "MACD histogram", display: display.data_window });
    const turnedGreen = impulse.eq(1).and(impulse.offset(1).lt(1));
    const turnedRed = impulse.eq(-1).and(impulse.offset(1).gt(-1));
    alertcondition(turnedGreen, {
      id: "turned-green",
      title: "Turned green",
      message: "Elder impulse turned green: trend and momentum both rising"
    });
    alertcondition(turnedRed, {
      id: "turned-red",
      title: "Turned red",
      message: "Elder impulse turned red: trend and momentum both falling"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/ba58a2d95677c2ec","declarations":[{"slot":0,"kind":"barcolor","kindOrdinal":0,"source":{"file":"indicator.ts","line":28,"column":1},"valueType":"color","qualifiers":{"colors":"series","target":"const"}},{"slot":1,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":34,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":35,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":3,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":36,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"turned-green","title":"Turned green","message":"Elder impulse turned green: trend and momentum both rising"},{"id":"turned-red","title":"Turned red","message":"Elder impulse turned red: trend and momentum both falling"}]});
