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
    indicator("Heikin Ashi", { overlay: false, format: format.price });
    const strong = input.bool(true, "Single out strong candles", { id: "strong" });
    const upColor = input.color("#26a69a", "Up candle", { id: "up-color" });
    const downColor = input.color("#ef5350", "Down candle", { id: "down-color" });
    const haClose = ohlc4;
    const haOpen = ta.scan(0, (prev, bar2, i) => i === 0 ? (bar2.open + bar2.close) / 2 : (prev + haClose.get(i - 1)) / 2);
    const haHigh = ta.max(high, ta.max(haOpen, haClose));
    const haLow = ta.min(low, ta.min(haOpen, haClose));
    const isUp = haClose.gte(haOpen);
    const isStrong = isUp.iff(haLow.gte(haOpen), haHigh.lte(haOpen));
    const wasUp = haClose.offset(1).gte(haOpen.offset(1));
    const wasDown = haClose.offset(1).lt(haOpen.offset(1));
    const turnedUp = isUp.and(wasDown);
    const turnedDown = isUp.not().and(wasUp);
    const candleColors = bars.map((_bar, i) => {
      const base = isUp.get(i) ? upColor : downColor;
      return !strong || isStrong.get(i) ? base : color.new(base, 45);
    });
    plotcandle(haOpen, haHigh, haLow, haClose, {
      title: "Heikin Ashi",
      color: candleColors,
      wickColor: candleColors,
      borderColor: candleColors
    });
    const run = ta.scan(0, (prev, _bar, i) => isUp.get(i) ? prev > 0 ? prev + 1 : 1 : prev < 0 ? prev - 1 : -1);
    plot(run, { title: "Candles in a row", display: display.data_window, precision: 0 });
    alertcondition(turnedUp, {
      id: "turned-up",
      title: "Turned up",
      message: "Heikin Ashi candles turned up"
    });
    alertcondition(turnedDown, {
      id: "turned-down",
      title: "Turned down",
      message: "Heikin Ashi candles turned down"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/65e690326872c504","declarations":[{"slot":0,"kind":"plotcandle","kindOrdinal":0,"source":{"file":"indicator.ts","line":30,"column":1},"valueType":"ohlc","qualifiers":{"open":"series","high":"series","low":"series","close":"series","title":"const","color":"series","wickColor":"series","borderColor":"series"},"colorPresent":true,"wickColorPresent":true,"borderColorPresent":true},{"slot":1,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":40,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"turned-up","title":"Turned up","message":"Heikin Ashi candles turned up"},{"id":"turned-down","title":"Turned down","message":"Heikin Ashi candles turned down"}]});
