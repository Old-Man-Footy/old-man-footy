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

            console.log(`Navigating to MySideline search: ${this.searchUrl}`);
            
            // Navigate to the search page
            await page.goto(this.searchUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            // Wait for content to load
            console.log('Waiting for search results to load...');
            await page.waitForTimeout(5000);

            // Try to find search results or any content with "Masters"
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
                                // Extract links
                                const links = el.querySelectorAll('a');
                                const href = links.length > 0 ? links[0].href : null;
                                
                                foundElements.push({
                                    selector: selector,
                                    text: text,
                                    href: href,
                                    html: el.innerHTML,
                                    id: el.id || `found-${Date.now()}-${index}`
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
                                    id: `fallback-${index}`
                                });
                            }
                        });
                    }
                } else {
                    console.log('Page does not contain "Masters" - may not have loaded properly');
                }
                
                return foundElements;
            });

            console.log(`Browser found ${events.length} potential Masters events`);
            
            // Convert browser events to standard format
            const standardEvents = [];
            for (const browserEvent of events) {
                try {
                    const standardEvent = this.convertBrowserEventToStandardFormat(browserEvent);
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
     * Convert browser-found event to standard format
     */
    convertBrowserEventToStandardFormat(browserEvent) {
        try {
            const text = browserEvent.text || '';
            const href = browserEvent.href || '';
            
            // Extract event title (first substantial line)
            const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 3);
            const title = lines[0] || 'Masters Rugby League Event';
            
            // Try to extract date from text
            const date = this.extractDateFromText(text) || this.getDefaultFutureDate();
            
            // Try to extract location
            const location = this.extractLocationFromText(text) || 'Location TBD';
            
            // Determine state from location or default
            const state = this.extractStateFromText(text) || 'NSW';
            
            // Extract contact info
            const contact = this.extractContact(text);
            
            // Create standardized event object
            const event = {
                mySidelineEventId: browserEvent.id || `mysideline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: title,
                description: text.length > 200 ? text.substring(0, 200) + '...' : text,
                date: date,
                location: location,
                state: state,
                registrationLink: href && href.startsWith('http') ? href : null,
                contactInfo: {
                    name: 'Event Organiser',
                    email: contact && contact.includes('@') ? contact : null,
                    phone: contact && !contact.includes('@') ? contact : null
                },
                source: 'MySideline Browser',
                lastUpdated: new Date()
            };
            
            // Validate the event before returning
            if (this.isValidEvent(event)) {
                return event;
            } else {
                console.log(`⚠️ Invalid event filtered out: ${title}`);
                return null;
            }
            
        } catch (error) {
            console.error('Error converting browser event:', error);
            return null;
        }
    }

    /**
     * Extract date from text using various patterns
     */
    extractDateFromText(text) {
        if (!text) return null;
        
        const datePatterns = [
            // Australian date formats
            /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g,                    // DD/MM/YYYY
            /(\d{1,2})-(\d{1,2})-(\d{2,4})/g,                     // DD-MM-YYYY
            /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{2,4})/gi, // DD Month YYYY
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s+(\d{2,4})/gi, // Month DD, YYYY
            /(\d{2,4})-(\d{1,2})-(\d{1,2})/g,                     // YYYY-MM-DD
            // Relative dates
            /(next|this)\s+(week|month|year)/gi,
            /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi
        ];

        for (const pattern of datePatterns) {
            const matches = text.match(pattern);
            if (matches) {
                for (const match of matches) {
                    try {
                        const parsedDate = new Date(match);
                        if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() >= 2024) {
                            return parsedDate;
                        }
                    } catch (error) {
                        continue;
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * Extract location from text
     */
    extractLocationFromText(text) {
        if (!text) return null;
        
        // Look for location indicators
        const locationPatterns = [
            /(?:at|@|venue|location):\s*([^,\n]+)/gi,
            /(?:held\s+at|taking\s+place\s+at)\s+([^,\n]+)/gi,
            /(NSW|New South Wales|QLD|Queensland|VIC|Victoria|WA|Western Australia|SA|South Australia|TAS|Tasmania|NT|Northern Territory|ACT|Australian Capital Territory)/gi,
            /(Sydney|Melbourne|Brisbane|Perth|Adelaide|Hobart|Darwin|Canberra)/gi,
            /([A-Z][a-z]+\s+(Stadium|Park|Ground|Field|Centre|Complex|Oval))/g
        ];

        for (const pattern of locationPatterns) {
            const matches = text.match(pattern);
            if (matches && matches[0]) {
                return matches[0].replace(/^(at|@|venue|location|held\s+at|taking\s+place\s+at):\s*/gi, '').trim();
            }
        }
        
        return null;
    }

    /**
     * Extract state from text
     */
    extractStateFromText(text) {
        if (!text) return null;
        
        const stateMap = {
            'NSW': 'NSW', 'New South Wales': 'NSW',
            'QLD': 'QLD', 'Queensland': 'QLD',
            'VIC': 'VIC', 'Victoria': 'VIC',
            'WA': 'WA', 'Western Australia': 'WA',
            'SA': 'SA', 'South Australia': 'SA',
            'TAS': 'TAS', 'Tasmania': 'TAS',
            'NT': 'NT', 'Northern Territory': 'NT',
            'ACT': 'ACT', 'Australian Capital Territory': 'ACT'
        };

        const lowerText = text.toLowerCase();
        for (const [key, value] of Object.entries(stateMap)) {
            if (lowerText.includes(key.toLowerCase())) {
                return value;
            }
        }

        // Try city to state mapping
        const cityStateMap = {
            'sydney': 'NSW', 'melbourne': 'VIC', 'brisbane': 'QLD',
            'perth': 'WA', 'adelaide': 'SA', 'hobart': 'TAS',
            'darwin': 'NT', 'canberra': 'ACT'
        };

        for (const [city, state] of Object.entries(cityStateMap)) {
            if (lowerText.includes(city)) {
                return state;
            }
        }

        return null;
    }

    /**
     * Get a default future date (6 months from now)
     */
    getDefaultFutureDate() {
        const defaultDate = new Date();
        defaultDate.setMonth(defaultDate.getMonth() + 6);
        return defaultDate;
    }

    /**
     * Validate event and filter out non-Masters Rugby League events
     * @param {Object} event - Event object to validate
     * @returns {boolean} - True if valid Masters Rugby League event, false otherwise
     */
    isValidEvent(event) {
        if (!event || !event.title || event.title.length <= 3 || !event.date || !event.mySidelineId) {
            return false;
        }

        // Filter out Touch events - check for specific Touch indicators
        
        // 1. Check for "Touch" in email addresses
        const emailText = event.contactInfo?.email || '';
        if (emailText.toLowerCase().includes('touch')) {
            console.log(`⚠️ Filtering out Touch event (email contains 'touch'): ${event.title}`);
            return false;
        }
        
        // 2. Check for "Touch" in title/subtitle (CSS ID context)
        // Look for Touch in the main title or any subtitle-like content
        const titleText = (event.title || '').toLowerCase();
        if (titleText.includes('touch')) {
            console.log(`⚠️ Filtering out Touch event (title contains 'touch'): ${event.title}`);
            return false;
        }
        
        // 3. Check for standalone "Touch" in the raw HTML/text content
        // This looks for "Touch" as a complete word, not part of another word
        const fullText = (event.description || '') + ' ' + (event.source || '');
        const touchWordPattern = /\btouch\b/gi; // Word boundary ensures it's standalone
        
        if (touchWordPattern.test(fullText)) {
            console.log(`⚠️ Filtering out Touch event (contains standalone 'Touch'): ${event.title}`);
            return false;
        }

        return true;
    }

    // Process scraped events and update database
    async processScrapedEvents(scrapedEvents) {
        const processedEvents = [];

        for (const scrapedEvent of scrapedEvents) {
            try {
                const processedEvent = await this.processIndividualEvent(scrapedEvent);
                if (processedEvent) {
                    processedEvents.push(processedEvent);
                }
            } catch (error) {
                console.error(`Failed to process event ${scrapedEvent.mySidelineId}:`, error);
            }
        }

        return processedEvents;
    }

    /**
     * Process a single scraped MySideline event.
     * Handles both direct ID matches and fuzzy duplicate detection for manual carnivals.
     * @param {Object} scrapedEvent - The event data scraped from MySideline
     * @returns {Promise<Object>} - The updated or created carnival
     */
    async processIndividualEvent(scrapedEvent) {
        try {
            // 1. Check for direct MySideline ID match
            let existingCarnival = await Carnival.findOne({
                where: { mySidelineEventId: scrapedEvent.mySidelineId }
            });

            if (existingCarnival) {
                // Update existing event if data has changed
                return await this.updateExistingEvent(existingCarnival, scrapedEvent);
            }

            // 2. Fuzzy duplicate detection for manual carnivals (no mySidelineEventId)
            const fuzzyDuplicate = await this.detectPotentialDuplicate({
                title: scrapedEvent.title,
                date: scrapedEvent.date,
                locationAddress: scrapedEvent.location,
                state: scrapedEvent.state
            });

            if (fuzzyDuplicate && !fuzzyDuplicate.mySidelineEventId) {
                // Merge MySideline data into the manual event
                await fuzzyDuplicate.update({
                    mySidelineEventId: scrapedEvent.mySidelineId,
                    // Prefer MySideline data for schedule/registration if not present
                    scheduleDetails: fuzzyDuplicate.scheduleDetails || scrapedEvent.description,
                    registrationLink: fuzzyDuplicate.registrationLink || scrapedEvent.registrationLink,
                    organiserContactName: fuzzyDuplicate.organiserContactName || scrapedEvent.contactInfo?.name,
                    organiserContactEmail: fuzzyDuplicate.organiserContactEmail || scrapedEvent.contactInfo?.email,
                    organiserContactPhone: fuzzyDuplicate.organiserContactPhone || scrapedEvent.contactInfo?.phone,
                    lastMySidelineSync: new Date()
                });
                // Optionally, update other fields if you want to always prefer MySideline data
                // ...
                // Send notification if claimed
                if (fuzzyDuplicate.createdByUserId) {
                    try {
                        await emailService.sendCarnivalNotification(fuzzyDuplicate, 'merged');
                    } catch (emailError) {
                        console.error('Failed to send merge notification:', emailError);
                    }
                }
                return fuzzyDuplicate;
            }

            // 3. No duplicates found, create new event
            return await this.createNewEvent(scrapedEvent);
        } catch (error) {
            console.error(`Error processing event ${scrapedEvent.mySidelineId}:`, error);
            throw error;
        }
    }

    async updateExistingEvent(existingCarnival, scrapedEvent) {
        const hasChanges = 
            existingCarnival.title !== scrapedEvent.title ||
            existingCarnival.date.getTime() !== scrapedEvent.date.getTime() ||
            existingCarnival.locationAddress !== scrapedEvent.location;

        if (hasChanges) {
            await existingCarnival.update({
                title: scrapedEvent.title,
                date: scrapedEvent.date,
                locationAddress: scrapedEvent.location,
                scheduleDetails: scrapedEvent.description || 'Event details to be confirmed',
                registrationLink: scrapedEvent.registrationLink,
                organiserContactName: scrapedEvent.contactInfo?.name || 'Event Organiser',
                organiserContactEmail: scrapedEvent.contactInfo?.email || 'contact@example.com',
                organiserContactPhone: scrapedEvent.contactInfo?.phone || '0400000000',
                lastMySidelineSync: new Date()
            });

            // Send update notifications if event has an owner
            if (existingCarnival.createdByUserId) {
                try {
                    await emailService.sendCarnivalNotification(existingCarnival, 'updated');
                } catch (emailError) {
                    console.error('Failed to send update notification:', emailError);
                }
            }

            console.log(`Updated existing carnival: ${existingCarnival.title}`);
            return existingCarnival;
        }

        return null; // No changes
    }

    async createNewEvent(scrapedEvent) {
        const newCarnival = await Carnival.create({
            title: scrapedEvent.title,
            date: scrapedEvent.date,
            locationAddress: scrapedEvent.location,
            state: scrapedEvent.state,
            scheduleDetails: scrapedEvent.description || 'Event details to be confirmed',
            registrationLink: scrapedEvent.registrationLink,
            organiserContactName: scrapedEvent.contactInfo?.name || 'Event Organiser',
            organiserContactEmail: scrapedEvent.contactInfo?.email || 'contact@example.com',
            organiserContactPhone: scrapedEvent.contactInfo?.phone || '0400000000',
            mySidelineEventId: scrapedEvent.mySidelineId,
            isManuallyEntered: false,
            isActive: true,
            lastMySidelineSync: new Date()
        });

        // Send new carnival notifications
        try {
            await emailService.sendCarnivalNotification(newCarnival, 'new');
        } catch (emailError) {
            console.error('Failed to send new carnival notification:', emailError);
        }

        console.log(`Created new carnival from MySideline: ${newCarnival.title}`);
        return newCarnival;
    }

    /**
     * Detect potential duplicate carnivals based on title, date, and location
     * @param {Object} carnivalData - New carnival data to check
     * @returns {Promise<Object|null>} - Existing carnival if duplicate found, null otherwise
     */
    async detectPotentialDuplicate(carnivalData) {
        try {
            const { title, date, locationAddress, state } = carnivalData;
            
            // Look for exact matches first
            const exactMatch = await Carnival.findOne({
                where: {
                    title: title,
                    date: date,
                    state: state,
                    isActive: true
                }
            });

            if (exactMatch) {
                return exactMatch;
            }

            // Look for potential matches with similar criteria
            const dateObj = new Date(date);
            const dayBefore = new Date(dateObj);
            dayBefore.setDate(dateObj.getDate() - 1);
            const dayAfter = new Date(dateObj);
            dayAfter.setDate(dateObj.getDate() + 1);

            // SQLite-compatible case-insensitive search
            const potentialMatches = await Carnival.findAll({
                where: {
                    state: state,
                    date: {
                        [Op.between]: [dayBefore, dayAfter]
                    },
                    isActive: true,
                    [Op.or]: [
                        // Similar title (SQLite-compatible case-insensitive search)
                        { title: { [Op.like]: `%${title.split(' ')[0]}%` } },
                        // Similar location (SQLite-compatible case-insensitive search)
                        { locationAddress: { [Op.like]: `%${locationAddress}%` } }
                    ]
                }
            });

            // Calculate similarity scores
            for (const match of potentialMatches) {
                const titleSimilarity = this.calculateSimilarity(title.toLowerCase(), match.title.toLowerCase());
                const locationSimilarity = this.calculateSimilarity(
                    locationAddress.toLowerCase(), 
                    match.locationAddress.toLowerCase()
                );
                
                // If similarity is high enough, consider it a potential duplicate
                if (titleSimilarity > 0.7 || locationSimilarity > 0.8) {
                    return match;
                }
            }

            return null;
        } catch (error) {
            console.error('Error detecting potential duplicates:', error);
            return null;
        }
    }

    /**
     * Calculate string similarity using Levenshtein distance
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} - Similarity score between 0 and 1
     */
    calculateSimilarity(str1, str2) {
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;

        if (len1 === 0) return len2 === 0 ? 1 : 0;
        if (len2 === 0) return 0;

        // Create matrix
        for (let i = 0; i <= len2; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len1; j++) {
            matrix[0][j] = j;
        }

        // Fill matrix
        for (let i = 1; i <= len2; i++) {
            for (let j = 1; j <= len1; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        const distance = matrix[len2][len1];
        const maxLength = Math.max(len1, len2);
        return (maxLength - distance) / maxLength;
    }

    /**
     * Merge manual carnival data with existing MySideline event
     * @param {Object} existingCarnival - Existing carnival from MySideline
     * @param {Object} manualData - Manual carnival data from user
     * @param {number} userId - User ID creating the manual carnival
     * @returns {Promise<Object>} - Updated carnival with merged data
     */
    async mergeWithExistingEvent(existingCarnival, manualData, userId) {
        try {
            // Prioritize manual data over MySideline data for most fields
            const mergedData = {
                // User-provided data takes priority
                title: manualData.title || existingCarnival.title,
                date: manualData.date || existingCarnival.date,
                locationAddress: manualData.locationAddress || existingCarnival.locationAddress,
                organiserContactName: manualData.organiserContactName || existingCarnival.organiserContactName,
                organiserContactEmail: manualData.organiserContactEmail || existingCarnival.organiserContactEmail,
                organiserContactPhone: manualData.organiserContactPhone || existingCarnival.organiserContactPhone,
                scheduleDetails: manualData.scheduleDetails || existingCarnival.scheduleDetails,
                registrationLink: manualData.registrationLink || existingCarnival.registrationLink,
                feesDescription: manualData.feesDescription || existingCarnival.feesDescription,
                callForVolunteers: manualData.callForVolunteers || existingCarnival.callForVolunteers,
                state: manualData.state || existingCarnival.state,
                
                // File uploads from manual entry
                clubLogoURL: manualData.clubLogoURL || existingCarnival.clubLogoURL,
                promotionalImageURL: manualData.promotionalImageURL || existingCarnival.promotionalImageURL,
                additionalImages: manualData.additionalImages || existingCarnival.additionalImages,
                drawFiles: manualData.drawFiles || existingCarnival.drawFiles,
                drawFileURL: manualData.drawFileURL || existingCarnival.drawFileURL,
                drawFileName: manualData.drawFileName || existingCarnival.drawFileName,
                drawTitle: manualData.drawTitle || existingCarnival.drawTitle,
                drawDescription: manualData.drawDescription || existingCarnival.drawDescription,
                
                // Social media from manual entry
                socialMediaFacebook: manualData.socialMediaFacebook || existingCarnival.socialMediaFacebook,
                socialMediaInstagram: manualData.socialMediaInstagram || existingCarnival.socialMediaInstagram,
                socialMediaTwitter: manualData.socialMediaTwitter || existingCarnival.socialMediaTwitter,
                socialMediaWebsite: manualData.socialMediaWebsite || existingCarnival.socialMediaWebsite,
                
                // Ownership and management
                createdByUserId: userId,
                isManuallyEntered: true, // Now manually managed
                claimedAt: new Date(),
                lastMySidelineSync: existingCarnival.lastMySidelineSync || new Date()
            };

            await existingCarnival.update(mergedData);

            console.log(`Merged manual carnival data with MySideline event: ${existingCarnival.title}`);
            
            // Send notification about the merge
            try {
                await emailService.sendCarnivalNotification(existingCarnival, 'merged');
            } catch (emailError) {
                console.error('Failed to send merge notification:', emailError);
            }

            return existingCarnival;
        } catch (error) {
            console.error('Error merging carnival data:', error);
            throw error;
        }
    }

    /**
     * Check for duplicates and handle creation or merging
     * @param {Object} carnivalData - Carnival data to create
     * @param {number} userId - User ID creating the carnival
     * @returns {Promise<Object>} - Created or merged carnival
     */
    async createOrMergeEvent(carnivalData, userId) {
        try {
            // Check for potential duplicates
            const existingCarnival = await this.detectPotentialDuplicate(carnivalData);
            
            if (existingCarnival) {
                // Check if it's a MySideline event without an owner
                if (existingCarnival.mySidelineEventId && !existingCarnival.createdByUserId) {
                    // Merge with existing MySideline event
                    return await this.mergeWithExistingEvent(existingCarnival, carnivalData, userId);
                } else {
                    // Return information about the duplicate for user decision
                    throw new Error(`A similar carnival already exists: "${existingCarnival.title}" on ${new Date(existingCarnival.date).toLocaleDateString()}. Please check if this is a duplicate.`);
                }
            }

            // No duplicates found, create new carnival
            const newCarnival = await Carnival.create({
                ...carnivalData,
                createdByUserId: userId,
                isManuallyEntered: true
            });

            return newCarnival;
        } catch (error) {
            console.error('Error in createOrMergeEvent:', error);
            throw error;
        }
    }

    // Manual sync trigger for admin users
    async triggerManualSync() {
        if (this.isRunning) {
            return {
                success: false,
                message: 'Sync already in progress'
            };
        }

        return await this.syncMySidelineEvents();
    }

    // Get sync status
    getSyncStatus() {
        return {
            isRunning: this.isRunning,
            lastSyncDate: this.lastSyncDate,
            nextScheduledSync: this.getNextScheduledSync()
        };
    }

    getNextScheduledSync() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(3, 0, 0, 0);
        return tomorrow;
    }

    // Take ownership of MySideline event
    async takeOwnership(carnivalId, userId) {
        try {
            const carnival = await Carnival.findByPk(carnivalId);
            const user = await User.findByPk(userId, {
                include: [{
                    model: Club,
                    as: 'club'
                }]
            });

            if (!carnival || !user) {
                throw new Error('Carnival or user not found');
            }

            if (carnival.createdByUserId) {
                throw new Error('Carnival already has an owner');
            }

            if (!carnival.mySidelineEventId) {
                throw new Error('Not a MySideline imported event');
            }

            await carnival.update({
                createdByUserId: userId,
                isManuallyEntered: true // Now managed manually
            });

            console.log(`User ${user.email} took ownership of carnival: ${carnival.title}`);
            
            return {
                success: true,
                message: 'Ownership taken successfully',
                carnival: carnival
            };
        } catch (error) {
            console.error('Failed to take ownership:', error);
            throw error;
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

            console.log(`Navigating to MySideline search: ${this.searchUrl}`);
            
            // Navigate to the search page
            await page.goto(this.searchUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            // Wait for content to load
            console.log('Waiting for search results to load...');
            await page.waitForTimeout(5000);

            // Try to find search results or any content with "Masters"
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
                                // Extract links
                                const links = el.querySelectorAll('a');
                                const href = links.length > 0 ? links[0].href : null;
                                
                                foundElements.push({
                                    selector: selector,
                                    text: text,
                                    href: href,
                                    html: el.innerHTML,
                                    id: el.id || `found-${Date.now()}-${index}`
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
                                    id: `fallback-${index}`
                                });
                            }
                        });
                    }
                } else {
                    console.log('Page does not contain "Masters" - may not have loaded properly');
                }
                
                return foundElements;
            });

            console.log(`Browser found ${events.length} potential Masters events`);
            
            // Convert browser events to standard format
            const standardEvents = [];
            for (const browserEvent of events) {
                try {
                    const standardEvent = this.convertBrowserEventToStandardFormat(browserEvent);
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
     * Convert browser-found event to standard format
     */
    convertBrowserEventToStandardFormat(browserEvent) {
        try {
            const text = browserEvent.text || '';
            const href = browserEvent.href || '';
            
            // Extract event title (first substantial line)
            const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 3);
            const title = lines[0] || 'Masters Rugby League Event';
            
            // Try to extract date from text
            const date = this.extractDateFromText(text) || this.getDefaultFutureDate();
            
            // Try to extract location
            const location = this.extractLocationFromText(text) || 'Location TBD';
            
            // Determine state from location or default
            const state = this.extractStateFromText(text) || 'NSW';
            
            // Extract contact info
            const contact = this.extractContact(text);
            
            // Create standardized event object
            const event = {
                mySidelineEventId: browserEvent.id || `mysideline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: title,
                description: text.length > 200 ? text.substring(0, 200) + '...' : text,
                date: date,
                location: location,
                state: state,
                registrationLink: href && href.startsWith('http') ? href : null,
                contactInfo: {
                    name: 'Event Organiser',
                    email: contact && contact.includes('@') ? contact : null,
                    phone: contact && !contact.includes('@') ? contact : null
                },
                source: 'MySideline Browser',
                lastUpdated: new Date()
            };
            
            // Validate the event before returning
            if (this.isValidEvent(event)) {
                return event;
            } else {
                console.log(`⚠️ Invalid event filtered out: ${title}`);
                return null;
            }
            
        } catch (error) {
            console.error('Error converting browser event:', error);
            return null;
        }
    }

    /**
     * Extract date from text using various patterns
     */
    extractDateFromText(text) {
        if (!text) return null;
        
        const datePatterns = [
            // Australian date formats
            /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g,                    // DD/MM/YYYY
            /(\d{1,2})-(\d{1,2})-(\d{2,4})/g,                     // DD-MM-YYYY
            /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{2,4})/gi, // DD Month YYYY
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s+(\d{2,4})/gi, // Month DD, YYYY
            /(\d{2,4})-(\d{1,2})-(\d{1,2})/g,                     // YYYY-MM-DD
            // Relative dates
            /(next|this)\s+(week|month|year)/gi,
            /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi
        ];

        for (const pattern of datePatterns) {
            const matches = text.match(pattern);
            if (matches) {
                for (const match of matches) {
                    try {
                        const parsedDate = new Date(match);
                        if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() >= 2024) {
                            return parsedDate;
                        }
                    } catch (error) {
                        continue;
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * Extract location from text
     */
    extractLocationFromText(text) {
        if (!text) return null;
        
        // Look for location indicators
        const locationPatterns = [
            /(?:at|@|venue|location):\s*([^,\n]+)/gi,
            /(?:held\s+at|taking\s+place\s+at)\s+([^,\n]+)/gi,
            /(NSW|New South Wales|QLD|Queensland|VIC|Victoria|WA|Western Australia|SA|South Australia|TAS|Tasmania|NT|Northern Territory|ACT|Australian Capital Territory)/gi,
            /(Sydney|Melbourne|Brisbane|Perth|Adelaide|Hobart|Darwin|Canberra)/gi,
            /([A-Z][a-z]+\s+(Stadium|Park|Ground|Field|Centre|Complex|Oval))/g
        ];

        for (const pattern of locationPatterns) {
            const matches = text.match(pattern);
            if (matches && matches[0]) {
                return matches[0].replace(/^(at|@|venue|location|held\s+at|taking\s+place\s+at):\s*/gi, '').trim();
            }
        }
        
        return null;
    }

    /**
     * Extract state from text
     */
    extractStateFromText(text) {
        if (!text) return null;
        
        const stateMap = {
            'NSW': 'NSW', 'New South Wales': 'NSW',
            'QLD': 'QLD', 'Queensland': 'QLD',
            'VIC': 'VIC', 'Victoria': 'VIC',
            'WA': 'WA', 'Western Australia': 'WA',
            'SA': 'SA', 'South Australia': 'SA',
            'TAS': 'TAS', 'Tasmania': 'TAS',
            'NT': 'NT', 'Northern Territory': 'NT',
            'ACT': 'ACT', 'Australian Capital Territory': 'ACT'
        };

        const lowerText = text.toLowerCase();
        for (const [key, value] of Object.entries(stateMap)) {
            if (lowerText.includes(key.toLowerCase())) {
                return value;
            }
        }

        // Try city to state mapping
        const cityStateMap = {
            'sydney': 'NSW', 'melbourne': 'VIC', 'brisbane': 'QLD',
            'perth': 'WA', 'adelaide': 'SA', 'hobart': 'TAS',
            'darwin': 'NT', 'canberra': 'ACT'
        };

        for (const [city, state] of Object.entries(cityStateMap)) {
            if (lowerText.includes(city)) {
                return state;
            }
        }

        return null;
    }

    /**
     * Get a default future date (6 months from now)
     */
    getDefaultFutureDate() {
        const defaultDate = new Date();
        defaultDate.setMonth(defaultDate.getMonth() + 6);
        return defaultDate;
    }

    /**
     * Validate event data structure
     */
    static validateEventData(eventData) {
        if (!eventData || typeof eventData !== 'object') {
            return false;
        }

        // Check required fields
        const requiredFields = ['title', 'date'];
        for (const field of requiredFields) {
            if (!eventData[field] || eventData[field] === '') {
                return false;
            }
        }

        // Validate date
        if (!(eventData.date instanceof Date) && isNaN(new Date(eventData.date).getTime())) {
            return false;
        }

        return true;
    }

    /**
     * Handle scraping errors gracefully
     */
    static handleScrapingError(error, operation) {
        const result = {
            success: false,
            error: error.message,
            operation: operation
        };

        // Provide specific recommendations based on error type
        if (error.message.includes('timeout') || error.message.includes('Network timeout')) {
            result.fallbackRecommendation = [
                'Increase timeout duration',
                'Check network connectivity', 
                'Try during off-peak hours'
            ];
        } else if (error.message.includes('Network')) {
            result.fallbackRecommendation = [
                'Check internet connection',
                'Verify MySideline website is accessible',
                'Try again later'
            ];
        } else {
            result.fallbackRecommendation = [
                'Check service configuration',
                'Verify API endpoints',
                'Review error logs'
            ];
        }

        return result;
    }
}

module.exports = MySidelineIntegrationService;

// Also export the class for accessing static methods
module.exports.MySidelineIntegrationService = MySidelineIntegrationService;
module.exports.validateEventData = MySidelineIntegrationService.validateEventData;
module.exports.handleScrapingError = MySidelineIntegrationService.handleScrapingError;