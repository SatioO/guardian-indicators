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
    indicator("Higher Timeframe MA", { overlay: true });
    const TIMEFRAMES = [
      { value: "1D", label: "Daily" },
      { value: "W", label: "Weekly" },
      { value: "1M", label: "Monthly" }
    ];
    const tf1 = input.timeframe("W", "Timeframe", { id: "timeframe", options: TIMEFRAMES });
    const type1 = input.string("EMA", "Type", { id: "type", options: ["EMA", "SMA"] });
    const length1 = input.int(10, "Length", { id: "length", min: 1, max: 500 });
    const color1 = input.color("#38bdf8", "Average", { id: "color" });
    const showSecond = input.bool(false, "Second average", { id: "second" });
    const tf2 = input.timeframe("W", "Second timeframe", { id: "second-timeframe", options: TIMEFRAMES });
    const type2 = input.string("SMA", "Second type", { id: "second-type", options: ["EMA", "SMA"] });
    const length2 = input.int(30, "Second length", { id: "second-length", min: 1, max: 500 });
    const color2 = input.color("#a78bfa", "Second average colour", { id: "second-color" });
    const showLabels = input.bool(true, "Label the averages", { id: "labels" });
    const average1 = request.security("", tf1, (s) => {
      if (type1 === "SMA") return s.ta.sma(s.close, length1);
      return s.ta.ema(s.close, length1);
    });
    const average2 = request.security("", tf2, (s) => {
      if (type2 === "SMA") return s.ta.sma(s.close, length2);
      return s.ta.ema(s.close, length2);
    });
    plot(average1, { title: "Higher-timeframe MA", style: plot.style_stepline, color: color1, linewidth: 2 });
    plot(showSecond ? average2 : na, {
      title: "Second higher-timeframe MA",
      style: plot.style_stepline,
      color: color2,
      linewidth: 2
    });
    plot(close.sub(average1).div(average1).mul(100), {
      title: "Close vs MA (%)",
      display: display.data_window,
      format: format.percent
    });
    alertcondition(ta.crossover(close, average1), {
      id: "crossed-above",
      title: "Crossed above higher-timeframe MA",
      message: "The close crossed above the higher-timeframe moving average"
    });
    alertcondition(ta.crossunder(close, average1), {
      id: "crossed-below",
      title: "Crossed below higher-timeframe MA",
      message: "The close crossed below the higher-timeframe moving average"
    });
    const shortName = (tf) => tf === "1D" ? "D" : tf === "1M" ? "M" : "W";
    if (showLabels && bars.length > 0) {
      const last = bars.length - 1;
      const tags = [
        [true, average1, `${shortName(tf1)} ${type1} ${length1}`, color1],
        [showSecond, average2, `${shortName(tf2)} ${type2} ${length2}`, color2]
      ];
      for (const [shown, series, text, tint] of tags) {
        const price = series.get(last);
        if (!shown || !Number.isFinite(price)) continue;
        label.new(last, price, text, { style: label.style_label_left, color: color.new(tint, 100), textColor: tint, size: size.small });
      }
    }
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/d9f355c55cfa0525","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":35,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"stepline","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":36,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"stepline","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":42,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"drawingContract":"g-script-v2","alertConditions":[{"id":"crossed-above","title":"Crossed above higher-timeframe MA","message":"The close crossed above the higher-timeframe moving average"},{"id":"crossed-below","title":"Crossed below higher-timeframe MA","message":"The close crossed below the higher-timeframe moving average"}]});
