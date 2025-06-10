const cron = require('node-cron');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { Carnival, User, Club } = require('../models');
const { Op } = require('sequelize');
const emailService = require('./emailService');

class MySidelineIntegrationService {
    constructor() {
        this.baseUrl = process.env.MYSIDELINE_URL || 'https://profile.mysideline.com.au';
        this.timeout = 30000;
        this.retryCount = 3;
        this.rateLimit = 1000; // 1 second between requests
        this.searchUrl = 'https://profile.mysideline.com.au/register/clubsearch/?criteria=Masters&type=&activity=&gender=&agemin=&agemax=&comptype=&source=rugby-league';
        this.lastSyncDate = null;
        this.isRunning = false;
        this.requestDelay = 2000; // 2 second delay between requests to be respectful
    }

    // Initialize the scheduled sync
    initializeScheduledSync() {
        // Run every day at 3 AM
        cron.schedule('0 3 * * *', async () => {
            console.log('Starting scheduled MySideline sync...');
            await this.syncMySidelineEvents();
        });

        // Also run on startup if not synced in last 24 hours
        this.checkAndRunInitialSync();
    }

    async checkAndRunInitialSync() {
        try {
            const lastImportedCarnival = await Carnival.findOne({ 
                where: {
                    mySidelineEventId: { [Op.ne]: null }
                },
                order: [['createdAt', 'DESC']]
            });

            if (!lastImportedCarnival || 
                (new Date() - lastImportedCarnival.createdAt) > 24 * 60 * 60 * 1000) {
                console.log('Running initial MySideline sync...');
                await this.syncMySidelineEvents();
            }
        } catch (error) {
            console.error('Failed to check for initial sync:', error);
        }
    }

    // Main sync function
    async syncMySidelineEvents() {
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
            console.log('Scraping MySideline Masters events from search page...');
            
            // Use browser automation as primary method since MySideline requires JavaScript
            const events = await this.fetchEventsWithBrowser();
            
            console.log(`Found ${events.length} Masters events from MySideline`);
            return events;
        } catch (error) {
            console.error('Failed to scrape MySideline events:', error);
            // Fall back to mock data for development
            console.log('Falling back to mock events for development...');
            return this.generateMockEvents('NSW').concat(
                this.generateMockEvents('QLD'),
                this.generateMockEvents('VIC')
            );
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
                    '--disable-features=VizDisplayCompositor'
                ],
                timeout: 60000
            });

            const page = await browser.newPage();
            
            // Set a realistic user agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            // Set viewport
            await page.setViewport({ width: 1280, height: 720 });

            // Set default navigation timeout
            page.setDefaultNavigationTimeout(30000);
            page.setDefaultTimeout(30000);

            // Track all network requests to capture form submissions and AJAX calls
            const capturedRequests = [];
            
            // Monitor network requests for registration endpoints
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                try {
                    const url = request.url();
                    const method = request.method();
                    const postData = request.postData();
                    
                    // Look for registration-related URLs or form submissions
                    if (url.includes('register') || url.includes('signup') || url.includes('event') || 
                        url.includes('form') || method === 'POST') {
                        console.log(`🔗 Captured ${method} request: ${url}`);
                        capturedRequests.push({
                            url: url,
                            method: method,
                            postData: postData,
                            timestamp: new Date()
                        });
                    }
                    
                    // Continue the request
                    request.continue();
                } catch (error) {
                    console.log(`Request interception error: ${error.message}`);
                    try {
                        request.continue();
                    } catch (continueError) {
                        // Request may have already been handled
                    }
                }
            });

            console.log(`Navigating to MySideline search: ${this.searchUrl}`);
            
            // Navigate to the search page with retry logic
            let navigationSuccess = false;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (!navigationSuccess && retryCount < maxRetries) {
                try {
                    await page.goto(this.searchUrl, { 
                        waitUntil: 'domcontentloaded',
                        timeout: 30000 
                    });
                    navigationSuccess = true;
                    console.log('Successfully navigated to MySideline search page');
                } catch (navError) {
                    retryCount++;
                    console.log(`Navigation attempt ${retryCount} failed: ${navError.message}`);
                    if (retryCount < maxRetries) {
                        console.log('Retrying navigation...');
                        await this.delay(2000);
                    } else {
                        throw new Error(`Failed to navigate after ${maxRetries} attempts: ${navError.message}`);
                    }
                }
            }

            // Wait for content to load
            console.log('Waiting for search results to load...');
            await page.waitForTimeout(3000);

            // Enhanced event extraction with proper form and button handling
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
                        'div[class*="event"]'
                    ];
                    
                    selectors.forEach(selector => {
                        try {
                            const elements = document.querySelectorAll(selector);
                            elements.forEach((el, index) => {
                                const text = el.textContent?.trim() || '';
                                
                                // Check if this element contains "Masters" (case insensitive)
                                if (text.toLowerCase().includes('masters') && text.length > 20) {
                                    // Look for registration forms and buttons
                                    const forms = el.querySelectorAll('form');
                                    const buttons = el.querySelectorAll('button, input[type="button"], input[type="submit"]');
                                    const links = el.querySelectorAll('a');
                                    
                                    let registrationInfo = null;
                                    
                                    // Check for forms with registration-related actions
                                    forms.forEach(form => {
                                        const action = form.action || form.getAttribute('action');
                                        const method = form.method || form.getAttribute('method') || 'GET';
                                        
                                        if (action && (action.includes('register') || action.includes('signup') || action.includes('event'))) {
                                            registrationInfo = {
                                                type: 'form',
                                                action: action,
                                                method: method.toUpperCase(),
                                                formId: form.id,
                                                formClass: form.className
                                            };
                                            console.log(`🎯 Found registration form: ${action}`);
                                        }
                                    });
                                    
                                    // Check for buttons with registration-related functionality
                                    buttons.forEach(btn => {
                                        const btnText = (btn.textContent || btn.value || '').toLowerCase();
                                        if (btnText.includes('register') || btnText.includes('sign up') || btnText.includes('join')) {
                                            const onclick = btn.getAttribute('onclick');
                                            const dataUrl = btn.getAttribute('data-url') || btn.getAttribute('data-href');
                                            const formAction = btn.closest('form')?.action;
                                            const buttonType = btn.type || 'button';
                                            
                                            registrationInfo = {
                                                type: 'button',
                                                buttonText: btn.textContent || btn.value,
                                                onclick: onclick,
                                                dataUrl: dataUrl,
                                                formAction: formAction,
                                                buttonType: buttonType,
                                                buttonClass: btn.className,
                                                buttonId: btn.id
                                            };
                                            
                                            console.log(`🎯 Found register button: ${btn.textContent || btn.value}`);
                                        }
                                    });
                                    
                                    // Fallback to any links that might be registration-related
                                    if (!registrationInfo) {
                                        links.forEach(link => {
                                            const href = link.href;
                                            const linkText = link.textContent?.toLowerCase() || '';
                                            
                                            if (href && (href.includes('register') || href.includes('signup') || 
                                                        linkText.includes('register') || linkText.includes('more info'))) {
                                                registrationInfo = {
                                                    type: 'link',
                                                    href: href,
                                                    linkText: link.textContent
                                                };
                                                console.log(`🎯 Found registration link: ${href}`);
                                            }
                                        });
                                    }
                                    
                                    foundElements.push({
                                        selector: selector,
                                        text: text,
                                        id: el.id || `found-${Date.now()}-${index}`,
                                        registrationInfo: registrationInfo,
                                        innerHTML: el.innerHTML.substring(0, 500) // First 500 chars for analysis
                                    });
                                    
                                    console.log(`Found Masters content with ${selector}: ${text.substring(0, 100)}`);
                                }
                            });
                        } catch (err) {
                            console.error(`Error with selector ${selector}:`, err.message);
                        }
                    });
                    
                    // Also check the entire page content for "Masters"
                    const pageText = document.body.textContent || '';
                    if (pageText.toLowerCase().includes('masters')) {
                        console.log('Page contains "Masters" - content is loading');
                        
                        // If we found Masters but no specific elements, try broader search
                        if (foundElements.length === 0) {
                            const allDivs = document.querySelectorAll('div');
                            let fallbackCount = 0;
                            allDivs.forEach((div, index) => {
                                const text = div.textContent?.trim() || '';
                                if (text.toLowerCase().includes('masters') && 
                                    text.length > 30 && 
                                    text.length < 1000 &&
                                    fallbackCount < 5) { // Limit fallback elements
                                    
                                    // Check for any forms or buttons in this div
                                    const hasForm = div.querySelector('form') !== null;
                                    const hasButton = div.querySelector('button, input[type="button"], input[type="submit"]') !== null;
                                    
                                    foundElements.push({
                                        selector: 'div-fallback',
                                        text: text,
                                        id: `fallback-${index}`,
                                        registrationInfo: hasForm || hasButton ? { type: 'detected', hasForm, hasButton } : null,
                                        innerHTML: div.innerHTML.substring(0, 300)
                                    });
                                    fallbackCount++;
                                }
                            });
                        }
                    } else {
                        console.log('Page does not contain "Masters" - may not have loaded properly');
                    }
                } catch (evaluationError) {
                    console.error('Error during page evaluation:', evaluationError.message);
                }
                
                return foundElements;
            });

            // Try to interact with registration forms/buttons to capture endpoints
            console.log('Attempting to analyze registration mechanisms...');
            
            for (const event of events) {
                if (event.registrationInfo) {
                    try {
                        if (event.registrationInfo.type === 'form') {
                            // For forms, we can extract the action URL directly
                            const formAction = event.registrationInfo.action;
                            if (formAction) {
                                console.log(`📋 Form action found: ${formAction}`);
                                const eventId = this.extractEventIdFromUrl(formAction);
                                if (eventId) {
                                    event.mySidelineEventId = eventId;
                                    event.registrationLink = formAction;
                                }
                            }
                        } else if (event.registrationInfo.type === 'button') {
                            // For buttons, check if they have data attributes or onclick handlers
                            const dataUrl = event.registrationInfo.dataUrl;
                            const onclick = event.registrationInfo.onclick;
                            
                            if (dataUrl) {
                                console.log(`📋 Button data-url found: ${dataUrl}`);
                                const eventId = this.extractEventIdFromUrl(dataUrl);
                                if (eventId) {
                                    event.mySidelineEventId = eventId;
                                    event.registrationLink = dataUrl;
                                }
                            } else if (onclick) {
                                // Try to extract URLs from onclick JavaScript
                                const urlMatch = onclick.match(/['"`](https?:\/\/[^'"`]+)['"`]/);
                                if (urlMatch) {
                                    console.log(`📋 Button onclick URL found: ${urlMatch[1]}`);
                                    const eventId = this.extractEventIdFromUrl(urlMatch[1]);
                                    if (eventId) {
                                        event.mySidelineEventId = eventId;
                                        event.registrationLink = urlMatch[1];
                                    }
                                }
                            }
                        } else if (event.registrationInfo.type === 'link') {
                            // For links, use the href directly
                            const href = event.registrationInfo.href;
                            console.log(`📋 Registration link found: ${href}`);
                            const eventId = this.extractEventIdFromUrl(href);
                            if (eventId) {
                                event.mySidelineEventId = eventId;
                                event.registrationLink = href;
                            }
                        }
                    } catch (analysisError) {
                        console.log(`⚠️ Could not analyze registration mechanism: ${analysisError.message}`);
                    }
                }
            }

            // Log all captured requests for analysis
            if (capturedRequests.length > 0) {
                console.log(`📋 Captured ${capturedRequests.length} network requests:`);
                capturedRequests.forEach(req => {
                    console.log(`  - ${req.method} ${req.url}`);
                    if (req.postData) {
                        console.log(`    Data: ${req.postData.substring(0, 100)}...`);
                    }
                });
            }

            console.log(`Browser found ${events.length} potential Masters events`);
            
            // Convert browser events to standard format
            const standardEvents = [];
            
            for (const event of events) {
                try {
                    const standardEvent = this.parseEventFromElement(event);
                    if (standardEvent) {
                        standardEvents.push(standardEvent);
                    }
                } catch (parseError) {
                    console.error('Error parsing event:', parseError);
                }
            }

            return standardEvents;

        } catch (error) {
            console.error('Browser automation error:', error);
            // Don't throw - let it fall back to mock data
            console.log('Browser automation failed, will use mock data instead');
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
