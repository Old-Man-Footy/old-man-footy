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

            // MySideline-specific selectors based on typical club search pages
            const mySidelineSelectors = [
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
                '.MuiGrid-container', // Material-UI grid (common in React apps)
                '.ant-list', // Ant Design list
                '.card-container',
                '.list-group',
                'table tbody', // Table-based results
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

            // Wait for search results to actually populate with content
            await page.waitForFunction(() => {
                // Look for elements that likely contain club or event information
                const potentialResults = document.querySelectorAll('div, li, tr, article, section');
                let relevantContent = 0;

                for (let element of potentialResults) {
                    const text = element.textContent?.toLowerCase() || '';
                    if (text.includes('masters') || 
                        text.includes('rugby') || 
                        text.includes('league') ||
                        text.includes('club') ||
                        text.includes('tournament') ||
                        text.includes('competition')) {
                        relevantContent++;
                    }
                }

                console.log(`Found ${relevantContent} elements with relevant content`);
                return relevantContent >= 3; // Require at least 3 relevant elements
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
     * Enhanced content validation specifically for MySideline
     * @param {Page} page - Playwright page object
     */
    async validatePageContent(page) {
        console.log('Validating MySideline page content...');
        
        try {
            const contentValidation = await page.evaluate(() => {
                const bodyText = document.body ? document.body.textContent.toLowerCase() : '';
                const url = window.location.href.toLowerCase();
                
                // MySideline-specific validation
                const isMySidelinePage = url.includes('mysideline.com.au');
                const hasSearchParams = url.includes('criteria=masters') || url.includes('source=rugby-league');
                
                // Content validation
                const hasRelevantTerms = bodyText.includes('masters') || 
                                       bodyText.includes('rugby') || 
                                       bodyText.includes('league') ||
                                       bodyText.includes('tournament') ||
                                       bodyText.includes('competition') ||
                                       bodyText.includes('club') ||
                                       bodyText.includes('sport') ||
                                       bodyText.includes('search') ||
                                       bodyText.includes('finder');
                
                const hasStructure = document.querySelectorAll('div, article, section, li, tr').length > 20;
                const hasLinks = document.querySelectorAll('a').length > 5;
                const hasInteractiveElements = document.querySelectorAll('button, input, select').length > 0;
                const textLength = bodyText.length;
                
                // Check for potential search results or listings
                const hasListStructure = document.querySelectorAll('ul li, ol li, table tr, .card, .item, .listing').length > 0;
                
                // Look for MySideline-specific elements
                const hasMySidelineElements = document.querySelector('[href*="mysideline"]') !== null ||
                                           document.querySelector('[src*="mysideline"]') !== null ||
                                           bodyText.includes('mysideline');
                
                return {
                    isMySidelinePage,
                    hasSearchParams,
                    hasRelevantTerms,
                    hasStructure,
                    hasLinks,
                    hasInteractiveElements,
                    hasListStructure,
                    hasMySidelineElements,
                    textLength,
                    isValid: isMySidelinePage && hasRelevantTerms && hasStructure && textLength > 1000,
                    pageLoadComplete: textLength > 2000 && hasInteractiveElements
                };
            });
            
            console.log('MySideline content validation result:', contentValidation);
            
            if (!contentValidation.isValid) {
                console.log('Warning: MySideline page content validation indicates incomplete loading');
            }

            if (!contentValidation.pageLoadComplete) {
                console.log('Warning: Page may not be fully loaded, waiting additional time...');
                await page.waitForTimeout(15000);
            }
            
        } catch (error) {
            console.log(`MySideline content validation failed: ${error.message}`);
        }
    }

    /**
     * Enhanced event extraction specifically optimized for MySideline
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
                    hasMasters: document.body ? document.body.textContent.toLowerCase().includes('masters') : false
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

            // Extract potential events with MySideline-optimized selectors
            const events = await page.evaluate(() => {
                const foundElements = [];
                
                // MySideline-specific selector patterns
                const mySidelineSelectors = [
                    // Specific MySideline patterns
                    '.club-search-result',
                    '.search-result-item',
                    '.club-listing-item',
                    '.club-card',
                    '.search-card',
                    '.result-card',
                    
                    // Common listing patterns
                    '.club-item',
                    '.event-item',
                    '.listing-item',
                    '.search-item',
                    '.result-item',
                    
                    // Generic container patterns
                    '[data-testid*="club"]',
                    '[data-testid*="search"]',
                    '[data-testid*="result"]',
                    '[data-testid*="listing"]',
                    
                    // Material-UI and common React patterns
                    '.MuiGrid-item',
                    '.MuiCard-root',
                    '.ant-card',
                    '.card',
                    '.item',
                    '.listing',
                    
                    // Table-based results
                    'table tbody tr',
                    '.table-row',
                    
                    // List-based results
                    'ul li',
                    'ol li',
                    '.list-item',
                    
                    // Generic containers that might contain clubs/events
                    'article',
                    'section',
                    '.row',
                    '.col',
                    '.container > div',
                    '.content > div',
                    
                    // Fallback to all divs, spans, and paragraphs
                    'div',
                    'span',
                    'p'
                ];
                
                console.log('Starting MySideline-optimized content extraction...');
                
                mySidelineSelectors.forEach((selector, selectorIndex) => {
                    try {
                        const elements = document.querySelectorAll(selector);
                        console.log(`Selector ${selectorIndex + 1}/${mySidelineSelectors.length} (${selector}): found ${elements.length} elements`);
                        
                        elements.forEach((el, index) => {
                            const text = el.textContent?.trim() || '';
                            const innerHTML = el.innerHTML || '';
                            
                            // Enhanced content detection for MySideline
                            const containsMasters = text.toLowerCase().includes('masters');
                            const containsRugby = text.toLowerCase().includes('rugby');
                            const containsLeague = text.toLowerCase().includes('league');
                            const containsClub = text.toLowerCase().includes('club');
                            const containsTournament = text.toLowerCase().includes('tournament');
                            const containsChampionship = text.toLowerCase().includes('championship');
                            const containsCompetition = text.toLowerCase().includes('competition');
                            const containsEvent = text.toLowerCase().includes('event');
                            
                            // Check for contact information patterns
                            const hasEmail = text.includes('@') || innerHTML.includes('mailto:');
                            const hasPhone = /\b(\d{4}\s?\d{3}\s?\d{3}|\(\d{2}\)\s?\d{4}\s?\d{4}|04\d{2}\s?\d{3}\s?\d{3})\b/.test(text);
                            const hasLocation = /\b(NSW|QLD|VIC|SA|WA|NT|ACT|TAS|Australia)\b/i.test(text);
                            
                            // Check if element has clickable content
                            const hasLinks = el.querySelectorAll('a').length > 0;
                            const hasButtons = el.querySelectorAll('button').length > 0;
                            
                            // Size validation - not too small, not too large
                            const isSubstantialSize = text.length > 20 && text.length < 5000;
                            
                            // Relevance scoring
                            let relevanceScore = 0;
                            if (containsMasters) relevanceScore += 10;
                            if (containsRugby || containsLeague) relevanceScore += 8;
                            if (containsClub) relevanceScore += 6;
                            if (containsTournament || containsChampionship || containsCompetition) relevanceScore += 7;
                            if (containsEvent) relevanceScore += 5;
                            if (hasEmail || hasPhone) relevanceScore += 4;
                            if (hasLocation) relevanceScore += 3;
                            if (hasLinks || hasButtons) relevanceScore += 2;
                            
                            // Only include elements with sufficient relevance and size
                            if (relevanceScore >= 5 && isSubstantialSize) {
                                const elementData = {
                                    selector: selector,
                                    text: text,
                                    id: el.id || `found-${Date.now()}-${selectorIndex}-${index}`,
                                    innerHTML: innerHTML.substring(0, 1000),
                                    href: el.href || el.querySelector('a')?.href || null,
                                    className: el.className || '',
                                    parentText: el.parentElement ? el.parentElement.textContent.substring(0, 300) : '',
                                    relevanceScore: relevanceScore,
                                    hasEmail: hasEmail,
                                    hasPhone: hasPhone,
                                    hasLocation: hasLocation,
                                    hasLinks: hasLinks
                                };

                                foundElements.push(elementData);
                                console.log(`Found relevant content (score: ${relevanceScore}): ${text.substring(0, 100)}...`);
                            }
                        });
                    } catch (err) {
                        console.log(`Error with selector ${selector}:`, err.message);
                    }
                });

                // Sort by relevance score and remove duplicates
                const uniqueElements = [];
                const seenTexts = new Set();
                
                foundElements
                    .sort((a, b) => b.relevanceScore - a.relevanceScore)
                    .forEach(element => {
                        const textKey = element.text.substring(0, 150).toLowerCase();
                        if (!seenTexts.has(textKey)) {
                            seenTexts.add(textKey);
                            uniqueElements.push(element);
                        }
                    });

                console.log(`Total relevant elements found: ${foundElements.length}, unique: ${uniqueElements.length}`);
                return uniqueElements.slice(0, 50); // Limit to top 50 results
            });

            // Convert to standard format with enhanced parsing
            const standardEvents = [];
            for (const event of events) {
                try {
                    const standardEvent = this.parseEventFromElement(event);
                    if (standardEvent) {
                        standardEvents.push(standardEvent);
                        console.log(`Successfully parsed MySideline event: ${standardEvent.title}`);
                    }
                } catch (parseError) {
                    console.log(`Failed to parse MySideline event: ${parseError.message}`);
                }
            }

            console.log(`Successfully extracted ${standardEvents.length} events from MySideline using enhanced Playwright extraction`);
            return standardEvents;
            
        } catch (error) {
            console.error('MySideline Playwright event extraction failed:', error.message);
            return [];
        }
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

    /**
     * Wait for content stabilization
     * @param {Page} page - Playwright page object
     */
    async waitForContentStabilization(page) {
        console.log('Waiting for content stabilization...');
        
        try {
            // Wait for network to be idle
            await page.waitForLoadState('networkidle');
            
            // Extended wait for any remaining dynamic content
            await page.waitForTimeout(20000);
            
            // Check content stability
            await this.waitForDynamicContentLoading(page);
            
        } catch (error) {
            console.log(`Content stabilization failed: ${error.message}`);
        }
    }

    /**
     * Wait for meaningful content to be present
     * @param {Page} page - Playwright page object
     */
    async waitForMeaningfulContent(page) {
        console.log('Waiting for meaningful content...');
        
        try {
            await page.waitForFunction(() => {
                const bodyText = document.body ? document.body.textContent : '';
                const hasSubstantialContent = bodyText.length > 2000;
                const hasMultipleElements = document.querySelectorAll('div, p, article, section').length > 30;
                
                return hasSubstantialContent && hasMultipleElements;
            }, { timeout: 60000 });
            
            console.log('Meaningful content confirmed');
        } catch (error) {
            console.log(`Meaningful content wait failed: ${error.message}`);
        }
    }
}

module.exports = new MySidelineIntegrationService();
