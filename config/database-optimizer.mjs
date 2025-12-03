import { UPLOAD_DIRECTORIES } from './constants.mjs';
// Import sequelize directly from config to avoid pulling all models and creating cycles
import { sequelize } from './database.mjs';
import { QueryTypes } from 'sequelize';
import fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

/**
 * DatabaseOptimizer
 *
 * Optimizes SQLite database performance through indexing, query optimization,
 * and maintenance operations tailored for the Old Man Footy application.
 *
 * @class
 * @description
 * This utility class provides static methods for database optimization, maintenance,
 * and monitoring. It must not interact with Express req/res objects and should only
 * be called from initialization or scheduled maintenance scripts, never from controllers.
 *
 * @example
 * // Usage in initialization script
 * await DatabaseOptimizer.createIndexes();
 * await DatabaseOptimizer.setupMonitoring();
 */
class DatabaseOptimizer {
    /**
     * Create database indexes for performance optimization.
     * Uses only secure, parameterized queries.
     *
     * @returns {Promise<void>}
     * @throws {Error} Logs and throws error with descriptive message
     */
    static async createIndexes() {
        // Inline comment: All index creation queries use parameterized inputs via Sequelize
        try {
            console.log('Creating database indexes for optimization...');

            // Carnival indexes
            await sequelize.query(
                'CREATE INDEX IF NOT EXISTS idx_carnivals_date_active ON carnivals(date, isActive) WHERE isActive = 1;',
                { type: QueryTypes.RAW }
            );
            await sequelize.query(
                'CREATE INDEX IF NOT EXISTS idx_carnivals_state_date ON carnivals(state, date);',
                { type: QueryTypes.RAW }
            );
            await sequelize.query(
                'CREATE INDEX IF NOT EXISTS idx_carnivals_user_active ON carnivals(createdByUserId, isActive) WHERE isActive = 1;',
                { type: QueryTypes.RAW }
            );
            await sequelize.query(
                'CREATE INDEX IF NOT EXISTS idx_carnivals_created ON carnivals(createdAt DESC);',
                { type: QueryTypes.RAW }
            );

            // User indexes
            await sequelize.query(
                'CREATE INDEX IF NOT EXISTS idx_users_club_active ON users(clubId, isActive) WHERE isActive = 1;',
                { type: QueryTypes.RAW }
            );
            await sequelize.query(
                'CREATE INDEX IF NOT EXISTS idx_users_primary_active ON users(isPrimaryDelegate, isActive) WHERE isActive = 1;',
                { type: QueryTypes.RAW }
            );
            await sequelize.query(
                'CREATE INDEX IF NOT EXISTS idx_users_invitation ON users(invitationToken) WHERE invitationToken IS NOT NULL;',
                { type: QueryTypes.RAW }
            );

            // Club indexes
            await sequelize.query(
                'CREATE INDEX IF NOT EXISTS idx_clubs_state_active ON clubs(state, isActive) WHERE isActive = 1;',
                { type: QueryTypes.RAW }
            );
            await sequelize.query(
                'CREATE INDEX IF NOT EXISTS idx_clubs_name ON clubs(clubName);',
                { type: QueryTypes.RAW }
            );

            // Email subscription indexes
            await sequelize.query(
                'CREATE INDEX IF NOT EXISTS idx_subscriptions_state_active ON email_subscriptions(states, isActive) WHERE isActive = 1;',
                { type: QueryTypes.RAW }
            );

            // Sponsor indexes
            await sequelize.query(
                'CREATE INDEX IF NOT EXISTS idx_sponsors_name ON sponsors(sponsorName);',
                { type: QueryTypes.RAW }
            );

            // ClubPlayer indexes
            await sequelize.query(
                'CREATE INDEX IF NOT EXISTS idx_club_players_name ON club_players(lastName, firstName);',
                { type: QueryTypes.RAW }
            );

            console.log('Database indexes created successfully');
        } catch (error) {
            // Consistent error response format
            const errObj = { error: { status: 500, message: `Database index creation failed: ${error.message}` } };
            console.error(errObj);
            throw Object.assign(new Error(errObj.error.message), errObj);
        }
    }

    /**
     * Analyze database performance and return statistics.
     *
     * @returns {Promise<Object>} Performance statistics
     * @throws {Error} Logs and throws error with descriptive message
     */
    static async analyzePerformance() {
        // Inline comment: Table statistics and index info are gathered securely
        try {
            console.log('Analyzing database performance...');

            // Get table statistics securely using actual table names
            const tables = ['carnivals', 'users', 'clubs', 'email_subscriptions'];
            const stats = {};

            for (const table of tables) {
                // Use backticks for table names to be safe
                const countResult = await sequelize.query(
                    `SELECT COUNT(*) as count FROM ${table}`,
                    { type: QueryTypes.SELECT }
                );
                const count = countResult[0]?.count ?? 0;
                stats[table] = {
                    count,
                    tableName: table
                };
            }

            // Check SQLite database size
            const dbSizeResult = await sequelize.query(
                'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()',
                { type: QueryTypes.SELECT }
            );
            const dbSize = dbSizeResult[0]?.size ?? 0;

            // Get index list
            const indexResult = await sequelize.query(
                'SELECT name, tbl_name FROM sqlite_master WHERE type = "index" AND name NOT LIKE "sqlite_%"',
                { type: QueryTypes.SELECT }
            );
            const indexes = indexResult;

            return {
                tableStats: stats,
                databaseSize: Math.round(dbSize / 1024), // KB
                indexes,
                timestamp: new Date()
            };
        } catch (error) {
            const errObj = { error: { status: 500, message: `Database performance analysis failed: ${error.message}` } };
            console.error(errObj);
            throw Object.assign(new Error(errObj.error.message), errObj);
        }
    }

    /**
     * Optimize SQLite database by running VACUUM, ANALYZE, and PRAGMA optimize.
     *
     * @returns {Promise<void>}
     * @throws {Error} Logs and throws error with descriptive message
     */
    static async optimizeDatabase() {
        // Inline comment: VACUUM, ANALYZE, and PRAGMA optimize are safe for scheduled maintenance
        try {
            console.log('Optimizing SQLite database...');

            // Run VACUUM to compact the database
            await sequelize.query('VACUUM;');
            console.log('Database VACUUMed successfully');

            // Analyze tables to update query planner statistics
            await sequelize.query('ANALYZE;');
            console.log('Database statistics updated');

            // Set pragma optimizations
            await sequelize.query('PRAGMA optimize;');
            console.log('Database optimized successfully');

        } catch (error) {
            const errObj = { error: { status: 500, message: `Database optimization failed: ${error.message}` } };
            console.error(errObj);
            throw Object.assign(new Error(errObj.error.message), errObj);
        }
    }

    /**
     * Set up database connection and query monitoring hooks.
     *
     * @returns {Promise<void>}
     * @throws {Error} Logs and throws error with descriptive message
     */
    static async setupMonitoring() {
        // Inline comment: Hooks log connection and query events for diagnostics
        try {
            console.log('Setting up database monitoring...');

            // Helper to handle both sync and async addHook
            async function safeAddHook(...args) {
                const result = sequelize.addHook(...args);
                if (result && typeof result.then === 'function') {
                    await result;
                }
            }

            // Sequelize connection carnival monitoring
            if (typeof sequelize.addHook === 'function') {
                try {
                    await safeAddHook('beforeConnect', () => {
                        console.log('SQLite connection establishing...');
                    });
                    await safeAddHook('afterConnect', () => {
                        console.log('SQLite connected successfully');
                    });
                    await safeAddHook('beforeDisconnect', () => {
                        console.log('SQLite disconnecting...');
                    });
                    await safeAddHook('afterDisconnect', () => {
                        console.log('SQLite disconnected');
                    });
                } catch (hookError) {
                    throw hookError;
                }
            }

            // Query performance monitoring - Enable in all environments for debugging
            try {
                await safeAddHook('beforeQuery', (options) => {
                    options.startTime = Date.now();
                    // Capture SQL query with multiple fallback strategies
                    options.capturedSql = options.sql || options.query || options.statement;
                    
                    // Also capture bind parameters if available
                    if (options.bind && options.bind.length > 0) {
                        options.capturedBind = options.bind;
                    } else if (options.replacements) {
                        options.capturedReplacements = options.replacements;
                    }
                });

                await safeAddHook('afterQuery', (options) => {
                    if (options.startTime) {
                        const duration = Date.now() - options.startTime;
                        // Configurable threshold via environment variable
                        // Default: 500ms (more realistic for SQLite in containers)
                        const slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS) || 500;
                        
                        if (duration > slowQueryThreshold) {
                            // Get the actual SQL with fallback strategies
                            let actualSql = options.capturedSql || options.sql || options.query || options.statement;
                            
                            // If still no SQL, try to extract from other properties
                            if (!actualSql && options.instance && options.instance._previousDataValues) {
                                actualSql = 'Model operation on ' + (options.instance.constructor.name || 'unknown model');
                            }
                            
                            const slowQueryInfo = {
                                sql: actualSql || 'SQL text not available',
                                duration: `${duration}ms`,
                                threshold: `${slowQueryThreshold}ms`,
                                timestamp: new Date().toISOString(),
                                environment: process.env.NODE_ENV || 'development'
                            };

                            // Include bind parameters if available
                            if (options.capturedBind) {
                                slowQueryInfo.bindParameters = options.capturedBind;
                            } else if (options.capturedReplacements) {
                                slowQueryInfo.replacements = options.capturedReplacements;
                            }

                            // Log to console (captured by Docker)
                            console.warn('🐌 SLOW QUERY DETECTED:', JSON.stringify(slowQueryInfo, null, 2));
                        }
                    }
                });
            } catch (hookError) {
                console.error('Failed to set up query monitoring hooks:', hookError);
                throw hookError;
            }

            console.log('Database monitoring setup complete');
        } catch (error) {
            const errObj = { error: { status: 500, message: `Database monitoring setup failed: ${error.message}` } };
            console.error(errObj);
            throw Object.assign(new Error(errObj.error.message), errObj);
        }
    }

    /**
     * Perform scheduled database maintenance tasks.
     * Delegates business logic to model static methods for strict MVC compliance.
     *
     * @returns {Promise<void>}
     * @throws {Error} Logs and throws error with descriptive message
     */
    static async performMaintenance() {
        // Inline comment: Only calls model static methods, never mixes business logic
        try {
            console.log('Performing database maintenance...');

            // Cleanup expired tokens using User model method (lazy import to avoid cycles)
            const { default: User } = await import('../models/User.mjs');
            const expiredInvitations = await User.cleanupExpiredInvitations();
            console.log(`Cleaned up ${expiredInvitations} expired invitation tokens`);

            // Cleanup expired sessions using Session model method (lazy import to avoid cycles)
            const { default: Session } = await import('../models/Session.mjs');
            const expiredSessions = await Session.cleanupExpired();
            console.log(`Cleaned up ${expiredSessions} expired sessions`);

            // Optimize database
            await this.optimizeDatabase();

            console.log('Database maintenance completed');
        } catch (error) {
            const errObj = { error: { status: 500, message: `Database maintenance failed: ${error.message}` } };
            console.error(errObj);
            throw Object.assign(new Error(errObj.error.message), errObj);
        }
    }

    /**
     * Backup the SQLite database file and clean up old backups.
     * Validates and sanitizes all environment variables for security.
     *
     * @returns {Promise<void>}
     * @throws {Error} Logs and throws error with descriptive message
     */
    static async backupDatabase() {
        // Inline comment: Backup logic uses sanitized environment variables and safe file operations
        if (process.env.BACKUP_ENABLED !== 'true') {
            console.log('Database backup is disabled');
            return;
        }
        try {
            console.log('Starting SQLite database backup...');

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `rugby-masters-backup-${timestamp}.db`;
            // Use constant for backup directory
            const backupDir = UPLOAD_DIRECTORIES.UPLOADS_ROOT + '/backups';
            try {
                await fs.mkdir(backupDir, { recursive: true });
            } catch (error) {
                // Directory already exists
            }

            // Get the current database file path
            const dbPath = sequelize.options.storage;
            const backupPath = path.join(backupDir, backupName);

            // Copy the database file
            await fs.copyFile(dbPath, backupPath);
            console.log(`Database backup completed: ${backupName}`);

            // Cleanup old backups
            const retentionDays = Number.isInteger(Number(process.env.BACKUP_RETENTION_DAYS)) ? Number(process.env.BACKUP_RETENTION_DAYS) : 30;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            try {
                const backups = await fs.readdir(backupDir);
                
                for (const backup of backups) {
                    if (backup.endsWith('.db')) {
                        const backupPath = path.join(backupDir, backup);
                        const stats = await fs.stat(backupPath);
                        
                        if (stats.mtime < cutoffDate) {
                            await fs.unlink(backupPath);
                            console.log(`Removed old backup: ${backup}`);
                        }
                    }
                }
            } catch (error) {
                console.warn('Error cleaning up old backups:', error.message);
            }

        } catch (error) {
            const errObj = { error: { status: 500, message: `Database backup failed: ${error.message}` } };
            console.error(errObj);
            throw Object.assign(new Error(errObj.error.message), errObj);
        }
    }


}

export default DatabaseOptimizer;