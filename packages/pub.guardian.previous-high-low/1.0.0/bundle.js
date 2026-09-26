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
    indicator("Previous High and Low", { overlay: true, max_labels_count: 20 });
    const showDay = input.bool(true, "Previous day high/low", { id: "day" });
    const showDayClose = input.bool(true, "Previous day close", { id: "day-close" });
    const showWeek = input.bool(true, "Previous week high/low", { id: "week" });
    const showMonth = input.bool(true, "Previous month high/low", { id: "month" });
    const showLabels = input.bool(true, "Label the levels", { id: "labels" });
    const markBreaks = input.bool(true, "Mark the first break of the day", { id: "breaks" });
    const dayColor = input.color("#38bdf8", "Day", { id: "day-color" });
    const closeColor = input.color("#787b86", "Day close", { id: "close-color" });
    const weekColor = input.color("#a78bfa", "Week", { id: "week-color" });
    const monthColor = input.color("#f59e0b", "Month", { id: "month-color" });
    const IST = 19800;
    const dayKey = (t) => Math.floor((t + IST) / 86400);
    const weekKey = (t) => {
      const d = dayKey(t);
      return d - (d + 3) % 7;
    };
    const monthKey = (t) => {
      const w = new Date((t + IST) * 1e3);
      return w.getUTCFullYear() * 12 + w.getUTCMonth();
    };
    const dayKeys = bars.map((b) => dayKey(b.time));
    const weekKeys = bars.map((b) => weekKey(b.time));
    const monthKeys = bars.map((b) => monthKey(b.time));
    const chartRank = timeframe.isintraday ? 0 : timeframe.isdaily ? 1 : timeframe.isweekly ? 2 : 3;
    const day = {
      high: request.security("", "1D", "high"),
      low: request.security("", "1D", "low"),
      close: request.security("", "1D", "close")
    };
    const week = { high: request.security("", "W", "high"), low: request.security("", "W", "low") };
    const month = { high: request.security("", "1M", "high"), low: request.security("", "1M", "low") };
    const previousPeriod = (rank, keys, requested, own) => (prev, _bar, i) => {
      if (chartRank > rank) return NaN;
      if (chartRank === rank) return i === 0 ? NaN : own.get(i - 1);
      return i === 0 || keys[i] !== keys[i - 1] ? requested.get(i) : prev;
    };
    const pdh = ta.scan(NaN, previousPeriod(1, dayKeys, day.high, high));
    const pdl = ta.scan(NaN, previousPeriod(1, dayKeys, day.low, low));
    const pdc = ta.scan(NaN, previousPeriod(1, dayKeys, day.close, close));
    const pwh = ta.scan(NaN, previousPeriod(2, weekKeys, week.high, high));
    const pwl = ta.scan(NaN, previousPeriod(2, weekKeys, week.low, low));
    const pmh = ta.scan(NaN, previousPeriod(3, monthKeys, month.high, high));
    const pml = ta.scan(NaN, previousPeriod(3, monthKeys, month.low, low));
    plot(showDay ? pdh : na, { style: plot.style_stepline, title: "Previous day high", color: dayColor });
    plot(showDay ? pdl : na, { style: plot.style_stepline, title: "Previous day low", color: dayColor });
    plot(showDayClose ? pdc : na, { style: plot.style_stepline, title: "Previous day close", color: closeColor });
    plot(showWeek ? pwh : na, { style: plot.style_stepline, title: "Previous week high", color: weekColor });
    plot(showWeek ? pwl : na, { style: plot.style_stepline, title: "Previous week low", color: weekColor });
    plot(showMonth ? pmh : na, { style: plot.style_stepline, title: "Previous month high", color: monthColor });
    plot(showMonth ? pml : na, { style: plot.style_stepline, title: "Previous month low", color: monthColor });
    const [brokeHigh, brokeLow] = ta.scan([0, 0, NaN, NaN], (prev, bar2, i) => {
      const fresh = i === 0 || dayKeys[i] !== dayKeys[i - 1];
      const highBefore = fresh ? NaN : prev[2];
      const lowBefore = fresh ? NaN : prev[3];
      const level = pdh.get(i);
      const floor = pdl.get(i);
      return [
        bar2.high > level && !(highBefore > level) ? 1 : 0,
        bar2.low < floor && !(lowBefore < floor) ? 1 : 0,
        Number.isNaN(highBefore) ? bar2.high : Math.max(highBefore, bar2.high),
        Number.isNaN(lowBefore) ? bar2.low : Math.min(lowBefore, bar2.low)
      ];
    });
    const brokeAbove = brokeHigh.gt(0);
    const brokeBelow = brokeLow.gt(0);
    plotshape(markBreaks && showDay ? brokeAbove : false, {
      title: "Previous day high break",
      shape: shape.triangleup,
      location: location.belowbar,
      color: dayColor,
      size: size.tiny
    });
    plotshape(markBreaks && showDay ? brokeBelow : false, {
      title: "Previous day low break",
      shape: shape.triangledown,
      location: location.abovebar,
      color: dayColor,
      size: size.tiny
    });
    alertcondition(markBreaks && showDay ? brokeAbove : false, {
      id: "broke-previous-day-high",
      title: "Broke previous day high",
      message: "Price traded above the previous day's high"
    });
    alertcondition(markBreaks && showDay ? brokeBelow : false, {
      id: "broke-previous-day-low",
      title: "Broke previous day low",
      message: "Price traded below the previous day's low"
    });
    const inr = (value) => {
      const [whole, fraction] = Math.abs(value).toFixed(2).split(".");
      const head = whole.slice(0, -3);
      const grouped = head ? `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${whole.slice(-3)}` : whole;
      return `${value < 0 ? "-" : ""}${grouped}.${fraction}`;
    };
    if (showLabels && bars.length > 0) {
      const last = bars.length - 1;
      const tags = [
        [showDay, pdh, "PDH", dayColor],
        [showDay, pdl, "PDL", dayColor],
        [showDayClose, pdc, "PDC", closeColor],
        [showWeek, pwh, "PWH", weekColor],
        [showWeek, pwl, "PWL", weekColor],
        [showMonth, pmh, "PMH", monthColor],
        [showMonth, pml, "PML", monthColor]
      ];
      for (const [shown, series, tag, tint] of tags) {
        const price = series.get(last);
        if (!shown || !Number.isFinite(price)) continue;
        label.new(last, price, `${tag} ${inr(price)}`, {
          style: label.style_label_left,
          color: color.new(tint, 100),
          textColor: tint,
          size: size.small
        });
      }
    }
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/5c87b8338c0c215e","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":58,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"stepline","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":59,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"stepline","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":60,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"stepline","histBase":0},{"slot":3,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":61,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"stepline","histBase":0},{"slot":4,"kind":"plot","kindOrdinal":4,"source":{"file":"indicator.ts","line":62,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"stepline","histBase":0},{"slot":5,"kind":"plot","kindOrdinal":5,"source":{"file":"indicator.ts","line":63,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"stepline","histBase":0},{"slot":6,"kind":"plot","kindOrdinal":6,"source":{"file":"indicator.ts","line":64,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"input","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"stepline","histBase":0},{"slot":7,"kind":"plotshape","kindOrdinal":0,"source":{"file":"indicator.ts","line":83,"column":1},"valueType":"boolean","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":8,"kind":"plotshape","kindOrdinal":1,"source":{"file":"indicator.ts","line":90,"column":1},"valueType":"boolean","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}}],"drawingContract":"g-script-v2","alertConditions":[{"id":"broke-previous-day-high","title":"Broke previous day high","message":"Price traded above the previous day's high"},{"id":"broke-previous-day-low","title":"Broke previous day low","message":"Price traded below the previous day's low"}]});
