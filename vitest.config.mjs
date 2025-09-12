import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Use Node.js environment (default for server-side testing)
    environment: 'node',
    
    // Global setup and teardown with our new files
    globalSetup: './tests/setup.mjs',
    globalTeardown: './tests/teardown.mjs',
    setupFiles: [
      './tests/vitest.env.mjs',
      './tests/vitest.setup.mjs'
    ],
    
    // Test file patterns
    include: [
      '**/tests/**/*.test.mjs'
    ],
    
    // Exclude patterns
    exclude: [
      '**/node_modules/**',
      '**/js/**',
      '**/test-results/**'
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'controllers/**/*.mjs',
        'services/**/*.mjs',
        'models/**/*.mjs',
        'middleware/**/*.mjs'
      ],
      exclude: [
        '**/node_modules/**',
        '**/tests/**',
        '**/scripts/**'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    
    // Test timeout
    testTimeout: 30000,
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Reset modules between tests
    restoreMocks: true,
    
    // Pool options for better isolation
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true // Better for database tests
      }
    },
    
    // Improved test isolation and cleanup
    isolate: true
  },
  
  // Resolve configuration for ES modules
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@tests': path.resolve(__dirname, 'tests')
    }
  }
})