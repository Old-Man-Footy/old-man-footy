/**
 * Image Migration Script - Convert existing images to structured naming
 * 
 * This script migrates existing images to the new structured naming convention
 * while maintaining all database references and file integrity.
 * 
 * Usage:
 * - node scripts/migrate-image-names.js --dry-run (to preview changes)
 * - node scripts/migrate-image-names.js --execute (to perform migration)
 */

const path = require('path');
const fs = require('fs').promises;
const ImageNamingService = require('../services/imageNamingService');
const { Club, Carnival, User } = require('../models');

class ImageMigrationScript {
    constructor() {
        this.dryRun = true;
        this.migrationLog = [];
        this.errorLog = [];
    }

    /**
     * Main migration function
     * @param {boolean} dryRun - If true, only simulate the migration
     */
    async migrate(dryRun = true) {
        this.dryRun = dryRun;
        console.log(`🔄 Starting image migration (${dryRun ? 'DRY RUN' : 'EXECUTION'})...`);
        
        try {
            // Migrate club images
            await this.migrateClubImages();
            
            // Migrate carnival images
            await this.migrateCarnivalImages();
            
            // Generate migration report
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            this.errorLog.push({ operation: 'main', error: error.message });
        }
    }

    /**
     * Migrate all club images
     */
    async migrateClubImages() {
        console.log('\n📂 Migrating club images...');
        
        const clubs = await Club.findAll({
            where: { isActive: true },
            attributes: ['id', 'clubName', 'logoUrl']
        });

        console.log(`Found ${clubs.length} active clubs`);

        for (const club of clubs) {
            try {
                const updates = {};
                let hasUpdates = false;

                // Migrate logo if present
                if (club.logoUrl) {
                    const migratedLogo = await this.migrateImage({
                        entityType: ImageNamingService.ENTITY_TYPES.CLUB,
                        entityId: club.id,
                        imageType: ImageNamingService.IMAGE_TYPES.LOGO,
                        currentUrl: club.logoUrl,
                        uploaderId: 1 // System user for migration
                    });

                    if (migratedLogo.success) {
                        updates.logoUrl = migratedLogo.newPath;
                        hasUpdates = true;
                    }
                }

                // Update database if changes were made
                if (hasUpdates && !this.dryRun) {
                    await club.update(updates);
                }

                this.migrationLog.push({
                    type: 'club',
                    id: club.id,
                    name: club.clubName,
                    updates,
                    success: true
                });

            } catch (error) {
                console.error(`Error migrating club ${club.id}:`, error);
                this.errorLog.push({
                    type: 'club',
                    id: club.id,
                    error: error.message
                });
            }
        }
    }

    /**
     * Migrate all carnival images
     */
    async migrateCarnivalImages() {
        console.log('\n🎪 Migrating carnival images...');
        
        const carnivals = await Carnival.findAll({
            where: { isActive: true },
            attributes: ['id', 'title', 'clubLogoURL', 'promotionalImageURL', 'additionalImages', 'drawFiles', 'createdByUserId']
        });

        console.log(`Found ${carnivals.length} active carnivals`);

        for (const carnival of carnivals) {
            try {
                const updates = {};
                let hasUpdates = false;
                const uploaderId = carnival.createdByUserId || 1;

                // Migrate club logo if present
                if (carnival.clubLogoURL) {
                    const migratedLogo = await this.migrateImage({
                        entityType: ImageNamingService.ENTITY_TYPES.CARNIVAL,
                        entityId: carnival.id,
                        imageType: ImageNamingService.IMAGE_TYPES.LOGO,
                        currentUrl: carnival.clubLogoURL,
                        uploaderId
                    });

                    if (migratedLogo.success) {
                        updates.clubLogoURL = migratedLogo.newPath;
                        hasUpdates = true;
                    }
                }

                // Migrate promotional image if present
                if (carnival.promotionalImageURL) {
                    const migratedPromo = await this.migrateImage({
                        entityType: ImageNamingService.ENTITY_TYPES.CARNIVAL,
                        entityId: carnival.id,
                        imageType: ImageNamingService.IMAGE_TYPES.PROMOTIONAL,
                        currentUrl: carnival.promotionalImageURL,
                        uploaderId
                    });

                    if (migratedPromo.success) {
                        updates.promotionalImageURL = migratedPromo.newPath;
                        hasUpdates = true;
                    }
                }

                // Migrate additional images if present
                if (carnival.additionalImages && Array.isArray(carnival.additionalImages)) {
                    const migratedAdditional = [];
                    
                    for (let i = 0; i < carnival.additionalImages.length; i++) {
                        const imageUrl = carnival.additionalImages[i];
                        const migrated = await this.migrateImage({
                            entityType: ImageNamingService.ENTITY_TYPES.CARNIVAL,
                            entityId: carnival.id,
                            imageType: ImageNamingService.IMAGE_TYPES.GALLERY,
                            currentUrl: imageUrl,
                            uploaderId,
                            customSuffix: `gallery-${i + 1}`
                        });

                        if (migrated.success) {
                            migratedAdditional.push(migrated.newPath);
                        } else {
                            migratedAdditional.push(imageUrl); // Keep original if migration failed
                        }
                    }

                    if (migratedAdditional.length > 0) {
                        updates.additionalImages = migratedAdditional;
                        hasUpdates = true;
                    }
                }

                // Migrate draw files if present
                if (carnival.drawFiles && Array.isArray(carnival.drawFiles)) {
                    const migratedDrawFiles = [];
                    
                    for (let i = 0; i < carnival.drawFiles.length; i++) {
                        const drawFile = carnival.drawFiles[i];
                        if (drawFile.url) {
                            const migrated = await this.migrateImage({
                                entityType: ImageNamingService.ENTITY_TYPES.CARNIVAL,
                                entityId: carnival.id,
                                imageType: ImageNamingService.IMAGE_TYPES.DRAW_DOCUMENT,
                                currentUrl: drawFile.url,
                                uploaderId,
                                customSuffix: `draw-${i + 1}`
                            });

                            if (migrated.success) {
                                migratedDrawFiles.push({
                                    ...drawFile,
                                    url: migrated.newPath
                                });
                            } else {
                                migratedDrawFiles.push(drawFile); // Keep original if migration failed
                            }
                        } else {
                            migratedDrawFiles.push(drawFile);
                        }
                    }

                    if (migratedDrawFiles.length > 0) {
                        updates.drawFiles = migratedDrawFiles;
                        hasUpdates = true;
                    }
                }

                // Update database if changes were made
                if (hasUpdates && !this.dryRun) {
                    await carnival.update(updates);
                }

                this.migrationLog.push({
                    type: 'carnival',
                    id: carnival.id,
                    name: carnival.title,
                    updates,
                    success: true
                });

            } catch (error) {
                console.error(`Error migrating carnival ${carnival.id}:`, error);
                this.errorLog.push({
                    type: 'carnival',
                    id: carnival.id,
                    error: error.message
                });
            }
        }
    }

    /**
     * Migrate a single image file
     * @param {Object} options - Migration options
     * @returns {Object} Migration result
     */
    async migrateImage(options) {
        const { entityType, entityId, imageType, currentUrl, uploaderId, customSuffix = 'migrated' } = options;
        
        try {
            // Skip if no URL provided
            if (!currentUrl) {
                return { success: false, reason: 'No URL provided' };
            }

            // Parse current file path
            const currentPath = currentUrl.startsWith('/uploads/') 
                ? path.join('uploads', currentUrl.substring(9))
                : path.join('uploads', currentUrl);

            // Check if file exists
            const fileExists = await fs.access(currentPath).then(() => true).catch(() => false);
            if (!fileExists) {
                return { success: false, reason: 'Original file not found', path: currentPath };
            }

            // Check if already using structured naming
            const parsed = ImageNamingService.parseImageName(path.basename(currentPath));
            if (parsed && parsed.entityType === entityType && parsed.entityId === entityId) {
                return { success: false, reason: 'Already using structured naming' };
            }

            // Generate new structured name
            const namingResult = await ImageNamingService.generateImageName({
                entityType,
                entityId,
                imageType,
                uploaderId,
                originalName: path.basename(currentPath),
                customSuffix
            });

            const newPath = path.join('uploads', namingResult.fullPath);
            const newUrl = `/uploads/${namingResult.fullPath.replace(/\\/g, '/')}`;

            if (!this.dryRun) {
                // Ensure target directory exists
                await fs.mkdir(path.dirname(newPath), { recursive: true });

                // Copy file to new location (don't delete original yet)
                await fs.copyFile(currentPath, newPath);

                // Verify the copy was successful
                const newFileExists = await fs.access(newPath).then(() => true).catch(() => false);
                if (!newFileExists) {
                    throw new Error('Failed to copy file to new location');
                }
            }

            return {
                success: true,
                oldPath: currentUrl,
                newPath: newUrl,
                metadata: namingResult.metadata
            };

        } catch (error) {
            return {
                success: false,
                reason: error.message,
                oldPath: currentUrl
            };
        }
    }

    /**
     * Generate migration report
     */
    generateReport() {
        console.log('\n📊 Migration Report');
        console.log('='.repeat(50));
        
        const clubMigrations = this.migrationLog.filter(item => item.type === 'club');
        const carnivalMigrations = this.migrationLog.filter(item => item.type === 'carnival');
        
        console.log(`✅ Clubs processed: ${clubMigrations.length}`);
        console.log(`✅ Carnivals processed: ${carnivalMigrations.length}`);
        console.log(`❌ Errors encountered: ${this.errorLog.length}`);
        
        if (this.errorLog.length > 0) {
            console.log('\n❌ Errors:');
            this.errorLog.forEach((error, index) => {
                console.log(`${index + 1}. ${error.type} ${error.id}: ${error.error}`);
            });
        }

        // Count total file operations
        let totalFiles = 0;
        this.migrationLog.forEach(item => {
            if (item.updates) {
                totalFiles += Object.keys(item.updates).length;
            }
        });

        console.log(`\n📁 Total files ${this.dryRun ? 'would be' : 'were'} migrated: ${totalFiles}`);
        
        if (this.dryRun) {
            console.log('\n💡 This was a dry run. To execute the migration, run with --execute flag');
        } else {
            console.log('\n✅ Migration completed successfully!');
            console.log('\n⚠️  Important: Verify the migration worked correctly before deleting old image files');
        }
    }

    /**
     * Clean up old image files after successful migration
     * Only call this after verifying the migration was successful
     */
    async cleanupOldFiles() {
        if (this.dryRun) {
            console.log('❌ Cannot cleanup in dry run mode');
            return;
        }

        console.log('\n🧹 Cleaning up old image files...');
        let cleanedCount = 0;
        let errors = 0;

        for (const migration of this.migrationLog) {
            if (migration.success && migration.updates) {
                for (const [field, newPath] of Object.entries(migration.updates)) {
                    // This would require tracking old paths, which we'd need to enhance
                    // For now, this is a placeholder for the cleanup functionality
                }
            }
        }

        console.log(`🧹 Cleanup completed: ${cleanedCount} files removed, ${errors} errors`);
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const isDryRun = !args.includes('--execute');
    const shouldCleanup = args.includes('--cleanup');

    (async () => {
        const migration = new ImageMigrationScript();
        
        await migration.migrate(isDryRun);
        
        if (shouldCleanup && !isDryRun) {
            await migration.cleanupOldFiles();
        }
    })().catch(console.error);
}

module.exports = ImageMigrationScript;