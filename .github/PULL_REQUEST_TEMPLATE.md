<!-- Publishing an indicator? Add ONLY packages/pub.<creator>.<name>/<version>/manifest.json + bundle.js.
     Do NOT add package.sig or edit catalog.json — CI generates both on merge. -->

## Indicator

- **id:** `pub.<creator>.<name>`
- **version:** `x.y.z`
- **what it does:** <one line>

## Author checklist

- [ ] Package is under `packages/pub.<creator>.<name>/<version>/` with `manifest.json` + `bundle.js` only.
- [ ] `manifest.type` equals the folder id and is `pub.<creator>.<name>`; `version` matches the folder; `apiVersion` is set.
- [ ] `manifest` includes `name`, `creator`, `description`.
- [ ] `bundle.js` is the resolution-sandboxed build (assigns `globalThis.compute`); no network/DOM/import of anything outside the SDK.
- [ ] This version is NEW (published versions are immutable — never edit an existing version's files).
- [ ] I have the right to publish this code (not a copy of someone else's paid/closed script).

## Moderator checklist

- [ ] `id`/`version`/folder agree; `creator` matches the author (not impersonating).
- [ ] Name/description are accurate and non-deceptive (no fake "official"/"institutional" claims).
- [ ] Sanity-checked the drawn output on fixture data (not obviously misleading signals).
- [ ] On merge, CI will sign + rebuild the catalog.
