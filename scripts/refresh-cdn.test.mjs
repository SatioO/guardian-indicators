import { describe, expect, it, vi } from 'vitest';
import { refreshCdn } from './refresh-cdn.mjs';

const CATALOG = '[{"id":"pub.guardian.connors-rsi"}]\n';
const noWait = () => Promise.resolve();

/** A CDN that serves `stale` until it has been purged `after` times. */
function cdn(stale, after) {
  let purges = 0;
  return vi.fn(async (url) => {
    if (url.startsWith('https://purge.jsdelivr.net/')) { purges += 1; return { ok: true, status: 200, text: async () => '{}' }; }
    return { ok: true, status: 200, text: async () => (purges >= after ? CATALOG : stale) };
  });
}

describe('refreshCdn: purge until the CDN serves the committed catalog', () => {
  it('succeeds as soon as the CDN serves the committed catalog', async () => {
    const fetchFn = cdn('[]\n', 1);
    const result = await refreshCdn({ repo: 'SatioO/guardian-indicators', expected: CATALOG, fetchFn, wait: noWait });
    expect(result).toEqual({ ok: true, attempts: 1 });
  });

  it('purges again while the CDN still serves the old catalog (the purge-after-push race)', async () => {
    const fetchFn = cdn('[]\n', 3);
    const result = await refreshCdn({ repo: 'SatioO/guardian-indicators', expected: CATALOG, fetchFn, wait: noWait });
    expect(result).toEqual({ ok: true, attempts: 3 });
    expect(fetchFn).toHaveBeenCalledWith('https://purge.jsdelivr.net/gh/SatioO/guardian-indicators@main/catalog.json');
  });

  it('gives up after the last attempt and says what the CDN serves', async () => {
    const fetchFn = cdn('[]\n', Infinity);
    const result = await refreshCdn({ repo: 'SatioO/guardian-indicators', expected: CATALOG, fetchFn, wait: noWait, attempts: 4 });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/4 purges/);
  });

  it('keeps trying through a failed request', async () => {
    let calls = 0;
    const fetchFn = vi.fn(async (url) => {
      calls += 1;
      if (calls === 1) throw new Error('network down');
      return { ok: true, status: 200, text: async () => (url.includes('purge') ? '{}' : CATALOG) };
    });
    const result = await refreshCdn({ repo: 'SatioO/guardian-indicators', expected: CATALOG, fetchFn, wait: noWait });
    expect(result.ok).toBe(true);
  });
});
