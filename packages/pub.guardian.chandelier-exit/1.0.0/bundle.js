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
    indicator("Chandelier Exit", { overlay: true });
    const length = input.int(22, "ATR period", { id: "atr-period", min: 1, max: 500 });
    const mult = input.float(3, "ATR multiplier", { id: "atr-mult", min: 0.1, step: 0.1 });
    const useClose = input.bool(true, "Use close price for extremums", { id: "use-close" });
    const labels = input.bool(true, "Show buy/sell labels", { id: "labels" });
    const shade = input.bool(true, "Shade the zone", { id: "shade" });
    const longColor = input.color("#26a69a", "Long stop", { id: "long-color" });
    const shortColor = input.color("#ef5350", "Short stop", { id: "short-color" });
    const offset = ta.atr(length).mul(mult);
    const longBase = (useClose ? ta.highest(close, length) : ta.highest(high, length)).sub(offset);
    const shortBase = (useClose ? ta.lowest(close, length) : ta.lowest(low, length)).add(offset);
    const [longStop, shortStop, direction] = ta.scan([na, na, 1], (prev, bar2, i) => {
      const [prevLong, prevShort, prevDir] = prev;
      const rawLong = longBase.get(i);
      const rawShort = shortBase.get(i);
      const longPrev = na(prevLong) ? rawLong : prevLong;
      const shortPrev = na(prevShort) ? rawShort : prevShort;
      const prevClose = i > 0 ? close.get(i - 1) : na;
      const long = prevClose > longPrev ? Math.max(rawLong, longPrev) : rawLong;
      const short = prevClose < shortPrev ? Math.min(rawShort, shortPrev) : rawShort;
      const dir = bar2.close > shortPrev ? 1 : bar2.close < longPrev ? -1 : prevDir;
      return [long, short, dir];
    });
    const isLong = direction.eq(1);
    const isShort = direction.eq(-1);
    const turnedLong = isLong.and(direction.offset(1).eq(-1));
    const turnedShort = isShort.and(direction.offset(1).eq(1));
    const activeLong = isLong.iff(longStop, na);
    const activeShort = isShort.iff(shortStop, na);
    const middle = plot(hl2, { title: "Price middle", display: display.none });
    const longLine = plot(activeLong, { title: "Long stop", color: longColor, linewidth: 2, style: plot.style_stepline });
    const shortLine = plot(activeShort, { title: "Short stop", color: shortColor, linewidth: 2, style: plot.style_stepline });
    fill(middle, longLine, { color: shade ? color.new(longColor, 90) : na });
    fill(middle, shortLine, { color: shade ? color.new(shortColor, 90) : na });
    plotshape(labels ? turnedLong.iff(longStop, na) : na, {
      title: "Buy",
      shape: shape.labelup,
      location: location.absolute,
      color: longColor,
      text: "Buy",
      textcolor: color.white,
      size: size.small
    });
    plotshape(labels ? turnedShort.iff(shortStop, na) : na, {
      title: "Sell",
      shape: shape.labeldown,
      location: location.absolute,
      color: shortColor,
      text: "Sell",
      textcolor: color.white,
      size: size.small
    });
    plot(direction, { title: "Direction", display: display.data_window });
    alertcondition(turnedLong, {
      id: "turned-long",
      title: "Chandelier turned long",
      message: "The close crossed above the Chandelier short stop"
    });
    alertcondition(turnedShort, {
      id: "turned-short",
      title: "Chandelier turned short",
      message: "The close crossed below the Chandelier long stop"
    });
    alertcondition(turnedLong.or(turnedShort), {
      id: "direction-changed",
      title: "Chandelier direction changed",
      message: "Chandelier Exit changed direction"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/5bf31cc5562b0496","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":40,"column":16},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":41,"column":18},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"stepline","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":42,"column":19},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"stepline","histBase":0},{"slot":3,"kind":"fill","kindOrdinal":0,"source":{"file":"indicator.ts","line":43,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[0,1],"edgeKind":"line"},{"slot":4,"kind":"fill","kindOrdinal":1,"source":{"file":"indicator.ts","line":44,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[0,2],"edgeKind":"line"},{"slot":5,"kind":"plotshape","kindOrdinal":0,"source":{"file":"indicator.ts","line":46,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":6,"kind":"plotshape","kindOrdinal":1,"source":{"file":"indicator.ts","line":55,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":7,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":64,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"alertConditions":[{"id":"turned-long","title":"Chandelier turned long","message":"The close crossed above the Chandelier short stop"},{"id":"turned-short","title":"Chandelier turned short","message":"The close crossed below the Chandelier long stop"},{"id":"direction-changed","title":"Chandelier direction changed","message":"Chandelier Exit changed direction"}]});
