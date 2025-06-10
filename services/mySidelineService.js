const cron = require('node-cron');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { Carnival, User, Club } = require('../models');
const { Op } = require('sequelize');
const emailService = require('./emailService');

class MySidelineIntegrationService {
    constructor() {
        this.timeout = parseInt(process.env.MYSIDELINE_REQUEST_TIMEOUT) || 30000;
        this.retryCount = parseInt(process.env.MYSIDELINE_RETRY_ATTEMPTS) || 3;
        this.rateLimit = 1000; // 1 second between requests
        this.searchUrl = process.env.MYSIDELINE_URL;
        this.lastSyncDate = null;
        this.isRunning = false;
        this.requestDelay = 2000; // 2 second delay between requests to be respectful
        
        // Use existing environment variables
        this.syncEnabled = process.env.MYSIDELINE_SYNC_ENABLED === 'true';
        this.useMockData = process.env.MYSIDELINE_USE_MOCK === 'true' || process.env.NODE_ENV === 'development';
        this.enableScraping = process.env.MYSIDELINE_ENABLE_SCRAPING !== 'false';
        
        // Log configuration on startup
        console.log('MySideline Service Configuration:', {
            syncEnabled: this.syncEnabled,
            useMockData: this.useMockData,
            enableScraping: this.enableScraping,
            environment: process.env.NODE_ENV || 'development'
        });
    }

    // Initialize the scheduled sync
    initializeScheduledSync() {
        // Run every day at 3 AM
        cron.schedule('0 3 * * *', async () => {
            console.log('Starting scheduled MySideline sync...');
            await this.syncMySidelineEvents();
        });

        // Also run on startup if not synced in last 24 hours - with delay to ensure DB is ready
        setTimeout(() => {
            this.checkAndRunInitialSync();
        }, 2000); // 2 second delay to ensure database is fully initialized
    }

    async checkAndRunInitialSync() {
        try {
            // Add a small delay and retry logic to ensure database is ready
            let retries = 3;
            let lastError = null;

            while (retries > 0) {
                try {
                    const lastImportedCarnival = await Carnival.findOne({ 
                        where: {
                            mySidelineEventId: { [Op.ne]: null }
                        },
                        order: [['createdAt', 'DESC']]
                    });

                    // In development mode, always run sync regardless of last sync time
                    const isDevelopment = process.env.NODE_ENV !== 'production';
                    const hasRecentSync = lastImportedCarnival && 
                        (new Date() - lastImportedCarnival.createdAt) <= 24 * 60 * 60 * 1000;

                    if (!lastImportedCarnival || !hasRecentSync || isDevelopment) {
                        if (isDevelopment && hasRecentSync) {
                            console.log('Running MySideline sync in development mode (ignoring recent sync)...');
                        } else if (!lastImportedCarnival) {
                            console.log('Running initial MySideline sync (no previous sync found)...');
                        } else {
                            console.log('Running initial MySideline sync (last sync > 24 hours ago)...');
                        }
                        await this.syncMySidelineEvents();
                    } else {
                        console.log('MySideline sync skipped - recent sync found (production mode)');
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

            throw lastError; // Re-throw the last error if all retries failed
        } catch (error) {
            console.error('Failed to check for initial sync:', error.message);
            console.log('Initial MySideline sync will be skipped. You can manually trigger it from the admin panel.');
        }
    }

    // Main sync function
    async syncMySidelineEvents() {
        // Check if sync is enabled at all
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
            const scrapedEvents = await this.scrapeMySidelineEvents();
            const processedEvents = await this.processScrapedEvents(scrapedEvents);
            
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

    // Scrape MySideline website for events
    async scrapeMySidelineEvents() {
        try {
            // Check if we should use mock data instead of scraping
            if (this.useMockData) {
                console.log('Using mock MySideline data (development mode)...');
                const mockEvents = this.generateMockEvents('NSW').concat(
                    this.generateMockEvents('QLD'),
                    this.generateMockEvents('VIC')
                );
                console.log(`Generated ${mockEvents.length} mock events for development`);
                return mockEvents;
            }

            // Check if scraping is disabled
            if (!this.enableScraping) {
                console.log('MySideline scraping is disabled via configuration');
                return [];
            }

            console.log('Scraping MySideline Masters events from search page...');
            
            // Use browser automation as primary method since MySideline requires JavaScript
            const events = await this.fetchEventsWithBrowser();
            
            if (events && events.length > 0) {
                console.log(`Found ${events.length} Masters events from MySideline`);
                return events;
            } else {
                console.log('No events found via browser automation');
                return [];
            }
        } catch (error) {
            console.error('Failed to scrape MySideline events:', error.message);
            
            // In development, always fall back to mock data on error
            if (process.env.NODE_ENV === 'development') {
                console.log('Browser automation failed in development...');               
            }
            
            // In production, just return empty array
            return [];
        }
    }

    /**
     * Fetch events from MySideline
     * @returns {Promise<Array>} Array of standardized event objects
     */
    async fetchEvents() {
        try {
            console.log('Starting MySideline event sync...');
            
            // Use browser automation as primary method since MySideline requires JavaScript
            console.log('Using browser automation for MySideline (JavaScript required)...');
            const events = await this.fetchEventsWithBrowser();
            
            if (events && events.length > 0) {
                console.log(`MySideline sync completed successfully. Found ${events.length} events.`);
                return events;
            } else {
                console.log('MySideline sync completed but no events found.');
                return [];
            }
            
        } catch (error) {
            console.error('MySideline sync failed:', error);
            
            // If browser automation fails, log the error but don't crash the entire sync
            console.log('MySideline browser automation failed, but continuing with other sync operations...');
            return [];
        }
    }

    // Enhanced method using Puppeteer for JavaScript-heavy pages
    async fetchEventsWithBrowser() {
        let browser = null;
        try {
            console.log('Launching browser for MySideline event scraping...');
            
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-extensions'
                ],
                timeout: 60000
            });

            const page = await browser.newPage();
            
            // Enhanced stealth configuration
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await page.setViewport({ width: 1366, height: 768 });
            
            // Remove webdriver property
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
            });

            // Increase timeouts
            page.setDefaultNavigationTimeout(60000);
            page.setDefaultTimeout(60000);

            // Try multiple approaches to get the data
            const approaches = [
                () => this.tryDirectNavigation(page),
                () => this.tryStepByStepNavigation(page)
            ];

            let events = [];
            for (const approach of approaches) {
                try {
                    console.log('Trying navigation approach...');
                    events = await approach();
                    if (events && events.length > 0) {
                        console.log(`Success! Found ${events.length} events`);
                        break;
                    }
                } catch (error) {
                    console.log(`Approach failed: ${error.message}`);
                    // Continue to next approach
                }
            }

            return events;

        } catch (error) {
            console.error('All browser automation approaches failed:', error.message);
            return [];
        } finally {
            if (browser) {
                try {
                    await browser.close();
                } catch (closeError) {
                    console.error('Error closing browser:', closeError.message);
                }
            }
        }
    }

    /**
     * Try direct navigation to the search page
     * @param {Page} page - Puppeteer page object
     * @returns {Promise<Array>} Array of events
     */
    async tryDirectNavigation(page) {
        console.log('Attempting direct navigation...');
        
        await page.goto(this.searchUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        // Wait for content to stabilize
        await page.waitForTimeout(5000);

        return await this.extractEventsFromPage(page);
    }

    /**
     * Try step-by-step navigation to avoid frame issues
     * @param {Page} page - Puppeteer page object
     * @returns {Promise<Array>} Array of events
     */
    async tryStepByStepNavigation(page) {
        console.log('Attempting step-by-step navigation...');
        
        // Start from the main MySideline page
        await page.goto('https://profile.mysideline.com.au', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        await page.waitForTimeout(3000);

        // Navigate to search page
        await page.goto(this.searchUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        await page.waitForTimeout(5000);

        return await this.extractEventsFromPage(page);
    }


    /**
     * Extract events from the current page
     * @param {Page} page - Puppeteer page object
     * @returns {Promise<Array>} Array of events
     */
    async extractEventsFromPage(page) {
        // Enhanced event extraction with better error handling
        const events = await page.evaluate(() => {
            const foundElements = [];
            
            try {
                // Look for various selectors that might contain event data
                const selectors = [
                    '.search-result',
                    '.club-item', 
                    '.event-item',
                    '.result-item',
                    '[data-club]',
                    '[data-event]',
                    'article',
                    '.card',
                    '.listing',
                    'li',
                    '.row',
                    'div[class*="result"]',
                    'div[class*="club"]',
                    'div[class*="event"]',
                    'div[class*="search"]'
                ];
                
                selectors.forEach(selector => {
                    try {
                        const elements = document.querySelectorAll(selector);
                        elements.forEach((el, index) => {
                            const text = el.textContent?.trim() || '';
                            
                            // Check if this element contains "Masters" (case insensitive)
                            if (text.toLowerCase().includes('masters') && text.length > 20) {
                                foundElements.push({
                                    selector: selector,
                                    text: text,
                                    id: el.id || `found-${Date.now()}-${index}`,
                                    innerHTML: el.innerHTML.substring(0, 500)
                                });
                                
                                console.log(`Found Masters content with ${selector}: ${text.substring(0, 100)}`);
                            }
                        });
                    } catch (err) {
                        // Continue with next selector
                    }
                });

                return foundElements;
            } catch (error) {
                return [];
            }
        });

        // Convert browser events to standard format
        const standardEvents = [];
        for (const event of events) {
            try {
                const standardEvent = this.parseEventFromElement(event);
                if (standardEvent) {
                    standardEvents.push(standardEvent);
                }
            } catch (parseError) {
                // Continue with next event
            }
        }

        return standardEvents;
    }

    /**
     * Extract event ID from MySideline URL
     * @param {string} url - The URL to extract event ID from
     * @returns {string|null} - The extracted event ID or null
     */
    extractEventIdFromUrl(url) {
        try {
            // Look for common patterns in MySideline URLs
            const patterns = [
                /event[\/=](\d+)/i,
                /id[\/=](\d+)/i,
                /register[\/=](\d+)/i,
                /\/(\d+)(?:\/|$)/
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }

            return null;
        } catch (error) {
            console.error('Error extracting event ID from URL:', error);
            return null;
        }
    }

    /**
     * Parse event information from scraped element
     * @param {Object} element - The scraped element data
     * @returns {Object|null} - Standardized event object or null
     */
    parseEventFromElement(element) {
        try {
            const text = element.text || '';
            const lines = text.split('\n').map(line => line.trim()).filter(line => line);

            // Extract basic information
            const name = this.extractEventName(lines);
            const location = this.extractLocation(lines);
            const date = this.extractDate(lines);
            const description = lines.join(' ').substring(0, 500);

            // Skip if we don't have minimum required info
            if (!name || name.length < 5) {
                return null;
            }

            // Determine state from location or use default
            let state = 'NSW';
            if (location) {
                const stateMatch = location.match(/(NSW|QLD|VIC|SA|WA|NT|ACT|TAS)/i);
                if (stateMatch) {
                    state = stateMatch[1].toUpperCase();
                }
            }

            return {
                title: name,
                date: date || new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), // Default to 30 days from now
                locationAddress: location || 'TBA',
                organiserContactName: 'MySideline Event Organiser',
                organiserContactEmail: 'events@mysideline.com.au',
                organiserContactPhone: '1300 000 000',
                scheduleDetails: description || 'Event details to be confirmed. Please check MySideline for updates.',
                state: state,
                registrationLink: element.href || element.registrationInfo?.href || null,
                mySidelineEventId: element.mySidelineEventId || this.extractEventIdFromUrl(element.href || ''),
                isManuallyEntered: false,
                maxTeams: 16,
                feesDescription: 'Entry fees TBA - check registration link for details',
                registrationDeadline: date ? new Date(date.getTime() + (7 * 24 * 60 * 60 * 1000)) : new Date(Date.now() + (23 * 24 * 60 * 60 * 1000)),
                ageCategories: ['35+', '40+', '45+', '50+'],
                isRegistrationOpen: true,
                isActive: true
            };
        } catch (error) {
            console.error('Error parsing event element:', error);
            return null;
        }
    }

    /**
     * Extract event name from text lines
     * @param {Array} lines - Array of text lines
     * @returns {string} - Extracted event name
     */
    extractEventName(lines) {
        // Look for lines that contain "Masters" and seem like titles
        for (const line of lines) {
            if (line.toLowerCase().includes('masters') && 
                line.length > 10 && 
                line.length < 100 &&
                !line.toLowerCase().includes('register') &&
                !line.toLowerCase().includes('location')) {
                return line.trim();
            }
        }

        // Fallback to first substantial line
        return lines.find(line => line.length > 10 && line.length < 100) || 'Masters Event';
    }

    /**
     * Extract location from text lines
     * @param {Array} lines - Array of text lines
     * @returns {string|null} - Extracted location or null
     */
    extractLocation(lines) {
        // Look for location indicators
        const locationIndicators = ['location:', 'venue:', 'at ', 'held at', 'address:'];
        
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            for (const indicator of locationIndicators) {
                if (lowerLine.includes(indicator)) {
                    return line.replace(new RegExp(indicator, 'i'), '').trim();
                }
            }
        }

        // Look for patterns that might be locations (contains state abbreviations)
        const statePattern = /(NSW|QLD|VIC|SA|WA|NT|ACT|TAS)/i;
        for (const line of lines) {
            if (statePattern.test(line) && line.length < 100) {
                return line.trim();
            }
        }

        return null;
    }

    /**
     * Extract date from text lines
     * @param {Array} lines - Array of text lines
     * @returns {Date|null} - Extracted date or null
     */
    extractDate(lines) {
        const datePatterns = [
            /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
            /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
            /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
            /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i
        ];

        for (const line of lines) {
            for (const pattern of datePatterns) {
                const match = line.match(pattern);
                if (match) {
                    try {
                        const date = new Date(line);
                        if (!isNaN(date.getTime()) && date.getFullYear() >= 2024) {
                            return date;
                        }
                    } catch (error) {
                        // Continue to next pattern
                    }
                }
            }
        }

        return null;
    }

    /**
     * Process scraped events and sync with database
     * @param {Array} scrapedEvents - Array of scraped events
     * @returns {Array} - Array of processed events
     */
    async processScrapedEvents(scrapedEvents) {
        const processedEvents = [];

        for (const eventData of scrapedEvents) {
            try {
                // Check if event already exists
                let existingEvent = null;
                
                if (eventData.mySidelineEventId) {
                    existingEvent = await Carnival.findOne({
                        where: { mySidelineEventId: eventData.mySidelineEventId }
                    });
                }

                if (!existingEvent && eventData.title) {
                    // Check by title similarity
                    existingEvent = await Carnival.findOne({
                        where: {
                            title: {
                                [Op.like]: `%${eventData.title.substring(0, 20)}%`
                            }
                        }
                    });
                }

                if (existingEvent) {
                    // Update existing event
                    await existingEvent.update({
                        registrationLink: eventData.registrationLink || existingEvent.registrationLink,
                        mySidelineEventId: eventData.mySidelineEventId || existingEvent.mySidelineEventId,
                        scheduleDetails: eventData.scheduleDetails || existingEvent.scheduleDetails,
                        lastMySidelineSync: new Date()
                    });
                    
                    processedEvents.push(existingEvent);
                    console.log(`Updated existing carnival: ${existingEvent.title}`);
                } else {
                    // Create new event
                    const newEvent = await Carnival.create({
                        ...eventData,
                        createdByUserId: 1, // System user
                        lastMySidelineSync: new Date(),
                        isActive: true
                    });
                    
                    processedEvents.push(newEvent);
                    console.log(`Created new carnival: ${newEvent.title}`);
                }

                // Add delay to respect rate limits
                await this.delay(this.requestDelay);

            } catch (error) {
                console.error('Error processing event:', error);
            }
        }

        return processedEvents;
    }

    /**
     * Generate mock events for development/testing
     * @param {string} state - State abbreviation
     * @returns {Array} - Array of mock events
     */
    generateMockEvents(state) {
        const stateNames = {
            'NSW': 'New South Wales',
            'QLD': 'Queensland', 
            'VIC': 'Victoria'
        };

        const mockEvents = [
            {
                title: `${stateNames[state]} Masters Rugby League Championship`,
                date: new Date(Date.now() + (Math.random() * 90 + 30) * 24 * 60 * 60 * 1000),
                locationAddress: `Rugby League Park, ${stateNames[state]}, Australia`,
                organiserContactName: `${state} Masters Committee`,
                organiserContactEmail: `contact@${state.toLowerCase()}masters.com.au`,
                organiserContactPhone: `0${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
                scheduleDetails: `Annual Masters Rugby League tournament for ${stateNames[state]}. Open to all Masters teams. Games start at 9:00 AM with finals at 3:00 PM.`,
                state: state,
                registrationLink: `https://profile.mysideline.com.au/register/event/${Math.floor(Math.random() * 10000)}`,
                mySidelineEventId: `mock-${state.toLowerCase()}-${Date.now()}`,
                isManuallyEntered: false,
                maxTeams: 16,
                feesDescription: `Entry fee: $200 per team. Includes lunch and presentation.`,
                registrationDeadline: new Date(Date.now() + (Math.random() * 60 + 15) * 24 * 60 * 60 * 1000),
                ageCategories: ['35+', '40+', '45+', '50+'],
                isRegistrationOpen: true,
                isActive: true
            }
        ];

        return mockEvents;
    }

    /**
     * Utility function to add delay
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} - Promise that resolves after delay
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get sync status and statistics
     * @returns {Object} - Sync status information
     */
    async getSyncStatus() {
        try {
            const totalCarnivals = await Carnival.count();
            const mySidelineCarnivals = await Carnival.count({
                where: {
                    mySidelineEventId: { [Op.ne]: null }
                }
            });

            const lastSyncedCarnival = await Carnival.findOne({
                where: {
                    lastMySidelineSync: { [Op.ne]: null }
                },
                order: [['lastMySidelineSync', 'DESC']]
            });

            return {
                isRunning: this.isRunning,
                lastSync: lastSyncedCarnival?.lastMySidelineSync || null,
                totalCarnivals: totalCarnivals,
                mySidelineCarnivals: mySidelineCarnivals,
                syncPercentage: totalCarnivals > 0 ? ((mySidelineCarnivals / totalCarnivals) * 100).toFixed(1) : 0
            };
        } catch (error) {
            console.error('Error getting sync status:', error);
            return {
                isRunning: this.isRunning,
                lastSync: null,
                error: error.message
            };
        }
    }

    /**
     * Manual trigger for sync (for admin use)
     * @returns {Promise<Object>} - Sync result
     */
    async triggerManualSync() {
        console.log('Manual sync triggered by admin');
        return await this.syncMySidelineEvents();
    }
}

module.exports = new MySidelineIntegrationService();
