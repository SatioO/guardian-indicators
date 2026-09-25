import { describe, expect, it } from 'vitest';
import { checkPrChanges } from './lib.mjs';

const sources = new Set(['pub.guardian.connors-rsi']);
const check = (changes) => checkPrChanges(changes, { sourceIds: sources, existingPackageFiles: new Set(['packages/pub.satioo.sma-envelope/1.0.0/bundle.js']) });

describe('checkPrChanges: what a PR may change', () => {
  it('accepts indicator source, tests and release notes', () => {
    expect(check([
      { status: 'M', path: 'indicators/connors-rsi/indicator.ts' },
      { status: 'A', path: 'indicators/new-one/manifest.json' },
      { status: 'M', path: 'indicators/connors-rsi/RELEASE-NOTES.md' },
    ])).toEqual([]);
  });

  it('accepts a new prebuilt package version for an id without source here', () => {
    expect(check([
      { status: 'A', path: 'packages/pub.satioo.sma-envelope/1.1.0/manifest.json' },
      { status: 'A', path: 'packages/pub.satioo.sma-envelope/1.1.0/bundle.js' },
    ])).toEqual([]);
  });

  it('leaves files that are not package files alone', () => {
    expect(check([{ status: 'M', path: 'packages/README.md' }])).toEqual([]);
  });

  it('refuses to edit or delete a Published version', () => {
    const errors = check([
      { status: 'M', path: 'packages/pub.satioo.sma-envelope/1.0.0/bundle.js' },
      { status: 'D', path: 'packages/pub.satioo.sma-envelope/1.0.0/manifest.json' },
    ]);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/immutable/);
  });

  it('refuses hand-made signatures and catalog edits: CI makes them', () => {
    expect(check([{ status: 'A', path: 'packages/pub.satioo.sma-envelope/1.1.0/package.sig' }])[0]).toMatch(/signs/);
    expect(check([{ status: 'M', path: 'catalog.json' }])[0]).toMatch(/catalog/);
  });

  it('refuses a prebuilt package for an indicator whose source lives here: CI builds those', () => {
    expect(check([{ status: 'A', path: 'packages/pub.guardian.connors-rsi/1.1.0/bundle.js' }])[0]).toMatch(/built by CI/);
  });
});
