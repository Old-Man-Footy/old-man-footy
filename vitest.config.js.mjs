import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // Use jsdom for DOM/client-side tests
    include: [
      'tests/js/**/*.test.mjs',
      'tests/js/**/*.spec.mjs'
    ],
    exclude: [
      '**/node_modules/**',
      '**/test-results/**',
      '**/tests/jest.env.mjs',
      '**/scripts/fix-jest-globals.mjs'
    ],
    coverage: {
      provider: 'v8',
      reportsDirectory: './test-results/coverage',
      include: [
        'public/js/**/*.mjs',
        'public/js/**/*.js'
      ],
      exclude: [
        '**/tests/**',
        '**/node_modules/**',
        '**/test-results/**',
      ]
    }
  }
});