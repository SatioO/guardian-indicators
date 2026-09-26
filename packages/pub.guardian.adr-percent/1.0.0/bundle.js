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
    indicator("ADR%", { overlay: false, format: format.percent, precision: 2 });
    const length = input.int(20, "Length", { id: "length", min: 1, max: 500 });
    const method = input.string("High \xF7 low", "Method", {
      id: "method",
      options: ["High \xF7 low", "Range \xF7 close"]
    });
    const minimum = input.float(3.5, "Minimum ADR%", { id: "minimum", min: 0, step: 0.5 });
    const tightAt = input.float(0.5, "Tight day at or below (\xD7 ADR)", { id: "tight-at", min: 0, max: 1, step: 0.1 });
    const expansionAt = input.float(1.5, "Expansion day at or above (\xD7 ADR)", { id: "expansion-at", min: 1, step: 0.1 });
    const activeColor = input.color("#38bdf8", "ADR% above minimum", { id: "active-color" });
    const belowMinimumColor = input.color("#b2b5be", "ADR% below minimum", { id: "below-minimum-color" });
    const tightColor = input.color("#a78bfa", "Tight day", { id: "tight-color" });
    const expansionColor = input.color("#f59e0b", "Expansion day", { id: "expansion-color" });
    const byClose = method === "Range \xF7 close";
    const dayRange = byClose ? high.sub(low).div(close).mul(100) : high.div(low).sub(1).mul(100);
    const adr = byClose ? ta.sma(high, length).sub(ta.sma(low, length)).div(close).mul(100) : ta.sma(high.div(low), length).sub(1).mul(100);
    const yardstick = adr.offset(1);
    const tight = dayRange.lte(yardstick.mul(tightAt));
    const expansion = dayRange.gte(yardstick.mul(expansionAt));
    const muted = "#787b86";
    plot(dayRange, {
      title: "Day range",
      style: plot.style_columns,
      color: bars.map((_bar, i) => {
        if (tight.get(i)) return color.new(tightColor, 25);
        if (expansion.get(i)) return color.new(expansionColor, 25);
        return color.new(muted, 70);
      })
    });
    plot(adr, {
      title: "ADR%",
      linewidth: 2,
      color: bars.map((_bar, i) => adr.get(i) >= minimum ? activeColor : belowMinimumColor)
    });
    hline(minimum, { title: "Minimum ADR%", color: muted, style: "dashed" });
    plot(ta.sma(high.sub(low), length), {
      title: "ADR (price)",
      display: display.data_window,
      format: format.price
    });
    alertcondition(tight, {
      id: "tight-day",
      title: "Tight day",
      message: "Range closed at or below the Tight day threshold (\xD7 ADR)"
    });
    alertcondition(expansion, {
      id: "expansion-day",
      title: "Expansion day",
      message: "Range closed at or above the Expansion day threshold (\xD7 ADR)"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/65a709e0553bb5e3","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":37,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"columns","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":46,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":51,"column":1},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":3,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":52,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"tight-day","title":"Tight day","message":"Range closed at or below the Tight day threshold (× ADR)"},{"id":"expansion-day","title":"Expansion day","message":"Range closed at or above the Expansion day threshold (× ADR)"}]});
