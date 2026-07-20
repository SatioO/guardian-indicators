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
