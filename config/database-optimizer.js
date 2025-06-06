const { sequelize } = require('./database');

/**
 * Database optimization configurations for SQLite/Sequelize
 * These optimizations improve performance, reliability, and monitoring for SQLite
 */

class DatabaseOptimizer {
    static async configureProduction() {
        // SQLite connection pool optimization
        const connectionOptions = {
            pool: {
                max: parseInt(process.env.SQLITE_MAX_POOL_SIZE) || 5,
                min: parseInt(process.env.SQLITE_MIN_POOL_SIZE) || 1,
                acquire: parseInt(process.env.SQLITE_ACQUIRE_TIMEOUT) || 30000,
                idle: parseInt(process.env.SQLITE_IDLE_TIMEOUT) || 10000
            },
            
            // SQLite specific optimizations
            dialectOptions: {
                // Enable foreign key constraints
                options: {
                    enableForeignKeyConstraints: true
                }
            },
            
            // Logging configuration
            logging: process.env.NODE_ENV === 'production' ? false : console.log,
            
            // Query timeout
            dialectOptions: {
                timeout: parseInt(process.env.SQLITE_QUERY_TIMEOUT) || 30000
            }
        };

        return connectionOptions;
    }

    static async createIndexes() {
        try {
            console.log('Creating database indexes for optimization...');

            // Carnival indexes
            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_carnivals_date_active 
                ON Carnivals(date, isActive) 
                WHERE isActive = 1;
            `);

            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_carnivals_state_date 
                ON Carnivals(state, date);
            `);

            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_carnivals_user_active 
                ON Carnivals(createdByUserId, isActive) 
                WHERE isActive = 1;
            `);

            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_carnivals_mysideline 
                ON Carnivals(mySidelineEventId) 
                WHERE mySidelineEventId IS NOT NULL;
            `);

            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_carnivals_created 
                ON Carnivals(createdAt DESC);
            `);

            // User indexes
            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_users_club_active 
                ON Users(clubId, isActive) 
                WHERE isActive = 1;
            `);

            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_users_primary_active 
                ON Users(isPrimaryDelegate, isActive) 
                WHERE isActive = 1;
            `);

            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_users_invitation 
                ON Users(invitationToken) 
                WHERE invitationToken IS NOT NULL;
            `);

            // Club indexes
            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_clubs_state_active 
                ON Clubs(state, isActive) 
                WHERE isActive = 1;
            `);

            // Email subscription indexes
            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_subscriptions_state_active 
                ON EmailSubscriptions(state, isActive) 
                WHERE isActive = 1;
            `);

            console.log('Database indexes created successfully');
        } catch (error) {
            console.error('Error creating database indexes:', error);
            throw error;
        }
    }

    static async analyzePerformance() {
        try {
            console.log('Analyzing database performance...');

            // Get table statistics
            const tables = ['Carnivals', 'Users', 'Clubs', 'EmailSubscriptions'];
            const stats = {};

            for (const table of tables) {
                const countResult = await sequelize.query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = countResult[0][0].count;
                
                stats[table] = {
                    count: count,
                    tableName: table
                };
            }

            // Check SQLite database size
            const dbSizeResult = await sequelize.query(`
                SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()
            `);
            const dbSize = dbSizeResult[0][0].size;

            // Get index list
            const indexResult = await sequelize.query(`
                SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
            `);
            const indexes = indexResult[0];

            return {
                tableStats: stats,
                databaseSize: Math.round(dbSize / 1024), // KB
                indexes: indexes,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Error analyzing database performance:', error);
            throw error;
        }
    }

    static async optimizeDatabase() {
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
            console.error('Error optimizing database:', error);
            throw error;
        }
    }

    static async setupMonitoring() {
        try {
            console.log('Setting up database monitoring...');

            // Sequelize connection event monitoring
            sequelize.addHook('beforeConnect', () => {
                console.log('SQLite connection establishing...');
            });

            sequelize.addHook('afterConnect', () => {
                console.log('SQLite connected successfully');
            });

            sequelize.addHook('beforeDisconnect', () => {
                console.log('SQLite disconnecting...');
            });

            sequelize.addHook('afterDisconnect', () => {
                console.log('SQLite disconnected');
            });

            // Query performance monitoring
            if (process.env.NODE_ENV === 'production') {
                sequelize.addHook('beforeQuery', (options) => {
                    options.startTime = Date.now();
                });

                sequelize.addHook('afterQuery', (options) => {
                    if (options.startTime) {
                        const duration = Date.now() - options.startTime;
                        if (duration > 100) {
                            console.warn(`Slow query detected: ${duration}ms`, {
                                sql: options.sql,
                                duration: `${duration}ms`
                            });
                        }
                    }
                });
            }

            console.log('Database monitoring setup complete');
        } catch (error) {
            console.error('Error setting up database monitoring:', error);
            throw error;
        }
    }

    static async performMaintenance() {
        try {
            console.log('Performing database maintenance...');

            // Cleanup expired tokens
            const now = new Date();
            
            const { User } = require('../models');
            const expiredInvitations = await User.update(
                { 
                    invitationToken: null,
                    tokenExpiry: null
                },
                {
                    where: {
                        tokenExpiry: { [sequelize.Op.lt]: now },
                        invitationToken: { [sequelize.Op.ne]: null }
                    }
                }
            );

            console.log(`Cleaned up ${expiredInvitations[0]} expired invitation tokens`);

            // Archive old carnival data (older than 2 years)
            const archiveDate = new Date();
            archiveDate.setFullYear(archiveDate.getFullYear() - 2);

            const { Carnival } = require('../models');
            const oldCarnivals = await Carnival.update(
                { 
                    isActive: false,
                    archivedAt: new Date()
                },
                {
                    where: {
                        date: { [sequelize.Op.lt]: archiveDate },
                        isActive: true
                    }
                }
            );

            console.log(`Archived ${oldCarnivals[0]} old carnivals`);

            // Optimize database
            await this.optimizeDatabase();

            console.log('Database maintenance completed');
        } catch (error) {
            console.error('Error during database maintenance:', error);
            throw error;
        }
    }

    static async backupDatabase() {
        if (process.env.BACKUP_ENABLED !== 'true') {
            console.log('Database backup is disabled');
            return;
        }

        try {
            console.log('Starting SQLite database backup...');

            const fs = require('fs').promises;
            const path = require('path');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `rugby-masters-backup-${timestamp}.db`;
            
            // Ensure backup directory exists
            const backupDir = './backups';
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
            const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
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
            console.error('SQLite database backup failed:', error);
            throw error;
        }
    }
}

module.exports = DatabaseOptimizer;