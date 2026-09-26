import { describe, expect, it } from 'vitest';
import { catalogEntry } from './lib.mjs';

const manifest = {
  type: 'pub.guardian.connors-rsi', name: 'Connors RSI', creator: 'guardian', description: 'Short-term gauge',
  apiVersion: 2, gScriptVersion: 2, placement: 'own-subpane',
};
const listing = { authored: { summary: 'A short-term gauge', fullName: 'Connors Relative Strength Index', categories: ['momentum'], tags: ['rsi', 'pullback'] } };

describe('catalogEntry: one catalog row, with what the Library needs to file it', () => {
  it('carries the listing’s categories, tags and full name, and where it draws', () => {
    expect(catalogEntry(manifest, ['1.0.0'], listing)).toEqual({
      id: 'pub.guardian.connors-rsi', name: 'Connors RSI', creator: 'guardian', summary: 'Short-term gauge',
      latestVersion: '1.0.0', versions: ['1.0.0'], apiVersion: 2, gScriptVersion: 2, placement: 'own-subpane',
      fullName: 'Connors Relative Strength Index', categories: ['momentum'], tags: ['rsi', 'pullback'],
    });
  });

  it('lists the latest of the versions given', () => {
    expect(catalogEntry(manifest, ['1.0.0', '1.10.0', '1.2.0'], listing).latestVersion).toBe('1.10.0');
  });

  it('leaves listing fields out when there is no listing', () => {
    const row = catalogEntry(manifest, ['1.0.0'], undefined);
    expect(row).not.toHaveProperty('categories');
    expect(row).not.toHaveProperty('tags');
    expect(row).not.toHaveProperty('fullName');
  });
});
