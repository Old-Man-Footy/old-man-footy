/**
 * @file database-optimizer.test.mjs
 * @description Unit tests for DatabaseOptimizer (config/database-optimizer.mjs).
 *
 * Mocks Sequelize and fs modules. Follows AAA pattern and project TDD standards.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DatabaseOptimizer from '../../config/database-optimizer.mjs';

// Mock dependencies
const mockSequelize = {
    query: vi.fn(),
    addHook: vi.fn(),
    options: { storage: '/mock/path/to/db.sqlite' }
};
const mockQueryTypes = { RAW: 'RAW', SELECT: 'SELECT' };
const mockFs = {
    mkdir: vi.fn(),
    readdir: vi.fn(),
    copyFile: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn()
};
const mockPath = {
    join: (...args) => args.join('/'),
};

// Patch globals
vi.stubGlobal('sequelize', mockSequelize);
vi.stubGlobal('QueryTypes', mockQueryTypes);
vi.stubGlobal('fs', mockFs);
vi.stubGlobal('path', mockPath);

// Patch User and Carnival for performMaintenance
vi.stubGlobal('User', { cleanupExpiredInvitations: vi.fn().mockResolvedValue(2) });

// Patch process.env
beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.BACKUP_ENABLED = 'true';
    process.env.BACKUP_RETENTION_DAYS = '30';
    process.env.SQLITE_MAX_POOL_SIZE = '5';
    process.env.SQLITE_MIN_POOL_SIZE = '1';
    process.env.SQLITE_ACQUIRE_TIMEOUT = '30000';
    process.env.SQLITE_IDLE_TIMEOUT = '10000';
    process.env.SQLITE_QUERY_TIMEOUT = '30000';
    vi.clearAllMocks();
});

describe('DatabaseOptimizer', () => {
    it('should configure production options securely', async () => {
        process.env.NODE_ENV = 'production';
        const opts = await DatabaseOptimizer.configureProduction();
        expect(opts.pool.max).toBe(5);
        expect(opts.pool.min).toBe(1);
        expect(opts.dialectOptions.timeout).toBe(30000);
        expect(opts.logging).toBe(false);
        process.env.NODE_ENV = 'test';
        const optsTest = await DatabaseOptimizer.configureProduction();
        expect(typeof optsTest.logging).toBe('function');
    });

    it('should create indexes and handle errors', async () => {
        mockSequelize.query.mockResolvedValueOnce();
        await expect(DatabaseOptimizer.createIndexes()).resolves.toBeUndefined();
        mockSequelize.query.mockRejectedValueOnce(new Error('fail'));
        await expect(DatabaseOptimizer.createIndexes()).rejects.toMatchObject({ error: { status: 500 } });
    });

    it('should analyze performance and handle errors', async () => {
        // Mock queries for each table in the loop
        mockSequelize.query
            .mockResolvedValueOnce([{ count: 10 }]) // Carnivals
            .mockResolvedValueOnce([{ count: 20 }]) // Users
            .mockResolvedValueOnce([{ count: 5 }])  // Clubs
            .mockResolvedValueOnce([{ count: 2 }])  // EmailSubscriptions
            .mockResolvedValueOnce([{ size: 2048 }]) // dbSize
            .mockResolvedValueOnce([{ name: 'idx_test', tbl_name: 'Users' }]); // indexes
        const stats = await DatabaseOptimizer.analyzePerformance();
        expect(stats.tableStats.Carnivals.count).toBe(10);
        expect(stats.tableStats.Users.count).toBe(20);
        expect(stats.tableStats.Clubs.count).toBe(5);
        expect(stats.tableStats.EmailSubscriptions.count).toBe(2);
        expect(stats.databaseSize).toBe(2);
        expect(stats.indexes[0].name).toBe('idx_test');
        mockSequelize.query.mockRejectedValueOnce(new Error('fail'));
        await expect(DatabaseOptimizer.analyzePerformance()).rejects.toMatchObject({ error: { status: 500 } });
    });

    it('should optimize database and handle errors', async () => {
        mockSequelize.query.mockResolvedValueOnce();
        mockSequelize.query.mockResolvedValueOnce();
        mockSequelize.query.mockResolvedValueOnce();
        await expect(DatabaseOptimizer.optimizeDatabase()).resolves.toBeUndefined();
        mockSequelize.query.mockRejectedValueOnce(new Error('fail'));
        await expect(DatabaseOptimizer.optimizeDatabase()).rejects.toMatchObject({ error: { status: 500 } });
    });

    it('should setup monitoring and handle errors', async () => {
        mockSequelize.addHook.mockResolvedValueOnce();
        await expect(DatabaseOptimizer.setupMonitoring()).resolves.toBeUndefined();
        mockSequelize.addHook.mockRejectedValueOnce(new Error('fail'));
        await expect(DatabaseOptimizer.setupMonitoring()).rejects.toMatchObject({ error: { status: 500 } });
    });

    it('should perform maintenance and handle errors', async () => {
        await expect(DatabaseOptimizer.performMaintenance()).resolves.toBeUndefined();
        User.cleanupExpiredInvitations.mockRejectedValueOnce(new Error('fail'));
        await expect(DatabaseOptimizer.performMaintenance()).rejects.toMatchObject({ error: { status: 500 } });
    });

    it('should backup database and handle errors', async () => {
        mockFs.mkdir.mockResolvedValueOnce();
        mockFs.copyFile.mockResolvedValueOnce();
        mockFs.readdir.mockResolvedValueOnce(['old.db']);
        mockFs.stat.mockResolvedValueOnce({ mtime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 31) });
        mockFs.unlink.mockResolvedValueOnce();
        await expect(DatabaseOptimizer.backupDatabase()).resolves.toBeUndefined();
        mockFs.copyFile.mockRejectedValueOnce(new Error('fail'));
        await expect(DatabaseOptimizer.backupDatabase()).rejects.toMatchObject({ error: { status: 500 } });
    });
});
