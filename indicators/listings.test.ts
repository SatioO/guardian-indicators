/**
 * Every indicator's listing.json against the app's real listing rules — the
 * same gate the Library applies — so what a trader reads is complete and
 * consistent before anything publishes.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkListing, type AuthoredListing } from 'guardian-gscript-toolchain';

const ROOT = 'indicators';
const names = readdirSync(ROOT).filter((name) => statSync(join(ROOT, name)).isDirectory()).sort();

describe('every listing passes the listing rules', () => {
  it.each(names)('%s', (name) => {
    const listing = JSON.parse(readFileSync(join(ROOT, name, 'listing.json'), 'utf8')) as { authored: AuthoredListing };
    const manifest = JSON.parse(readFileSync(join(ROOT, name, 'manifest.json'), 'utf8')) as { name: string };
    const findings = checkListing(listing.authored, manifest.name);
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
  });
});
