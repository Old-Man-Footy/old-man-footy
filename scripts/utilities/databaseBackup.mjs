/**
 * Database Backup
 * 
 * Handles backup and restoration operations for SQLite databases
 * Used during seeding to ensure data safety
 */

import path from 'path';
import fs from 'fs';
import { sequelize } from '../../models/index.mjs';
import { initializeDatabase } from '../../config/database.mjs';

class DatabaseBackup {
    constructor() {
        this.backupPath = null;
    }

    /**
     * Create a backup of the current database before making changes
     * Uses simple file copy for SQLite databases with timestamp naming
     * @returns {Promise<string|null>} Path to backup file or null if skipped
     */
    async createBackup() {
        console.log('💾 Creating database backup...');
        
        try {
            const dbPath = sequelize.options.storage;
            
            // Skip backup for in-memory databases
            if (dbPath === ':memory:') {
                console.log('ℹ️  Skipping backup for in-memory database');
                return null;
            }
            
            // Check if source database exists
            if (!fs.existsSync(dbPath)) {
                console.log('ℹ️  No existing database found - skipping backup');
                return null;
            }
            
            // Get database file info
            const dbStats = fs.statSync(dbPath);
            if (dbStats.size === 0) {
                console.log('ℹ️  Database is empty - skipping backup');
                return null;
            }
            
            // Generate backup filename with timestamp
            const timestamp = new Date().toISOString()
                .replace(/:/g, '-')
                .replace(/\./g, '-')
                .substring(0, 19); // YYYY-MM-DDTHH-MM-SS
            
            const dbDir = path.dirname(dbPath);
            const dbName = path.basename(dbPath, '.db');
            const backupFileName = `${dbName}-backup-${timestamp}.db`;
            this.backupPath = path.join(dbDir, backupFileName);
            
            console.log(`  📁 Source: ${dbPath}`);
            console.log(`  💾 Backup: ${this.backupPath}`);
            
            // For SQLite, we can copy the file while the database is open
            // This avoids connection management issues
            console.log('  📋 Creating backup copy...');
            
            // Create the backup by copying the file
            fs.copyFileSync(dbPath, this.backupPath);
            
            // Verify backup was created successfully
            const backupStats = fs.statSync(this.backupPath);
            if (backupStats.size !== dbStats.size) {
                throw new Error(`Backup size mismatch: original ${dbStats.size} bytes, backup ${backupStats.size} bytes`);
            }
            
            console.log(`  ✅ Backup created successfully (${Math.round(backupStats.size / 1024)} KB)`);
            
            return this.backupPath;
            
        } catch (error) {
            console.error('❌ Backup creation failed:', error.message);
            
            // Clean up incomplete backup file
            if (this.backupPath && fs.existsSync(this.backupPath)) {
                try {
                    fs.unlinkSync(this.backupPath);
                    console.log('  🧹 Cleaned up incomplete backup file');
                } catch (cleanupError) {
                    console.error('⚠️  Could not clean up backup file:', cleanupError.message);
                }
            }
            
            // Try to reconnect to database
            try {
                await initializeDatabase();
                console.log('  🔌 Database connection restored after backup failure');
            } catch (reconnectError) {
                console.error('💥 Could not restore database connection:', reconnectError.message);
            }
            
            throw error;
        }
    }

    /**
     * Restore from backup in case of emergency
     * @param {string} backupPath - Path to backup file to restore from
     * @returns {Promise<void>}
     */
    async restoreFromBackup(backupPath = null) {
        const restorePath = backupPath || this.backupPath;
        
        if (!restorePath || !fs.existsSync(restorePath)) {
            throw new Error('No backup file available for restoration');
        }
        
        console.log('🔄 Restoring database from backup...');
        
        try {
            const dbPath = sequelize.options.storage;
            
            // Close database connection
            await sequelize.close();
            
            // Replace current database with backup
            fs.copyFileSync(restorePath, dbPath);
            
            // Reconnect to database
            await initializeDatabase();
            
            console.log(`✅ Database restored from backup: ${path.basename(restorePath)}`);
            
        } catch (error) {
            console.error('❌ Database restoration failed:', error.message);
            throw error;
        }
    }

    /**
     * Clean up old backup files (keep only last 5 backups)
     * @returns {Promise<void>}
     */
    async cleanupOldBackups() {
        try {
            const dbPath = sequelize.options.storage;
            const dbDir = path.dirname(dbPath);
            const dbName = path.basename(dbPath, '.db');
            
            // Find all backup files for this database
            const files = fs.readdirSync(dbDir);
            const backupFiles = files
                .filter(file => file.startsWith(`${dbName}-backup-`) && file.endsWith('.db'))
                .map(file => ({
                    name: file,
                    path: path.join(dbDir, file),
                    mtime: fs.statSync(path.join(dbDir, file)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime); // Newest first
            
            // Keep only the 5 most recent backups
            const backupsToDelete = backupFiles.slice(5);
            
            if (backupsToDelete.length > 0) {
                console.log(`🧹 Cleaning up ${backupsToDelete.length} old backup files...`);
                
                for (const backup of backupsToDelete) {
                    fs.unlinkSync(backup.path);
                    console.log(`  🗑️  Deleted: ${backup.name}`);
                }
                
                console.log(`✅ Kept ${Math.min(5, backupFiles.length)} most recent backups`);
            }
            
        } catch (error) {
            console.warn('⚠️  Could not clean up old backups:', error.message);
        }
    }

    /**
     * Get the current backup path
     * @returns {string|null} Current backup path
     */
    getBackupPath() {
        return this.backupPath;
    }
}

export default DatabaseBackup;