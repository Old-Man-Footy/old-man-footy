#!/usr/bin/env node

/**
 * Image Management CLI Utility
 * 
 * Command-line interface for managing structured images in the NRL Masters application.
 * Provides tools for migration, cleanup, validation, and maintenance.
 * 
 * Usage Examples:
 * - node scripts/image-manager.js migrate --dry-run
 * - node scripts/image-manager.js migrate --execute
 * - node scripts/image-manager.js cleanup --orphaned
 * - node scripts/image-manager.js validate --entity club --id 42
 * - node scripts/image-manager.js stats
 */

import path from 'path';
import { promises as fs } from 'fs';
import ImageNamingService from '../services/imageNamingService.mjs';
import ImageMigrationScript from './migrate-image-names.mjs';
import { Club, Carnival, User } from '../models/index.mjs';
import { UPLOAD_DIRECTORIES_ARRAY } from '../config/constants.mjs';

/**
 * Image Management CLI for structured image handling
 */
class ImageManagerCLI {
    constructor() {
        this.uploadDirs = UPLOAD_DIRECTORIES_ARRAY;

        this.commands = {
            migrate: this.migrate.bind(this),
            cleanup: this.cleanup.bind(this),
            validate: this.validate.bind(this),
            stats: this.stats.bind(this),
            help: this.help.bind(this)
        };
    }

    /**
     * Main entry point for CLI
     * @returns {Promise<void>}
     */
    async run() {
        const args = process.argv.slice(2);
        const command = args[0];
        
        if (!command || !this.commands[command]) {
            this.help();
            return;
        }

        try {
            await this.commands[command](args);
        } catch (error) {
            console.error(`❌ Error executing ${command}:`, error.message);
            process.exit(1);
        }
    }

    /**
     * Migrate existing images to structured naming
     * @param {string[]} args - Command line arguments
     * @returns {Promise<void>}
     */
    async migrate(args) {
        const dryRun = !args.includes('--execute');
        const migration = new ImageMigrationScript();
        
        console.log('🔄 Starting image migration...');
        await migration.migrate(dryRun);
        
        if (!dryRun && args.includes('--cleanup')) {
            console.log('\n🧹 Starting cleanup of old files...');
            await migration.cleanupOldFiles();
        }
    }

    /**
     * Cleanup orphaned or invalid images
     * @param {string[]} args - Command line arguments
     * @returns {Promise<void>}
     */
    async cleanup(args) {
        const dryRun = !args.includes('--execute');
        
        if (args.includes('--orphaned')) {
            console.log('🧹 Cleaning up orphaned images...');
            const results = await ImageNamingService.cleanupOrphanedImages(dryRun);
            
            console.log(`📊 Cleanup Results:`);
            console.log(`   Processed: ${results.processed} files`);
            console.log(`   Orphaned: ${results.orphaned.length} files`);
            console.log(`   Errors: ${results.errors.length}`);
            
            if (results.orphaned.length > 0 && dryRun) {
                console.log('\n📁 Orphaned files found:');
                results.orphaned.forEach(item => {
                    console.log(`   ${item.file} (${item.entityType} ID: ${item.entityId})`);
                });
                console.log('\n💡 Run with --execute to actually delete these files');
            }
        }

        if (args.includes('--invalid')) {
            console.log('🔍 Finding invalid image names...');
            await this.findInvalidImageNames(dryRun);
        }

        if (args.includes('--duplicates')) {
            console.log('🔍 Finding duplicate images...');
            await this.findDuplicateImages();
        }
    }

    /**
     * Validate images for a specific entity
     * @param {string[]} args - Command line arguments
     * @returns {Promise<void>}
     */
    async validate(args) {
        const entityTypeIndex = args.indexOf('--entity');
        const entityIdIndex = args.indexOf('--id');
        
        if (entityTypeIndex === -1 || entityIdIndex === -1) {
            console.log('❌ Usage: validate --entity <type> --id <id>');
            console.log('   Types: club, carnival, user');
            return;
        }

        const entityType = args[entityTypeIndex + 1];
        const entityId = parseInt(args[entityIdIndex + 1]);

        if (!['club', 'carnival', 'user'].includes(entityType)) {
            console.log('❌ Invalid entity type. Use: club, carnival, or user');
            return;
        }

        console.log(`🔍 Validating images for ${entityType} ${entityId}...`);
        
        try {
            const images = await ImageNamingService.getEntityImages(entityType, entityId);
            
            console.log(`📊 Found ${images.length} images:`);
            
            for (const image of images) {
                const exists = await fs.access(path.join('uploads', image.fullPath.replace(/^\/uploads\//, '')))
                    .then(() => true)
                    .catch(() => false);
                
                const status = exists ? '✅' : '❌';
                console.log(`   ${status} ${image.filename} (${image.imageType})`);
                
                if (!exists) {
                    console.log(`      Missing file: ${image.fullPath}`);
                }
            }
        } catch (error) {
            console.error(`❌ Error validating ${entityType} ${entityId}:`, error.message);
        }
    }

    /**
     * Display statistics about the image system
     * @returns {Promise<void>}
     */
    async stats() {
        console.log('📊 Image System Statistics');
        console.log('='.repeat(50));
        
        try {
            // Count entities
            const [clubCount, carnivalCount, userCount] = await Promise.all([
                Club.count({ where: { isActive: true } }),
                Carnival.count({ where: { isActive: true } }),
                User.count({ where: { isActive: true } })
            ]);

            console.log(`\n📈 Entity Counts:`);
            console.log(`   Active Clubs: ${clubCount}`);
            console.log(`   Active Carnivals: ${carnivalCount}`);
            console.log(`   Active Users: ${userCount}`);

            // Count files by type using constants
            const fileStats = {};
            let totalFiles = 0;

            for (const dir of this.uploadDirs) {
                try {
                    const files = await fs.readdir(dir);
                    totalFiles += files.length;

                    const dirName = dir.split('/').pop();
                    fileStats[dirName] = { total: files.length, structured: 0, legacy: 0 };

                    files.forEach(file => {
                        const parsed = ImageNamingService.parseImageName(file);
                        if (parsed) {
                            fileStats[dirName].structured++;
                        } else {
                            fileStats[dirName].legacy++;
                        }
                    });
                } catch (error) {
                    // Directory doesn't exist yet
                    const dirName = dir.split('/').pop();
                    fileStats[dirName] = { total: 0, structured: 0, legacy: 0 };
                }
            }

            console.log(`\n📁 File Statistics:`);
            console.log(`   Total Files: ${totalFiles}`);
            
            let totalStructured = 0;
            let totalLegacy = 0;
            
            Object.entries(fileStats).forEach(([dir, stats]) => {
                if (stats.total > 0) {
                    console.log(`   ${dir}: ${stats.total} files (${stats.structured} structured, ${stats.legacy} legacy)`);
                    totalStructured += stats.structured;
                    totalLegacy += stats.legacy;
                }
            });

            console.log(`\n📋 Migration Status:`);
            console.log(`   Structured Files: ${totalStructured}`);
            console.log(`   Legacy Files: ${totalLegacy}`);
            console.log(`   Migration Progress: ${totalFiles > 0 ? Math.round((totalStructured / totalFiles) * 100) : 0}%`);

        } catch (error) {
            console.error('❌ Error gathering statistics:', error.message);
        }
    }

    /**
     * Find images with invalid naming conventions
     * @param {boolean} dryRun - Whether to perform a dry run
     * @returns {Promise<void>}
     */
    async findInvalidImageNames(dryRun = true) {
        const uploadDirs = [
            'public/uploads/logos',
            'public/uploads/images',
            'public/uploads/documents'
        ];

        const invalidFiles = [];

        for (const baseDir of uploadDirs) {
            try {
                const scan = async (dir) => {
                    const entries = await fs.readdir(dir, { withFileTypes: true });
                    
                    for (const entry of entries) {
                        const fullPath = path.join(dir, entry.name);
                        
                        if (entry.isDirectory()) {
                            await scan(fullPath);
                        } else {
                            const parsed = ImageNamingService.parseImageName(entry.name);
                            if (!parsed) {
                                invalidFiles.push(fullPath);
                            }
                        }
                    }
                };
                
                await scan(baseDir);
            } catch (error) {
                console.warn(`⚠️  Could not scan ${baseDir}: ${error.message}`);
            }
        }

        console.log(`\n🔍 Found ${invalidFiles.length} files with invalid naming:`);
        invalidFiles.forEach(file => {
            console.log(`   ${file}`);
        });

        if (invalidFiles.length > 0 && !dryRun) {
            console.log('\n💡 These files should be migrated using the migration script');
        }
    }

    /**
     * Find potential duplicate images
     * @returns {Promise<void>}
     */
    async findDuplicateImages() {
        // This would require implementing file hash comparison
        // For now, we'll focus on finding files with similar names
        console.log('🔍 Duplicate detection not yet implemented');
        console.log('💡 Future enhancement: Compare file hashes to find true duplicates');
    }

    /**
     * Display help information
     */
    help() {
        console.log('🖼️  Image Management CLI');
        console.log('='.repeat(50));
        console.log('Usage: node scripts/image-manager.js <command> [options]');
        console.log('');
        console.log('Commands:');
        console.log('  migrate              Migrate existing images to structured naming');
        console.log('    --dry-run          Preview changes (default)');
        console.log('    --execute          Actually perform migration');
        console.log('    --cleanup          Remove old files after migration');
        console.log('');
        console.log('  cleanup              Clean up problematic images');
        console.log('    --orphaned         Remove images not linked to entities');
        console.log('    --invalid          Find images with invalid names');
        console.log('    --duplicates       Find potential duplicate images');
        console.log('    --execute          Actually perform cleanup');
        console.log('');
        console.log('  validate             Validate images for an entity');
        console.log('    --entity <type>    Entity type (club|carnival|user)');
        console.log('    --id <id>          Entity ID');
        console.log('');
        console.log('  stats                Show image system statistics');
        console.log('');
        console.log('  help                 Show this help message');
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/image-manager.js migrate --dry-run');
        console.log('  node scripts/image-manager.js cleanup --orphaned --execute');
        console.log('  node scripts/image-manager.js validate --entity club --id 42');
        console.log('  node scripts/image-manager.js stats');
    }
}

// Run CLI if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    const cli = new ImageManagerCLI();
    cli.run().catch(console.error);
}

export default ImageManagerCLI;