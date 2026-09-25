// PR guard: Published versions are immutable, and CI alone makes signatures,
// the catalog and the packages of indicators built from indicators/.
//
//   node scripts/check-pr.mjs [base-ref]     (default: origin/$GITHUB_BASE_REF or origin/main)
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { checkPrChanges } from './lib.mjs';

/** Indicators built from source here publish under this Author handle. */
const SOURCE_AUTHOR_HANDLE = 'guardian';

const base = process.argv[2] ?? `origin/${process.env.GITHUB_BASE_REF || 'main'}`;
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
const dirs = (p) => (existsSync(p) ? readdirSync(p).filter((n) => statSync(join(p, n)).isDirectory()) : []);

const changes = git('diff', '--name-status', '--no-renames', `${base}...HEAD`)
  .split('\n').filter(Boolean)
  .map((line) => { const [status, path] = line.split('\t'); return { status: status[0], path }; });
const existingPackageFiles = new Set(git('ls-tree', '-r', '--name-only', base, '--', 'packages').split('\n').filter(Boolean));
const sourceIds = new Set(dirs('indicators').map((name) => `pub.${SOURCE_AUTHOR_HANDLE}.${name}`));

const errors = checkPrChanges(changes, { sourceIds, existingPackageFiles });
if (errors.length === 0) {
  console.log(`PR changes OK (${changes.length} file(s) against ${base}).`);
} else {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exit(1);
}
