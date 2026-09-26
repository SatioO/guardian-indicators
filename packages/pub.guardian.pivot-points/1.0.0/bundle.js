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
    indicator("Pivot Points Standard", { overlay: true, max_lines_count: 500, max_labels_count: 500 });
    const kind = input.string("Traditional", "Type", {
      id: "type",
      options: ["Traditional", "Fibonacci", "Woodie", "Classic", "DM", "Camarilla"]
    });
    const anchor = input.string("Auto", "Pivots timeframe", { id: "timeframe", options: ["Auto", "Daily", "Weekly", "Monthly"] });
    const periodsBack = input.int(15, "Number of pivots back", { id: "periods", min: 1, max: 40 });
    const showLabels = input.bool(true, "Show labels", { id: "labels" });
    const showPrices = input.bool(true, "Show prices", { id: "prices" });
    const lineWidth = input.int(1, "Line width", { id: "width", min: 1, max: 4 });
    const pivotColor = input.color("#f59e0b", "Pivot", { id: "pivot-color" });
    const resistanceColor = input.color("#ef5350", "Resistance", { id: "resistance-color" });
    const supportColor = input.color("#26a69a", "Support", { id: "support-color" });
    const chartRank = timeframe.isintraday ? 0 : timeframe.isdaily ? 1 : timeframe.isweekly ? 2 : 3;
    const anchorRank = anchor === "Daily" ? 1 : anchor === "Weekly" ? 2 : anchor === "Monthly" ? 3 : chartRank + 1;
    const active = anchorRank > chartRank && anchorRank <= 3;
    const periodData = (tf) => ({
      high: request.security("", tf, "high"),
      low: request.security("", tf, "low"),
      close: request.security("", tf, "close"),
      open: request.security("", tf, "open")
    });
    const byRank = [null, periodData("1D"), periodData("W"), periodData("1M")];
    const prior = active ? byRank[anchorRank] : null;
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
    const keyOf = anchorRank === 1 ? dayKey : anchorRank === 2 ? weekKey : monthKey;
    const starts = [];
    if (active) {
      let lastKey = NaN;
      for (let i = 0; i < bars.length; i++) {
        const key = keyOf(bars[i].time);
        if (key !== lastKey) starts.push(i);
        lastKey = key;
      }
    }
    const SLOTS = ["P", "R1", "S1", "R2", "S2", "R3", "S3", "R4", "S4", "R5", "S5"];
    const levelsFor = (h, l, c, o, currentOpen) => {
      const r = h - l;
      if (kind === "DM") {
        const x = o === c ? h + l + 2 * c : c > o ? 2 * h + l + c : 2 * l + h + c;
        return [x / 4, x / 2 - l, x / 2 - h, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN];
      }
      if (kind === "Woodie") {
        const p2 = (h + l + 2 * currentOpen) / 4;
        const r3 = h + 2 * (p2 - l);
        const s3 = l - 2 * (h - p2);
        return [p2, 2 * p2 - l, 2 * p2 - h, p2 + r, p2 - r, r3, s3, r3 + r, s3 - r, NaN, NaN];
      }
      const p = (h + l + c) / 3;
      if (kind === "Fibonacci") {
        return [p, p + 0.382 * r, p - 0.382 * r, p + 0.618 * r, p - 0.618 * r, p + r, p - r, NaN, NaN, NaN, NaN];
      }
      if (kind === "Classic") {
        return [p, 2 * p - l, 2 * p - h, p + r, p - r, p + 2 * r, p - 2 * r, p + 3 * r, p - 3 * r, NaN, NaN];
      }
      if (kind === "Camarilla") {
        const r5 = h / l * c;
        return [
          p,
          c + 1.1 * r / 12,
          c - 1.1 * r / 12,
          c + 1.1 * r / 6,
          c - 1.1 * r / 6,
          c + 1.1 * r / 4,
          c - 1.1 * r / 4,
          c + 1.1 * r / 2,
          c - 1.1 * r / 2,
          r5,
          c - (r5 - c)
        ];
      }
      return [
        p,
        2 * p - l,
        2 * p - h,
        p + r,
        p - r,
        2 * p + (h - 2 * l),
        2 * p - (2 * h - l),
        3 * p + (h - 3 * l),
        3 * p - (3 * h - l),
        4 * p + (h - 4 * l),
        4 * p - (4 * h - l)
      ];
    };
    const periodLevels = starts.map((s) => levelsFor(
      prior.high.get(s),
      prior.low.get(s),
      prior.close.get(s),
      prior.open.get(s),
      open.get(s)
    ));
    const perBar = SLOTS.map(() => new Array(bars.length).fill(NaN));
    starts.forEach((s, k) => {
      const end = k + 1 < starts.length ? starts[k + 1] : bars.length;
      const levels = periodLevels[k];
      for (let slot = 0; slot < SLOTS.length; slot++) {
        for (let i = s; i < end; i++) perBar[slot][i] = levels[slot];
      }
    });
    const levelAt = (slot) => (_prev, _bar, i) => perBar[slot][i];
    plot(ta.scan(NaN, levelAt(0)), { title: "P", display: display.data_window, format: format.price });
    plot(ta.scan(NaN, levelAt(1)), { title: "R1", display: display.data_window, format: format.price });
    plot(ta.scan(NaN, levelAt(2)), { title: "S1", display: display.data_window, format: format.price });
    plot(ta.scan(NaN, levelAt(3)), { title: "R2", display: display.data_window, format: format.price });
    plot(ta.scan(NaN, levelAt(4)), { title: "S2", display: display.data_window, format: format.price });
    plot(ta.scan(NaN, levelAt(5)), { title: "R3", display: display.data_window, format: format.price });
    plot(ta.scan(NaN, levelAt(6)), { title: "S3", display: display.data_window, format: format.price });
    plot(ta.scan(NaN, levelAt(7)), { title: "R4", display: display.data_window, format: format.price });
    plot(ta.scan(NaN, levelAt(8)), { title: "S4", display: display.data_window, format: format.price });
    plot(ta.scan(NaN, levelAt(9)), { title: "R5", display: display.data_window, format: format.price });
    plot(ta.scan(NaN, levelAt(10)), { title: "S5", display: display.data_window, format: format.price });
    const inr = (value) => {
      const [whole, fraction] = Math.abs(value).toFixed(2).split(".");
      const head = whole.slice(0, -3);
      const grouped = head ? `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${whole.slice(-3)}` : whole;
      return `${value < 0 ? "-" : ""}${grouped}.${fraction}`;
    };
    const tintOf = (slot) => slot === 0 ? pivotColor : slot % 2 === 1 ? resistanceColor : supportColor;
    const first = Math.max(0, starts.length - periodsBack);
    for (let k = first; k < starts.length; k++) {
      const start = starts[k];
      const latest = k === starts.length - 1;
      const end = latest ? bars.length - 1 : starts[k + 1] - 1;
      const levels = periodLevels[k];
      for (let slot = 0; slot < SLOTS.length; slot++) {
        const price = levels[slot];
        if (!Number.isFinite(price)) continue;
        const tint = tintOf(slot);
        line.new(start, price, end, price, { color: tint, width: lineWidth, extend: latest ? extend.right : extend.none });
        if (showLabels) {
          label.new(start, price, showPrices ? `${SLOTS[slot]} (${inr(price)})` : SLOTS[slot], {
            style: label.style_label_right,
            color: color.new(tint, 100),
            textColor: tint,
            size: size.small
          });
        }
      }
    }
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/d07b67183a753ec5","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":109,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":110,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":111,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":3,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":112,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":4,"kind":"plot","kindOrdinal":4,"source":{"file":"indicator.ts","line":113,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":5,"kind":"plot","kindOrdinal":5,"source":{"file":"indicator.ts","line":114,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":6,"kind":"plot","kindOrdinal":6,"source":{"file":"indicator.ts","line":115,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":7,"kind":"plot","kindOrdinal":7,"source":{"file":"indicator.ts","line":116,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":8,"kind":"plot","kindOrdinal":8,"source":{"file":"indicator.ts","line":117,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":9,"kind":"plot","kindOrdinal":9,"source":{"file":"indicator.ts","line":118,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":10,"kind":"plot","kindOrdinal":10,"source":{"file":"indicator.ts","line":119,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"drawingContract":"g-script-v2"});
