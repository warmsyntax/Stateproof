import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@stateproof-dev/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@stateproof-dev/playwright-runner': fileURLToPath(
        new URL('./packages/playwright-runner/src/index.ts', import.meta.url),
      ),
      '@stateproof-dev/reporter-html': fileURLToPath(
        new URL('./packages/reporter-html/src/index.ts', import.meta.url),
      ),
      '@stateproof-dev/app': fileURLToPath(new URL('./packages/app/src/index.ts', import.meta.url)),
      '@getstateproof/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@getstateproof/playwright-runner': fileURLToPath(
        new URL('./packages/playwright-runner/src/index.ts', import.meta.url),
      ),
      '@getstateproof/reporter-html': fileURLToPath(
        new URL('./packages/reporter-html/src/index.ts', import.meta.url),
      ),
      '@getstateproof/app': fileURLToPath(new URL('./packages/app/src/index.ts', import.meta.url)),
      '@stateproof/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@stateproof/playwright-runner': fileURLToPath(
        new URL('./packages/playwright-runner/src/index.ts', import.meta.url),
      ),
      '@stateproof/reporter-html': fileURLToPath(
        new URL('./packages/reporter-html/src/index.ts', import.meta.url),
      ),
      '@stateproof/app': fileURLToPath(new URL('./packages/app/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['packages/*/src/**/*.test.ts', 'examples/*/test/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    coverage: {
      provider: 'v8',
      include: ['packages/core/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/dist/**'],
    },
  },
});
