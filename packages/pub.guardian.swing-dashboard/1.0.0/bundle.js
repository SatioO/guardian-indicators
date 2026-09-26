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
    indicator("Swing Dashboard", { overlay: true });
    const benchmark = input.symbol("INDEX:NIFTY", "Benchmark", { id: "benchmark" });
    const place = input.string("Top right", "Position", {
      id: "position",
      options: ["Top right", "Top left", "Bottom right", "Bottom left"]
    });
    const adrLength = input.int(20, "ADR length", { id: "adr-length", min: 1, max: 200 });
    const atrLength = input.int(14, "ATR length", { id: "atr-length", min: 1, max: 200 });
    const volumeLength = input.int(50, "Volume average length", { id: "volume-length", min: 2, max: 500 });
    const minAdr = input.float(3.5, "Minimum ADR%", { id: "min-adr", min: 0, step: 0.5 });
    const minTurnover = input.float(10, "Minimum turnover (\u20B9 Cr)", { id: "min-turnover", min: 0, step: 1 });
    const surgeAt = input.float(1.5, "Volume surge at (\xD7 average)", { id: "surge-at", min: 1, step: 0.1 });
    const dryUpAt = input.float(0.5, "Volume dry-up at (\xD7 average)", { id: "dry-up-at", min: 0, max: 1, step: 0.05 });
    const upColor = input.color("#26a69a", "Good", { id: "up-color" });
    const downColor = input.color("#ef5350", "Poor", { id: "down-color" });
    const surgeColor = input.color("#f59e0b", "Volume surge", { id: "surge-color" });
    const dryUpColor = input.color("#38bdf8", "Volume dry-up", { id: "dry-up-color" });
    const YEAR = 252;
    const QUARTER = 63;
    const adr = ta.sma(high.div(low), adrLength).sub(1).mul(100);
    const atrPct = ta.atr(atrLength).div(close).mul(100);
    const rvol = volume.div(ta.sma(volume, volumeLength).offset(1));
    const offHigh = close.div(ta.highest(high, YEAR)).sub(1).mul(100);
    const aboveLow = close.div(ta.lowest(low, YEAR)).sub(1).mul(100);
    const turnoverCr = ta.sma(close.mul(volume), volumeLength).div(1e7);
    const upClose = close.gt(close.offset(1));
    const downClose = close.lt(close.offset(1));
    const upVolume = ta.sma(upClose.iff(volume, 0), volumeLength);
    const downVolume = ta.sma(downClose.iff(volume, 0), volumeLength);
    const upDown = upVolume.div(downVolume);
    const from50 = close.div(ta.sma(close, 50)).sub(1).mul(100);
    const index = request.security(benchmark, "", "close");
    const vsIndex = close.div(close.offset(QUARTER)).div(index.div(index.offset(QUARTER))).sub(1).mul(100);
    const dryUp = rvol.lte(dryUpAt);
    const volumeSurge = rvol.gte(surgeAt);
    const quietAccumulation = dryUp.and(upDown.gte(1));
    plot(adr, { title: "ADR%", display: display.data_window, format: format.percent });
    plot(atrPct, { title: "ATR%", display: display.data_window, format: format.percent });
    plot(rvol, { title: "RVOL", display: display.data_window });
    plot(offHigh, { title: "% off 52-week high", display: display.data_window, format: format.percent });
    plot(aboveLow, { title: "% above 52-week low", display: display.data_window, format: format.percent });
    plot(turnoverCr, { title: "Avg turnover (\u20B9 Cr)", display: display.data_window });
    plot(upDown, { title: "Up/down volume ratio", display: display.data_window });
    plot(from50, { title: "% from 50 SMA", display: display.data_window, format: format.percent });
    plot(vsIndex, { title: "3M vs benchmark (%)", display: display.data_window, format: format.percent });
    alertcondition(quietAccumulation, {
      id: "quiet-accumulation",
      title: "Quiet accumulation",
      message: "Volume dry-up at or below the Volume dry-up threshold, with up/down volume at or above 1"
    });
    alertcondition(volumeSurge, {
      id: "volume-surge",
      title: "Volume surge",
      message: "RVOL reached the Volume surge at threshold"
    });
    const grouped = (value) => {
      const [whole, fraction] = value.toFixed(1).split(".");
      const head = whole.slice(0, -3);
      return `${head ? `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${whole.slice(-3)}` : whole}.${fraction}`;
    };
    const money = (crore) => crore >= 1 ? `\u20B9 ${grouped(crore)} Cr` : `\u20B9 ${grouped(crore * 100)} L`;
    const percent = (v) => `${v.toFixed(2)}%`;
    const signed = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
    const byGood = (good) => good ? upColor : downColor;
    if (bars.length > 0) {
      const last = bars.length - 1;
      const benchName = benchmark.includes(":") ? benchmark.slice(benchmark.indexOf(":") + 1) : benchmark;
      const muted = "#787b86";
      const BULLISH_EXTREME = Number.MAX_VALUE;
      const upDownLast = (() => {
        const up = upVolume.get(last);
        const down = downVolume.get(last);
        return down === 0 && up > 0 ? BULLISH_EXTREME : upDown.get(last);
      })();
      const rows = [
        [`ADR% (${adrLength})`, adr.get(last), percent, (v) => v >= minAdr ? upColor : muted],
        [`ATR% (${atrLength})`, atrPct.get(last), percent, () => void 0],
        [
          `RVOL (${volumeLength})`,
          rvol.get(last),
          (v) => `${v.toFixed(2)}\xD7`,
          (v) => v >= surgeAt ? surgeColor : v <= dryUpAt ? dryUpColor : void 0
        ],
        ["Off 52-week high", offHigh.get(last), signed, (v) => byGood(v >= -25)],
        ["Above 52-week low", aboveLow.get(last), signed, (v) => byGood(v >= 30)],
        [`Avg turnover (${volumeLength})`, turnoverCr.get(last), money, (v) => byGood(v >= minTurnover)],
        [
          `Up/down volume (${volumeLength})`,
          upDownLast,
          (v) => v === BULLISH_EXTREME ? "\u221E" : v.toFixed(2),
          (v) => byGood(v === BULLISH_EXTREME || v >= 1)
        ],
        ["From 50 SMA", from50.get(last), signed, (v) => byGood(v >= 0)],
        [`3M vs ${benchName}`, vsIndex.get(last), signed, (v) => byGood(v >= 0)]
      ];
      const positions = {
        "Top right": position.top_right,
        "Top left": position.top_left,
        "Bottom right": position.bottom_right,
        "Bottom left": position.bottom_left
      };
      const panel = table.new(positions[place] ?? position.top_right, 2, rows.length + 1);
      table.cell(panel, 0, 0, "Swing dashboard", { bold: true });
      table.cell(panel, 1, 0, "");
      rows.forEach(([name, value, text, tint], k) => {
        const known = Number.isFinite(value);
        table.cell(panel, 0, k + 1, name);
        table.cell(panel, 1, k + 1, known ? text(value) : "\u2014", { mono: true, textColor: known ? tint(value) : muted });
      });
    }
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/1e214f77861229b0","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":43,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":1,"kind":"plot","kindOrdinal":1,"source":{"file":"indicator.ts","line":44,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":2,"kind":"plot","kindOrdinal":2,"source":{"file":"indicator.ts","line":45,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":3,"kind":"plot","kindOrdinal":3,"source":{"file":"indicator.ts","line":46,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":4,"kind":"plot","kindOrdinal":4,"source":{"file":"indicator.ts","line":47,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":5,"kind":"plot","kindOrdinal":5,"source":{"file":"indicator.ts","line":48,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":6,"kind":"plot","kindOrdinal":6,"source":{"file":"indicator.ts","line":49,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":7,"kind":"plot","kindOrdinal":7,"source":{"file":"indicator.ts","line":50,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0},{"slot":8,"kind":"plot","kindOrdinal":8,"source":{"file":"indicator.ts","line":51,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"const","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"line","histBase":0}],"drawingContract":"g-script-v2","alertConditions":[{"id":"quiet-accumulation","title":"Quiet accumulation","message":"Volume dry-up at or below the Volume dry-up threshold, with up/down volume at or above 1"},{"id":"volume-surge","title":"Volume surge","message":"RVOL reached the Volume surge at threshold"}]});
