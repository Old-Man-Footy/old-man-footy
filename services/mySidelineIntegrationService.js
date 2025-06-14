const cron = require('node-cron');
const MySidelineScraperService = require('./mySidelineScraperService');
const MySidelineEventParserService = require('./mySidelineEventParserService');
const MySidelineDataService = require('./mySidelineDataService');

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
     * Main sync function - orchestrates the entire process
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
                return {
                    success: true,
                    eventsProcessed: 0,
                    message: 'No events passed validation'
                };
            }

            // Step 2: Process validated events using the data service
            const processedEvents = await this.dataService.processScrapedEvents(cleanedEvents);
            
            console.log(`MySideline sync completed. Processed ${processedEvents.length} events.`);
            this.lastSyncDate = new Date();
            
            return {
                success: true,
                eventsProcessed: processedEvents.length,
                lastSync: this.lastSyncDate
            };
        } catch (error) {
            console.error('MySideline sync failed:', error);
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

module.exports = new MySidelineIntegrationService();

