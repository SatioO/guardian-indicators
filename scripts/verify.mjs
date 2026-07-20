// Locally verify every signed package against a public key — the same check the
// app performs on install. Handy before/after signing.
//
//   node scripts/verify.mjs                # uses signing-key.public.txt
//   node scripts/verify.mjs <base64Spki>   # explicit public key
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';
import { packageMessage } from './lib.mjs';

const b64 = process.argv[2] || (existsSync('signing-key.public.txt') && readFileSync('signing-key.public.txt', 'utf8').trim());
if (!b64) { console.error('No public key. Pass base64 SPKI or create signing-key.public.txt.'); process.exit(1); }
const key = crypto.createPublicKey({ key: Buffer.from(b64, 'base64'), format: 'der', type: 'spki' });

const PKG_ROOT = 'packages';
const dirs = (p) => (existsSync(p) ? readdirSync(p).filter((n) => statSync(join(p, n)).isDirectory()) : []);
let ok = 0, bad = 0;
for (const id of dirs(PKG_ROOT)) {
  for (const ver of dirs(join(PKG_ROOT, id))) {
    const dir = join(PKG_ROOT, id, ver);
    const m = join(dir, 'manifest.json'), b = join(dir, 'bundle.js'), s = join(dir, 'package.sig');
    if (!existsSync(s)) { console.log('· unsigned', dir); continue; }
    const msg = packageMessage(readFileSync(m), readFileSync(b));
    const sig = Buffer.from(readFileSync(s, 'utf8').trim(), 'base64');
    const valid = crypto.verify('sha256', msg, { key, dsaEncoding: 'ieee-p1363' }, sig);
    console.log(valid ? '✓' : '✗', dir);
    valid ? ok++ : bad++;
  }
}
console.log(`\n${ok} valid, ${bad} invalid.`);
process.exit(bad ? 1 : 0);
