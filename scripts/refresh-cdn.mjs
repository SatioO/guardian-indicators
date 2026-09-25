// Make jsDelivr serve the catalog CI just committed. One purge right after the
// push can race jsDelivr re-caching @main at the previous commit, leaving the
// app's Library on the old catalog for hours. So: purge, read the CDN copy, and
// repeat until it matches the committed catalog.json — or fail loudly.
//
//   node scripts/refresh-cdn.mjs        (GITHUB_REPOSITORY, or SatioO/guardian-indicators)
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {{ repo: string, expected: string, ref?: string, attempts?: number, intervalMs?: number,
 *           fetchFn?: (url: string) => Promise<{ ok: boolean, status: number, text(): Promise<string> }>,
 *           wait?: (ms: number) => Promise<void> }} options
 * @returns {Promise<{ ok: true, attempts: number } | { ok: false, error: string }>}
 */
export async function refreshCdn({ repo, expected, ref = 'main', attempts = 12, intervalMs = 15_000, fetchFn = fetch, wait = sleep }) {
  const path = `gh/${repo}@${ref}/catalog.json`;
  let served = '(nothing yet)';
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await fetchFn(`https://purge.jsdelivr.net/${path}`);
      await wait(intervalMs / 3);
      const res = await fetchFn(`https://cdn.jsdelivr.net/${path}`);
      served = res.ok ? await res.text() : `HTTP ${res.status}`;
      if (res.ok && served.trim() === expected.trim()) return { ok: true, attempts: attempt };
    } catch (error) {
      served = `request failed: ${error instanceof Error ? error.message : String(error)}`;
    }
    if (attempt < attempts) await wait(intervalMs);
  }
  return {
    ok: false,
    error: `jsDelivr still serves a different catalog after ${attempts} purges (first 200 chars: ${served.slice(0, 200)}). Re-run this workflow later ("Run workflow").`,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const result = await refreshCdn({
    repo: process.env.GITHUB_REPOSITORY || 'SatioO/guardian-indicators',
    expected: readFileSync('catalog.json', 'utf8'),
  });
  if (result.ok) {
    console.log(`jsDelivr serves the committed catalog (after ${result.attempts} purge${result.attempts === 1 ? '' : 's'}).`);
  } else {
    console.error(`::error::${result.error}`);
    process.exit(1);
  }
}
