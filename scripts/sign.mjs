// Sign every UNSIGNED package (one missing package.sig) with the registry key.
//
//   node scripts/sign.mjs
//
// Key source: REGISTRY_SIGNING_KEY env (CI secret, PEM) or signing-key.private.pem
// (local). Only packages without a package.sig are signed — ECDSA signatures are
// randomized, so re-signing would churn the repo; published versions are immutable.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';
import { packageMessage } from './lib.mjs';

const PKG_ROOT = 'packages';
const dirs = (p) => (existsSync(p) ? readdirSync(p).filter((n) => statSync(join(p, n)).isDirectory()) : []);

// Collect unsigned packages first, so an empty/fully-signed registry needs no key.
const unsigned = [];
for (const id of dirs(PKG_ROOT)) {
  for (const ver of dirs(join(PKG_ROOT, id))) {
    const dir = join(PKG_ROOT, id, ver);
    const m = join(dir, 'manifest.json'), b = join(dir, 'bundle.js'), s = join(dir, 'package.sig');
    if (existsSync(m) && existsSync(b) && !existsSync(s)) unsigned.push({ dir, m, b, s });
  }
}
if (unsigned.length === 0) {
  console.log('No unsigned packages — nothing to sign.');
  process.exit(0);
}

const pem = process.env.REGISTRY_SIGNING_KEY || (existsSync('signing-key.private.pem') && readFileSync('signing-key.private.pem', 'utf8'));
if (!pem) {
  console.error('No signing key. Set REGISTRY_SIGNING_KEY (CI secret) or run: node scripts/gen-keypair.mjs');
  process.exit(1);
}
const key = crypto.createPrivateKey(pem);

for (const { dir, m, b, s } of unsigned) {
  const msg = packageMessage(readFileSync(m), readFileSync(b));
  const sig = crypto.sign('sha256', msg, { key, dsaEncoding: 'ieee-p1363' }).toString('base64');
  writeFileSync(s, sig + '\n');
  console.log('signed', dir);
}
console.log(`Signed ${unsigned.length} package(s).`);
