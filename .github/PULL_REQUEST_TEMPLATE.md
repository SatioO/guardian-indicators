<!-- Guardian indicators: change indicators/<name>/ only — CI builds, signs and catalogs.
     Prebuilt (SDK v1) packages: add packages/pub.<creator>.<name>/<version>/{manifest.json,bundle.js} only.
     Never add package.sig or edit catalog.json. -->

## Indicator

- **id:** `pub.<author>.<name>`
- **version:** `x.y.z` (change level: patch / minor / major)
- **what changed:** <one line>

## Author checklist

- [ ] `version` in `manifest.json` is bumped at least as much as the change (CI enforces it and names the smallest valid version).
- [ ] `RELEASE-NOTES.md` has a `## x.y.z` entry written for traders (what they'll notice; a Breaking change says what to redo).
- [ ] Tests cover the change against a reference computation; `npm test` passes.
- [ ] `npm run check` shows what merging publishes, and it is what I intend.
- [ ] I have the right to publish this code.

## Reviewer checklist

- [ ] The *What merging publishes* summary on the `check` run matches the intent (versions, change level, reasons).
- [ ] Name, summary and release notes are accurate and non-deceptive.
- [ ] The drawn output is sane on the test fixtures (not an obviously misleading signal).
- [ ] A `toolchain/` change is a real app build (`npx gscript-toolchain info`) and was deliberate.
