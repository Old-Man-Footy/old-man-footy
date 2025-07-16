import cron from 'node-cron';
import MySidelineScraperService from './mySidelineScraperService.mjs';
import MySidelineEventParserService from './mySidelineEventParserService.mjs';
import MySidelineDataService from './mySidelineDataService.mjs';
import MySidelineLogoDownloadService from './mySidelineLogoDownloadService.mjs';
import ImageNamingService from './imageNamingService.mjs';
import { Carnival, SyncLog } from '../models/index.mjs';

/**
 * MySideline Integration Service (Main Orchestrator)
 * Coordinates the scraping, parsing, and data processing of MySideline events
 * This is the refactored main service that delegates to specialized services
 */
class MySidelineIntegrationService {
    constructor() {
        this.scraperService = new MySidelineScraperService();
        this.parserService = new MySidelineEventParserService();
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
            await this.syncMySidelineEvents();
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
                        await this.syncMySidelineEvents();
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
    async syncMySidelineEvents() {
        if (!this.syncEnabled) {
            console.log('MySideline sync is disabled via MYSIDELINE_SYNC_ENABLED configuration');
            return {
                success: true,
                eventsProcessed: 0,
                message: 'Sync disabled via configuration'
            };
        }

        if (this.isRunning) {
            console.log('MySideline sync already running, skipping...');
            return;
        }

        this.isRunning = true;
        console.log('Starting MySideline event synchronization...');

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

            // Step 1: Scrape events using the scraper service
            const scrapedEvents = await this.scraperService.scrapeEvents();
            
            if (!scrapedEvents || scrapedEvents.length === 0) {
                console.log('No events found from MySideline scraper');
                
                // Mark sync as completed even when no events found - this prevents endless retries
                await syncLog.markCompleted({
                    eventsProcessed: 0,
                    eventsCreated: 0,
                    eventsUpdated: 0
                });
                
                return {
                    success: true,
                    eventsProcessed: 0,
                    message: 'No events found'
                };
            }

            // Step 1.5: Validate and clean the scraped data
            console.log('Validating and cleaning scraped event data...');
            const cleanedEvents = scrapedEvents.map(event => {
                try {
                    return this.scraperService.validateAndCleanData(event);
                } catch (validationError) {
                    console.warn(`Failed to validate event "${event.title}": ${validationError.message}`);
                    return null; // Mark for filtering out
                }
            }).filter(event => event !== null); // Remove failed validations

            console.log(`${cleanedEvents.length}/${scrapedEvents.length} events passed validation`);

            if (cleanedEvents.length === 0) {
                console.log('No events passed validation checks');
                
                // Mark sync as completed even when no events pass validation
                await syncLog.markCompleted({
                    eventsProcessed: 0,
                    eventsCreated: 0,
                    eventsUpdated: 0
                });
                
                return {
                    success: true,
                    eventsProcessed: 0,
                    message: 'No events passed validation'
                };
            }

            // Step 2: Process validated events using the data service
            const processedEvents = await this.dataService.processScrapedEvents(cleanedEvents);
            
            // Count new vs updated events for logging
            const eventsCreated = processedEvents.filter(event => 
                event.createdAt && new Date(event.createdAt) > new Date(Date.now() - 60000) // Created in last minute
            ).length;
            const eventsUpdated = processedEvents.length - eventsCreated;
            
            // For each processed event where clubImageUrl starts with http
            const imageDownloadPromises = processedEvents
                .filter(event => event.clubLogoURL 
                    && event.clubLogoURL.startsWith('http')).map(event => {
                        const logoUrl = event.clubLogoURL;
                        const entityType = ImageNamingService.ENTITY_TYPES.CARNIVAL; // Use constant instead of string
                        const entityId = event.id;
                        const imageType = ImageNamingService.IMAGE_TYPES.LOGO;
                        return { logoUrl, entityType, entityId, imageType };                
            });

            let results = [];
            if (imageDownloadPromises.length > 0) {
                console.log(`Downloading logos for ${imageDownloadPromises.length} events...`);
                results = await this.logoDownloadService.downloadLogos(imageDownloadPromises);
            }

            // Process the results of logo downloads
            if (results && results.length > 0) {
                console.log(`Downloaded logos for ${results.length} events.`);
                results.forEach(async result => {
                    // Update the event with the public URL
                    const event = processedEvents.find(e => e.id === result.entityId);
                    if (result.success) {
                        console.log(`Logo downloaded successfully for event ${result.entityId}: ${result.publicUrl}`);
                        if (event) {
                            try {
                                await Carnival.update(
                                    { clubLogoURL: result.publicUrl },
                                    { where: { id: event.id } }
                                );
                                console.log(`✅ Updated event ${event.id} with new logo URL`);
                            } catch (updateError) {
                                console.error(`❌ Failed to update event ${event.id} logo URL:`, updateError.message);
                            }
                        } else {
                            console.warn(`Event with ID ${result.entityId} not found in processed events.`);
                        }
                    } else {
                        console.warn(`Failed to download logo for event ${result.entityId}: ${result.error}`);
                        if (event) {
                            try {
                                await Carnival.update(
                                    { clubLogoURL: null },
                                    { where: { id: event.id } }
                                );
                                console.log(`✅ Cleared external logo from event ${event.id}`);
                            } catch (updateError) {
                                console.error(`❌ Failed to clear logo from ${event.id}:`, updateError.message);
                            }
                        }
                    }
                })
            };

            console.log(`MySideline sync completed. Processed ${processedEvents.length} events (${eventsCreated} new, ${eventsUpdated} updated).`);
            this.lastSyncDate = new Date();
            
            // Mark sync as completed with detailed results
            await syncLog.markCompleted({
                eventsProcessed: processedEvents.length,
                eventsCreated: eventsCreated,
                eventsUpdated: eventsUpdated
            });
            
            return {
                success: true,
                eventsProcessed: processedEvents.length,
                eventsCreated: eventsCreated,
                eventsUpdated: eventsUpdated,
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
    async fetchEvents() {
        try {
            console.log('Starting manual MySideline event sync...');
            const result = await this.syncMySidelineEvents();
            
            if (result && result.success) {
                console.log(`Manual MySideline sync completed successfully. Found ${result.eventsProcessed} events.`);
                return result.eventsProcessed > 0 ? result.eventsProcessed : [];
            } else {
                console.log('Manual MySideline sync completed but no events found.');
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
                parser: 'MySidelineEventParserService',
                data: 'MySidelineDataService'
            }
        };
    }    
}

export default new MySidelineIntegrationService();

