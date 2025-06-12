const { chromium } = require('playwright');
const MySidelineDataService = require('./mySidelineDataService');
const MySidelineEventParserService = require('./mySidelineEventParserService');

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
            //TODO: Work out if we need all of these waits
            await this.waitForPageStructure(page);
            await this.waitForJavaScriptInitialization(page);
            await this.waitForDynamicContentLoading(page);
            await this.waitForSearchResults(page);
            await this.validatePageContent(page);
            await this.waitForContentStabilization(page);
            await this.waitForMeaningfulContent(page);
            
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
     * Wait for basic page structure to be established
     * @param {Page} page - Playwright page object
     */
    async waitForPageStructure(page) {
        console.log('Waiting for page structure...');
        
        try {
            await page.waitForSelector('body', { timeout: 30000 });
            console.log('Body element found');
            
            const headExists = await page.locator('head').count() > 0;
            if (headExists) {
                console.log('Head element confirmed');
            }
            
            await page.waitForFunction(() => {
                return document.querySelectorAll('*').length > 50;
            }, { timeout: 45000 });
            
            console.log('Page structure confirmed - found substantial DOM elements');
        } catch (error) {
            console.log(`Page structure waiting failed: ${error.message}`);
        }
    }

    /**
     * Wait for JavaScript frameworks to initialize
     * @param {Page} page - Playwright page object
     */
    async waitForJavaScriptInitialization(page) {
        console.log('Waiting for JavaScript initialization...');
        
        try {
            await page.waitForFunction(() => {
                const hasInteractiveElements = document.querySelectorAll('button, input, select, a').length > 5;
                const hasSubstantialContent = document.body.textContent.trim().length > 500;
                const scriptsLoaded = document.querySelectorAll('script').length > 0;
                
                return hasInteractiveElements && hasSubstantialContent && scriptsLoaded;
            }, { timeout: 60000 });
            
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
            await page.waitForFunction(() => {
                return document.title.includes('Club Finder') || 
                       document.title.includes('MySideline') ||
                       document.title.includes('Search');
            }, { timeout: 30000 });

            console.log('Page title confirmed, waiting for search content...');

            const mySidelineSelectors = [
                '.main.padding-lr-10-sm-and-up',
                '.el-card.is-always-shadow',
                '[id^="clubsearch_"]',
                '.el-card__body',
                '.click-expand',
                '.button-no-style',
                '.title',
                '.subtitle'
            ];
            
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

            await page.waitForTimeout(10000);

            await page.waitForFunction(() => {
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
                return mastersContent >= 3;
            }, { timeout: 45000 });

            await page.waitForTimeout(8000);
            console.log('MySideline search results waiting complete');

        } catch (error) {
            console.log(`MySideline search results waiting failed: ${error.message}`);
        }
    }

    /**
     * Validate that page content has meaningful MySideline data
     * @param {Page} page - Playwright page object
     * @returns {Promise<Object>} Validation results object
     */
    async validatePageContent(page) {
        console.log('Validating page content...');
        
        try {
            const validation = await page.evaluate(() => {
                const bodyText = document.body ? document.body.textContent : '';
                const hasTitle = document.title && document.title.length > 0;
                const hasMeaningfulContent = bodyText.length > 500;
                const hasNavigationElements = document.querySelectorAll('nav, .nav, .navigation, header, .header').length > 0;
                const hasCards = document.querySelectorAll('.el-card, [id^="clubsearch_"], .card, .search-result').length > 0;
                
                return {
                    isValid: hasTitle && hasMeaningfulContent && (hasNavigationElements || hasCards),
                    hasTitle,
                    hasMeaningfulContent,
                    hasNavigationElements,
                    hasCards,
                    contentLength: bodyText.length,
                    elementCount: document.querySelectorAll('*').length
                };
            });
            
            if (validation.isValid) {
                console.log('Page content validation passed');
            } else {
                console.log('Page content validation failed');
            }
            
            return validation;
        } catch (error) {
            console.log(`Page content validation failed: ${error.message}`);
            return {
                isValid: false,
                hasTitle: false,
                hasMeaningfulContent: false,
                hasNavigationElements: false,
                hasCards: false,
                contentLength: 0,
                elementCount: 0,
                error: error.message
            };
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
             
                    // Step 2: Extract data from this specific card
                    const cardData = await this.extractSingleCardData(currentCard, cardIndex);
                    
                    if (cardData && this.isRelevantMastersEvent(cardData)) {
                        // Step 3: Extract registration URL if needed
                        if (!cardData.registrationLink && cardData.isMySidelineCard) {
                            cardData.registrationLink = this.extractregistrationLink(currentCard, '.el-card.is-always-shadow', cardIndex);
                        }                        
                        
                    } else {
                        console.log(`⏭️  Skipping card ${cardIndex + 1} - not relevant or insufficient data`);
                    }
                    
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
                    locationAddressPart1 = addressParts[0]?.trim() || '';
                    locationAddressPart2 = addressParts[1]?.trim() || '';   
                    locationAddressPart3 = addressParts[2]?.trim() || '';
                    locationAddressPart4 = addressParts[3]?.trim() || '';
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
            if (!carnivalName || !eventDate) {
                console.log(`⚠️  Could not parse carnival name or date from: ${cardData.fullTitle}`);
                return null;
            }

            const state = this.extractStateFromAddress(cardData.locationAddress);

            const processedCardData = {
                title: carnivalName,
                date: eventDate,
                state: state,
                locationAddress: cardData.locationAddress,
                locationAddressPart1: cardData.locationAddressPart1,
                locationAddressPart2: cardData.locationAddressPart2,
                locationAddressPart3: cardData.locationAddressPart3,
                locationAddressPart4: cardData.locationAddressPart4,
                googleMapsUrl: cardData.googleMapsUrl,
                scheduleDetails: [cardData.subtitle, cardData.scheduleDetails].filter(Boolean).join('\n'),
                organiserContactName: cardData.contactName,
                organiserContactPhone: cardData.contactPhone,
                organiserContactEmail: cardData.contactEmail,
                socialMediaFacebook: cardData.socialMediaFacebook,
                socialMediaWebsite: cardData.socialMediaWebsite,
                clubLogoUrl: cardData.clubLogoUrl,
                isActive: cardData.hasRegistration,
                source: 'MySideline',
                scrapedAt: new Date(),
                isMySidelineCard: true
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
     * Capture registration URL by monitoring navigation and popup events
     * @param {Page} page - Playwright page object
     * @param {string} selector - CSS selector for the cards
     * @param {number} cardIndex - Optional specific card index
     * @returns {Promise<string|null>} Registration URL or null
     */
    captureEventBasedregistrationLink(currentCard, selector, cardIndex = null) {
        try {
            console.log('Attempting to capture registration URL via navigation/popup events...');
            
            const buttonSelector = cardIndex !== null 
                ? `${selector}:nth-child(${cardIndex + 1}) button.el-button--primary, ${selector}:nth-child(${cardIndex + 1}) button[id="cardButton"]`
                : `${selector} button.el-button--primary, ${selector} button[id="cardButton"]`;
            
            const button = currentCard.locator(buttonSelector).first();
            const isVisible = button.isVisible();
            
            if (!isVisible) {
                console.log('No visible registration button found for event-based extraction');
                return null;
            }
            
            // Check button text
            const buttonText = button.textContent() || '';
            const isRegisterButton = buttonText.toLowerCase().includes('register') ||
                               buttonText.toLowerCase().includes('join') ||
                               buttonText.toLowerCase().includes('sign up');
        
            if (!isRegisterButton) {
                console.log('Button does not appear to be a registration button');
                return null;
            }
            
            // Try popup monitoring first
            const popupUrl = this.extractregistrationLinkViaPopup(page, buttonSelector);
            if (popupUrl) {
                return popupUrl;
            }
            
            // Try navigation monitoring as fallback
            const navigationUrl = this.extractregistrationLinkViaNavigation(page, buttonSelector);
            if (navigationUrl) {
                return navigationUrl;
            }
            
            return null;
            
        } catch (error) {
            console.log(`Error in event-based registration URL capture: ${error.message}`);
            return null;
        }
    }

    /**
     * Extract registration URL from MySideline cards with dynamic event listener handling
     * @param {Page} page - Playwright page object
     * @param {string} selector - CSS selector for the cards
     * @param {number} cardIndex - Optional specific card index
     * @returns {Promise<string|null>} Registration URL or null
     */
    extractregistrationLink(currentCard, selector, cardIndex = null) {
        try {
            console.log(`Extracting registration URL${cardIndex !== null ? ` from card ${cardIndex + 1}` : ''}...`);
            
            // First try: Intercept dynamic event listeners
            // TODO: CHANGE TO USE CURRENT CARD
            const dynamicUrl = this.interceptDynamicregistrationLink(currentCard, selector, cardIndex);
            if (dynamicUrl) {
                return dynamicUrl;
            }
            
            // Third try: Monitor navigation/popup events
            // TODO: CHANGE TO USE CURRENT CARD
            const registrationLink = this.captureEventBasedregistrationLink(currentCard, selector, cardIndex);
            if (registrationLink) {
                return registrationLink;
            }
            
            console.log(`❌ No registration URL found${cardIndex !== null ? ` in card ${cardIndex + 1}` : ''}`);
            return null;
            
        } catch (error) {
            console.log(`Error extracting registration URL: ${error.message}`);
            return null;
        }
    }

    /**
     * Intercept dynamic JavaScript event listeners to capture registration URLs
     * @param {Page} page - Playwright page object
     * @param {string} selector - CSS selector for the cards
     * @param {number} cardIndex - Optional specific card index
     * @returns {Promise<string|null>} Registration URL or null
     */
    interceptDynamicregistrationLink(currentCard, selector, cardIndex = null) {
        try {
            console.log('Intercepting dynamic event listeners for registration URL...');
            
            // Set up click event interception before interacting with buttons
            let capturedUrls = [];
            
            // Intercept all click events and capture potential registration URLs
            currentCard.evaluate(() => {
                // Store original methods
                window.__originalWindowOpen = window.open;
                window.__originalLocationHref = window.location.href;
                window.__capturedUrls = [];
                
                // Override window.open to capture URLs
                window.open = function(url, target, features) {
                    console.log('window.open intercepted:', url);
                    if (url && url.startsWith('http')) {
                        window.__capturedUrls.push({
                            type: 'window.open',
                            url: url,
                            timestamp: Date.now()
                        });
                    }
                    // Still call the original to maintain functionality
                    return window.__originalWindowOpen.call(this, url, target, features);
                };
                
                // Override location.href setter
                Object.defineProperty(window.location, 'href', {
                    set: function(url) {
                        console.log('location.href intercepted:', url);
                        if (url && url.startsWith('http')) {
                            window.__capturedUrls.push({
                                type: 'location.href',
                                url: url,
                                timestamp: Date.now()
                            });
                        }
                        // Set the actual location
                        window.__originalLocationHref = url;
                    },
                    get: function() {
                        return window.__originalLocationHref;
                    }
                });
                
                // Add global click listener to capture dynamically bound events
                document.addEventListener('click', function(event) {
                    const target = event.target;
                    
                    // Check if clicked element is a registration button
                    const isRegisterButton = target.textContent?.toLowerCase().includes('register') ||
                                           target.classList.contains('el-button--primary') ||
                                           target.id === 'cardButton' ||
                                           target.closest('.register-button');
                    
                    if (isRegisterButton) {
                        console.log('Registration button clicked:', target);
                        
                        // Try to extract URL from Vue.js data attributes or component props
                        if (target.__vue__ || target._vueParentNode) {
                            try {
                                const vueInstance = target.__vue__ || target._vueParentNode;
                                if (vueInstance && vueInstance.$data) {
                                    // Look for registration URL in Vue component data
                                    const data = vueInstance.$data;
                                    const possibleUrls = [
                                        data.registrationLink,
                                        data.registerUrl,
                                        data.url,
                                        data.href,
                                        data.link
                                    ].filter(url => url && typeof url === 'string' && url.startsWith('http'));
                                    
                                    possibleUrls.forEach(url => {
                                        window.__capturedUrls.push({
                                            type: 'vue.data',
                                            url: url,
                                            timestamp: Date.now()
                                        });
                                    });
                                }
                            } catch (vueError) {
                                console.log('Error accessing Vue data:', vueError);
                            }
                        }
                        
                        // Also check for data attributes that might contain URLs
                        const dataAttributes = target.dataset;
                        Object.keys(dataAttributes).forEach(key => {
                            const value = dataAttributes[key];
                            if (value && value.startsWith('http')) {
                                window.__capturedUrls.push({
                                    type: 'data-attribute',
                                    url: value,
                                    attribute: key,
                                    timestamp: Date.now()
                                });
                            }
                        });
                    }
                }, true); // Use capture phase to catch events before they bubble
            });
            
            // Now find and click registration buttons
            const buttonSelector = cardIndex !== null 
                ? `${selector}:nth-child(${cardIndex + 1}) button.el-button--primary, ${selector}:nth-child(${cardIndex + 1}) button[id="cardButton"], ${selector}:nth-child(${cardIndex + 1}) button`
                : `${selector} button.el-button--primary, ${selector} button[id="cardButton"], ${selector} button`;
            
            const buttons = page.locator(buttonSelector).all();
            
            for (let i = 0; i < Math.min(buttons.length, 3); i++) { // Limit to first 3 buttons to avoid excessive clicking
                try {
                    const button = buttons[i];
                    const isVisible = button.isVisible();
                    
                    if (!isVisible) continue;
                    
                    // Check if button text suggests it's a registration button
                    const buttonText = button.textContent() || '';
                    const isRegisterButton = buttonText.toLowerCase().includes('register') ||
                                           buttonText.toLowerCase().includes('join') ||
                                           buttonText.toLowerCase().includes('sign up');
                    
                    if (!isRegisterButton) continue;
                    
                    console.log(`Clicking potential registration button: "${buttonText}"`);
                    
                    // Click the button and wait briefly for any dynamic behavior
                    button.click({ timeout: 5000 });
                    this.delay(2000);

                    // Check if any URLs were captured
                    capturedUrls = page.evaluate(() => {
                        return window.__capturedUrls || [];
                    });
                    
                    if (capturedUrls.length > 0) {
                        // Found URLs, break out of button clicking loop
                        break;
                    }
                    
                } catch (buttonError) {
                    console.log(`Error clicking button ${i + 1}: ${buttonError.message}`);
                }
            }
            
            // Clean up event listeners
            page.evaluate(() => {
                if (window.__originalWindowOpen) {
                    window.open = window.__originalWindowOpen;
                }
                if (window.__originalLocationHref) {
                    window.location.href = window.__originalLocationHref;
                }
            });
            
            // Return the most likely registration URL
            if (capturedUrls.length > 0) {
                // Sort by timestamp and prioritize certain types
                const sortedUrls = capturedUrls.sort((a, b) => {
                    // Prioritize window.open and vue.data types
                    if (a.type === 'window.open' && b.type !== 'window.open') return -1;
                    if (b.type === 'window.open' && a.type !== 'window.open') return 1;
                    if (a.type === 'vue.data' && b.type !== 'vue.data') return -1;
                    if (b.type === 'vue.data' && a.type !== 'vue.data') return 1;
                    return b.timestamp - a.timestamp; // Most recent first
                });
                
                const selectedUrl = sortedUrls[0];
                console.log(`✅ Found dynamic registration URL (${selectedUrl.type}): ${selectedUrl.url}`);
                return selectedUrl.url;
            }
            
            return null;
            
        } catch (error) {
            console.log(`Error intercepting dynamic registration URL: ${error.message}`);
            return null;
        }
    }

    /**
     * Capture registration URL by monitoring navigation events
     * @param {Page} page - Playwright page object
     * @param {string} buttonSelector - Selector for the registration button
     * @returns {Promise<string|null>} Registration URL or null
     */
    extractregistrationLinkViaNavigation(page, buttonSelector) {
        try {
            console.log('Attempting to extract registration URL via navigation monitoring...');
            
            const registrationButton = page.locator(buttonSelector).first();
            const isVisible = registrationButton.isVisible();
            
            if (!isVisible) {
                console.log('Registration button not visible for navigation extraction');
                return null;
            }
            
            // Set up navigation promise before clicking
            const navigationPromise = page.waitForNavigation({ 
                waitUntil: 'domcontentloaded',
                timeout: 10000 
            }).catch(() => null);
            
            // Click the button
            registrationButton.click();
            
            // Wait for navigation or timeout
            const navigationResponse = navigationPromise;
            
            if (navigationResponse) {
                const registrationLink = navigationResponse.url();
                console.log(`✅ Registration URL extracted via navigation: ${registrationLink}`);
                
                // Navigate back to the original page
                page.goBack({ waitUntil: 'domcontentloaded' });
                
                return registrationLink;
            } else {
                console.log('No navigation occurred, registration URL not found');
                return null;
            }
            
        } catch (error) {
            console.log(`Error extracting registration URL via navigation: ${error.message}`);
            return null;
        }
    }

    /**
     * Extract registration URL by monitoring popup windows
     * @param {Page} page - Playwright page object
     * @param {string} buttonSelector - Selector for the registration button
     * @returns {Promise<string|null>} Registration URL or null
     */
    extractregistrationLinkViaPopup(page, buttonSelector) {
        try {
            console.log('Attempting to extract registration URL via popup monitoring...');
            
            
            const registrationButton = page.locator(buttonSelector).first();
            const isVisible = registrationButton.isVisible();
            
            if (!isVisible) {
                console.log('Registration button not visible for popup extraction');
                return null;
            }
            
            // Set up popup promise before clicking
            const popupPromise = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
            
            // Click the button
            registrationButton.click();
            
            // Wait for popup or timeout
            const popup = popupPromise;
            
            if (popup) {
                const registrationLink = popup.url();
                console.log(`✅ Registration URL extracted via popup: ${registrationLink}`);
                
                // Close the popup
                popup.close();
                
                return registrationLink;
            } else {
                console.log('No popup occurred, registration URL not found');
                return null;
            }
            
        } catch (error) {
            console.log(`Error extracting registration URL via popup: ${error.message}`);
            return null;
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