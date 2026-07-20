# guardian-indicators

The published custom-indicator **registry** for the Guardian trading app. It's a
plain public GitHub repo served to the app over the free [jsDelivr](https://www.jsdelivr.com/)
CDN — **no server, no backend**. The app's "Browse Published" tab reads `catalog.json`
from here; installing fetches a package's files and verifies their signature.

```
catalog.json                                  the index the app's Browse tab reads (CI-generated)
packages/
  pub.<creator>.<name>/
    <version>/
      manifest.json                           the published manifest (see below)
      bundle.js                               compiled compute (assigns globalThis.compute)
      package.sig                             detached signature (CI-generated)
scripts/                                       gen-keypair / sign / build-catalog / verify
.github/workflows/sign-and-catalog.yml         signs + rebuilds the catalog on merge
```

## Trust model

- **Moderation = PR review + merge.** A creator opens a PR adding their package; a
  maintainer reviews and merges. That human merge is the gate.
- **Integrity = one registry signature.** On merge, CI signs each new package with
  the registry's private key (repo secret `REGISTRY_SIGNING_KEY`). The app ships the
  matching **public** key pinned (`VITE_REGISTRY_PUBKEY`) and verifies every
  download — so a tampered or unsigned package can't install.
- **Runtime safety is the app's sandbox**, not this repo: an installed `pub.*`
  indicator runs as bytecode in a QuickJS-in-WASM VM inside a Worker (no network,
  DOM, storage, or timers). The signature is authenticity + integrity + "a
  moderator approved this", not sandbox safety.
- **Versions are immutable.** Never edit a published version's files; ship a new
  version. jsDelivr caches by ref, so pinned installs are deterministic.

## One-time setup (maintainer)

```bash
npm install            # (no deps today; Node 20+)
node scripts/gen-keypair.mjs
```

This writes `signing-key.private.pem` (git-ignored — **keep secret**) and prints the
**public** key. Then:

1. **App:** set `VITE_REGISTRY_PUBKEY` to the printed public key (base64 SPKI).
2. **This repo:** add the private key as the Actions secret **`REGISTRY_SIGNING_KEY`**
   (Settings → Secrets and variables → Actions → New repository secret; paste the whole
   `.pem`). CI uses it to sign on merge.

## Publishing an indicator

1. Build your indicator with the SDK (`@traderview/indicator-sdk`) → a `bundle.js`
   that assigns `globalThis.compute`, plus a `manifest.json`.
2. Open a PR adding `packages/pub.<creator>.<name>/<version>/{manifest.json, bundle.js}`
   (no `package.sig`, don't touch `catalog.json` — CI does both).
3. On merge, CI signs the package and regenerates `catalog.json`; it appears in every
   user's Browse tab.

### `manifest.json` shape

```json
{
  "type": "pub.<creator>.<name>",
  "name": "Display Name",
  "creator": "<creator>",
  "description": "One-line description.",
  "version": "1.0.0",
  "apiVersion": 1,
  "placement": "price",
  "inputs": [],
  "changelog": "optional"
}
```

## Local checks

```bash
node scripts/sign.mjs           # sign unsigned packages with your local key (or CI does it)
node scripts/build-catalog.mjs  # regenerate catalog.json
node scripts/verify.mjs         # verify every package.sig against signing-key.public.txt
```
