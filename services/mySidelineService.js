const cron = require('node-cron');
const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');
const { Carnival, User, Club } = require('../models');
const { Op } = require('sequelize');
const emailService = require('./emailService');

class MySidelineIntegrationService {
    constructor() {
        this.timeout = parseInt(process.env.MYSIDELINE_REQUEST_TIMEOUT) || 60000;
        this.retryCount = parseInt(process.env.MYSIDELINE_RETRY_ATTEMPTS) || 3;
        this.rateLimit = 1000; // 1 second between requests
        this.searchUrl = process.env.MYSIDELINE_URL;
        this.lastSyncDate = null;
        this.isRunning = false;
        this.requestDelay = 2000; // 2 second delay between requests to be respectful
        
        // Use existing environment variables
        this.syncEnabled = process.env.MYSIDELINE_SYNC_ENABLED === 'true';
        this.useMockData = process.env.MYSIDELINE_USE_MOCK === 'true';
        this.enableScraping = process.env.MYSIDELINE_ENABLE_SCRAPING !== 'false';
        
        this.useHeadlessBrowser = process.env.NODE_ENV !== 'development'
        
        // Log configuration on startup with debugging info
        console.log('MySideline Service Configuration:', {
            syncEnabled: this.syncEnabled,
            useMockData: this.useMockData,
            enableScraping: this.enableScraping,
            environment: process.env.NODE_ENV || 'development',
            debug: {
                MYSIDELINE_SYNC_ENABLED: process.env.MYSIDELINE_SYNC_ENABLED,
                NODE_ENV: process.env.NODE_ENV,
                syncEnabledCheck1: process.env.MYSIDELINE_SYNC_ENABLED === 'true',
                syncEnabledCheck2: process.env.NODE_ENV === 'development'
            }
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

    /**
     * Enhanced method using Playwright for JavaScript-heavy pages
     * @returns {Promise<Array>} Array of standardized event objects
     */
    async fetchEventsWithBrowser() {
        let browser = null;
        let context = null;
        let page = null;
        
        try {
            console.log('Launching Playwright browser for MySideline event scraping...');
            
            // Launch browser with comprehensive configuration
            browser = await chromium.launch({
                headless: this.useHeadlessBrowser,
                timeout: 120000,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            });

            // Create context with realistic browser settings
            context = await browser.newContext({
                viewport: { width: 1366, height: 768 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                javaScriptEnabled: true,
                acceptDownloads: false,
                ignoreHTTPSErrors: true
            });

            // Create page with extended timeouts
            page = await context.newPage();
            page.setDefaultTimeout(180000); // 3 minutes for any single operation
            page.setDefaultNavigationTimeout(180000);

            // Block tracking and analytics requests to improve performance and reduce noise
            await page.route('**/*', (route) => {
                const url = route.request().url();
                const resourceType = route.request().resourceType();
                
                // Define patterns for requests to block
                const blockedPatterns = [
                    // Google Analytics
                    'google-analytics.com',
                    'googletagmanager.com',
                    'doubleclick.net',
                    'google.com/analytics',
                    'google.com/ccm/collect',
                    'google.com/g/collect',
                    
                    // Facebook tracking
                    'facebook.com/tr',
                    'connect.facebook.net',
                    
                    // Other common tracking services
                    'hotjar.com',
                    'fullstory.com',
                    'mixpanel.com',
                    'segment.com',
                    'amplitude.com',
                    'intercom.io',
                    'zendesk.com',
                    
                    // Ad networks
                    'googlesyndication.com',
                    'adsystem.com',
                    'amazon-adsystem.com',
                    
                    // Social media widgets (non-essential)
                    'twitter.com/widgets',
                    'instagram.com/embed',
                    'youtube.com/embed',
                    
                    // Common tracking pixels and beacons
                    '/collect?',
                    '/track?',
                    '/pixel?',
                    '/beacon?',
                    '/analytics?'
                ];
                
                // Check if URL matches any blocked patterns
                const shouldBlock = blockedPatterns.some(pattern => url.includes(pattern));
                
                // Also block certain resource types that aren't needed for scraping
                const blockedResourceTypes = ['font', 'media'];
                const shouldBlockResourceType = blockedResourceTypes.includes(resourceType);
                
                if (shouldBlock || shouldBlockResourceType) {
                    console.log(`Blocked request: ${resourceType} - ${url.substring(0, 100)}...`);
                    route.abort();
                } else {
                    route.continue();
                }
            });

            // Enhanced logging for debugging (only log meaningful events)
            page.on('console', msg => {
                // Filter out noise from tracking scripts
                const text = msg.text();
                if (!text.includes('Google Analytics') && 
                    !text.includes('gtag') && 
                    !text.includes('Facebook') &&
                    !text.includes('tracking')) {
                    console.log(`Browser console: ${text}`);
                }
            });
            
            page.on('pageerror', error => console.log(`Browser error: ${error.message}`));
            
            // Only log failed requests that aren't blocked tracking requests
            page.on('requestfailed', request => {
                const url = request.url();
                const isTrackingRequest = ['google-analytics.com', 'googletagmanager.com', 'facebook.com'].some(domain => url.includes(domain));
                
                if (!isTrackingRequest) {
                    console.log(`Failed request (non-tracking): ${url}`);
                }
            });

            // Try multiple navigation strategies
            const strategies = [
                () => this.tryComprehensivePlaywrightNavigation(page),
                () => this.tryStepByStepPlaywrightNavigation(page),
                () => this.tryDirectPlaywrightNavigation(page)
            ];

            let events = [];
            for (let i = 0; i < strategies.length; i++) {
                try {
                    console.log(`Trying Playwright strategy ${i + 1}...`);
                    events = await strategies[i]();
                    if (events && events.length > 0) {
                        console.log(`Success! Found ${events.length} events with strategy ${i + 1}`);
                        break;
                    }
                } catch (error) {
                    console.log(`Playwright strategy ${i + 1} failed: ${error.message}`);
                    if (i < strategies.length - 1) {
                        console.log('Retrying with next strategy...');
                        await this.delay(5000);
                    }
                }
            }

            return events;

        } catch (error) {
            console.error('All Playwright strategies failed:', error.message);
            return [];
        } finally {
            // Clean up resources
            if (page) {
                try {
                    await page.close();
                } catch (e) {
                    console.log('Error closing page:', e.message);
                }
            }
            if (context) {
                try {
                    await context.close();
                } catch (e) {
                    console.log('Error closing context:', e.message);
                }
            }
            if (browser) {
                try {
                    await browser.close();
                } catch (e) {
                    console.log('Error closing browser:', e.message);
                }
            }
        }
    }

    /**
     * Comprehensive Playwright navigation with maximum waiting
     * @param {Page} page - Playwright page object
     * @returns {Promise<Array>} Array of events
     */
    async tryComprehensivePlaywrightNavigation(page) {
        console.log('Starting comprehensive Playwright navigation...');
        
        try {
            console.log(`Navigating to: ${this.searchUrl}`);
            
            // Navigate with all wait conditions
            await page.goto(this.searchUrl, {
                waitUntil: 'networkidle',
                timeout: 120000
            });

            console.log('Navigation complete, implementing comprehensive waiting...');

            // Stage 1: Wait for basic page structure
            await this.waitForPageStructure(page);
            
            // Stage 2: Wait for JavaScript frameworks to initialize
            await this.waitForJavaScriptInitialization(page);
            
            // Stage 3: Wait for dynamic content to load
            await this.waitForDynamicContentLoading(page);
            
            // Stage 4: Wait for search results or content
            await this.waitForSearchResults(page);
            
            // Stage 5: Final content validation
            await this.validatePageContent(page);

            return await this.extractEventsFromPlaywrightPage(page);
            
        } catch (error) {
            console.log(`Comprehensive navigation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Step-by-step navigation with session establishment
     * @param {Page} page - Playwright page object
     * @returns {Promise<Array>} Array of events
     */
    async tryStepByStepPlaywrightNavigation(page) {
        console.log('Starting step-by-step Playwright navigation...');
        
        try {
            // Step 1: Visit main MySideline page to establish session
            console.log('Step 1: Establishing session...');
            await page.goto('https://mysideline.com.au', {
                waitUntil: 'networkidle',
                timeout: 60000
            });
            
            await page.waitForTimeout(5000);
            
            // Step 2: Navigate to search page
            console.log('Step 2: Navigating to search page...');
            await page.goto(this.searchUrl, {
                waitUntil: 'networkidle',
                timeout: 90000
            });

            // Step 3: Extended waiting for content
            console.log('Step 3: Waiting for content to stabilize...');
            await this.waitForContentStabilization(page);

            return await this.extractEventsFromPlaywrightPage(page);
            
        } catch (error) {
            console.log(`Step-by-step navigation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Direct navigation with extended timeouts
     * @param {Page} page - Playwright page object
     * @returns {Promise<Array>} Array of events
     */
    async tryDirectPlaywrightNavigation(page) {
        console.log('Starting direct Playwright navigation...');
        
        try {
            await page.goto(this.searchUrl, {
                waitUntil: 'networkidle',
                timeout: 90000
            });

            // Extended wait for dynamic content
            await page.waitForTimeout(30000);
            
            // Wait for content to be meaningful
            await this.waitForMeaningfulContent(page);

            return await this.extractEventsFromPlaywrightPage(page);
            
        } catch (error) {
            console.log(`Direct navigation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Wait for basic page structure to be established
     * @param {Page} page - Playwright page object
     */
    async waitForPageStructure(page) {
        console.log('Waiting for page structure...');
        
        try {
            // Wait for essential page elements (but don't check visibility for head since it's always hidden)
            await page.waitForSelector('body', { timeout: 30000 });
            console.log('Body element found');
            
            // Just check that head exists (don't wait for visibility)
            const headExists = await page.locator('head').count() > 0;
            if (headExists) {
                console.log('Head element confirmed');
            }
            
            // Wait for page to have meaningful structure
            await page.waitForFunction(() => {
                return document.querySelectorAll('*').length > 50;
            }, { timeout: 45000 });
            
            console.log('Page structure confirmed - found substantial DOM elements');
        } catch (error) {
            console.log(`Page structure waiting failed: ${error.message}`);
            // Don't throw - continue with the process since content is loading
        }
    }

    /**
     * Wait for JavaScript frameworks to initialize
     * @param {Page} page - Playwright page object
     */
    async waitForJavaScriptInitialization(page) {
        console.log('Waiting for JavaScript initialization...');
        
        try {
            // Wait for common framework indicators
            await page.waitForFunction(() => {
                // Check for common framework globals or initialized content
                const hasInteractiveElements = document.querySelectorAll('button, input, select, a').length > 5;
                const hasSubstantialContent = document.body.textContent.trim().length > 500;
                const scriptsLoaded = document.querySelectorAll('script').length > 0;
                
                return hasInteractiveElements && hasSubstantialContent && scriptsLoaded;
            }, { timeout: 60000 });
            
            // Additional wait for async operations
            await page.waitForTimeout(10000);
            
            console.log('JavaScript initialization confirmed');
        } catch (error) {
            console.log(`JavaScript initialization waiting failed: ${error.message}`);
        }
    }

    /**
     * Wait for dynamic content to finish loading
     * @param {Page} page - Playwright page object
     */
    async waitForDynamicContentLoading(page) {
        console.log('Waiting for dynamic content loading...');
        
        try {
            // Monitor content stability over time
            let previousLength = 0;
            let stableCount = 0;
            const requiredStableChecks = 3;
            
            for (let i = 0; i < 10; i++) {
                const currentLength = await page.evaluate(() => {
                    return document.body ? document.body.textContent.length : 0;
                });
                
                console.log(`Content check ${i + 1}: ${currentLength} characters`);
                
                if (currentLength === previousLength && currentLength > 1000) {
                    stableCount++;
                    if (stableCount >= requiredStableChecks) {
                        console.log('Content appears stable');
                        break;
                    }
                } else {
                    stableCount = 0;
                }
                
                previousLength = currentLength;
                await page.waitForTimeout(3000);
            }
            
            // Final wait for any remaining dynamic operations
            await page.waitForTimeout(8000);
            
        } catch (error) {
            console.log(`Dynamic content loading wait failed: ${error.message}`);
        }
    }

    /**
     * Wait specifically for MySideline search results to appear
     * @param {Page} page - Playwright page object
     */
    async waitForSearchResults(page) {
        console.log('Waiting for MySideline search results...');
        
        try {
            // Wait for the page title to confirm we're on the right page
            await page.waitForFunction(() => {
                return document.title.includes('Club Finder') || 
                       document.title.includes('MySideline') ||
                       document.title.includes('Search');
            }, { timeout: 30000 });

            console.log('Page title confirmed, waiting for search content...');

            // MySideline-specific Vue.js selectors based on the actual HTML structure
            const mySidelineSelectors = [
                // Vue.js specific selectors from the actual page structure
                '.main.padding-lr-10-sm-and-up',
                '.el-card.is-always-shadow',
                '[id^="clubsearch_"]',
                '.el-card__body',
                '.click-expand',
                '.button-no-style',
                '.title',
                '.subtitle',
                
                // Fallback selectors
                '.club-search-results',
                '.search-results',
                '.club-listing',
                '.club-item',
                '.search-item',
                '.result-item',
                '.listing-container',
                '.search-container',
                '.club-container',
                '.results-container',
                '[data-testid*="search"]',
                '[data-testid*="club"]',
                '[data-testid*="result"]',
                '.MuiGrid-container',
                '.ant-list',
                '.card-container',
                '.list-group',
                'table tbody',
                '.table-responsive'
            ];
            
            // Try to wait for any MySideline-specific content
            let contentSelector = null;
            for (const selector of mySidelineSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 8000 });
                    contentSelector = selector;
                    console.log(`Found content with MySideline selector: ${selector}`);
                    break;
                } catch (error) {
                    // Continue to next selector
                }
            }

            // Additional wait for dynamic content loading after initial selectors appear
            await page.waitForTimeout(10000);

            // Wait for search results to actually populate with Masters-specific content
            await page.waitForFunction(() => {
                // Look for the specific Vue.js card structure with Masters content
                const mySidelineCards = document.querySelectorAll('.el-card.is-always-shadow, [id^="clubsearch_"]');
                let mastersContent = 0;

                for (let card of mySidelineCards) {
                    const text = card.textContent?.toLowerCase() || '';
                    if (text.includes('masters') || 
                        text.includes('rugby') || 
                        text.includes('league') ||
                        text.includes('tournament') ||
                        text.includes('carnival') ||
                        text.includes('championship')) {
                        mastersContent++;
                    }
                }

                console.log(`Found ${mastersContent} MySideline cards with Masters content`);
                return mastersContent >= 3; // Require at least 3 Masters-related cards
            }, { timeout: 45000 });

            // Final wait for any lazy-loaded content
            await page.waitForTimeout(8000);
            
            console.log('MySideline search results waiting complete');

        } catch (error) {
            console.log(`MySideline search results waiting failed: ${error.message}`);
            // Continue anyway - we'll try to extract what we can
        }
    }

    /**
     * Validate that page content has meaningful MySideline data
     * @param {Page} page - Playwright page object
     */
    async validatePageContent(page) {
        console.log('Validating page content...');
        
        try {
            await page.waitForFunction(() => {
                const bodyText = document.body ? document.body.textContent : '';
                const hasTitle = document.title && document.title.length > 0;
                const hasMeaningfulContent = bodyText.length > 500;
                const hasNavigationElements = document.querySelectorAll('nav, .nav, .navigation, header, .header').length > 0;
                const hasCards = document.querySelectorAll('.el-card, [id^="clubsearch_"], .card, .search-result').length > 0;
                
                return hasTitle && hasMeaningfulContent && (hasNavigationElements || hasCards);
            }, { timeout: 30000 });
            
            console.log('Page content validation passed');
        } catch (error) {
            console.log(`Page content validation failed: ${error.message}`);
        }
    }

    /**
     * Wait for content to stabilize over multiple checks
     * @param {Page} page - Playwright page object
     */
    async waitForContentStabilization(page) {
        console.log('Waiting for content stabilization...');
        
        try {
            let previousContentLength = 0;
            let stableChecks = 0;
            const requiredStableChecks = 4;
            
            for (let i = 0; i < 15; i++) {
                const currentContentLength = await page.evaluate(() => {
                    return document.body ? document.body.textContent.length : 0;
                });
                
                console.log(`Stabilization check ${i + 1}: ${currentContentLength} characters`);
                
                if (Math.abs(currentContentLength - previousContentLength) < 100 && currentContentLength > 1000) {
                    stableChecks++;
                    if (stableChecks >= requiredStableChecks) {
                        console.log('Content stabilized successfully');
                        return;
                    }
                } else {
                    stableChecks = 0;
                }
                
                previousContentLength = currentContentLength;
                await this.delay(2000);
            }
            
            console.log('Content stabilization timeout reached');
        } catch (error) {
            console.log(`Content stabilization failed: ${error.message}`);
        }
    }

    /**
     * Wait for meaningful content to appear on the page
     * @param {Page} page - Playwright page object
     */
    async waitForMeaningfulContent(page) {
        console.log('Waiting for meaningful content...');
        
        try {
            await page.waitForFunction(() => {
                const bodyText = document.body ? document.body.textContent.toLowerCase() : '';
                const hasSubstantialText = bodyText.length > 2000;
                const hasInteractiveElements = document.querySelectorAll('button, input, select, a').length > 10;
                const hasStructuredContent = document.querySelectorAll('div, section, article, main').length > 20;
                const hasMastersContent = bodyText.includes('masters') || bodyText.includes('rugby') || bodyText.includes('league');
                
                return hasSubstantialText && hasInteractiveElements && hasStructuredContent && hasMastersContent;
            }, { timeout: 45000 });
            
            console.log('Meaningful content found');
        } catch (error) {
            console.log(`Meaningful content wait failed: ${error.message}`);
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
     * Process scraped events and save to database
     * @param {Array} scrapedEvents - Array of scraped event objects
     * @returns {Promise<Array>} Array of processed event objects
     */
    async processScrapedEvents(scrapedEvents) {
        console.log(`Processing ${scrapedEvents.length} scraped MySideline events...`);
        
        const processedEvents = [];
        
        for (const eventData of scrapedEvents) {
            try {
                // Check if event already exists
                const existingEvent = await Carnival.findOne({
                    where: {
                        mySidelineEventId: eventData.mySidelineEventId
                    }
                });
                
                if (existingEvent) {
                    console.log(`Event already exists: ${eventData.title}`);
                    // Update existing event with any new information
                    await existingEvent.update({
                        title: eventData.title,
                        date: eventData.date,
                        locationAddress: eventData.locationAddress,
                        scheduleDetails: eventData.scheduleDetails,
                        state: eventData.state,
                        updatedAt: new Date()
                    });
                    processedEvents.push(existingEvent);
                } else {
                    // Create new event
                    const newEvent = await Carnival.create({
                        ...eventData,
                        isManuallyEntered: false,
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    
                    console.log(`Created new MySideline event: ${newEvent.title}`);
                    processedEvents.push(newEvent);
                }
            } catch (error) {
                console.error(`Failed to process event "${eventData.title}":`, error.message);
            }
        }
        
        console.log(`Successfully processed ${processedEvents.length} MySideline events`);
        return processedEvents;
    }

    /**
     * Enhanced event extraction specifically optimized for MySideline Vue.js structure
     * Now includes click-to-expand functionality for full event details
     * @param {Page} page - Playwright page object
     * @returns {Promise<Array>} Array of events
     */
    async extractEventsFromPlaywrightPage(page) {
        console.log('Extracting events from MySideline page...');
        
        try {
            // Get comprehensive page information
            const pageInfo = await page.evaluate(() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    bodyTextLength: document.body ? document.body.textContent.length : 0,
                    elementCount: document.querySelectorAll('*').length,
                    linkCount: document.querySelectorAll('a').length,
                    formCount: document.querySelectorAll('form, input, button').length,
                    hasContent: document.body && document.body.textContent.trim().length > 1000,
                    hasMasters: document.body ? document.body.textContent.toLowerCase().includes('masters') : false,
                    cardCount: document.querySelectorAll('.el-card, [id^="clubsearch_"]').length,
                    clickExpandCount: document.querySelectorAll('.click-expand').length
                };
            });
            
            console.log('MySideline page info:', pageInfo);

            // Take a screenshot for debugging (if not headless)
            if (!this.useHeadlessBrowser) {
                try {
                    await page.screenshot({ 
                        path: 'debug-mysideline-page.png', 
                        fullPage: true 
                    });
                    console.log('Debug screenshot saved as debug-mysideline-page.png');
                } catch (screenshotError) {
                    console.log('Could not save screenshot:', screenshotError.message);
                }
            }

            // First, expand all click-expand elements to get full details
            await this.expandAllClickExpandElements(page);

            // Extract potential events using MySideline-specific Vue.js selectors
            const events = await page.evaluate(() => {
                const foundElements = [];
                
                console.log('Starting MySideline Vue.js-optimized content extraction...');
                
                // Primary extraction: Target Vue.js MySideline cards specifically
                const mySidelineCards = document.querySelectorAll('.el-card.is-always-shadow, [id^="clubsearch_"]');
                console.log(`Found ${mySidelineCards.length} MySideline cards`);
                
                mySidelineCards.forEach((card, index) => {
                    try {
                        const cardText = card.textContent?.trim() || '';
                        
                        // Extract title and subtitle from the Vue.js structure
                        const titleElement = card.querySelector('.title, h3.title');
                        const subtitleElement = card.querySelector('.subtitle, h4.subtitle, #subtitle');
                        const imageElement = card.querySelector('.image__item, img');
                        const buttonElement = card.querySelector('.button-no-style');
                        
                        const title = titleElement ? titleElement.textContent.trim() : '';
                        const subtitle = subtitleElement ? subtitleElement.textContent.trim() : '';
                        const imageSrc = imageElement ? imageElement.src : '';
                        const imageAlt = imageElement ? imageElement.alt : '';
                        
                        // Check if this card had expanded content
                        const hasExpandedContent = card.querySelector('.expanded-content, .click-expand-content, .expanded-details');
                        let expandedDetails = '';
                        
                        if (hasExpandedContent) {
                            expandedDetails = hasExpandedContent.textContent?.trim() || '';
                        }
                        
                        // Enhanced content detection for MySideline Masters events
                        const fullContent = cardText + ' ' + expandedDetails;
                        const containsMasters = fullContent.toLowerCase().includes('masters');
                        const containsRugby = fullContent.toLowerCase().includes('rugby');
                        const containsLeague = fullContent.toLowerCase().includes('league');
                        const containsNRL = fullContent.toLowerCase().includes('nrl');
                        const containsCarnival = fullContent.toLowerCase().includes('carnival');
                        const containsTournament = fullContent.toLowerCase().includes('tournament');
                        const containsChampionship = fullContent.toLowerCase().includes('championship');
                        const containsEvent = fullContent.toLowerCase().includes('event');
                        const containsGala = fullContent.toLowerCase().includes('gala');
                        
                        // Look for dates in the title or text (including expanded content)
                        const dateMatches = fullContent.match(/(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4}|\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{4}|20\d{2})/gi) || [];
                        
                        // Look for locations (Australian states/territories)
                        const hasLocation = /\b(NSW|QLD|VIC|SA|WA|NT|ACT|TAS|Australia|Brisbane|Sydney|Melbourne|Perth|Adelaide|Darwin|Hobart|Canberra)\b/i.test(fullContent);
                        
                        // Look for additional details that might be in expanded content
                        const hasVenue = /\b(venue|ground|park|stadium|field|centre|center|club|oval)\b/i.test(fullContent);
                        const hasTime = /\b(\d{1,2}:\d{2}|\d{1,2}(am|pm))\b/i.test(fullContent);
                        const hasContact = /\b(contact|email|phone|mobile|call)\b/i.test(fullContent);
                        const hasFees = /\b(fee|cost|price|\$\d+|entry|registration)\b/i.test(fullContent);
                        
                        // Size validation
                        const hasSubstantialContent = title.length > 5 && fullContent.length > 20;
                        
                        // Relevance scoring for MySideline Masters events (enhanced with expanded content)
                        let relevanceScore = 0;
                        if (containsMasters) relevanceScore += 15; // Higher score for Masters
                        if (containsNRL) relevanceScore += 12;
                        if (containsRugby || containsLeague) relevanceScore += 10;
                        if (containsCarnival || containsTournament || containsChampionship) relevanceScore += 8;
                        if (containsEvent || containsGala) relevanceScore += 6;
                        if (dateMatches.length > 0) relevanceScore += 5;
                        if (hasLocation) relevanceScore += 4;
                        if (title.length > 10) relevanceScore += 3;
                        if (subtitle.includes('Masters') || subtitle.includes('NRL')) relevanceScore += 7;
                        
                        // Bonus points for expanded content details
                        if (hasExpandedContent) relevanceScore += 5;
                        if (hasVenue) relevanceScore += 3;
                        if (hasTime) relevanceScore += 2;
                        if (hasContact) relevanceScore += 3;
                        if (hasFees) relevanceScore += 2;
                        
                        // Only include MySideline cards with Masters relevance
                        if (relevanceScore >= 10 && hasSubstantialContent) {
                            const cardId = card.id || card.getAttribute('id') || `mysideline-card-${index}`;
                            
                            const elementData = {
                                selector: '.el-card.is-always-shadow',
                                text: cardText,
                                title: title,
                                subtitle: subtitle,
                                id: cardId,
                                innerHTML: card.innerHTML.substring(0, 4000), // Increased to capture expanded content
                                href: null, // MySideline cards don't seem to have direct links in this structure
                                imageSrc: imageSrc,
                                imageAlt: imageAlt,
                                className: card.className || '',
                                relevanceScore: relevanceScore,
                                dates: dateMatches,
                                hasLocation: hasLocation,
                                cardIndex: index,
                                isMySidelineCard: true,
                                // New expanded content fields
                                expandedDetails: expandedDetails,
                                hasExpandedContent: !!hasExpandedContent,
                                hasVenue: hasVenue,
                                hasTime: hasTime,
                                hasContact: hasContact,
                                hasFees: hasFees,
                                fullContent: fullContent
                            };

                            foundElements.push(elementData);
                            console.log(`Found MySideline Masters card (score: ${relevanceScore}): ${title} ${hasExpandedContent ? '[EXPANDED]' : ''}`);
                        }
                    } catch (err) {
                        console.log(`Error processing MySideline card ${index}:`, err.message);
                    }
                });
                
                // Secondary extraction: Fallback to other selectors if no cards found
                if (foundElements.length === 0) {
                    console.log('No MySideline cards found, trying fallback selectors...');
                    
                    const fallbackSelectors = [
                        '.club-item', '.event-item', '.listing-item', '.search-item', '.result-item',
                        'article', 'section', '.row', '.col', '.container > div', '.content > div',
                        'div', 'span', 'p'
                    ];
                    
                    fallbackSelectors.forEach((selector, selectorIndex) => {
                        if (foundElements.length >= 10) return; // Stop if we have enough
                        
                        try {
                            const elements = document.querySelectorAll(selector);
                            elements.forEach((el, index) => {
                                if (foundElements.length >= 10) return;
                                
                                const text = el.textContent?.trim() || '';
                                if (text.toLowerCase().includes('masters') && text.length > 20 && text.length < 1000) {
                                    foundElements.push({
                                        selector: selector,
                                        text: text,
                                        title: text.split('\n')[0] || text.substring(0, 100),
                                        id: `fallback-${selectorIndex}-${index}`,
                                        relevanceScore: 5,
                                        isFallback: true,
                                        expandedDetails: '',
                                        hasExpandedContent: false,
                                        fullContent: text
                                    });
                                }
                            });
                        } catch (err) {
                            console.log(`Error with fallback selector ${selector}:`, err.message);
                        }
                    });
                }

                // Sort by relevance score and remove duplicates
                const uniqueElements = [];
                const seenTitles = new Set();
                
                foundElements
                    .sort((a, b) => b.relevanceScore - a.relevanceScore)
                    .forEach(element => {
                        const titleKey = (element.title || element.text.substring(0, 50)).toLowerCase().trim();
                        if (!seenTitles.has(titleKey) && titleKey.length > 5) {
                            seenTitles.add(titleKey);
                            uniqueElements.push(element);
                        }
                    });

                console.log(`Total MySideline elements found: ${foundElements.length}, unique: ${uniqueElements.length}`);
                return uniqueElements.slice(0, 25); // Limit to top 25 results
            });

            // Convert to standard format with enhanced parsing for MySideline data
            const standardEvents = [];
            for (const event of events) {
                try {
                    const standardEvent = this.parseEventFromMySidelineElement(event);
                    if (standardEvent) {
                        standardEvents.push(standardEvent);
                        console.log(`Successfully parsed MySideline event: ${standardEvent.title} ${event.hasExpandedContent ? '[WITH EXPANDED DETAILS]' : ''}`);
                    }
                } catch (parseError) {
                    console.log(`Failed to parse MySideline event: ${parseError.message}`);
                }
            }

            console.log(`Successfully extracted ${standardEvents.length} events from MySideline using Vue.js-optimized extraction with click-expand functionality`);
            return standardEvents;
            
        } catch (error) {
            console.error('MySideline Playwright event extraction failed:', error.message);
            return [];
        }
    }

    /**
     * Click on all elements with class="click-expand" to reveal full event details
     * @param {Page} page - Playwright page object
     */
    async expandAllClickExpandElements(page) {
        console.log('Expanding all click-expand elements to get full event details...');
        
        try {
            // Find all click-expand elements
            const clickExpandElements = await page.locator('.click-expand').all();
            console.log(`Found ${clickExpandElements.length} click-expand elements`);
            
            if (clickExpandElements.length === 0) {
                console.log('No click-expand elements found, skipping expansion');
                return;
            }
            
            // Click each expand element and wait for content to load
            for (let i = 0; i < clickExpandElements.length; i++) {
                try {
                    const element = clickExpandElements[i];
                    
                    // Check if element is visible and clickable
                    const isVisible = await element.isVisible();
                    if (!isVisible) {
                        console.log(`Click-expand element ${i + 1} is not visible, skipping`);
                        continue;
                    }
                    
                    console.log(`Clicking expand element ${i + 1} of ${clickExpandElements.length}...`);
                    
                    // Scroll element into view if needed
                    await element.scrollIntoViewIfNeeded();
                    
                    // Wait a moment for any scroll animations
                    await this.delay(500);
                    
                    // Click the element
                    await element.click();
                    
                    // Wait for content to expand
                    await this.delay(1000);
                    
                    // Wait for any dynamic content loading after click
                    await this.waitForExpandedContent(page, i);
                    
                    console.log(`Successfully expanded element ${i + 1}`);
                    
                } catch (clickError) {
                    console.log(`Failed to click expand element ${i + 1}: ${clickError.message}`);
                    // Continue with other elements even if one fails
                }
                
                // Add delay between clicks to be respectful
                if (i < clickExpandElements.length - 1) {
                    await this.delay(800);
                }
            }
            
            // Final wait for all expanded content to stabilize
            console.log('Waiting for all expanded content to stabilize...');
            await this.delay(3000);
            
            // Take a screenshot after expansion for debugging
            if (!this.useHeadlessBrowser) {
                try {
                    await page.screenshot({ 
                        path: 'debug-mysideline-expanded.png', 
                        fullPage: true 
                    });
                    console.log('Debug screenshot after expansion saved as debug-mysideline-expanded.png');
                } catch (screenshotError) {
                    console.log('Could not save expanded screenshot:', screenshotError.message);
                }
            }
            
            console.log('Click-expand element processing completed');
            
        } catch (error) {
            console.error('Error during click-expand processing:', error.message);
            // Don't throw error - continue with extraction even if expansion fails
        }
    }

    /**
     * Wait for expanded content to load after clicking a click-expand element
     * @param {Page} page - Playwright page object
     * @param {number} elementIndex - Index of the element that was clicked
     */
    async waitForExpandedContent(page, elementIndex) {
        try {
            // Wait for common expanded content indicators
            await page.waitForFunction(() => {
                // Look for common expanded content selectors
                const expandedContentSelectors = [
                    '.expanded-content',
                    '.click-expand-content', 
                    '.expanded-details',
                    '.show-more-content',
                    '.additional-details',
                    '.full-details',
                    '.event-details',
                    '.expanded',
                    '[style*="display: block"]',
                    '[style*="height: auto"]'
                ];
                
                return expandedContentSelectors.some(selector => 
                    document.querySelectorAll(selector).length > 0
                );
            }, { timeout: 5000 });
            
            console.log(`Expanded content detected for element ${elementIndex + 1}`);
            
        } catch (waitError) {
            // If we can't detect expanded content, just wait a bit and continue
            console.log(`Could not detect expanded content for element ${elementIndex + 1}, continuing...`);
            await this.delay(1500);
        }
    }

    /**
     * Parse event information from MySideline Vue.js card element (enhanced with expanded content)
     * @param {Object} element - The scraped MySideline card element data
     * @returns {Object|null} - Standardized event object or null
     */
    parseEventFromMySidelineElement(element) {
        try {
            const title = element.title || '';
            const subtitle = element.subtitle || '';
            const fullText = element.fullContent || element.text || '';
            const expandedDetails = element.expandedDetails || '';
            const dates = element.dates || [];
            
            // Extract and clean the event name - ensure subtitle is NOT included
            let eventName = title;
            let extractedDate = null;
            
            // First, try to extract date from title and remove it
            if (eventName) {
                const dateExtractionResult = this.extractAndStripDateFromTitle(eventName);
                eventName = dateExtractionResult.cleanTitle;
                extractedDate = dateExtractionResult.extractedDate;
            }
            
            // If no title or title too short after cleaning, use extractEventName method
            if (!eventName || eventName.length < 5) {
                eventName = this.extractEventName(fullText.split('\n').filter(line => line.trim()));
                // Try to extract date from the extracted event name as well
                if (eventName) {
                    const dateExtractionResult = this.extractAndStripDateFromTitle(eventName);
                    eventName = dateExtractionResult.cleanTitle;
                    if (!extractedDate) {
                        extractedDate = dateExtractionResult.extractedDate;
                    }
                }
            }
            
            // If we still don't have a date, try other sources including expanded content
            let eventDate = extractedDate;
            
            if (!eventDate && dates.length > 0) {
                // Try to parse the first date found in the content
                eventDate = this.parseDate(dates[0]);
            }
            
            if (!eventDate) {
                // Try to extract date from subtitle (but don't include subtitle in title)
                const subtitleDateMatch = subtitle.match(/(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4}|\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{4})/);
                if (subtitleDateMatch) {
                    eventDate = this.parseDate(subtitleDateMatch[0]);
                }
            }
            
            // Try to extract additional details from expanded content
            const enhancedLocation = this.extractLocationFromExpandedContent(fullText, expandedDetails);
            const enhancedSchedule = this.extractScheduleFromExpandedContent(fullText, expandedDetails);
            const enhancedContact = this.extractContactFromExpandedContent(expandedDetails);
            const enhancedFees = this.extractFeesFromExpandedContent(expandedDetails);
            
            // Extract location and state (using enhanced location if available)
            const location = enhancedLocation || this.extractLocationFromMySidelineText(fullText);
            const state = this.extractStateFromMySidelineText(fullText, subtitle);
            
            // Generate enhanced description using expanded content
            const descriptionParts = [];
            if (subtitle && subtitle.trim() && !subtitle.toLowerCase().includes('masters rugby league')) {
                // Only include subtitle in description if it adds meaningful information
                descriptionParts.push(subtitle);
            }
            if (enhancedSchedule) {
                descriptionParts.push(enhancedSchedule);
            }
            if (expandedDetails && expandedDetails.length > 20) {
                // Include relevant parts of expanded details
                const cleanedExpandedDetails = expandedDetails
                    .replace(/click to expand/gi, '')
                    .replace(/show more/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                if (cleanedExpandedDetails.length > 10) {
                    descriptionParts.push(cleanedExpandedDetails.substring(0, 200));
                }
            }
            if (descriptionParts.length === 0) {
                descriptionParts.push('Event details available on MySideline');
            }
            const description = descriptionParts.join('. ').substring(0, 500);
            
            // Skip if we don't have minimum required info
            if (!eventName || eventName.length < 5) {
                return null;
            }

            return {
                title: eventName.trim(),
                date: eventDate, // Don't set a default date if none found
                locationAddress: location && location !== 'TBA - Check MySideline for details' ? location : null,
                organiserContactName: enhancedContact.name || null,
                organiserContactEmail: enhancedContact.email || null,
                organiserContactPhone: enhancedContact.phone || null,
                scheduleDetails: description && description !== 'Event details available on MySideline' ? description : null,
                state: state,
                registrationLink: `https://profile.mysideline.com.au/register/${element.id || 'event'}`,
                mySidelineEventId: element.id || `mysideline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                isManuallyEntered: false,
                maxTeams: 16,
                feesDescription: enhancedFees || 'Entry fees TBA - check MySideline registration for details',
                registrationDeadline: eventDate ? new Date(eventDate.getTime() - (7 * 24 * 60 * 60 * 1000)) : null,
                ageCategories: ['35+', '40+', '45+', '50+'],
                isRegistrationOpen: true,
                isActive: true,
                sourceData: {
                    mySidelineCardId: element.id,
                    cardIndex: element.cardIndex,
                    relevanceScore: element.relevanceScore,
                    extractedTitle: title,
                    extractedSubtitle: subtitle,
                    extractedDates: dates,
                    originalTitle: title,
                    cleanedTitle: eventName,
                    extractedDateFromTitle: extractedDate,
                    // Enhanced with expanded content data
                    hasExpandedContent: element.hasExpandedContent,
                    expandedDetails: expandedDetails,
                    enhancedLocation: enhancedLocation,
                    enhancedSchedule: enhancedSchedule,
                    enhancedContact: enhancedContact,
                    enhancedFees: enhancedFees,
                    fullContent: fullText
                }
            };
        } catch (error) {
            console.error('Error parsing MySideline element:', error);
            return null;
        }
    }

    /**
     * Extract enhanced location information from expanded content
     * @param {string} fullText - The full text content
     * @param {string} expandedDetails - The expanded details content
     * @returns {string|null} - Enhanced location or null
     */
    extractLocationFromExpandedContent(fullText, expandedDetails) {
        const content = (fullText + ' ' + expandedDetails).toLowerCase();
        
        // Look for specific venue patterns in expanded content
        const venuePatterns = [
            /venue:\s*([^,\n]+)/i,
            /location:\s*([^,\n]+)/i,
            /address:\s*([^,\n]+)/i,
            /at\s+([^,\n]+(?:park|ground|stadium|field|centre|center|oval|club))/i,
            /([^,\n]+(?:park|ground|stadium|field|centre|center|oval|club))/i
        ];
        
        for (const pattern of venuePatterns) {
            const match = content.match(pattern);
            if (match && match[1] && match[1].trim().length > 5) {
                return match[1].trim();
            }
        }
        
        return null;
    }

    /**
     * Extract enhanced schedule information from expanded content
     * @param {string} fullText - The full text content
     * @param {string} expandedDetails - The expanded details content
     * @returns {string|null} - Enhanced schedule or null
     */
    extractScheduleFromExpandedContent(fullText, expandedDetails) {
        const content = fullText + ' ' + expandedDetails;
        
        // Look for schedule patterns
        const schedulePatterns = [
            /schedule:\s*([^,\n]+)/i,
            /time:\s*([^,\n]+)/i,
            /(\d{1,2}:\d{2}(?:\s*[ap]m)?(?:\s*-\s*\d{1,2}:\d{2}(?:\s*[ap]m)?)?)/i,
            /start(?:s)?:\s*([^,\n]+)/i,
            /kick(?:\s*off)?:\s*([^,\n]+)/i
        ];
        
        for (const pattern of schedulePatterns) {
            const match = content.match(pattern);
            if (match && match[1] && match[1].trim().length > 3) {
                return match[1].trim();
            }
        }
        
        return null;
    }

    /**
     * Extract date from title and return both the clean title and extracted date
     * @param {string} title - The title containing potential date information
     * @returns {Object} - Object with cleanTitle and extractedDate properties
     */
    extractAndStripDateFromTitle(title) {
        if (!title || typeof title !== 'string') {
            return { cleanTitle: title, extractedDate: null };
        }

        let cleanTitle = title.trim();
        let extractedDate = null;

        // Enhanced date patterns to match various formats in titles
        const datePatterns = [
            // Dates in brackets: (DD/MM/YYYY), (DD-MM-YYYY), (DD Month YYYY)
            {
                pattern: /\s*\((\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{4})\)\s*/gi,
                extract: (match) => match[1]
            },
            {
                pattern: /\s*\((\d{1,2}[\s]+\w+[\s]+\d{4})\)\s*/gi,
                extract: (match) => match[1]
            },
            {
                pattern: /\s*\((\w+[\s]+\d{1,2},?[\s]+\d{4})\)\s*/gi,
                extract: (match) => match[1]
            },
            
            // Dates without brackets but with separators: - DD/MM/YYYY, | DD Month YYYY
            {
                pattern: /\s*[\-\|]\s*(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{4})\s*/gi,
                extract: (match) => match[1]
            },
            {
                pattern: /\s*[\-\|]\s*(\d{1,2}[\s]+\w+[\s]+\d{4})\s*/gi,
                extract: (match) => match[1]
            },
            {
                pattern: /\s*[\-\|]\s*(\w+[\s]+\d{1,2},?[\s]+\d{4})\s*/gi,
                extract: (match) => match[1]
            },
            
            // Dates at the end of title: Title DD/MM/YYYY, Title DD Month YYYY
            {
                pattern: /\s+(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{4})\s*$/gi,
                extract: (match) => match[1]
            },
            {
                pattern: /\s+(\d{1,2}[\s]+\w+[\s]+\d{4})\s*$/gi,
                extract: (match) => match[1]
            },
            {
                pattern: /\s+(\w+[\s]+\d{1,2},?[\s]+\d{4})\s*$/gi,
                extract: (match) => match[1]
            },
            
            // Year only patterns: (2024), (2025), - 2024, | 2025
            {
                pattern: /\s*\((20\d{2})\)\s*/gi,
                extract: (match) => match[1]
            },
            {
                pattern: /\s*[\-\|]\s*(20\d{2})\s*$/gi,
                extract: (match) => match[1]
            }
        ];

        // Try each pattern to find and extract date
        for (const { pattern, extract } of datePatterns) {
            const match = pattern.exec(cleanTitle);
            if (match) {
                const dateString = extract(match);
                const parsedDate = this.parseDate(dateString);
                
                if (parsedDate) {
                    // Remove the matched date pattern from the title
                    cleanTitle = cleanTitle.replace(pattern, ' ').trim();
                    // Clean up any double spaces
                    cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();
                    extractedDate = parsedDate;
                    console.log(`Extracted date "${dateString}" from title. Clean title: "${cleanTitle}"`);
                    break;
                }
                
                // Reset the regex lastIndex for next iteration
                pattern.lastIndex = 0;
            }
        }
        // Additional cleanup for common title artifacts
        cleanTitle = cleanTitle
        .replace(/\s*[\-\|]\s*$/, '') // Remove trailing dashes or pipes
        .replace(/^\s*[\-\|]\s*/, '') // Remove leading dashes or pipes
        .replace(/\(\s*\)/, '') // Remove empty brackets
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

        return {
            cleanTitle: cleanTitle,
            extractedDate: extractedDate
        };
    }


    /**
     * Extract contact information from expanded content
     * @param {string} expandedDetails - The expanded details content
     * @returns {Object} - Contact information object
     */
    extractContactFromExpandedContent(expandedDetails) {
        const contact = {
            name: null,
            email: null,
            phone: null
        };
        
        if (!expandedDetails) return contact;
        
        // Extract email
        const emailMatch = expandedDetails.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
            contact.email = emailMatch[1];
        }
        
        // Extract phone
        const phoneMatch = expandedDetails.match(/(?:phone|mobile|call|contact):\s*([0-9\s\-\(\)]+)/i);
        if (phoneMatch && phoneMatch[1].trim().length > 8) {
            contact.phone = phoneMatch[1].trim();
        }
        
        // Extract contact name
        const nameMatch = expandedDetails.match(/contact:\s*([^,\n]+)/i);
        if (nameMatch && nameMatch[1] && !nameMatch[1].includes('@') && !nameMatch[1].match(/\d{8,}/)) {
            contact.name = nameMatch[1].trim();
        }
        
        return contact;
    }

    /**
     * Extract fees information from expanded content
     * @param {string} expandedDetails - The expanded details content
     * @returns {string|null} - Fees information or null
     */
    extractFeesFromExpandedContent(expandedDetails) {
        if (!expandedDetails) return null;
        
        // Look for fee patterns
        const feePatterns = [
            /fee[s]?:\s*([^,\n]+)/i,
            /cost:\s*([^,\n]+)/i,
            /price:\s*([^,\n]+)/i,
            /entry:\s*([^,\n]+)/i,
            /(\$\d+(?:\.\d{2})?[^,\n]*)/i
        ];
        
        for (const pattern of feePatterns) {
            const match = expandedDetails.match(pattern);
            if (match && match[1] && match[1].trim().length > 2) {
                return match[1].trim();
            }
        }
        
        return null;
    }
}

module.exports = new MySidelineIntegrationService();
