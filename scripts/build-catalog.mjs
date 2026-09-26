// Rebuild catalog.json from the packages/ tree. The catalog is the ONLY file the
// app's Library reads to list indicators; each package's files are fetched when
// a trader adds it.
//
//   node scripts/build-catalog.mjs
//
// Listing metadata (categories, tags, full name, and the path of the listing
// holding the long description) comes from the indicator's
// listing.json: indicators/<name>/listing.json for those built here from
// source (published as pub.guardian.<name>), or packages/<id>/listing.json for
// a prebuilt package that ships one.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { catalogEntry, compareSemver } from './lib.mjs';

const PKG_ROOT = 'packages';
const SOURCE_AUTHOR_HANDLE = 'guardian';
const dirs = (p) => (existsSync(p) ? readdirSync(p).filter((n) => statSync(join(p, n)).isDirectory()) : []);
const readJson = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined);

/** The listing and its repo path (posix, what the CDN serves), or undefined. */
function listingFor(id) {
  const sourcePrefix = `pub.${SOURCE_AUTHOR_HANDLE}.`;
  const candidates = [
    ...(id.startsWith(sourcePrefix) ? [`indicators/${id.slice(sourcePrefix.length)}/listing.json`] : []),
    `${PKG_ROOT}/${id}/listing.json`,
  ];
  for (const path of candidates) {
    const listing = readJson(path);
    if (listing) return { listing, path };
  }
  return undefined;
}

const entries = [];
for (const id of dirs(PKG_ROOT)) {
  const idDir = join(PKG_ROOT, id);
  const versions = dirs(idDir).filter((v) => existsSync(join(idDir, v, 'manifest.json'))).sort(compareSemver);
  if (versions.length === 0) continue;
  const manifest = readJson(join(idDir, versions[versions.length - 1], 'manifest.json'));
  const found = listingFor(id);
  entries.push(catalogEntry(manifest, versions, found?.listing, found?.path));
}
entries.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync('catalog.json', JSON.stringify(entries, null, 2) + '\n');
console.log(`catalog.json: ${entries.length} package(s).`);
