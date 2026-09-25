# guardian-indicators

The published indicator **Registry** for the Guardian trading app. It is a plain public
GitHub repo served to the app over the free [jsDelivr](https://www.jsdelivr.com/) CDN — **no
server, no backend**. The app's Indicator Library lists `catalog.json`; **Add to chart** on an
indicator that isn't installed downloads its package, verifies the signature, and adds it —
nothing is downloaded until a trader adds it.

```
indicators/<name>/                    SOURCE — reviewed in PRs (Guardian's indicators)
  manifest.json                       name, placement, apiVersion, gScriptVersion, version
  indicator.ts                        the G Script
  listing.json                        how the Library describes it (summary, categories, tags)
  RELEASE-NOTES.md                    one "## x.y.z" entry per Published version
  <name>.test.ts                      tests against a reference computation
packages/pub.<author>.<name>/<version>/
  manifest.json                       BUILT by CI, contract baked in, provenance recorded
  bundle.js                           the compiled script
  package.sig                         the registry signature (CI)
catalog.json                          the index the app lists (CI)
toolchain/                            the app's G Script toolchain, pinned (see below)
scripts/                              sign / build-catalog / verify / PR guard
.github/workflows/check.yml           every PR: tests, build, version rules, PR guard
.github/workflows/sign-and-catalog.yml  on merge: build, sign, catalog, verify, CDN refresh
```

## The one invariant

**A package CI signs is one the app installs.** CI builds every indicator with
`toolchain/gscript-toolchain.mjs` — the app's own bundler, contract discovery, sandbox
dry-run and validators, pinned to one app build with the exact same compiler and sandbox
versions. "It built here" and "it installs in the app" cannot drift.

## The indicator lifecycle

| Step | Who | What happens |
|---|---|---|
| **Write** | Author | Add `indicators/<name>/` (copy an existing one). Run `npm test` and `npm run check`. |
| **Review** | PR + CI | `check` runs the indicator's tests, builds it exactly as the app installs it, enforces the version rules and the PR guard, and shows *What merging publishes* (each version, its change level and why) in the run summary. The Registry operator (CODEOWNERS) reviews. |
| **Publish** | Merge + CI | `sign-and-catalog` builds each new version into `packages/`, signs it, rebuilds `catalog.json`, verifies every signature, commits, and refreshes the CDN catalog — purging until jsDelivr serves the new catalog, or failing the run. It is in every trader's Library within minutes. (Actions → sign-and-catalog → Run workflow re-runs it by hand.) |
| **Install** | Trader | **Add to chart** downloads, verifies (signature + revocation), dry-runs, stores and adds it in one action. Every later start is instant — installed indicators load before first paint and work offline. |
| **Update** | Author → trader | A new version in `manifest.json` + a Release notes entry. The app shows *Update available* with the change level and the notes, and **always asks** — nothing updates silently. |
| **Roll back** | Trader | Published versions are immutable and stay installable; reinstalling an earlier version is the rollback. |
| **Retire** | Operator | Stop listing it (a delisting change) or, in an emergency, revoke a version through the app's trust runbook — installed copies of a revoked version stop running. |

## Publishing best practices (enforced by CI)

| Practice | Rule |
|---|---|
| Semantic versions | `manifest.json` `version` is semver. A Published version never changes: the same source again is *unchanged*; different source under a published version fails. |
| Contract-aware bumps | The new build's contract is compared with the latest Published version's. **Major** (a Breaking change): placement moved; an input, output or alert removed; an input changed kind or narrowed its range/options; an output drawn differently. **Minor**: something added, a range widened, a default changed, a newer G Script required. **Patch**: the computation, labels, titles. A smaller bump fails and names the smallest valid version. Before 1.0.0 a minor bump may carry a Breaking change. |
| Release notes | Every version after the first needs its `## x.y.z` entry in `RELEASE-NOTES.md`; it becomes the notes traders read before updating. |
| Tests | Every indicator has tests against a reference computation, run with the pinned toolchain's test runtime (`createTestRuntime`). |
| Provenance | Each built manifest records `build.sourceSha256` (the reviewed source) and `build.toolchain` (what built it). |
| Compatibility | Manifests carry `apiVersion` + `gScriptVersion`; the app refuses what it can't run and the Library says it needs a newer app. |
| Review gate | CODEOWNERS on `indicators/`, `toolchain/`, `scripts/`, `.github/`. Signing keys live only in the CI secret. A PR may not add signatures, edit `catalog.json`, change a Published version, or hand-add a package for an indicator built from `indicators/`. |
| Safety | Scripts run in the app's sandbox (QuickJS in WASM, in a Worker: no network, DOM, storage or timers). CI's dry-run proves the build runs there. |

## Writing an indicator

```bash
npm ci
cp -r indicators/connors-rsi indicators/my-indicator   # then edit
npm test                                               # its tests (and everyone's)
npm run check                                          # builds all, prints what merging publishes
```

- `manifest.json`: `name`, `placement` (`price` | `own-subpane`), `apiVersion: 2`,
  `gScriptVersion: 2`, `version`. Its `type` is how the app's developer mode loads the folder
  (`local.<name>`); the published id is always `pub.guardian.<folder name>`.
- `listing.json`: `authored.summary` becomes the Library's one-line description.
- Tests import the runtime and fixtures from the toolchain:

  ```ts
  import { createTestRuntime, realisticDaily } from 'guardian-gscript-toolchain';
  const runtime = await createTestRuntime();          // load(name) reads indicators/<name>/
  const crsi = await runtime.load('connors-rsi');
  const run = await crsi.run(realisticDaily(300), { 'rsi-length': 3 });
  run.plot('CRSI');                                   // one value per bar
  ```

## Updating the toolchain

The toolchain is the app's, built in the Guardian app repo with `npm run gscript:toolchain`
(output: `dist-toolchain/`). A bump is a reviewed PR that replaces `toolchain/` with a new
build and refreshes `package-lock.json` (`npm install`). `npx gscript-toolchain info` prints
the pinned build and the G Script versions it compiles. An existing version is never rebuilt
with a newer toolchain — Published versions stay byte-for-byte what was signed.

## Prebuilt packages (SDK v1)

Indicators built outside this repo can still be published as prebuilt packages: a PR adding
`packages/pub.<creator>.<name>/<version>/{manifest.json, bundle.js}` (no `package.sig`, no
`catalog.json` edit). The same signing, catalog and immutability rules apply.

## Trust model

- **Moderation = PR review + merge.** The human merge is the gate.
- **Integrity = one registry signature.** On merge CI signs each new package with the
  registry key (secret `REGISTRY_SIGNING_KEY`). The app pins the matching public key
  (`VITE_REGISTRY_PUBKEY`) and verifies every download — a tampered or unsigned package
  can't install. The signature covers `manifest.json ‖ 0x00 ‖ bundle.js`, ECDSA P-256 /
  SHA-256, base64 of the raw r‖s bytes (the app's `packageMessageBytes`).
- **Runtime safety is the app's sandbox**, not this repo.

## One-time setup (maintainer)

```bash
node scripts/gen-keypair.mjs
```

This writes `signing-key.private.pem` (git-ignored — **keep secret**) and prints the public
key. Set it as the app's `VITE_REGISTRY_PUBKEY`, and add the private key as the Actions
secret **`REGISTRY_SIGNING_KEY`**.

## Rotating the signing key

When the private key is lost or must change (before the app pins `trust/` root keys):

1. On your own machine, in a clone of this repo: `node scripts/gen-keypair.mjs`. It writes
   `signing-key.private.pem` (git-ignored) and `signing-key.public.txt`.
2. Put the whole `.pem` in the Actions secret `REGISTRY_SIGNING_KEY`, then delete the local
   file (CI is the only signer).
3. Open a PR that commits the new `signing-key.public.txt` and **deletes** every
   `package.sig`. The PR guard allows deleting signatures only in a PR that changes the
   public key; on merge CI re-signs every package with the new key and verifies them all.
4. Set the app's `VITE_REGISTRY_PUBKEY` to the new public key. Installed copies signed with
   the old key no longer verify; reinstalling fixes them.

## Local checks

```bash
npm test                       # every indicator's tests
npm run check                  # build + version rules + PR guard (no writes)
node scripts/verify.mjs        # verify every package.sig against signing-key.public.txt
```
