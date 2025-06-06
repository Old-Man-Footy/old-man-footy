const mongoose = require('mongoose');

/**
 * Database optimization configurations for production
 * These optimizations improve performance, reliability, and monitoring
 */

class DatabaseOptimizer {
    static async configureProduction() {
        // Connection pool optimization
        const connectionOptions = {
            maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
            minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE) || 2,
            maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME) || 30000,
            connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT) || 10000,
            socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT) || 45000,
            
            // Replica set optimizations
            readPreference: 'secondaryPreferred',
            retryWrites: true,
            w: 'majority',
            
            // Connection management
            serverSelectionTimeoutMS: 5000,
            heartbeatFrequencyMS: 10000,
            
            // Buffer management
            bufferMaxEntries: 0,
            bufferCommands: false,
            
            // Compression
            compressors: ['zlib'],
            zlibCompressionLevel: 6
        };

        return connectionOptions;
    }

    static async createIndexes() {
        try {
            console.log('Creating database indexes for optimization...');

            // Carnival indexes
            await mongoose.connection.collection('carnivals').createIndexes([
                // Performance indexes
                { key: { date: 1, isActive: 1 }, name: 'date_active_idx' },
                { key: { state: 1, date: 1 }, name: 'state_date_idx' },
                { key: { createdByUserId: 1, isActive: 1 }, name: 'user_active_idx' },
                { key: { mySidelineEventId: 1 }, name: 'mysideline_idx', sparse: true },
                
                // Search indexes
                { key: { title: 'text', locationAddress: 'text', scheduleDetails: 'text' }, 
                  name: 'search_text_idx' },
                
                // Admin queries
                { key: { createdAt: -1 }, name: 'created_desc_idx' },
                { key: { lastMySidelineSync: 1 }, name: 'sync_date_idx', sparse: true }
            ]);

            // User indexes
            await mongoose.connection.collection('users').createIndexes([
                { key: { email: 1 }, name: 'email_unique_idx', unique: true },
                { key: { clubId: 1, isActive: 1 }, name: 'club_active_idx' },
                { key: { isPrimaryDelegate: 1, isActive: 1 }, name: 'primary_active_idx' },
                { key: { invitationToken: 1 }, name: 'invitation_idx', sparse: true },
                { key: { tokenExpiry: 1 }, name: 'token_expiry_idx', sparse: true }
            ]);

            // Club indexes
            await mongoose.connection.collection('clubs').createIndexes([
                { key: { name: 1, state: 1 }, name: 'name_state_idx' },
                { key: { state: 1, isActive: 1 }, name: 'state_active_idx' },
                { key: { isActive: 1 }, name: 'active_idx' }
            ]);

            // Email subscription indexes
            await mongoose.connection.collection('emailsubscriptions').createIndexes([
                { key: { email: 1 }, name: 'email_unique_idx', unique: true },
                { key: { state: 1, isActive: 1 }, name: 'state_active_idx' },
                { key: { unsubscribeToken: 1 }, name: 'unsubscribe_idx', unique: true }
            ]);

            console.log('Database indexes created successfully');
        } catch (error) {
            console.error('Error creating database indexes:', error);
            throw error;
        }
    }

    static async analyzePerformance() {
        try {
            console.log('Analyzing database performance...');

            const db = mongoose.connection.db;
            
            // Get collection statistics
            const collections = ['carnivals', 'users', 'clubs', 'emailsubscriptions'];
            const stats = {};

            for (const collection of collections) {
                const collStats = await db.collection(collection).stats();
                stats[collection] = {
                    count: collStats.count,
                    avgObjSize: Math.round(collStats.avgObjSize),
                    storageSize: Math.round(collStats.storageSize / 1024), // KB
                    indexSizes: collStats.indexSizes,
                    totalIndexSize: Math.round(collStats.totalIndexSize / 1024) // KB
                };
            }

            // Check slow operations
            const slowOps = await db.admin().command({
                currentOp: true,
                $or: [
                    { "active": true, "secs_running": { "$gt": 1 } },
                    { "waitingForLock": true }
                ]
            });

            return {
                collectionStats: stats,
                slowOperations: slowOps.inprog || [],
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Error analyzing database performance:', error);
            throw error;
        }
    }

    static async optimizeQueries() {
        // Query optimization hints and aggregation pipeline optimizations
        const optimizations = {
            // Carnival queries
            upcomingCarnivals: {
                pipeline: [
                    { $match: { date: { $gte: new Date() }, isActive: true } },
                    { $sort: { date: 1 } },
                    { $limit: 50 },
                    { $lookup: {
                        from: 'users',
                        localField: 'createdByUserId',
                        foreignField: '_id',
                        as: 'creator',
                        pipeline: [{ $project: { name: 1, email: 1 } }]
                    }}
                ],
                hint: { date: 1, isActive: 1 }
            },

            // User statistics
            userStats: {
                pipeline: [
                    { $match: { isActive: true } },
                    { $group: {
                        _id: '$clubId',
                        userCount: { $sum: 1 },
                        primaryDelegates: { 
                            $sum: { $cond: ['$isPrimaryDelegate', 1, 0] } 
                        }
                    }},
                    { $lookup: {
                        from: 'clubs',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'club'
                    }},
                    { $unwind: '$club' },
                    { $project: {
                        clubName: '$club.name',
                        state: '$club.state',
                        userCount: 1,
                        primaryDelegates: 1
                    }}
                ]
            },

            // Carnival statistics by state
            carnivalsByState: {
                pipeline: [
                    { $match: { isActive: true } },
                    { $group: {
                        _id: '$state',
                        totalCarnivals: { $sum: 1 },
                        upcomingCarnivals: {
                            $sum: { $cond: [{ $gte: ['$date', new Date()] }, 1, 0] }
                        },
                        avgDaysAhead: {
                            $avg: {
                                $divide: [
                                    { $subtract: ['$date', new Date()] },
                                    86400000 // milliseconds in a day
                                ]
                            }
                        }
                    }},
                    { $sort: { totalCarnivals: -1 } }
                ]
            }
        };

        return optimizations;
    }

    static async setupMonitoring() {
        try {
            console.log('Setting up database monitoring...');

            // Connection event monitoring
            mongoose.connection.on('connected', () => {
                console.log('MongoDB connected successfully');
            });

            mongoose.connection.on('error', (err) => {
                console.error('MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                console.log('MongoDB disconnected');
            });

            // Query performance monitoring
            if (process.env.NODE_ENV === 'production') {
                mongoose.set('debug', (collection, method, query, options) => {
                    const startTime = Date.now();
                    
                    // Log slow queries (>100ms)
                    setTimeout(() => {
                        const duration = Date.now() - startTime;
                        if (duration > 100) {
                            console.warn(`Slow query detected: ${collection}.${method}`, {
                                query: JSON.stringify(query),
                                duration: `${duration}ms`,
                                options
                            });
                        }
                    }, 0);
                });
            }

            // Connection pool monitoring
            setInterval(() => {
                const poolStats = {
                    totalConnections: mongoose.connection.readyState,
                    availableConnections: mongoose.connection.db?.serverConfig?.s?.poolSize || 0
                };
                
                if (poolStats.availableConnections < 2) {
                    console.warn('Low database connection pool availability:', poolStats);
                }
            }, 30000); // Check every 30 seconds

            console.log('Database monitoring setup complete');
        } catch (error) {
            console.error('Error setting up database monitoring:', error);
            throw error;
        }
    }

    static async performMaintenance() {
        try {
            console.log('Performing database maintenance...');

            const db = mongoose.connection.db;
            
            // Compact collections to reclaim space
            const collections = ['carnivals', 'users', 'clubs', 'emailsubscriptions'];
            
            for (const collection of collections) {
                try {
                    await db.command({ compact: collection });
                    console.log(`Compacted collection: ${collection}`);
                } catch (error) {
                    console.warn(`Could not compact ${collection}:`, error.message);
                }
            }

            // Update statistics
            await db.command({ planCacheClear: 1 });
            console.log('Query plan cache cleared');

            // Cleanup expired tokens
            const now = new Date();
            
            const expiredInvitations = await mongoose.connection.collection('users').updateMany(
                { 
                    tokenExpiry: { $lt: now },
                    invitationToken: { $exists: true }
                },
                {
                    $unset: { 
                        invitationToken: 1,
                        tokenExpiry: 1
                    }
                }
            );

            console.log(`Cleaned up ${expiredInvitations.modifiedCount} expired invitation tokens`);

            // Archive old carnival data (older than 2 years)
            const archiveDate = new Date();
            archiveDate.setFullYear(archiveDate.getFullYear() - 2);

            const oldCarnivals = await mongoose.connection.collection('carnivals').updateMany(
                { 
                    date: { $lt: archiveDate },
                    isActive: true
                },
                {
                    $set: { 
                        isActive: false,
                        archivedAt: new Date()
                    }
                }
            );

            console.log(`Archived ${oldCarnivals.modifiedCount} old carnivals`);

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
            console.log('Starting database backup...');

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `rugby-masters-backup-${timestamp}`;

            // This would integrate with your chosen backup solution
            // Example implementations:

            // For MongoDB Atlas
            if (process.env.MONGODB_URI.includes('mongodb.net')) {
                console.log('Using MongoDB Atlas backup (configured in Atlas dashboard)');
                return;
            }

            // For self-hosted MongoDB with mongodump
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);

            const mongodumpCmd = `mongodump --uri="${process.env.MONGODB_URI}" --out=./backups/${backupName}`;
            
            await execAsync(mongodumpCmd);
            console.log(`Database backup completed: ${backupName}`);

            // Cleanup old backups
            const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            // Remove old backup directories
            const fs = require('fs').promises;
            const path = require('path');
            
            try {
                const backupDir = './backups';
                const backups = await fs.readdir(backupDir);
                
                for (const backup of backups) {
                    const backupPath = path.join(backupDir, backup);
                    const stats = await fs.stat(backupPath);
                    
                    if (stats.isDirectory() && stats.mtime < cutoffDate) {
                        await fs.rmdir(backupPath, { recursive: true });
                        console.log(`Removed old backup: ${backup}`);
                    }
                }
            } catch (error) {
                console.warn('Error cleaning up old backups:', error.message);
            }

        } catch (error) {
            console.error('Database backup failed:', error);
            throw error;
        }
    }
}

module.exports = DatabaseOptimizer;