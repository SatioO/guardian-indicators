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
    indicator("RSI Divergence", { overlay: false, precision: 2, max_lines_count: 500, max_labels_count: 500 });
    const rsiLength = input.int(14, "RSI length", { id: "rsi-length", min: 1, max: 200 });
    const src = input.source("close", "RSI source", { id: "source" });
    const left = input.int(5, "Pivot lookback left", { id: "left", min: 1, max: 50 });
    const right = input.int(5, "Pivot lookback right", { id: "right", min: 1, max: 50 });
    const rangeMin = input.int(5, "Min of lookback range", { id: "range-min", min: 0, max: 500 });
    const rangeMax = input.int(60, "Max of lookback range", { id: "range-max", min: 1, max: 500 });
    const showBull = input.bool(true, "Regular bullish", { id: "bull" });
    const showHiddenBull = input.bool(false, "Hidden bullish", { id: "hidden-bull" });
    const showBear = input.bool(true, "Regular bearish", { id: "bear" });
    const showHiddenBear = input.bool(false, "Hidden bearish", { id: "hidden-bear" });
    const keep = input.int(20, "Divergences shown", { id: "keep", min: 1, max: 250 });
    const overbought = input.float(70, "Overbought", { id: "overbought", min: 50, max: 100, step: 5 });
    const oversold = input.float(30, "Oversold", { id: "oversold", min: 0, max: 50, step: 5 });
    const rsiColor = input.color("#a78bfa", "RSI line", { id: "rsi-color" });
    const bullColor = input.color("#26a69a", "Bullish divergence", { id: "bull-color" });
    const bearColor = input.color("#ef5350", "Bearish divergence", { id: "bear-color" });
    const rsiValue = ta.rsi(src, rsiLength);
    const pivotLowRsi = ta.pivotlow(rsiValue, left, right).offset(right);
    const pivotHighRsi = ta.pivothigh(rsiValue, left, right).offset(right);
    const lowThen = low.offset(right);
    const highThen = high.offset(right);
    const windowStart = rsiValue.offset(left + right);
    const [
      ,
      ,
      ,
      ,
      ,
      ,
      lowKind,
      lowFrom,
      lowFromRsi,
      highKind,
      highFrom,
      highFromRsi
    ] = ta.scan([NaN, NaN, NaN, NaN, NaN, NaN, 0, NaN, NaN, 0, NaN, NaN], (prev, _bar, i) => {
      let [lastLowRsi, lastLow, lastLowAt, lastHighRsi, lastHigh, lastHighAt] = prev;
      let [lk, lf, lfr, hk, hf, hfr] = [0, NaN, NaN, 0, NaN, NaN];
      const ready = Number.isFinite(windowStart.get(i));
      const pl = pivotLowRsi.get(i);
      if (ready && Number.isFinite(pl)) {
        const price = lowThen.get(i);
        const since = i - lastLowAt - 1;
        if (since >= rangeMin && since <= rangeMax) {
          if (price < lastLow && pl > lastLowRsi) lk = 1;
          else if (price > lastLow && pl < lastLowRsi) lk = 2;
          if (lk > 0) [lf, lfr] = [lastLowAt - right, lastLowRsi];
        }
        [lastLowRsi, lastLow, lastLowAt] = [pl, price, i];
      }
      const ph = pivotHighRsi.get(i);
      if (ready && Number.isFinite(ph)) {
        const price = highThen.get(i);
        const since = i - lastHighAt - 1;
        if (since >= rangeMin && since <= rangeMax) {
          if (price > lastHigh && ph < lastHighRsi) hk = 1;
          else if (price < lastHigh && ph > lastHighRsi) hk = 2;
          if (hk > 0) [hf, hfr] = [lastHighAt - right, lastHighRsi];
        }
        [lastHighRsi, lastHigh, lastHighAt] = [ph, price, i];
      }
      return [lastLowRsi, lastLow, lastLowAt, lastHighRsi, lastHigh, lastHighAt, lk, lf, lfr, hk, hf, hfr];
    });
    const guide = "#787b86";
    const upper = hline(overbought, { title: "Overbought", color: guide, style: "dashed" });
    hline(50, { title: "Middle", color: color.new(guide, 50), style: "dotted" });
    const lower = hline(oversold, { title: "Oversold", color: guide, style: "dashed" });
    fill(upper, lower, { color: color.new(rsiColor, 90) });
    plot(rsiValue, { title: "RSI", color: rsiColor, linewidth: 2 });
    const found = [];
    for (let i = 0; i < bars.length; i++) {
      const lk = lowKind.get(i);
      if (lk === 1 && showBull || lk === 2 && showHiddenBull) {
        found.push({ from: lowFrom.get(i), fromRsi: lowFromRsi.get(i), to: i - right, bullish: true, hidden: lk === 2 });
      }
      const hk = highKind.get(i);
      if (hk === 1 && showBear || hk === 2 && showHiddenBear) {
        found.push({ from: highFrom.get(i), fromRsi: highFromRsi.get(i), to: i - right, bullish: false, hidden: hk === 2 });
      }
    }
    for (const d of found.slice(-keep)) {
      const tint = d.bullish ? bullColor : bearColor;
      const toRsi = rsiValue.get(d.to);
      line.new(d.from, d.fromRsi, d.to, toRsi, { color: tint, width: d.hidden ? 1 : 2, style: d.hidden ? "dashed" : "solid" });
      label.new(d.to, toRsi, `${d.hidden ? "H " : ""}${d.bullish ? "Bull" : "Bear"}`, {
        style: d.bullish ? label.style_label_up : label.style_label_down,
        color: tint,
        textColor: "#ffffff",
        size: size.small
      });
    }
    alertcondition(lowKind.eq(1), {
      id: "regular-bullish",
      title: "Regular bullish divergence",
      message: "RSI regular bullish divergence: price made a lower low, RSI a higher low"
    });
    alertcondition(lowKind.eq(2), {
      id: "hidden-bullish",
      title: "Hidden bullish divergence",
      message: "RSI hidden bullish divergence: price made a higher low, RSI a lower low"
    });
    alertcondition(highKind.eq(1), {
      id: "regular-bearish",
      title: "Regular bearish divergence",
      message: "RSI regular bearish divergence: price made a higher high, RSI a lower high"
    });
    alertcondition(highKind.eq(2), {
      id: "hidden-bearish",
      title: "Hidden bearish divergence",
      message: "RSI hidden bearish divergence: price made a lower high, RSI a higher high"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/0efd3e5fe544a84c","declarations":[{"slot":0,"kind":"hline","kindOrdinal":0,"source":{"file":"indicator.ts","line":70,"column":15},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":1,"kind":"hline","kindOrdinal":1,"source":{"file":"indicator.ts","line":71,"column":1},"valueType":"number","qualifiers":{"value":"const","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":2,"kind":"hline","kindOrdinal":2,"source":{"file":"indicator.ts","line":72,"column":15},"valueType":"number","qualifiers":{"value":"input","title":"const","color":"const","lineWidth":"const","lineStyle":"const"}},{"slot":3,"kind":"fill","kindOrdinal":0,"source":{"file":"indicator.ts","line":73,"column":1},"valueType":"fill","qualifiers":{"color":"input"},"dependencySlots":[0,2],"edgeKind":"hline"},{"slot":4,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":75,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"drawingContract":"g-script-v2","alertConditions":[{"id":"regular-bullish","title":"Regular bullish divergence","message":"RSI regular bullish divergence: price made a lower low, RSI a higher low"},{"id":"hidden-bullish","title":"Hidden bullish divergence","message":"RSI hidden bullish divergence: price made a higher low, RSI a lower low"},{"id":"regular-bearish","title":"Regular bearish divergence","message":"RSI regular bearish divergence: price made a higher high, RSI a lower high"},{"id":"hidden-bearish","title":"Hidden bearish divergence","message":"RSI hidden bearish divergence: price made a lower high, RSI a higher high"}]});
