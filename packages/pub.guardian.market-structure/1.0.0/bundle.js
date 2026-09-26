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
    indicator("Market Structure", { overlay: true, max_labels_count: 500, max_lines_count: 500 });
    const left = input.int(5, "Pivot left bars", { id: "left", min: 1, max: 50 });
    const right = input.int(5, "Pivot right bars", { id: "right", min: 1, max: 50 });
    const keep = input.int(10, "Structures shown", { id: "keep", min: 1, max: 200 });
    const showSwings = input.bool(true, "Swing labels", { id: "swings" });
    const bullColor = input.color("#26a69a", "Bullish structure", { id: "bull-color" });
    const bearColor = input.color("#ef5350", "Bearish structure", { id: "bear-color" });
    const swingHigh = ta.pivothigh(high, left, right).offset(right);
    const swingLow = ta.pivotlow(low, left, right).offset(right);
    const [
      ,
      ,
      ,
      ,
      bullBreak,
      bullFrom,
      bullLevel,
      bearBreak,
      bearFrom,
      bearLevel,
      structure,
      lastHigh,
      lastLow
    ] = ta.scan([NaN, NaN, NaN, NaN, 0, NaN, NaN, 0, NaN, NaN, 0, NaN, NaN], (prev, bar2, i) => {
      let [activeHigh, activeHighBar, activeLow, activeLowBar] = prev;
      let [direction, recentHigh, recentLow] = prev.slice(10);
      const h = swingHigh.get(i);
      if (Number.isFinite(h)) {
        activeHigh = h;
        activeHighBar = i - right;
        recentHigh = h;
      }
      const l = swingLow.get(i);
      if (Number.isFinite(l)) {
        activeLow = l;
        activeLowBar = i - right;
        recentLow = l;
      }
      let [bull, fromHigh, brokenHigh, bear, fromLow, brokenLow] = [0, NaN, NaN, 0, NaN, NaN];
      if (bar2.close > activeHigh) {
        [bull, fromHigh, brokenHigh] = [1, activeHighBar, activeHigh];
        [activeHigh, activeHighBar, direction] = [NaN, NaN, 1];
      }
      if (bar2.close < activeLow) {
        [bear, fromLow, brokenLow] = [1, activeLowBar, activeLow];
        [activeLow, activeLowBar, direction] = [NaN, NaN, -1];
      }
      return [
        activeHigh,
        activeHighBar,
        activeLow,
        activeLowBar,
        bull,
        fromHigh,
        brokenHigh,
        bear,
        fromLow,
        brokenLow,
        direction,
        recentHigh,
        recentLow
      ];
    });
    const swings = [];
    let previousHigh = NaN;
    let previousLow = NaN;
    for (let i = 0; i < bars.length; i++) {
      const h = swingHigh.get(i);
      if (Number.isFinite(h)) {
        if (Number.isFinite(previousHigh)) {
          swings.push({ bar: i - right, price: h, text: h > previousHigh ? "HH" : "LH", isHigh: true });
        }
        previousHigh = h;
      }
      const l = swingLow.get(i);
      if (Number.isFinite(l)) {
        if (Number.isFinite(previousLow)) {
          swings.push({ bar: i - right, price: l, text: l > previousLow ? "HL" : "LL", isHigh: false });
        }
        previousLow = l;
      }
    }
    const breaks = [];
    for (let i = 0; i < bars.length; i++) {
      if (bullBreak.get(i)) breaks.push({ from: bullFrom.get(i), to: i, level: bullLevel.get(i), bullish: true });
      if (bearBreak.get(i)) breaks.push({ from: bearFrom.get(i), to: i, level: bearLevel.get(i), bullish: false });
    }
    for (const swing of showSwings ? swings.slice(-keep) : []) {
      const bullish = swing.text === "HH" || swing.text === "HL";
      label.new(swing.bar, swing.price, swing.text, {
        style: swing.isHigh ? label.style_label_down : label.style_label_up,
        color: na,
        textColor: bullish ? bullColor : bearColor,
        size: size.small
      });
    }
    for (const brk of breaks.slice(-keep)) {
      const tint = brk.bullish ? bullColor : bearColor;
      line.new(brk.from, brk.level, brk.to, brk.level, { color: tint, style: "dashed" });
      label.new(Math.round((brk.from + brk.to) / 2), brk.level, "BOS", {
        style: brk.bullish ? label.style_label_down : label.style_label_up,
        color: na,
        textColor: tint,
        size: size.tiny
      });
    }
    plot(lastHigh, { title: "Last swing high", display: display.data_window });
    plot(lastLow, { title: "Last swing low", display: display.data_window });
    plot(structure, { title: "Structure", display: display.data_window, precision: 0 });
    alertcondition(bullBreak.gt(0), {
      id: "bullish-bos",
      title: "Bullish BOS",
      message: "Price closed above the last swing high: bullish break of structure"
    });
    alertcondition(bearBreak.gt(0), {
      id: "bearish-bos",
      title: "Bearish BOS",
      message: "Price closed below the last swing low: bearish break of structure"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/1cfe4fec5b891fdf","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":101,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":102,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":103,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"drawingContract":"g-script-v2","alertConditions":[{"id":"bullish-bos","title":"Bullish BOS","message":"Price closed above the last swing high: bullish break of structure"},{"id":"bearish-bos","title":"Bearish BOS","message":"Price closed below the last swing low: bearish break of structure"}]});
