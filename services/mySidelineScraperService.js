const { chromium } = require('playwright');
const MySidelineDataService = require('./mySidelineDataService');
const MySidelineEventParserService = require('./mySidelineEventParserService');
const { Page } = require('puppeteer');

/**
 * MySideline Web Scraper Service
 * Handles all web scraping functionality for MySideline events
 */
class MySidelineScraperService {
    constructor() {
        this.timeout = parseInt(process.env.MYSIDELINE_REQUEST_TIMEOUT) || 60000;
        this.retryCount = parseInt(process.env.MYSIDELINE_RETRY_ATTEMPTS) || 3;
        this.requestDelay = 2000;
        this.searchUrl = process.env.MYSIDELINE_URL;
        this.eventUrl = process.env.MYSIDELINE_EVENT_URL;
        this.useHeadlessBrowser = process.env.NODE_ENV !== 'development';
        this.enableScraping = process.env.MYSIDELINE_ENABLE_SCRAPING !== 'false';
        this.useMockData = process.env.MYSIDELINE_USE_MOCK === 'true';
        
        // Initialize the parser service
        this.parserService = new MySidelineEventParserService();
        this.dataService = new MySidelineDataService();
    }

    /**
     * Main method to scrape MySideline events
     * @returns {Promise<Array>} Array of scraped event objects
     */
    async scrapeEvents() {
        try {
            // Check if we should use mock data instead of scraping
            if (this.useMockData) {
                console.log('Using mock MySideline data (development mode)...');
                return this.generateMockEvents();
            }

            // Check if scraping is disabled
            if (!this.enableScraping) {
                console.log('MySideline scraping is disabled via configuration');
                return [];
            }

            console.log('Scraping MySideline Masters events from search page...');
            
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
            return [];
        }
    }

    /**
     * Fetch events using the browser automation
     * @returns {Promise<Array>} Array of fetched event objects
     */
    async fetchEventsWithBrowser() {
        let browser = null;
        let context = null;

        try {
            // Launch browser
            browser = await chromium.launch({
                headless: this.useHeadlessBrowser,
                timeout: this.timeout
            });
            
            context = await browser.newContext();
            const page = await context.newPage();
            
            // Set a longer timeout for navigation and actions
            page.setDefaultTimeout(this.timeout);
            page.setDefaultNavigationTimeout(this.timeout);
            
            console.log(`Navigating to MySideline search URL: ${this.searchUrl}`);
            await page.goto(this.searchUrl, { waitUntil: 'domcontentloaded' });
            console.log('Page loaded, waiting for content...');
            
            // Wait for the essential page structure and content
            await this.waitForMySidelineContent(page);
            
            // Extract events from the page
            const events = await this.extractEvents(page);
            return events;
                
        } catch (error) {
            console.error('Error during browser fetching:', error.message);
            return [];
        } finally {
            try {
                if (context) {
                    await context.close();
                }
                if (browser) {
                    await browser.close();
                }
            } catch (closeError) {
                console.log('Error closing browser resources:', closeError.message);
            }
        }
    }

    /**
     * Wait for MySideline-specific content to load (replaces all other wait methods)
     * @param {Page} page - Playwright page object
     */
    async waitForMySidelineContent(page) {
        console.log('Waiting for MySideline content to load...');
        
        try {
            // Step 1: Wait for basic page structure
            await page.waitForSelector('body', { timeout: 30000 });
            
            // Step 2: Wait for MySideline-specific elements
            await page.waitForSelector('.el-card.is-always-shadow, [id^="clubsearch_"]', { 
                timeout: 45000 
            });
            
            // Step 3: Wait for meaningful content with Masters events
            await page.waitForFunction(() => {
                const cards = document.querySelectorAll('.el-card.is-always-shadow, [id^="clubsearch_"]');
                let mastersContent = 0;

                for (let card of cards) {
                    const text = card.textContent?.toLowerCase() || '';
                    if (text.includes('masters') || 
                        text.includes('rugby') || 
                        text.includes('league') ||
                        text.includes('tournament') ||
                        text.includes('carnival')) {
                        mastersContent++;
                    }
                }

                return mastersContent >= 2; // At least 2 relevant cards
            }, { timeout: 60000 });

            // Step 4: Final stabilization wait
            await page.waitForTimeout(5000);
            
            console.log('✅ MySideline content loaded and ready for extraction');
            
        } catch (error) {
            console.log(`⚠️ MySideline content wait failed: ${error.message}`);
        }
    }
    
    /**
     * Extract events from the page using sequential processing
     * @param {Page} page - Playwright page object
     * @returns {Promise<Array>} Array of extracted events
     */
    async extractEvents(page) {
        console.log('Extracting events from MySideline page using sequential processing...');
        
        try {
            const pageInfo = await page.evaluate(() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    bodyTextLength: document.body ? document.body.textContent.length : 0,
                    elementCount: document.querySelectorAll('*').length,
                    cardCount: document.querySelectorAll('.el-card, [id^="clubsearch_"]').length,
                    clickExpandCount: document.querySelectorAll('.click-expand').length
                };
            });
            
            console.log('MySideline page info:', pageInfo);

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

            // Locate all the card elements on the page once.
            // This returns a single Locator object that points to all matching cards.
            const cardLocator = page.locator('.el-card.is-always-shadow, [id^="clubsearch_"]');

            // Get the number of cards found.
            const cardCount = await cardLocator.count();
            console.log(`Found ${cardCount} MySideline cards to process sequentially`);

            const extractedEvents = [];

            // Process each card sequentially: expand -> extract -> move to next
            for (let cardIndex = 0; cardIndex < cardCount; cardIndex++) {
                try {
                    console.log(`\n--- Processing card ${cardIndex + 1}/${cardCount} ---`);
                    
                    // Get the card elements as an array for sequential processing
                    const currentCard = cardLocator.nth(cardIndex);

                    // This scopes the search within the card, making it robust.
                    const clickExpandElement = currentCard.locator('.click-expand');

                    // Click the element.
                    // Playwright's auto-waiting will ensure the element is ready before clicking.
                    await clickExpandElement.click();
             
                    // Extract data from this specific card
                    const cardData = await this.extractSingleCardData(currentCard, cardIndex);

                    // If the card data is null, skip this card
                    if (!cardData) {
                        console.log(`Skipping card ${cardIndex + 1} due to missing data`);
                        continue;
                    }

                    // Add the extracted data to the results array
                    extractedEvents.push(cardData);
                                        
                    // Small delay between cards to avoid overwhelming the page
                    if (cardIndex < cardElements.length - 1) {
                        await this.delay(1000);
                    }

                    // Collapse the card after processing
                    await clickExpandElement.click();                    
                } catch (cardError) {
                    console.log(`Error processing card ${cardIndex + 1}: ${cardError.message}`);
                }
            }

            console.log(`\n🎯 Sequential processing completed: ${extractedEvents.length} events extracted from ${cardElements.length} cards`);
            return extractedEvents;
            
        } catch (error) {
            console.error('MySideline Playwright event extraction failed:', error.message);
            return [];
        }
    }

    /**
     * Extracts structured data from a single card locator using Playwright's API.
     * This is an async function and should be awaited.
     * @param {import('playwright').Locator} currentCard - The Playwright locator for the specific card element.
     * @param {number} cardIndex - The index of the card, used for logging purposes.
     * @param {boolean} wasExpanded - A boolean indicating if the card was expanded to get all data.
     * @returns {Promise<object|null>} A promise that resolves to an object with the extracted card data, or null if extraction fails or the card is skipped.
     */
    async extractSingleCardData(currentCard, cardIndex) {
        try {
            console.log(`Extracting data from card ${cardIndex + 1}...`);

            // --- Data Extraction using Playwright Locators ---

            // Extract carnival logo/image.
            // We find the locator first, then check if it exists before getting attributes.
            const logoLocator = currentCard.locator('.image__wrapper img');
            let carnivalIcon = '';
            if (await logoLocator.count() > 0) {
                // Prefer data-url, then src, then an empty string.
                carnivalIcon = (await logoLocator.getAttribute('data-url')) || (await logoLocator.getAttribute('src')) || '';
            }

            // Extract title and category.
            const titleLocator = currentCard.locator('h3.title');
            const fullTitle = await titleLocator.count() > 0 ? (await titleLocator.textContent()).trim() : null;

            const subtitleLocator = currentCard.locator('h4.subtitle, h4#subtitle');
            const subtitle = await subtitleLocator.count() > 0 ? (await subtitleLocator.textContent()).trim() : null;

            // Extract venue address from Google Maps link.
            const addressLinkLocator = currentCard.locator('a[href*="maps.google.com"]');
            let locationAddress = '';
            let locationAddressPart1 = '';
            let locationAddressPart2 = '';
            let locationAddressPart3 = '';
            let locationAddressPart4 = '';
            let googleMapsUrl = '';
            if (await addressLinkLocator.count() > 0) {
                googleMapsUrl = await addressLinkLocator.getAttribute('href');
                // Get all text from child <p> elements and join them.
                const addressParts = await addressLinkLocator.locator('p.m-0').allTextContents();
                // Join the address parts, ensuring to trim and filter out empty strings.
                if (addressParts.length > 0) {
                    locationAddress = addressParts.map(p => p.trim()).filter(Boolean).join(', ');
                    for (let i = 0; i < addressParts.length; i++) {
                        if (!addressParts[i] || addressParts[i] === '') continue; // Skip empty parts

                        switch (i) {
                            case 0:
                                locationAddressPart1 = addressParts[i].trim();
                                break;
                            case 1:
                                locationAddressPart2 = addressParts[i].trim();
                                break;
                            case 2:
                                locationAddressPart3 = addressParts[i].trim();
                                break;
                            case 3:
                                locationAddressPart4 = addressParts[i].trim();
                                break;
                            default:
                                console.warn(`Unexpected address part index ${i}: ${addressParts[i]}`);
                                break;
                        }
                    }
                }
            }
            
            // Extract event description.
            // We get all potential description paragraphs and find the first suitable one.
            // const descriptionParagraphs = await currentCard.locator('p[data-v-06457438]').all();
            const descriptionParagraphs = await currentCard.locator('p:not(a > p)').all();
            let scheduleDetails = '';
            for (const pLocator of descriptionParagraphs) {
                const text = (await pLocator.textContent()).trim();
                // Skip paragraphs that are empty, short, or contain contact info.
                if (text && !text.includes('Club Contact') && text.length > 20) {
                    scheduleDetails = text;
                    break; // Stop after finding the first valid description.
                }
            }

            // Extract contact information.
            // We find the specific paragraph that contains the "Club Contact" text.
            const contactParagraphLocator = currentCard.locator('p:has-text("Club Contact")');
            let contactName = '';
            let contactPhone = '';
            let contactEmail = '';
            let socialMediaFacebook = ''
            let socialMediaWebsite = '';
            if (await contactParagraphLocator.count() > 0) {
                const contactText = await contactParagraphLocator.textContent();

                // Extract name using regex on the paragraph's text.
                const nameMatch = contactText.match(/Name:\s*([^]*?)(?:\s*Number:|$)/);
                if (nameMatch && nameMatch[1]) contactName = nameMatch[1].trim();

                // Extract phone from the nested tel: link.
                const phoneLocator = contactParagraphLocator.locator('a[href^="tel:"]');
                if (await phoneLocator.count() > 0) contactPhone = (await phoneLocator.textContent()).trim();

                // Extract email from the nested mailto: link.
                const emailLocator = contactParagraphLocator.locator('a[href^="mailto:"]');
                if (await emailLocator.count() > 0) contactEmail = (await emailLocator.textContent()).trim();

                // Extract Facebook from the contact paragraph if it exists.
                const facebookLocator = contactParagraphLocator.locator('a[href^="https://facebook.com/"], a[href^="https://www.facebook.com/"]');
                if (await facebookLocator.count() > 0) socialMediaFacebook = (await facebookLocator.getAttribute('href')).trim();

                // Extract other URLs from the contact paragraph.
                const websiteLocator = contactParagraphLocator.locator('a[href^="http"]:not([href*="facebook.com"])');
                if (await websiteLocator.count() > 0) socialMediaWebsite = (await websiteLocator.getAttribute('href')).trim();
            }

            // Extract event type.
            let eventType = '';
            const typeItems = await currentCard.locator('.item').all();
            for (const itemLocator of typeItems) {
                const labelLocator = itemLocator.locator('.list-item');
                const labelText = await labelLocator.count() > 0 ? (await labelLocator.textContent()).trim() : '';
                if (labelText === 'Type') {
                    const valueLocator = itemLocator.locator('.right');
                    eventType = await valueLocator.count() > 0 ? (await valueLocator.textContent()).trim() : '';
                    break; // Stop after finding the type.
                }
            }

            // Check if registration button exists.
            const registerButtonLocator = currentCard.locator('button#cardButton, button.el-button--primary');
            const hasRegistration = await registerButtonLocator.count() > 0;
            
            // --- Post-Processing ---

            const cardData = {
                clubLogoUrl: carnivalIcon, fullTitle, subtitle, locationAddress, locationAddressPart1, locationAddressPart2, 
                locationAddressPart3, locationAddressPart4, googleMapsUrl, scheduleDetails: scheduleDetails, contactName, 
                contactPhone, contactEmail, eventType, hasRegistration, socialMediaFacebook, socialMediaWebsite
            };
            
            if (cardData.eventType === 'Touch') {
                console.log(`⏭️  Skipping Touch event: ${cardData.fullTitle}`);
                return null;
            }

            if (!cardData.fullTitle) {
                console.log('⚠️  No title found, skipping event');
                return null;
            }

            const { cleanTitle: carnivalName, extractedDate: eventDate } = this.parserService.extractAndStripDateFromTitle(cardData.fullTitle);
            if (!carnivalName) {
                // If no title was extracted, use the full title.
                carnivalName = cardData.fullTitle || 'Unknown Carnival';                
            }

            const state = this.extractStateFromAddress(cardData.locationAddress);

            const processedCardData = {
                clubLogoUrl: cardData.clubLogoUrl,
                date: eventDate,
                googleMapsUrl: cardData.googleMapsUrl,
                isActive: cardData.hasRegistration,
                isMySidelineCard: true,
                locationAddress: cardData.locationAddress,
                locationAddressPart1: cardData.locationAddressPart1,
                locationAddressPart2: cardData.locationAddressPart2,
                locationAddressPart3: cardData.locationAddressPart3,
                locationAddressPart4: cardData.locationAddressPart4,
                mySidelineTitle: cardData.fullTitle,
                organiserContactEmail: cardData.contactEmail,
                organiserContactName: cardData.contactName,
                organiserContactPhone: cardData.contactPhone,
                registrationLink: `${this.eventUrl}${encodeURIComponent(carnivalName)}`,
                scheduleDetails: [cardData.subtitle, cardData.scheduleDetails].filter(Boolean).join('\n'),
                scrapedAt: new Date(),
                socialMediaFacebook: cardData.socialMediaFacebook,
                socialMediaWebsite: cardData.socialMediaWebsite,
                source: 'MySideline',
                state: state,
                title: carnivalName,
            };

            console.log(`✅ Extracted data from card ${cardIndex + 1}: ${carnivalName} (${eventDate}) ${cardData.clubLogoUrl ? '[ICON]' : '[NO-ICON]'}`);
            return processedCardData;

        } catch (error) {
            console.error(`❌ Error extracting data from card ${cardIndex + 1}:`, error.message);
            // Log the state of the card's HTML for debugging if an error occurs.
            console.error("Card HTML on error:", await currentCard.innerHTML());
            return null;
        }
    }

    /**
     * Extracts an Australian state or territory from a given address string.
     * It checks against a comprehensive list of names and abbreviations.
     * @param {string} addressString - The address string to parse.
     * @returns {string|null} The acronym of the state/territory (e.g., "NSW"), or null if no match is found.
     */
    extractStateFromAddress(addressString) {
        if (!addressString || typeof addressString !== 'string') {
            return null;
        }

        // A list of states and territories with their names and abbreviations.
        const states = [
            { name: 'NSW', abbreviations: ['NSW', 'N.S.W.','New South Wales'] },
            { name: 'VIC', abbreviations: ['VIC', 'Vic.','Victoria'] },
            { name: 'QLD', abbreviations: ['QLD', 'Qld.','Queensland'] },
            { name: 'WA', abbreviations: ['WA', 'W.A.','Western Australia'] },
            { name: 'SA', abbreviations: ['SA', 'S.A.','South Australia'] },
            { name: 'TAS', abbreviations: ['TAS', 'Tas.','Tasmania'] },
            { name: 'ACT', abbreviations: ['ACT', 'A.C.T.','Australian Capital Territory'] },
            { name: 'NT', abbreviations: ['NT', 'N.T.','Northern Territory'] }
        ];

        const lowerCaseAddress = addressString.toLowerCase();

        for (const state of states) {
            // Create a regex pattern to match the full name or any abbreviation as a whole word.
            // Example for NSW: /\b(new south wales|nsw|n\.s\.w\.)\b/i
            const patterns = [state.name.toLowerCase(), ...state.abbreviations.map(abbr => abbr.toLowerCase().replace(/\./g, '\\.'))];
            const regex = new RegExp(`\\b(${patterns.join('|')})\\b`, 'i');

            if (regex.test(lowerCaseAddress)) {
                return state.name; // Return the full, properly cased name.
            }
        }

        return null; // Return null if no state is found.
    }

    /**
     * Safely extract text content from a locator
     * @param {import('playwright').Locator} locator - Playwright locator
     * @param {string} defaultValue - Default value if extraction fails
     * @returns {Promise<string>} Extracted text or default
     */
    async safeTextContent(locator, defaultValue = '') {
        try {
            const count = await locator.count();
            if (count > 0) {
                const text = await locator.textContent();
                return text?.trim() || defaultValue;
            }
            return defaultValue;
        } catch (error) {
            console.warn('Safe text extraction failed:', error.message);
            return defaultValue;
        }
    }
    
    /**
     * Generate mock events for development/testing
     * @returns {Array} Array of mock events
     */
    generateMockEvents() {
        const states = ['NSW', 'QLD', 'VIC'];
        const mockEvents = [];
        
        states.forEach(state => {
            const currentYear = new Date().getFullYear();
            const eventTemplates = [
                {
                    title: `${state} Masters Rugby League Carnival`,
                    locationSuffix: state === 'NSW' ? 'Sydney' : state === 'QLD' ? 'Brisbane' : 'Melbourne',
                    monthOffset: 2
                },
                {
                    title: `${state} Over 35s Championship`,
                    locationSuffix: state === 'NSW' ? 'Newcastle' : state === 'QLD' ? 'Gold Coast' : 'Geelong',
                    monthOffset: 4
                }
            ];

            eventTemplates.forEach((template, index) => {
                const eventDate = new Date();
                eventDate.setMonth(eventDate.getMonth() + template.monthOffset);
                eventDate.setDate(15);

                mockEvents.push({
                    title: template.title,
                    date: eventDate,
                    locationAddress: `${template.locationSuffix} Sports Complex, ${state}`,
                    state: state,
                    registrationLink: `https://profile.mysideline.com.au/register/mock-${state.toLowerCase()}-${index + 1}`,
                    isManuallyEntered: false,
                    maxTeams: 16,
                    feesDescription: `$${300 + (index * 50)} per team (Early bird discount available)`,
                    registrationDeadline: new Date(eventDate.getTime() - (14 * 24 * 60 * 60 * 1000)),
                    scheduleDetails: `Day-long tournament starting at ${8 + index}:00 AM. Multiple age divisions available.`,
                    isRegistrationOpen: true,
                    isActive: true,
                    organiserContactName: `${state} Rugby League Masters`,
                    organiserContactEmail: `masters@${state.toLowerCase()}rl.com.au`,
                    organiserContactPhone: `0${index + 2} ${Math.floor(Math.random() * 9000) + 1000} ${Math.floor(Math.random() * 9000) + 1000}`,
                    sourceData: {
                        isMockData: true,
                        generatedAt: new Date(),
                        state: state,
                        templateIndex: index
                    }
                });
            });
        });

        return mockEvents;
    }

    /**
     * Check if card data represents a relevant Masters event
     * @param {Object} cardData - The extracted card data
     * @returns {boolean} True if relevant
     */
    isRelevantMastersEvent(cardData) {
        if (!cardData || !cardData.title || cardData.title.length < 5) {
            return false;
        }
        
        const socialMediaWebsite = cardData.socialMediaWebsite?.toLowerCase() || '';
        const email = cardData.contactEmail?.toLowerCase() || '';
        const socialMediaFacebook = cardData.socialMediaFacebook?.toLowerCase() || '';
        const title = cardData.title.toLowerCase();
        const subtitle = (cardData.subtitle || '').toLowerCase();
        
        // Filter out Touch events at the scraping stage
        const containsTouch = socialMediaWebsite.includes('touch') || email.includes('touch') || socialMediaFacebook.includes('touch') || title.includes('touch') || subtitle.includes('touch');
        if (containsTouch) {
            console.log(`❌ Filtering out Touch event: ${cardData.title}`);
            return false;
        }
        
        return true;
    }

    /**
     * Expand all click-expand elements on the page (fallback method)
     * @param {Page} page - Playwright page object
     * @returns {Promise<boolean>} True if any elements were expanded
     */
    async expandAllClickExpandElements(page) {
        try {
            console.log('Expanding all click-expand elements...');
            
            const clickExpandElements = await page.locator('.click-expand').all();
            
            if (clickExpandElements.length === 0) {
                console.log('No click-expand elements found on the page');
                return false;
            }
            
            console.log(`Found ${clickExpandElements.length} click-expand elements to expand`);
            
            let expandedCount = 0;
            for (let i = 0; i < clickExpandElements.length; i++) {
                try {
                    const element = clickExpandElements[i];
                    
                    const isVisible = await element.isVisible();
                    if (!isVisible) {
                        console.log(`Click-expand element ${i + 1} is not visible, skipping`);
                        continue;
                    }
                    
                    console.log(`Expanding element ${i + 1}...`);
                    
                    await element.scrollIntoViewIfNeeded();
                    await this.delay(500);
                    await element.click();
                    await this.delay(1000);
                    
                    expandedCount++;
                    console.log(`✅ Expanded element ${i + 1}`);
                    
                } catch (clickError) {
                    console.log(`Failed to expand element ${i + 1}: ${clickError.message}`);
                }
            }
            
            if (expandedCount > 0) {
                console.log(`🔄 Waiting for all expanded content to load...`);
                await this.delay(3000);
            }
            
            console.log(`📊 Successfully expanded ${expandedCount}/${clickExpandElements.length} elements`);
            return expandedCount > 0;
            
        } catch (error) {
            console.log(`Error expanding click-expand elements: ${error.message}`);
            return false;
        }
    }

    /**
     * Delay for a specified amount of time
     * @param {number} ms - Delay time in milliseconds
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = MySidelineScraperService;