import { defineConfig } from 'vitest/config';

// Each indicator's tests live beside its source: indicators/<name>/<name>.test.ts.
// They run the indicator through the pinned toolchain's test runtime — the
// same bundler, sandbox and output resolution the app uses.
export default defineConfig({
  test: {
    include: ['indicators/**/*.test.ts', 'scripts/**/*.test.mjs'],
    environment: 'node',
    testTimeout: 30_000,
  },
});
