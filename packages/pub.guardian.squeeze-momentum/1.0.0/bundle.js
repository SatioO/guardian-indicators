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
    indicator("Squeeze Momentum", { overlay: false, precision: 2 });
    const bbLength = input.int(20, "BB length", { id: "bb-length", min: 1, max: 500 });
    const bbMult = input.float(2, "BB mult factor", { id: "bb-mult", min: 0.1, max: 10, step: 0.1 });
    const kcLength = input.int(20, "KC length", { id: "kc-length", min: 1, max: 500 });
    const kcMult = input.float(1.5, "KC mult factor", { id: "kc-mult", min: 0.1, max: 10, step: 0.1 });
    const useTrueRange = input.bool(true, "Use true range (KC)", { id: "use-true-range" });
    const upColor = input.color("#26a69a", "Momentum above zero", { id: "up-color" });
    const downColor = input.color("#ef5350", "Momentum below zero", { id: "down-color" });
    const onColor = input.color("#787b86", "Squeeze on", { id: "on-color" });
    const offColor = input.color("#26a69a", "Squeeze off", { id: "off-color" });
    const bbBasis = ta.sma(close, bbLength);
    const bbDev = ta.stdev(close, bbLength).mul(bbMult);
    const upperBB = bbBasis.add(bbDev);
    const lowerBB = bbBasis.sub(bbDev);
    const kcBasis = ta.sma(close, kcLength);
    const range = useTrueRange ? ta.tr(false) : high.sub(low);
    const rangeMa = ta.sma(range, kcLength);
    const upperKC = kcBasis.add(rangeMa.mul(kcMult));
    const lowerKC = kcBasis.sub(rangeMa.mul(kcMult));
    const squeezeOn = lowerBB.gt(lowerKC).and(upperBB.lt(upperKC));
    const squeezeOff = lowerBB.lte(lowerKC).or(upperBB.gte(upperKC));
    const fired = squeezeOff.and(squeezeOn.offset(1));
    const donchianMid = math.avg(ta.highest(high, kcLength), ta.lowest(low, kcLength));
    const momentum = ta.linreg(close.sub(math.avg(donchianMid, kcBasis)), kcLength, 0);
    plot(momentum, {
      title: "Momentum",
      style: plot.style_columns,
      color: bars.map((_bar, i) => {
        const now = momentum.get(i);
        const before = i > 0 && !na(momentum.get(i - 1)) ? momentum.get(i - 1) : 0;
        if (now > 0) return now > before ? upColor : color.new(upColor, 55);
        return now < before ? downColor : color.new(downColor, 55);
      })
    });
    plotshape(squeezeOn.iff(0, na), {
      title: "Squeeze on",
      shape: shape.circle,
      location: location.absolute,
      color: onColor,
      size: size.tiny
    });
    plotshape(squeezeOff.iff(0, na), {
      title: "Squeeze off",
      shape: shape.circle,
      location: location.absolute,
      color: offColor,
      size: size.tiny
    });
    alertcondition(fired, {
      id: "squeeze-fired",
      title: "Squeeze fired",
      message: "The Bollinger Bands moved back outside the Keltner Channels: the squeeze fired"
    });
  }
  return __toCommonJS(indicator_exports);
})();

globalThis.compute = globalThis.__pine.makeComputeForVersion(2,"g-script-v2",__pineMod.__gScriptRunV2,{"mode":"native-event","declarationFingerprint":"pine-event-declarations/v1/8a5016f8db0e39ac","declarations":[{"slot":0,"kind":"plot","kindOrdinal":0,"source":{"file":"indicator.ts","line":38,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","color":"series","lineWidth":"const","style":"const","histBase":"const","editable":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"},"style":"columns","histBase":0},{"slot":1,"kind":"plotshape","kindOrdinal":0,"source":{"file":"indicator.ts","line":48,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}},{"slot":2,"kind":"plotshape","kindOrdinal":1,"source":{"file":"indicator.ts","line":55,"column":1},"valueType":"number","qualifiers":{"value":"series","title":"const","primary":"const","text":"const","location":"const","color":"input","textColor":"const","editable":"const","size":"const","showLast":"const","display":"const","format":"const","precision":"const","offsetBars":"const","forceOverlay":"const"}}],"alertConditions":[{"id":"squeeze-fired","title":"Squeeze fired","message":"The Bollinger Bands moved back outside the Keltner Channels: the squeeze fired"}]});
