// Rebuild catalog.json from the packages/ tree. The catalog is the ONLY file the
// app's Browse tab reads to list packages; per-package manifests/bundles are
// fetched lazily on install.
//
//   node scripts/build-catalog.mjs
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { compareSemver } from './lib.mjs';

const PKG_ROOT = 'packages';
const dirs = (p) => (existsSync(p) ? readdirSync(p).filter((n) => statSync(join(p, n)).isDirectory()) : []);

const entries = [];
for (const id of dirs(PKG_ROOT)) {
  const idDir = join(PKG_ROOT, id);
  const versions = dirs(idDir).filter((v) => existsSync(join(idDir, v, 'manifest.json'))).sort(compareSemver);
  if (versions.length === 0) continue;
  const latest = versions[versions.length - 1];
  const m = JSON.parse(readFileSync(join(idDir, latest, 'manifest.json'), 'utf8'));
  entries.push({
    id: m.type,
    name: m.name,
    creator: m.creator,
    summary: m.summary ?? m.description ?? '',
    latestVersion: latest,
    versions,
    apiVersion: m.apiVersion,
  });
}
entries.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync('catalog.json', JSON.stringify(entries, null, 2) + '\n');
console.log(`catalog.json: ${entries.length} package(s).`);
