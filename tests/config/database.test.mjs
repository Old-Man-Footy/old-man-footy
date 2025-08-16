/**
 * @file database.test.mjs
 * @description Unit tests for config/database.mjs setup and connection logic.
 */
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import * as db from '../../config/database.mjs';

// Mock expensive operations for isolation
vi.mock('../../config/database-optimizer.mjs', () => ({
  default: {
    createIndexes: vi.fn().mockResolvedValue(undefined),
    setupMonitoring: vi.fn().mockResolvedValue(undefined),
    configureProduction: vi.fn().mockResolvedValue({}),
  }
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    mkdirSync: vi.fn(),
  }
}));

vi.mock('child_process', () => ({
  exec: vi.fn((cmd, cb) => cb(null, 'done', '')),
}));

// Test suite
describe('config/database.mjs', () => {
  it('setupDatabase should run without throwing', async () => {
    await expect(db.setupDatabase()).resolves.not.toThrow();
  });

  it('getDatabaseConnection should return true for healthy connection', async () => {
    const result = await db.getDatabaseConnection();
    expect(result).toBe(true);
  });
});
