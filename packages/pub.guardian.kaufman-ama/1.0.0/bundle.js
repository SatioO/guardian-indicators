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
    indicator("KAMA", { overlay: true });
    const length = input.int(14, "Length", { id: "length", min: 1, max: 500 });
    const fastLength = input.int(2, "Fast length", { id: "fast-length", min: 1, max: 500 });
    const slowLength = input.int(30, "Slow length", { id: "slow-length", min: 1, max: 500 });
    const source = input.source("close", "Source", { id: "source" });
    const upColor = input.color("#26a69a", "Rising", { id: "up-color" });
    const downColor = input.color("#ef5350", "Falling", { id: "down-color" });
    const fastAlpha = 2 / (fastLength + 1);
    const slowAlpha = 2 / (slowLength + 1);
    const move = math.abs(source.sub(source.offset(length)));
    const path = math.sum(math.abs(source.sub(source.offset(1))), length);
    const [kama, efficiency] = ta.scan([na, na], (prev, _bar, i) => {
      const m = move.get(i);
      const p = path.get(i);
      if (na(m) || na(p)) return [na, na];
      const er = p !== 0 ? m / p : 0;
      const sc = (er * (fastAlpha - slowAlpha) + slowAlpha) ** 2;
      const src = source.get(i);
      return [na(prev[0]) ? src : prev[0] + sc * (src - prev[0]), er];
    });
    const rising = kama.gt(kama.offset(1));
    const falling = kama.lt(kama.offset(1));
    plot(kama, {
      title: "KAMA",
      linewidth: 2,
      color: bars.map((_bar, i) => {
        if (rising.get(i)) return upColor;
        if (falling.get(i)) return downColor;
        return "#787b86";
      })
    });
    plot(efficiency, { title: "Efficiency ratio", display: display.data_window, precision: 3 });
    alertcondition(rising.and(falling.offset(1)), {
      id: "turned-up",
      title: "KAMA turned up",
      message: "KAMA turned up"
    });
    alertcondition(falling.and(rising.offset(1)), {
      id: "turned-down",
      title: "KAMA turned down",
      message: "KAMA turned down"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/c9da72459027cbaa","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":34,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":43,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"turned-up","title":"KAMA turned up","message":"KAMA turned up"},{"id":"turned-down","title":"KAMA turned down","message":"KAMA turned down"}]});
