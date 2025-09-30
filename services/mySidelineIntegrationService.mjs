import cron from 'node-cron';
import MySidelineScraperService from './mySidelineScraperService.mjs';
import MySidelineCarnivalParserService from './mySidelineCarnivalParserService.mjs';
import MySidelineDataService from './mySidelineDataService.mjs';
import MySidelineLogoDownloadService from './mySidelineLogoDownloadService.mjs';
import { Carnival, SyncLog } from '../models/index.mjs';

/**
 * MySideline Integration Service (Main Orchestrator)
 * Coordinates the scraping, parsing, and data processing of MySideline carnivals
 * This is the refactored main service that delegates to specialized services
 */
class MySidelineIntegrationService {
    constructor() {
        this.scraperService = new MySidelineScraperService();
        this.parserService = new MySidelineCarnivalParserService();
        this.dataService = new MySidelineDataService();
        this.logoDownloadService = new MySidelineLogoDownloadService();
        
        this.syncEnabled = process.env.MYSIDELINE_SYNC_ENABLED === 'true';
        this.lastSyncDate = null;
        this.isRunning = false;
        
        // Log configuration on startup
        console.log('MySideline Integration Service initialized with:', {
            syncEnabled: this.syncEnabled,
            environment: process.env.NODE_ENV || 'development'
        });
    }

    /**
     * Initialize the scheduled sync
     */
    initializeScheduledSync() {
        // Run every day at 3 AM
        cron.schedule('0 3 * * *', async () => {
            console.log('Starting scheduled MySideline sync...');
            await this.syncMySidelineCarnivals();
        });

        // Also run on startup if needed - with delay to ensure DB is ready
        setTimeout(() => {
            this.checkAndRunInitialSync();
        }, 2000);
    }

    /**
     * Check and run initial sync if needed
     */
    async checkAndRunInitialSync() {
        try {
            let retries = 3;
            let lastError = null;

            while (retries > 0) {
                try {
                    const shouldSync = await this.dataService.shouldRunInitialSync();
                    if (shouldSync) {
                        await this.syncMySidelineCarnivals();
                    }
                    return; // Success, exit retry loop
                } catch (dbError) {
                    lastError = dbError;
                    retries--;
                    if (retries > 0) {
                        console.log(`Database not ready, retrying in 3 seconds... (${3 - retries}/3)`);
                        await this.delay(3000);
                    }
                }
            }

            throw lastError;
        } catch (error) {
            console.error('Failed to check for initial sync:', error.message);
            console.log('Initial MySideline sync will be skipped. You can manually trigger it from the admin panel.');
        }
    }

    /**
     * Main sync function - orchestrates the entire process with proper sync logging
     */
    async syncMySidelineCarnivals() {
        if (!this.syncEnabled) {
            console.log('MySideline sync is disabled via MYSIDELINE_SYNC_ENABLED configuration');
            return {
                success: true,
                carnivalsProcessed: 0,
                message: 'Sync disabled via configuration'
            };
        }

        if (this.isRunning) {
            console.log('MySideline sync already running, skipping...');
            return;
        }

        this.isRunning = true;
        console.log('Starting MySideline carnival synchronization...');

        // Create sync log entry at the start - this ensures we always track sync attempts
        const syncLog = await SyncLog.startSync('mysideline', {
            triggerSource: 'scheduled',
            environment: process.env.NODE_ENV || 'development'
        });

        try {
            // Step 0: Deactivate past carnivals first (data hygiene)
            console.log('🗓️  Running data hygiene: deactivating past carnivals...');
            const deactivationResult = await this.dataService.deactivatePastCarnivals();
            
            if (deactivationResult.success && deactivationResult.deactivatedCount > 0) {
                console.log(`✅ Deactivated ${deactivationResult.deactivatedCount} past carnivals`);
            }

            // Step 1: Scrape carnivals using the scraper service
            const scrapedCarnivals = await this.scraperService.scrapeCarnivals();
            
            if (!scrapedCarnivals || scrapedCarnivals.length === 0) {
                console.log('No carnivals found from MySideline scraper');
                
                // Mark sync as completed even when no carnivals found - this prcarnivals endless retries
                await syncLog.markCompleted({
                    carnivalsProcessed: 0,
                    carnivalsCreated: 0,
                    carnivalsUpdated: 0
                });
                
                return {
                    success: true,
                    carnivalsProcessed: 0,
                    message: 'No carnivals found'
                };
            }

            // Step 1.5: Validate and clean the scraped data
            console.log('Validating and cleaning scraped carnival data...');
            const cleanedCarnivals = scrapedCarnivals.map(carnival => {
                try {
                    return this.scraperService.validateAndCleanData(carnival);
                } catch (validationError) {
                    console.warn(`Failed to validate carnival "${carnival.title}": ${validationError.message}`);
                    return null; // Mark for filtering out
                }
            }).filter(carnival => carnival !== null); // Remove failed validations

            console.log(`${cleanedCarnivals.length}/${scrapedCarnivals.length} carnivals passed validation`);

            if (cleanedCarnivals.length === 0) {
                console.log('No carnivals passed validation checks');
                
                // Mark sync as completed even when no carnivals pass validation
                await syncLog.markCompleted({
                    carnivalsProcessed: 0,
                    carnivalsCreated: 0,
                    carnivalsUpdated: 0
                });
                
                return {
                    success: true,
                    carnivalsProcessed: 0,
                    message: 'No carnivals passed validation'
                };
            }

            // Step 2: Process validated carnivals using the data service
            const processedCarnivals = await this.dataService.processScrapedCarnivals(cleanedCarnivals);
            
            // Count new vs updated carnivals for logging
            const carnivalsCreated = processedCarnivals.filter(carnival => 
                carnival.createdAt && new Date(carnival.createdAt) > new Date(Date.now() - 60000) // Created in last minute
            ).length;
            const carnivalsUpdated = processedCarnivals.length - carnivalsCreated;
            
            // For each processed carnival where clubImageUrl starts with http
            const imageDownloadPromises = processedCarnivals
                .filter(carnival => carnival.clubLogoURL 
                    && carnival.clubLogoURL.startsWith('http')).map(carnival => {
                        const logoUrl = carnival.clubLogoURL;
                        const entityType = 'carnival'; 
                        const entityId = carnival.id;
                        const imageType = 'logo';
                        return { logoUrl, entityType, entityId, imageType };                
            });

            let results = [];
            if (imageDownloadPromises.length > 0) {
                console.log(`Downloading logos for ${imageDownloadPromises.length} carnivals...`);
                results = await this.logoDownloadService.downloadLogos(imageDownloadPromises);
            }

            // Process the results of logo downloads
            if (results && results.length > 0) {
                console.log(`Downloaded logos for ${results.length} carnivals.`);
                results.forEach(async result => {
                    // Update the carnival with the public URL
                    const carnival = processedCarnivals.find(e => e.id === result.entityId);
                    if (result.success) {
                        console.log(`Logo downloaded successfully for carnival ${result.entityId}: ${result.publicUrl}`);
                        if (carnival) {
                            try {
                                await Carnival.update(
                                    { clubLogoURL: result.publicUrl },
                                    { where: { id: carnival.id } }
                                );
                                console.log(`✅ Updated carnival ${carnival.id} with new logo URL`);
                            } catch (updateError) {
                                console.error(`❌ Failed to update carnival ${carnival.id} logo URL:`, updateError.message);
                            }
                        } else {
                            console.warn(`Carnival with ID ${result.entityId} not found in processed carnivals.`);
                        }
                    } else {
                        console.warn(`Failed to download logo for carnival ${result.entityId}: ${result.error}`);
                        if (carnival) {
                            try {
                                await Carnival.update(
                                    { clubLogoURL: null },
                                    { where: { id: carnival.id } }
                                );
                                console.log(`✅ Cleared external logo from carnival ${carnival.id}`);
                            } catch (updateError) {
                                console.error(`❌ Failed to clear logo from ${carnival.id}:`, updateError.message);
                            }
                        }
                    }
                })
            };

            console.log(`MySideline sync completed. Processed ${processedCarnivals.length} carnivals (${carnivalsCreated} new, ${carnivalsUpdated} updated).`);
            this.lastSyncDate = new Date();
            
            // Mark sync as completed with detailed results
            await syncLog.markCompleted({
                carnivalsProcessed: processedCarnivals.length,
                carnivalsCreated: carnivalsCreated,
                carnivalsUpdated: carnivalsUpdated
            });
            
            return {
                success: true,
                carnivalsProcessed: processedCarnivals.length,
                carnivalsCreated: carnivalsCreated,
                carnivalsUpdated: carnivalsUpdated,
                lastSync: this.lastSyncDate
            };
        } catch (error) {
            console.error('MySideline sync failed:', error);
            
            // Mark sync as failed in the log
            await syncLog.markFailed(error.message);
            
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Public method for manual sync (called from admin panel)
     */
    async fetchCarnivals() {
        try {
            console.log('Starting manual MySideline carnival sync...');
            const result = await this.syncMySidelineCarnivals();
            
            if (result && result.success) {
                console.log(`Manual MySideline sync completed successfully. Found ${result.carnivalsProcessed} carnivals.`);
                return result.carnivalsProcessed > 0 ? result.carnivalsProcessed : [];
            } else {
                console.log('Manual MySideline sync completed but no carnivals found.');
                return [];
            }
        } catch (error) {
            console.error('Manual MySideline sync failed:', error);
            return [];
        }
    }

    /**
     * Utility method to add delays
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after the delay
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get sync status
     * @returns {Object} Current sync status
     */
    getSyncStatus() {
        return {
            isRunning: this.isRunning,
            lastSync: this.lastSyncDate,
            syncEnabled: this.syncEnabled,
            services: {
                scraper: 'MySidelineScraperService',
                parser: 'MySidelineCarnivalParserService',
                data: 'MySidelineDataService'
            }
        };
    }    
}

export default new MySidelineIntegrationService();

