// Generate the registry's ECDSA P-256 signing keypair.
//
//   node scripts/gen-keypair.mjs
//
// Writes:
//   signing-key.private.pem  — the PRIVATE key (gitignored). KEEP SECRET.
//   signing-key.public.txt   — the PUBLIC key (base64 SPKI) for the app.
//
// Then:
//   1. App: set VITE_REGISTRY_PUBKEY to the printed public key.
//   2. Registry CI: add the private key as the repo secret REGISTRY_SIGNING_KEY
//      (Settings → Secrets and variables → Actions). Paste the whole .pem.
//   3. You can keep signing-key.private.pem locally to sign packages yourself, or
//      delete it and let CI sign on merge. NEVER commit it.
import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const pubSpkiB64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');

writeFileSync('signing-key.private.pem', privPem, { mode: 0o600 });
writeFileSync('signing-key.public.txt', pubSpkiB64 + '\n');

console.log('Wrote signing-key.private.pem (SECRET, gitignored) + signing-key.public.txt\n');
console.log('PUBLIC KEY — set VITE_REGISTRY_PUBKEY to this in the app .env:\n');
console.log(pubSpkiB64);
