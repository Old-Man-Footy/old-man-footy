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
            for (const browserEvent of events) {
                try {
                    const standardEvent = this.convertBrowserEventToStandardFormat(browserEvent, capturedLinks);
                    if (standardEvent) {
                        standardEvents.push(standardEvent);
                    }
                } catch (error) {
                    console.error('Error converting browser event:', error);
                }
            }

            return standardEvents;

        } catch (error) {
            console.error('Browser automation failed:', error);
            throw error;
        } finally {
            if (browser) {
                try {
                    await browser.close();
                } catch (closeError) {
                    console.error('Error closing browser:', closeError);
                }
            }
        }
    }

    /**
     * Capture hidden registration links from Register buttons
     * This method clicks on Register buttons to reveal their actual destination URLs
     */
    async captureRegistrationLinks(page) {
        try {
            console.log('🔍 Searching for Register buttons and capturing their links...');
            
            // Wait for any potential dynamic content to load
            await page.waitForTimeout(2000);
            
            // Find all Register buttons or links
            const registerButtons = await page.$$eval('a, button, input[type="submit"], input[type="button"]', (elements) => {
                return elements
                    .map((el, index) => {
                        const text = el.textContent?.trim().toLowerCase() || '';
                        const value = el.value?.trim().toLowerCase() || '';
                        const type = el.type || '';
                        
                        // Look for Register-related text
                        if (text.includes('register') || value.includes('register') || 
                            text.includes('sign up') || text.includes('signup') ||
                            text.includes('enter') || text.includes('join')) {
                            
                            return {
                                index,
                                tagName: el.tagName,
                                text: el.textContent?.trim() || el.value?.trim() || '',
                                href: el.href || null,
                                onclick: el.onclick ? el.onclick.toString() : null,
                                formAction: el.form ? el.form.action : null,
                                className: el.className,
                                id: el.id,
                                dataset: Object.keys(el.dataset).length > 0 ? el.dataset : null
                            };
                        }
                        return null;
                    })
                    .filter(Boolean);
            });

            console.log(`Found ${registerButtons.length} potential registration buttons`);
            
            const capturedLinks = [];
            
            for (const button of registerButtons) {
                try {
                    console.log(`📋 Processing button: "${button.text}" (${button.tagName})`);
                    
                    // Extract event context (look for nearby event info)
                    const eventContext = await page.evaluate((buttonIndex) => {
                        const elements = document.querySelectorAll('a, button, input[type="submit"], input[type="button"]');
                        const buttonEl = elements[buttonIndex];
                        
                        if (!buttonEl) return null;
                        
                        // Find the closest event container
                        let container = buttonEl.closest('.event-item, .event-card, .event-row, tr, .search-result, .listing-item');
                        if (!container) {
                            // Fallback: look for parent containers
                            container = buttonEl.closest('div[class*="event"], div[class*="result"], div[class*="item"]');
                        }
                        
                        if (!container) {
                            container = buttonEl.parentElement;
                        }
                        
                        // Extract event information from the container
                        const eventTitle = container.querySelector('h1, h2, h3, h4, .title, .event-title, .name')?.textContent?.trim();
                        const eventDate = container.querySelector('.date, .event-date, [class*="date"]')?.textContent?.trim();
                        const eventLocation = container.querySelector('.location, .venue, [class*="location"]')?.textContent?.trim();
                        
                        return {
                            title: eventTitle,
                            date: eventDate,
                            location: eventLocation,
                            containerHTML: container.outerHTML.substring(0, 500) // Truncated for logging
                        };
                    }, button.index);
                    
                    // If button has a direct href, capture it
                    if (button.href && button.href !== 'javascript:void(0)' && button.href !== '#') {
                        capturedLinks.push({
                            eventTitle: eventContext?.title,
                            eventDate: eventContext?.date,
                            eventLocation: eventContext?.location,
                            registrationLink: button.href,
                            buttonText: button.text,
                            captureMethod: 'direct_href'
                        });
                        continue;
                    }
                    
                    // For JavaScript-driven buttons, we need to simulate a click
                    // and capture the navigation or form submission
                    if (button.onclick || button.tagName === 'BUTTON' || button.tagName === 'INPUT') {
                        const navigationPromise = page.waitForNavigation({ 
                            waitUntil: 'networkidle0', 
                            timeout: 5000 
                        }).catch(() => null);
                        
                        // Click the button
                        await page.evaluate((buttonIndex) => {
                            const elements = document.querySelectorAll('a, button, input[type="submit"], input[type="button"]');
                            const buttonEl = elements[buttonIndex];
                            if (buttonEl) {
                                buttonEl.click();
                            }
                        }, button.index);
                        
                        // Wait for potential navigation
                        const response = await navigationPromise;
                        
                        if (response) {
                            const newUrl = page.url();
                            capturedLinks.push({
                                eventTitle: eventContext?.title,
                                eventDate: eventContext?.date,
                                eventLocation: eventContext?.location,
                                registrationLink: newUrl,
                                buttonText: button.text,
                                captureMethod: 'click_navigation'
                            });
                            
                            // Go back to the search results
                            await page.goBack();
                            await page.waitForTimeout(1000);
                        } else {
                            // Check for form submission or popup
                            const currentUrl = page.url();
                            if (currentUrl !== page.url()) {
                                capturedLinks.push({
                                    eventTitle: eventContext?.title,
                                    eventDate: eventContext?.date,
                                    eventLocation: eventContext?.location,
                                    registrationLink: currentUrl,
                                    buttonText: button.text,
                                    captureMethod: 'form_submission'
                                });
                            }
                        }
                    }
                } catch (buttonError) {
                    console.error(`Error processing button "${button.text}":`, buttonError.message);
                }
            }
            
            // Extract event IDs from captured links
            const eventsWithIds = capturedLinks.map(link => {
                const eventId = this.extractEventIdFromUrl(link.registrationLink);
                return {
                    ...link,
                    mySidelineEventId: eventId
                };
            }).filter(event => event.mySidelineEventId);
            
            console.log(`✅ Successfully captured ${eventsWithIds.length} registration links with event IDs`);
            return eventsWithIds;
            
        } catch (error) {
            console.error('Error capturing registration links:', error);
            return [];
        }
    }

    /**
     * Extract MySideline event ID from various URL formats
     */
    extractEventIdFromUrl(url) {
        if (!url) return null;
        
        // Common MySideline URL patterns for event IDs
        const patterns = [
            /\/register\/(\d+)/,                    // /register/12345
            /\/event\/(\d+)/,                       // /event/12345
            /eventid[=:](\d+)/i,                    // eventid=12345 or eventid:12345
            /event_id[=:](\d+)/i,                   // event_id=12345
            /id[=:](\d+)/i,                         // id=12345
            /\/(\d+)(?:\/|$)/,                      // /12345/ or /12345 at end
            /[?&]e(?:vent)?(?:_)?id[=:](\d+)/i,     // ?eid=12345, ?eventid=12345, etc.
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        // If no pattern matches, try to extract any number from the URL
        // that looks like it could be an event ID (4+ digits)
        const numberMatch = url.match(/(\d{4,})/);
        if (numberMatch) {
            return numberMatch[1];
        }
        
        return null;
    }

    /**
     * Enhanced scraping method that includes registration link capture
     */
    async scrapeEventsWithRegistrationLinks(searchUrl) {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });

        try {
            const page = await browser.newPage();
            
            // Set user agent to avoid bot detection
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            console.log(`🌐 Navigating to: ${searchUrl}`);
            await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 30000 });
            
            // First, scrape the basic event information
            const basicEvents = await this.scrapeSearchResults(page);
            
            // Then, capture the registration links
            const registrationLinks = await this.captureRegistrationLinks(page);
            
            // Merge the data
            const mergedEvents = basicEvents.map(event => {
                const matchingLink = registrationLinks.find(link => 
                    link.eventTitle && event.title && 
                    link.eventTitle.toLowerCase().includes(event.title.toLowerCase().substring(0, 20))
                );
                
                if (matchingLink) {
                    return {
                        ...event,
                        registrationLink: matchingLink.registrationLink,
                        mySidelineEventId: matchingLink.mySidelineEventId || event.mySidelineEventId
                    };
                }
                
                return event;
            });
            
            console.log(`📊 Scraped ${mergedEvents.length} events with ${registrationLinks.length} registration links captured`);
            return mergedEvents;
            
        } finally {
            await browser.close();
        }
    }