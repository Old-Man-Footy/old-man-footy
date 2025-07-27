/**
 * @file database-optimizer.test.mjs
 * @description Unit tests for DatabaseOptimizer (config/database-optimizer.mjs).
 *
 * Mocks Sequelize and fs modules. Follows AAA pattern and project TDD standards.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DatabaseOptimizer from '../../config/database-optimizer.mjs';

// Mock dependencies at the module level
vi.mock('../../models/index.mjs', () => ({
    sequelize: {
        query: vi.fn(),
        addHook: vi.fn(),
        options: { storage: '/mock/path/to/db.sqlite' }
    }
}));
vi.mock('sequelize', () => ({
    QueryTypes: { RAW: 'RAW', SELECT: 'SELECT' }
}));
vi.mock('fs/promises', () => ({
    default: {
        mkdir: vi.fn(),
        readdir: vi.fn(),
        copyFile: vi.fn(),
        stat: vi.fn(),
        unlink: vi.fn()
    }
}));
vi.mock('path', () => ({
    default: {
        join: (...args) => args.join('/')
    }
}));
// The User model needs to be available for the maintenance task
vi.stubGlobal('User', { cleanupExpiredInvitations: vi.fn() });
vi.stubGlobal('UPLOAD_DIRECTORIES', { UPLOADS_ROOT: 'uploads' });


// Import the mocked modules to use in tests
import { sequelize } from '../../models/index.mjs';
import fs from 'fs/promises';


describe('DatabaseOptimizer', () => {

    // Ensure mocks are clean before each test
    beforeEach(() => {
        vi.resetAllMocks();
        process.env.NODE_ENV = 'test';
        process.env.BACKUP_ENABLED = 'true';
    });

    afterEach(() => {
        // This is crucial to restore any spies and prevent leaks
        vi.restoreAllMocks();
    });

    describe('configureProduction', () => {
        it('should return production options when NODE_ENV is production', async () => {
            process.env.NODE_ENV = 'production';
            const opts = await DatabaseOptimizer.configureProduction();
            expect(opts.pool.max).toBe(5);
            expect(opts.logging).toBe(false);
        });

        it('should return development options when NODE_ENV is not production', async () => {
            process.env.NODE_ENV = 'test';
            const optsTest = await DatabaseOptimizer.configureProduction();
            expect(typeof optsTest.logging).toBe('function');
        });
    });

    describe('createIndexes', () => {
        it('should execute all index creation queries successfully', async () => {
            sequelize.query.mockResolvedValue(undefined);
            await expect(DatabaseOptimizer.createIndexes()).resolves.toBeUndefined();
            expect(sequelize.query).toHaveBeenCalled();
        });

        it('should handle errors during index creation', async () => {
            const error = new Error('DB connection failed');
            sequelize.query.mockRejectedValue(error);
            await expect(DatabaseOptimizer.createIndexes()).rejects.toThrow(error.message);
        });
    });

    describe('analyzePerformance', () => {
        it('should return performance statistics successfully', async () => {
            sequelize.query
                .mockResolvedValueOnce([{ count: 10 }]) // carnivals
                .mockResolvedValueOnce([{ count: 20 }]) // users
                .mockResolvedValueOnce([{ count: 5 }])  // clubs
                .mockResolvedValueOnce([{ count: 2 }])  // email_subscriptions
                .mockResolvedValueOnce([{ size: 2048 }]) // dbSize
                .mockResolvedValueOnce([{ name: 'idx_test', tbl_name: 'users' }]); // indexes

            const stats = await DatabaseOptimizer.analyzePerformance();
            expect(stats.tableStats.carnivals.count).toBe(10);
            expect(stats.tableStats.users.count).toBe(20);
            expect(stats.databaseSize).toBe(2);
        });

        it('should handle errors during performance analysis', async () => {
            const error = new Error('Analysis failed');
            sequelize.query.mockRejectedValue(error);
            await expect(DatabaseOptimizer.analyzePerformance()).rejects.toThrow(error.message);
        });
    });

    describe('optimizeDatabase', () => {
        it('should run all optimization commands successfully', async () => {
            sequelize.query.mockResolvedValue(undefined);
            await expect(DatabaseOptimizer.optimizeDatabase()).resolves.toBeUndefined();
            expect(sequelize.query).toHaveBeenCalledWith('VACUUM;');
            expect(sequelize.query).toHaveBeenCalledWith('ANALYZE;');
            expect(sequelize.query).toHaveBeenCalledWith('PRAGMA optimize;');
        });

        it('should handle errors during database optimization', async () => {
            const error = new Error('VACUUM failed');
            sequelize.query.mockRejectedValue(error);
            await expect(DatabaseOptimizer.optimizeDatabase()).rejects.toThrow(error.message);
        });
    });

    describe('setupMonitoring', () => {
        it('should add all monitoring hooks successfully', async () => {
            sequelize.addHook.mockResolvedValue(undefined);
            await expect(DatabaseOptimizer.setupMonitoring()).resolves.toBeUndefined();
            expect(sequelize.addHook).toHaveBeenCalled();
        });

        it('should handle errors during monitoring setup', async () => {
            const error = new Error('Hook failed');
            sequelize.addHook.mockRejectedValue(error);
            await expect(DatabaseOptimizer.setupMonitoring()).rejects.toThrow(error.message);
        });
    });

    describe('performMaintenance', () => {
        it('should perform all maintenance tasks successfully', async () => {
            User.cleanupExpiredInvitations.mockResolvedValue(2);
            sequelize.query.mockResolvedValue(undefined);
            await expect(DatabaseOptimizer.performMaintenance()).resolves.toBeUndefined();
            expect(User.cleanupExpiredInvitations).toHaveBeenCalled();
            expect(sequelize.query).toHaveBeenCalledWith('VACUUM;');
        });

        it('should handle errors during maintenance', async () => {
            const error = new Error('Cleanup failed');
            User.cleanupExpiredInvitations.mockRejectedValue(error);
            await expect(DatabaseOptimizer.performMaintenance()).rejects.toThrow(error.message);
        });
    });

    describe('backupDatabase', () => {
        it('should perform backup and cleanup successfully', async () => {
            fs.mkdir.mockResolvedValue(undefined);
            fs.copyFile.mockResolvedValue(undefined);
            fs.readdir.mockResolvedValue(['old.db']);
            fs.stat.mockResolvedValue({ mtime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 31) });
            fs.unlink.mockResolvedValue(undefined);

            await expect(DatabaseOptimizer.backupDatabase()).resolves.toBeUndefined();
            expect(fs.copyFile).toHaveBeenCalled();
            expect(fs.unlink).toHaveBeenCalled();
        });

        it('should handle errors during database backup', async () => {
            const error = new Error('Copy failed');
            fs.copyFile.mockRejectedValue(error);
            await expect(DatabaseOptimizer.backupDatabase()).rejects.toThrow(error.message);
        });

        it('should not run if backups are disabled', async () => {
            process.env.BACKUP_ENABLED = 'false';
            await DatabaseOptimizer.backupDatabase();
            expect(fs.copyFile).not.toHaveBeenCalled();
        });
    });
});
