// Shared registry tooling (guardian-indicators).
//
// The canonical signed message MUST byte-match the app's packageMessageBytes
// (src/lib/indicators/registrySignature.ts): utf8(manifest.json) ‖ 0x00 ‖
// utf8(bundle.js), signed with ECDSA P-256 / SHA-256, signature encoded as base64
// of the raw r‖s (IEEE P1363) bytes — which is exactly what WebCrypto verify
// expects. We sign over the RAW file bytes so the app, which verifies over the
// exact bytes it fetched, agrees.

/** Concatenate the exact package bytes the signature covers. */
export function packageMessage(manifestBuf, bundleBuf) {
  return Buffer.concat([manifestBuf, Buffer.from([0]), bundleBuf]);
}

/** Compare two semver strings (major.minor.patch[-pre]) — returns -1 | 0 | 1. */
export function compareSemver(a, b) {
  const split = (v) => {
    const dash = v.indexOf('-');
    const core = dash < 0 ? v : v.slice(0, dash);
    const pre = dash < 0 ? [] : v.slice(dash + 1).split('.');
    return { main: core.split('.').map(Number), pre };
  };
  const A = split(a), B = split(b);
  for (let i = 0; i < 3; i++) if (A.main[i] !== B.main[i]) return A.main[i] < B.main[i] ? -1 : 1;
  if (!A.pre.length && !B.pre.length) return 0;
  if (!A.pre.length) return 1;
  if (!B.pre.length) return -1;
  for (let i = 0; i < Math.max(A.pre.length, B.pre.length); i++) {
    const x = A.pre[i], y = B.pre[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    if (xn && yn) return Number(x) < Number(y) ? -1 : 1;
    if (xn !== yn) return xn ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * What a PR may change (`git diff --name-status base...head` rows). CI makes
 * signatures, the catalog and the packages of indicators whose source lives in
 * indicators/; Published versions never change. Returns one message per
 * violation (empty = allowed).
 *
 * @param {{ status: string, path: string }[]} changes
 * @param {{ sourceIds: Set<string>, existingPackageFiles: Set<string> }} repo
 */
export function checkPrChanges(changes, repo) {
  const errors = [];
  // A key rotation replaces the public key; its old signatures may then be
  // deleted (never edited) so CI re-signs those packages with the new key.
  const rotatingKey = changes.some(({ path }) => path === 'signing-key.public.txt');
  for (const { status, path } of changes) {
    if (path === 'catalog.json') {
      errors.push('catalog.json: CI rebuilds the catalog on merge — leave it out of the PR.');
      continue;
    }
    // Only package files (packages/<id>/<version>/<file>) are guarded.
    if (!/^packages\/[^/]+\/[^/]+\/[^/]+$/.test(path)) continue;
    if (path.endsWith('.sig')) {
      if (rotatingKey && status === 'D') continue;
      errors.push(`${path}: CI signs packages on merge — never add or edit a signature.`);
      continue;
    }
    const [, id] = path.split('/');
    if (repo.sourceIds.has(id)) {
      errors.push(`${path}: ${id} is built by CI from indicators/ — change its source and version instead.`);
      continue;
    }
    if (status !== 'A' || repo.existingPackageFiles.has(path)) {
      errors.push(`${path}: Published versions are immutable — publish a new version instead of changing this one.`);
    }
  }
  return errors;
}

/**
 * One catalog row: what the app's Library lists before anything is installed.
 * `listing` is the indicator's listing.json (source-built indicators) — its
 * categories, tags and full name let the Library file and find the indicator
 * like a built-in. `listingPath` is where that listing.json lives in this repo:
 * when it has a long description the row points at it, and the app fetches it
 * only when a trader opens the indicator's details — the catalog stays small.
 * Display data only: installs verify the signed package.
 */
export function catalogEntry(manifest, versions, listing, listingPath) {
  const sorted = [...versions].sort(compareSemver);
  const authored = listing?.authored ?? {};
  return {
    id: manifest.type,
    name: manifest.name,
    creator: manifest.creator,
    summary: manifest.summary ?? manifest.description ?? '',
    latestVersion: sorted[sorted.length - 1],
    versions: sorted,
    apiVersion: manifest.apiVersion,
    // G Script packages (apiVersion 2) are pinned to a language version too;
    // the app refuses a v2 row without it, so the catalog must carry it.
    ...(manifest.gScriptVersion === undefined ? {} : { gScriptVersion: manifest.gScriptVersion }),
    ...(manifest.packageFormat === undefined ? {} : { packageFormat: manifest.packageFormat }),
    // Where it draws, so the app can check pane room before downloading it.
    ...(manifest.placement === undefined ? {} : { placement: manifest.placement }),
    ...(typeof authored.fullName === 'string' && authored.fullName ? { fullName: authored.fullName } : {}),
    ...(Array.isArray(authored.categories) && authored.categories.length ? { categories: authored.categories } : {}),
    ...(Array.isArray(authored.tags) && authored.tags.length ? { tags: authored.tags } : {}),
    ...(listingPath && typeof authored.description === 'string' && authored.description.trim() ? { listing: listingPath } : {}),
  };
}
