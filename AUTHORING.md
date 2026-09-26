# Authoring a Guardian indicator

Guardian's indicators are G Script v2 scripts published from this Registry to
every trader. Each one is also a conformance test of the language: it runs
through the same route a user's script does (the pinned toolchain is the app's
own), and its numbers are held to the reference platform's published
definition of the study. An indicator that passes is a script that loads, draws
and alerts correctly for a trader.

## What a folder holds

```
indicators/<slug>/
  manifest.json     { type: "local.<slug>", name, placement, apiVersion: 2, gScriptVersion: 2, version: "1.0.0" }
  indicator.ts      the script; first line //@gscript=2
  listing.json      { "authored": { fullName?, summary, description, categories, tags } }
  RELEASE-NOTES.md  one "## x.y.z" entry per Published version
  <slug>.test.ts    tests against a reference computation
```

It publishes as `pub.guardian.<slug>`; `type` is how the app's Developer Mode
loads the folder while you work on it.

- `slug`: lower-case words joined by hyphens, starting with a letter.
- `placement`: `price` for an overlay, `own-subpane` for a pane (match `indicator(..., { overlay })`).
- `name`: 3–60 plain ASCII characters, no word of 5+ capitals.
- `version`: semver; see the README for the version rules CI enforces.

### listing.json

The Library's format (`indicators/listings.test.ts` checks every listing with the app's own rules):

- `summary`: one sentence, 20–140 characters, no links or handles.
- `description`: at least 200 characters of text, exactly three `##` headings in
  this order — `What it shows`, `How to read it`, `Limits`. Paragraphs, `-`
  lists, `**bold**`, `*italic*` and `` `code` `` only.
- Name every input by its exact label in bold and give defaults as
  "(14 by default)". Use Indian digit grouping (5,00,000).
- `categories`: 1–3 of `trend momentum volatility volume orderflow pivot
  patterns depth fundamental utility`; the first is the primary one.
- `tags`: up to 8, lower case, `^[a-z0-9][a-z0-9-]{0,23}$`, no duplicates.
- Never promise results (win rate, accuracy, profits) and never name another
  charting language: the language is G Script.

## Test first, at the agreed seam

Every indicator has `indicators/<slug>/<slug>.test.ts`. Tests go through the
toolchain's test runtime only — never into the runtime's internals:

```ts
import { createTestRuntime, realisticDaily, closeSeries } from 'guardian-gscript-toolchain';
const runtime = await createTestRuntime();          // once per file (beforeAll)
const ind = await runtime.load('adr-percent');      // production route: bundle → analyse → discover → dry run
const run = await ind.run(bars, { length: 10 }, { symbols: { 'INDEX:NIFTY': indexBars } });
run.plot('ADR%');          // number | null per bar
run.plotColors('ADR%');    // per-bar colour
run.markers('Buy');        // plotshape / plotchar, per bar
run.level('Minimum ADR%'); // hline price
run.fillColors / colorEffect / alert('Tight day') / drawings / table() / shown('ADR (price)') / outputs()
```

Settings are keyed by each input's `id`. Other timeframes and symbols are
authenticated exactly as a chart authenticates them; a declared dataset the test
does not supply is pending (empty).

Work in vertical slices: one failing test, the least code that passes it, the
next test. Expected values come from an independent source of truth, never from
the code under test:

- a value worked by hand on bars shaped to make it obvious (the toolchain's
  `barsFrom`, `flatRangeBars`, `pathBars`, `realisticDaily`), and
- the published formula as a plain loop — shared ones (`sma`, `rma`, `atr`,
  `supertrend`, …) come from the toolchain; write new ones as local functions
  in your test.

## Agree on the reference contract

Match the reference platform's built-in study: its formula, default inputs,
warm-up, and what it draws. State the definition in a comment where you
recompute it. When your script uses `ta.X`, your independent reference is what
checks `ta.X`'s numbers — that is how these indicators find language bugs.

If G Script disagrees with the definition, loads on the legacy route, refuses
something the language documents, or gives a confusing error: **do not work
around it.** Stop, write the smallest source that shows it (expected vs actual),
and report it in the Guardian app repo. The language is fixed at the root with
its own regression test, gated so released versions never change meaning; the
fix reaches this Registry with the next toolchain bump.

## G Script v2 facts that save time

- Series have methods, not operators: `close.sub(open).div(open).mul(100)`,
  `a.gt(b)`, `a.and(b)`, `cond.iff(x, y)`, `x.offset(1)` (one bar ago). JS
  operators on a Series are refused.
- `const [a, b, c] = ta.macd(close, 12, 26, 9)` — destructuring is fine.
- Per-bar colour: `color: bars.map((_bar, i) => (x.get(i) > 0 ? up : down))`.
  `color.new(c, 80)` is 80% transparent.
- State carried bar to bar: `ta.scan(seed, (prev, bar, i) => next)` — numbers
  only; a fixed-length array seed returns one Series per slot. Read other
  series inside with `.get(i)`.
- Plot styles: `line`, `stepline`, `histogram`, `columns`, `area`. Dots are
  `plotshape(cond.iff(value, na), { location: location.absolute, shape: shape.circle })`.
- `hline(price, { title, color, style: 'dashed' | 'dotted' | 'solid' })`.
- `fill(plotA, plotB, { color })` — no title in v2; one colour per fill.
- `display.none` hides a helper plot; `display.data_window` shows a value
  only in the Data Window.
- `alertcondition(cond, { id: 'kebab-id', title, message })` — once, top level.
- Inputs: `input.int / float / bool / color / string(def, 'Label', { id: 'kebab-id', min, max, step, options: [...] }) / symbol / timeframe / source`.
  Give every input a stable `id`.
- `request.security('INDEX:NIFTY', '', 'close')` or a callback
  `(s) => s.ta.sma(s.close, 10)`; `''` means this chart's symbol or timeframe.
- Never name a variable after a built-in: `line`, `label`, `box`, `table`,
  `color`, `time`, `close`, `volume`… (esbuild reports "already declared").
- `table.new(position.top_right, cols, rows)`, `table.cell(t, col, row, text, { textColor, bold, mono })`.
- `label.new(barIndex, price, text, { style: label.style_label_up, color, textColor, size })`,
  `line.new(x1, y1, x2, y2, { color, width, style, extend })`.

## Design standard

Design as a trader would want to read it.

- One clear idea per indicator, the reference platform's defaults, and the
  extras a professional reaches for (a signal line, zones, the key alert).
- House palette: up `#26a69a`, down `#ef5350`, accent `#38bdf8`, violet
  `#a78bfa`, amber `#f59e0b`, guides `#787b86` (dashed), zone fills at 85–92%
  transparency. Expose colours as inputs.
- Every plot has a meaningful, unique `title` — the Library lists them. Hide
  helper plots with `display.none`; put useful secondary numbers in the Data
  Window.
- Nothing is drawn before the study is defined; missing data draws nothing
  rather than a wrong line.
- Fast: prefer `ta.*`; avoid per-bar loops over a window. Every plotted
  indicator recomputes on live ticks, so aim well under 1 s for 5,000 bars.

## Checks before calling it done

```sh
npx vitest run indicators/<slug>            # its tests
npx vitest run indicators/listings.test.ts  # its listing
npm run check                               # builds it as the app installs it + version rules
```
