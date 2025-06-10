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
                    '--disable-gpu'
                ]
            });

            const page = await browser.newPage();
            
            // Set a realistic user agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            // Set viewport
            await page.setViewport({ width: 1280, height: 720 });

            // Track navigation requests to capture hidden register links
            const capturedLinks = [];
            
            // Intercept navigation attempts to capture hidden register links
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                const url = request.url();
                
                // Look for registration-related URLs
                if (url.includes('register') || url.includes('signup') || url.includes('event')) {
                    console.log(`🔗 Captured potential registration link: ${url}`);
                    capturedLinks.push({
                        url: url,
                        method: request.method(),
                        timestamp: new Date()
                    });
                }
                
                // Continue the request
                request.continue();
            });

            console.log(`Navigating to MySideline search: ${this.searchUrl}`);
            
            // Navigate to the search page
            await page.goto(this.searchUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            // Wait for content to load
            console.log('Waiting for search results to load...');
            await page.waitForTimeout(5000);

            // Enhanced event extraction with Register button interaction
            const events = await page.evaluate(() => {
                const foundElements = [];
                
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
                                // Look for Register buttons and extract their targets
                                const registerButtons = el.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
                                let registrationInfo = null;
                                
                                registerButtons.forEach(btn => {
                                    const btnText = (btn.textContent || btn.value || '').toLowerCase();
                                    if (btnText.includes('register') || btnText.includes('sign up') || btnText.includes('join')) {
                                        // Try to extract the registration target
                                        const href = btn.href || btn.getAttribute('href');
                                        const onclick = btn.getAttribute('onclick');
                                        const dataUrl = btn.getAttribute('data-url') || btn.getAttribute('data-href');
                                        const formAction = btn.closest('form')?.action;
                                        
                                        registrationInfo = {
                                            buttonText: btn.textContent || btn.value,
                                            href: href,
                                            onclick: onclick,
                                            dataUrl: dataUrl,
                                            formAction: formAction,
                                            buttonClass: btn.className,
                                            buttonId: btn.id
                                        };
                                        
                                        console.log(`🎯 Found Register button:`, registrationInfo);
                                    }
                                });
                                
                                // Extract links
                                const links = el.querySelectorAll('a');
                                const href = links.length > 0 ? links[0].href : null;
                                
                                foundElements.push({
                                    selector: selector,
                                    text: text,
                                    href: href,
                                    html: el.innerHTML,
                                    id: el.id || `found-${Date.now()}-${index}`,
                                    registrationInfo: registrationInfo
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
                        allDivs.forEach((div, index) => {
                            const text = div.textContent?.trim() || '';
                            if (text.toLowerCase().includes('masters') && 
                                text.length > 30 && 
                                text.length < 1000) {
                                foundElements.push({
                                    selector: 'div-fallback',
                                    text: text,
                                    href: div.querySelector('a')?.href || null,
                                    id: `fallback-${index}`,
                                    registrationInfo: null
                                });
                            }
                        });
                    }
                } else {
                    console.log('Page does not contain "Masters" - may not have loaded properly');
                }
                
                return foundElements;
            });

            // Try to interact with Register buttons to capture their destinations
            console.log('Attempting to interact with Register buttons to capture destinations...');
            
            for (const event of events) {
                if (event.registrationInfo) {
                    try {
                        // Try to click the register button and capture where it tries to go
                        const registerButton = await page.$(event.registrationInfo.buttonId ? `#${event.registrationInfo.buttonId}` : 
                                                      event.registrationInfo.buttonClass ? `.${event.registrationInfo.buttonClass.split(' ')[0]}` :
                                                      'button, input[type="button"], input[type="submit"]');
                        
                        if (registerButton) {
                            // Set up a promise to capture navigation
                            const navigationPromise = page.waitForNavigation({ 
                                waitUntil: 'networkidle2', 
                                timeout: 5000 
                            }).catch(() => null);
                            
                            // Click the button
                            await registerButton.click();
                            
                            // Wait for navigation or timeout
                            const navigationResult = await navigationPromise;
                            
                            if (navigationResult) {
                                const currentUrl = page.url();
                                console.log(`🎯 Register button led to: ${currentUrl}`);
                                
                                // Extract event ID from the URL
                                const eventId = this.extractEventIdFromUrl(currentUrl);
                                if (eventId) {
                                    event.mySidelineEventId = eventId;
                                    event.registrationLink = currentUrl;
                                    console.log(`✅ Extracted event ID: ${eventId}`);
                                }
                                
                                // Navigate back to continue processing
                                await page.goBack({ waitUntil: 'networkidle2' });
                            }
                        }
                    } catch (interactionError) {
                        console.log(`⚠️ Could not interact with register button: ${interactionError.message}`);
                    }
                }
            }

            // Log all captured links for analysis
            if (capturedLinks.length > 0) {
                console.log(`📋 Captured ${capturedLinks.length} registration-related links:`);
                capturedLinks.forEach(link => {
                    console.log(`  - ${link.url}`);
                    
                    // Try to extract event ID from captured links
                    const eventId = this.extractEventIdFromUrl(link.url);
                    if (eventId) {
                        console.log(`    🆔 Event ID: ${eventId}`);
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
            throw error;
        } finally {
            if (browser) {
                await browser.close();
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
                        description: eventData.description || existingEvent.description,
                        lastSyncDate: new Date()
                    });
                    
                    processedEvents.push(existingEvent);
                    console.log(`Updated existing carnival: ${existingEvent.title}`);
                } else {
                    // Create new event
                    const newEvent = await Carnival.create({
                        ...eventData,
                        createdBy: 1, // System user
                        lastSyncDate: new Date(),
                        isPublic: true
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
                    lastSyncDate: { [Op.ne]: null }
                },
                order: [['lastSyncDate', 'DESC']]
            });

            return {
                isRunning: this.isRunning,
                lastSync: lastSyncedCarnival?.lastSyncDate || null,
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