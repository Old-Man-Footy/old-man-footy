const { chromium } = require('playwright');
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
            
            // In development, fall back to mock data on error
            if (process.env.NODE_ENV === 'development') {
                console.log('Browser automation failed in development, using mock data...');
                return this.generateMockEvents();
            }
            
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

            // Get all MySideline cards first
            const cardElements = await page.locator('.el-card.is-always-shadow, [id^="clubsearch_"]').all();
            console.log(`Found ${cardElements.length} MySideline cards to process sequentially`);

            const extractedEvents = [];

            // Process each card sequentially: expand -> extract -> move to next
            for (let cardIndex = 0; cardIndex < cardElements.length; cardIndex++) {
                try {
                    console.log(`\n--- Processing card ${cardIndex + 1}/${cardElements.length} ---`);
                    
                    // Step 1: Expand any click-expand elements within this specific card
                    const expandedSuccessfully = await this.expandCardClickExpandElements(page, cardIndex);
                    
                    // Step 2: Extract data from this specific card
                    const cardData = await this.extractSingleCardData(page, cardIndex, expandedSuccessfully);
                    
                    if (cardData && this.isRelevantMastersEvent(cardData)) {
                        // Step 3: Extract registration URL if needed
                        if (!cardData.registrationUrl && cardData.isMySidelineCard) {
                            cardData.registrationUrl = await this.extractRegistrationUrl(page, '.el-card.is-always-shadow', cardIndex);
                        }
                        
                        // Step 4: Parse the event data
                        try {
                            const standardEvent = this.parserService.parseEventFromElement(cardData);
                            if (standardEvent) {
                                extractedEvents.push(standardEvent);
                                console.log(`✅ Successfully parsed event: ${standardEvent.title} ${expandedSuccessfully ? '[EXPANDED]' : ''} ${cardData.registrationUrl ? '[REG_URL]' : ''}`);
                            }
                        } catch (parseError) {
                            console.log(`Failed to parse MySideline event: ${parseError.message}`);
                        }
                    } else {
                        console.log(`⏭️  Skipping card ${cardIndex + 1} - not relevant or insufficient data`);
                    }
                    
                    // Small delay between cards to avoid overwhelming the page
                    if (cardIndex < cardElements.length - 1) {
                        await this.delay(1000);
                    }
                    
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
     * Extract data from a single card
     * @param {Page} page - Playwright page object
     * @param {number} cardIndex - Index of the card to extract data from
     * @param {boolean} wasExpanded - Whether the card was successfully expanded
     * @returns {Promise<Object|null>} Extracted card data or null
     */
    async extractSingleCardData(page, cardIndex, wasExpanded) {
        try {
            const cardData = await page.evaluate(({ index, expanded }) => {
                const cards = document.querySelectorAll('.el-card.is-always-shadow, [id^="clubsearch_"]');
                const card = cards[index];
                
                if (!card) {
                    console.log(`Card ${index + 1} not found`);
                    return null;
                }
                
                const cardText = card.textContent?.trim() || '';
                
                // Extract basic card information
                const titleElement = card.querySelector('.title, h3.title');
                const subtitleElement = card.querySelector('.subtitle, h4.subtitle, #subtitle');
                const imageElement = card.querySelector('.image__item, img');
                const registerButton = card.querySelector('button.el-button--primary, button[id="cardButton"], button');
                
                const title = titleElement ? titleElement.textContent.trim() : '';
                const subtitle = subtitleElement ? subtitleElement.textContent.trim() : '';
                const imageSrc = imageElement ? imageElement.src : '';
                const imageAlt = imageElement ? imageElement.alt : '';
                
                // Extract registration URL from button attributes
                let registrationUrl = null;
                if (registerButton) {
                    // Check if button text contains "Register" or similar terms
                    const buttonText = registerButton.textContent?.toLowerCase() || '';
                    const isRegisterButton = buttonText.includes('register') || 
                                           buttonText.includes('join') || 
                                           buttonText.includes('sign up') ||
                                           registerButton.classList.contains('el-button--primary') ||
                                           registerButton.id === 'cardButton';
                    
                    if (isRegisterButton) {
                        registrationUrl = registerButton.getAttribute('data-url') || 
                                       registerButton.getAttribute('data-href') || 
                                       registerButton.getAttribute('data-link') ||
                                       registerButton.getAttribute('data-registration-url');
                        
                        if (!registrationUrl) {
                            const onclickContent = registerButton.getAttribute('onclick');
                            if (onclickContent) {
                                const urlMatch = onclickContent.match(/['"](https?:\/\/[^'"]+)['"]/);
                                if (urlMatch && urlMatch[1]) {
                                    registrationUrl = urlMatch[1];
                                }
                            }
                        }
                    }
                }
                
                // Extract expanded content if available
                const expandedElements = card.querySelectorAll('.expanded-content, .click-expand-content, .expanded-details, .show-more-content, .additional-details, .full-details, .event-details, .expanded');
                let expandedDetails = '';
                
                if (expandedElements.length > 0) {
                    expandedDetails = Array.from(expandedElements)
                        .map(el => el.textContent?.trim() || '')
                        .filter(text => text.length > 0)
                        .join(' ');
                }
                
                const fullContent = cardText + ' ' + expandedDetails;
                const cardId = card.id || card.getAttribute('id') || `mysideline-card-${index}`;
                
                // Extract dates and other metadata
                const dateMatches = fullContent.match(/(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4}|\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{4}|20\d{2})/gi) || [];
                const hasLocation = /\b(NSW|QLD|VIC|SA|WA|NT|ACT|TAS|Australia|Brisbane|Sydney|Melbourne|Perth|Adelaide|Darwin|Hobart|Canberra)\b/i.test(fullContent);
                const hasVenue = /\b(venue|ground|park|stadium|field|centre|center|club|oval)\b/i.test(fullContent);
                const hasTime = /\b(\d{1,2}:\d{2}|\d{1,2}(am|pm))\b/i.test(fullContent);
                const hasContact = /\b(contact|email|phone|mobile|call)\b/i.test(fullContent);
                const hasFees = /\b(fee|cost|price|\$\d+|entry|registration)\b/i.test(fullContent);
                
                console.log(`Extracted data from card ${index + 1}: "${title}" (${fullContent.length} chars) ${expanded ? '[EXPANDED]' : '[NOT_EXPANDED]'}`);
                
                return {
                    selector: '.el-card.is-always-shadow',
                    text: cardText,
                    title: title,
                    subtitle: subtitle,
                    id: cardId,
                    innerHTML: card.innerHTML.substring(0, 4000),
                    href: null,
                    imageSrc: imageSrc,
                    imageAlt: imageAlt,
                    className: card.className || '',
                    dates: dateMatches,
                    hasLocation: hasLocation,
                    cardIndex: index,
                    isMySidelineCard: true,
                    expandedDetails: expandedDetails,
                    hasExpandedContent: expandedElements.length > 0,
                    wasExpanded: expanded,
                    hasVenue: hasVenue,
                    hasTime: hasTime,
                    hasContact: hasContact,
                    hasFees: hasFees,
                    fullContent: fullContent,
                    registrationUrl: registrationUrl
                };
                
            }, { index: cardIndex, expanded: wasExpanded });
            
            return cardData;
            
        } catch (error) {
            console.log(`Error extracting data from card ${cardIndex + 1}: ${error.message}`);
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
    async extractRegistrationUrl(page, selector, cardIndex = null) {
        try {
            console.log(`Extracting registration URL${cardIndex !== null ? ` from card ${cardIndex + 1}` : ''}...`);
            
            // First try: Intercept dynamic event listeners
            const dynamicUrl = await this.interceptDynamicRegistrationUrl(page, selector, cardIndex);
            if (dynamicUrl) {
                return dynamicUrl;
            }
            
            // Third try: Monitor navigation/popup events
            const eventUrl = await this.captureEventBasedRegistrationUrl(page, selector, cardIndex);
            if (eventUrl) {
                return eventUrl;
            }
            
            console.log(`❌ No registration URL found${cardIndex !== null ? ` in card ${cardIndex + 1}` : ''}`);
            return null;
            
        } catch (error) {
            console.log(`Error extracting registration URL: ${error.message}`);
            return null;
        }
    }

    /**
     * Extract registration URL from static attributes and onclick handlers
     * @param {Page} page - Playwright page object
     * @param {string} selector - CSS selector for the cards
     * @param {number} cardIndex - Optional specific card index
     * @returns {Promise<string|null>} Registration URL or null
     */
    async extractStaticRegistrationUrl(page, selector, cardIndex = null) {
        try {
            const registrationUrl = await page.evaluate(({ selector: sel, cardIndex: index }) => {
                let cards;
                if (index !== null) {
                    const allCards = document.querySelectorAll(sel);
                    cards = allCards[index] ? [allCards[index]] : [];
                } else {
                    cards = document.querySelectorAll(sel);
                }
                
                for (let card of cards) {
                    // Look for registration buttons with various attributes
                    const registerButtons = card.querySelectorAll('button.el-button--primary, button[id="cardButton"], button:contains("Register"), .register-button, .registration-link');
                    
                    for (let button of registerButtons) {
                        // Check various attributes that might contain the registration URL
                        const urlSources = [
                            button.getAttribute('data-url'),
                            button.getAttribute('data-href'),
                            button.getAttribute('data-link'),
                            button.getAttribute('data-registration-url'),
                            button.getAttribute('href'),
                            button.getAttribute('onclick')
                        ];
                        
                        for (let urlSource of urlSources) {
                            if (urlSource) {
                                // If it's an onclick handler, extract URL from it
                                if (urlSource.includes('window.open') || urlSource.includes('location.href')) {
                                    const urlMatch = urlSource.match(/['"](https?:\/\/[^'"]+)['"]/);
                                    if (urlMatch && urlMatch[1]) {
                                        return urlMatch[1];
                                    }
                                }
                                // If it's already a URL
                                if (urlSource.startsWith('http')) {
                                    return urlSource;
                                }
                            }
                        }
                    }
                    
                    // Look for any links that might be registration related
                    const registrationLinks = card.querySelectorAll('a[href*="register"], a[href*="signup"], a[href*="join"]');
                    for (let link of registrationLinks) {
                        const href = link.getAttribute('href');
                        if (href && href.startsWith('http')) {
                            return href;
                        }
                    }
                }
                
                return null;
            }, { selector, cardIndex });
            
            if (registrationUrl) {
                console.log(`✅ Found static registration URL: ${registrationUrl}`);
                return registrationUrl;
            }
            
            return null;
            
        } catch (error) {
            console.log(`Error extracting static registration URL: ${error.message}`);
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
    async interceptDynamicRegistrationUrl(page, selector, cardIndex = null) {
        try {
            console.log('Intercepting dynamic event listeners for registration URL...');
            
            // Set up click event interception before interacting with buttons
            let capturedUrls = [];
            
            // Intercept all click events and capture potential registration URLs
            await page.evaluate(() => {
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
                                        data.registrationUrl,
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
            
            const buttons = await page.locator(buttonSelector).all();
            
            for (let i = 0; i < Math.min(buttons.length, 3); i++) { // Limit to first 3 buttons to avoid excessive clicking
                try {
                    const button = buttons[i];
                    const isVisible = await button.isVisible();
                    
                    if (!isVisible) continue;
                    
                    // Check if button text suggests it's a registration button
                    const buttonText = await button.textContent() || '';
                    const isRegisterButton = buttonText.toLowerCase().includes('register') ||
                                           buttonText.toLowerCase().includes('join') ||
                                           buttonText.toLowerCase().includes('sign up');
                    
                    if (!isRegisterButton) continue;
                    
                    console.log(`Clicking potential registration button: "${buttonText}"`);
                    
                    // Click the button and wait briefly for any dynamic behavior
                    await button.click({ timeout: 5000 });
                    await this.delay(2000);
                    
                    // Check if any URLs were captured
                    capturedUrls = await page.evaluate(() => {
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
            await page.evaluate(() => {
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
     * Capture registration URL by monitoring navigation and popup events
     * @param {Page} page - Playwright page object
     * @param {string} selector - CSS selector for the cards
     * @param {number} cardIndex - Optional specific card index
     * @returns {Promise<string|null>} Registration URL or null
     */
    async captureEventBasedRegistrationUrl(page, selector, cardIndex = null) {
        try {
            console.log('Attempting to capture registration URL via navigation/popup events...');
            
            const buttonSelector = cardIndex !== null 
                ? `${selector}:nth-child(${cardIndex + 1}) button.el-button--primary, ${selector}:nth-child(${cardIndex + 1}) button[id="cardButton"]`
                : `${selector} button.el-button--primary, ${selector} button[id="cardButton"]`;
            
            const button = page.locator(buttonSelector).first();
            const isVisible = await button.isVisible();
            
            if (!isVisible) {
                console.log('No visible registration button found for event-based extraction');
                return null;
            }
            
            // Check button text
            const buttonText = await button.textContent() || '';
            const isRegisterButton = buttonText.toLowerCase().includes('register') ||
                                   buttonText.toLowerCase().includes('join') ||
                                   buttonText.toLowerCase().includes('sign up');
            
            if (!isRegisterButton) {
                console.log('Button does not appear to be a registration button');
                return null;
            }
            
            // Try popup monitoring first
            const popupUrl = await this.extractRegistrationUrlViaPopup(page, buttonSelector);
            if (popupUrl) {
                return popupUrl;
            }
            
            // Try navigation monitoring as fallback
            const navigationUrl = await this.extractRegistrationUrlViaNavigation(page, buttonSelector);
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
     * Extract registration URL from MySideline cards
     * @param {Page} page - Playwright page object
     * @param {string} selector - CSS selector for the cards
     * @param {number} cardIndex - Optional specific card index
     * @returns {Promise<string|null>} Registration URL or null
     */
    async extractRegistrationUrl(page, selector, cardIndex = null) {
        try {
            console.log(`Extracting registration URL${cardIndex !== null ? ` from card ${cardIndex + 1}` : ''}...`);
            
            // First try: Extract from static attributes and onclick handlers
            const staticUrl = await this.extractStaticRegistrationUrl(page, selector, cardIndex);
            if (staticUrl) {
                return staticUrl;
            }
            
            // Second try: Intercept dynamic event listeners
            const dynamicUrl = await this.interceptDynamicRegistrationUrl(page, selector, cardIndex);
            if (dynamicUrl) {
                return dynamicUrl;
            }
            
            // Third try: Monitor navigation/popup events
            const eventUrl = await this.captureEventBasedRegistrationUrl(page, selector, cardIndex);
            if (eventUrl) {
                return eventUrl;
            }
            
            console.log(`❌ No registration URL found${cardIndex !== null ? ` in card ${cardIndex + 1}` : ''}`);
            return null;
            
        } catch (error) {
            console.log(`Error extracting registration URL: ${error.message}`);
            return null;
        }
    }

    /**
     * Extract registration URL from static attributes and onclick handlers
     * @param {Page} page - Playwright page object
     * @param {string} selector - CSS selector for the cards
     * @param {number} cardIndex - Optional specific card index
     * @returns {Promise<string|null>} Registration URL or null
     */
    async extractStaticRegistrationUrl(page, selector, cardIndex = null) {
        try {
            const registrationUrl = await page.evaluate(({ selector: sel, cardIndex: index }) => {
                let cards;
                if (index !== null) {
                    const allCards = document.querySelectorAll(sel);
                    cards = allCards[index] ? [allCards[index]] : [];
                } else {
                    cards = document.querySelectorAll(sel);
                }
                
                for (let card of cards) {
                    // Look for registration buttons with various attributes
                    const registerButtons = card.querySelectorAll('button.el-button--primary, button[id="cardButton"], button:contains("Register"), .register-button, .registration-link');
                    
                    for (let button of registerButtons) {
                        // Check various attributes that might contain the registration URL
                        const urlSources = [
                            button.getAttribute('data-url'),
                            button.getAttribute('data-href'),
                            button.getAttribute('data-link'),
                            button.getAttribute('data-registration-url'),
                            button.getAttribute('href'),
                            button.getAttribute('onclick')
                        ];
                        
                        for (let urlSource of urlSources) {
                            if (urlSource) {
                                // If it's an onclick handler, extract URL from it
                                if (urlSource.includes('window.open') || urlSource.includes('location.href')) {
                                    const urlMatch = urlSource.match(/['"](https?:\/\/[^'"]+)['"]/);
                                    if (urlMatch && urlMatch[1]) {
                                        return urlMatch[1];
                                    }
                                }
                                // If it's already a URL
                                if (urlSource.startsWith('http')) {
                                    return urlSource;
                                }
                            }
                        }
                    }
                    
                    // Look for any links that might be registration related
                    const registrationLinks = card.querySelectorAll('a[href*="register"], a[href*="signup"], a[href*="join"]');
                    for (let link of registrationLinks) {
                        const href = link.getAttribute('href');
                        if (href && href.startsWith('http')) {
                            return href;
                        }
                    }
                }
                
                return null;
            }, { selector, cardIndex });
            
            if (registrationUrl) {
                console.log(`✅ Found static registration URL: ${registrationUrl}`);
                return registrationUrl;
            }
            
            return null;
            
        } catch (error) {
            console.log(`Error extracting static registration URL: ${error.message}`);
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
    async interceptDynamicRegistrationUrl(page, selector, cardIndex = null) {
        try {
            console.log('Intercepting dynamic event listeners for registration URL...');
            
            // Set up click event interception before interacting with buttons
            let capturedUrls = [];
            
            // Intercept all click events and capture potential registration URLs
            await page.evaluate(() => {
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
                                        data.registrationUrl,
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
            
            const buttons = await page.locator(buttonSelector).all();
            
            for (let i = 0; i < Math.min(buttons.length, 3); i++) { // Limit to first 3 buttons to avoid excessive clicking
                try {
                    const button = buttons[i];
                    const isVisible = await button.isVisible();
                    
                    if (!isVisible) continue;
                    
                    // Check if button text suggests it's a registration button
                    const buttonText = await button.textContent() || '';
                    const isRegisterButton = buttonText.toLowerCase().includes('register') ||
                                           buttonText.toLowerCase().includes('join') ||
                                           buttonText.toLowerCase().includes('sign up');
                    
                    if (!isRegisterButton) continue;
                    
                    console.log(`Clicking potential registration button: "${buttonText}"`);
                    
                    // Click the button and wait briefly for any dynamic behavior
                    await button.click({ timeout: 5000 });
                    await this.delay(2000);
                    
                    // Check if any URLs were captured
                    capturedUrls = await page.evaluate(() => {
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
            await page.evaluate(() => {
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
     * Capture registration URL by monitoring navigation and popup events
     * @param {Page} page - Playwright page object
     * @param {string} selector - CSS selector for the cards
     * @param {number} cardIndex - Optional specific card index
     * @returns {Promise<string|null>} Registration URL or null
     */
    async captureEventBasedRegistrationUrl(page, selector, cardIndex = null) {
        try {
            console.log('Attempting to capture registration URL via navigation/popup events...');
            
            const buttonSelector = cardIndex !== null 
                ? `${selector}:nth-child(${cardIndex + 1}) button.el-button--primary, ${selector}:nth-child(${cardIndex + 1}) button[id="cardButton"]`
                : `${selector} button.el-button--primary, ${selector} button[id="cardButton"]`;
            
            const button = page.locator(buttonSelector).first();
            const isVisible = await button.isVisible();
            
            if (!isVisible) {
                console.log('No visible registration button found for event-based extraction');
                return null;
            }
            
            // Check button text
            const buttonText = await button.textContent() || '';
            const isRegisterButton = buttonText.toLowerCase().includes('register') ||
                                   buttonText.toLowerCase().includes('join') ||
                                   buttonText.toLowerCase().includes('sign up');
            
            if (!isRegisterButton) {
                console.log('Button does not appear to be a registration button');
                return null;
            }
            
            // Try popup monitoring first
            const popupUrl = await this.extractRegistrationUrlViaPopup(page, buttonSelector);
            if (popupUrl) {
                return popupUrl;
            }
            
            // Try navigation monitoring as fallback
            const navigationUrl = await this.extractRegistrationUrlViaNavigation(page, buttonSelector);
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
     * Extract registration URL from MySideline cards
     * @param {Page} page - Playwright page object
     * @param {string} selector - CSS selector for the cards
     * @param {number} cardIndex - Optional specific card index
     * @returns {Promise<string|null>} Registration URL or null
     */
    async extractRegistrationUrl(page, selector, cardIndex = null) {
        try {
            console.log(`Extracting registration URL${cardIndex !== null ? ` from card ${cardIndex + 1}` : ''}...`);
            
            // First try: Extract from static attributes and onclick handlers
            const staticUrl = await this.extractStaticRegistrationUrl(page, selector, cardIndex);
            if (staticUrl) {
                return staticUrl;
            }
            
            // Second try: Intercept dynamic event listeners
            const dynamicUrl = await this.interceptDynamicRegistrationUrl(page, selector, cardIndex);
            if (dynamicUrl) {
                return dynamicUrl;
            }
            
            // Third try: Monitor navigation/popup events
            const eventUrl = await this.captureEventBasedRegistrationUrl(page, selector, cardIndex);
            if (eventUrl) {
                return eventUrl;
            }
            
            console.log(`❌ No registration URL found${cardIndex !== null ? ` in card ${cardIndex + 1}` : ''}`);
            return null;
            
        } catch (error) {
            console.log(`Error extracting registration URL: ${error.message}`);
            return null;
        }
    }

    /**
     * Extract registration URL from static attributes and onclick handlers
     * @param {Page} page - Playwright page object
     * @param {string} selector - CSS selector for the cards
     * @param {number} cardIndex - Optional specific card index
     * @returns {Promise<string|null>} Registration URL or null
     */
    async extractStaticRegistrationUrl(page, selector, cardIndex = null) {
        try {
            const registrationUrl = await page.evaluate(({ selector: sel, cardIndex: index }) => {
                let cards;
                if (index !== null) {
                    const allCards = document.querySelectorAll(sel);
                    cards = allCards[index] ? [allCards[index]] : [];
                } else {
                    cards = document.querySelectorAll(sel);
                }
                
                for (let card of cards) {
                    // Look for registration buttons with various attributes
                    const registerButtons = card.querySelectorAll('button.el-button--primary, button[id="cardButton"], button:contains("Register"), .register-button, .registration-link');
                    
                    for (let button of registerButtons) {
                        // Check various attributes that might contain the registration URL
                        const urlSources = [
                            button.getAttribute('data-url'),
                            button.getAttribute('data-href'),
                            button.getAttribute('data-link'),
                            button.getAttribute('data-registration-url'),
                            button.getAttribute('href'),
                            button.getAttribute('onclick')
                        ];
                        
                        for (let urlSource of urlSources) {
                            if (urlSource) {
                                // If it's an onclick handler, extract URL from it
                                if (urlSource.includes('window.open') || urlSource.includes('location.href')) {
                                    const urlMatch = urlSource.match(/['"](https?:\/\/[^'"]+)['"]/);
                                    if (urlMatch && urlMatch[1]) {
                                        return urlMatch[1];
                                    }
                                }
                                // If it's already a URL
                                if (urlSource.startsWith('http')) {
                                    return urlSource;
                                }
                            }
                        }
                    }
                    
                    // Look for any links that might be registration related
                    const registrationLinks = card.querySelectorAll('a[href*="register"], a[href*="signup"], a[href*="join"]');
                    for (let link of registrationLinks) {
                        const href = link.getAttribute('href');
                        if (href && href.startsWith('http')) {
                            return href;
                        }
                    }
                }
                
                return null;
            }, { selector, cardIndex });
            
            if (registrationUrl) {
                console.log(`✅ Found static registration URL: ${registrationUrl}`);
                return registrationUrl;
            }
            
            return null;
            
        } catch (error) {
            console.log(`Error extracting static registration URL: ${error.message}`);
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
    async interceptDynamicRegistrationUrl(page, selector, cardIndex = null) {
        try {
            console.log('Intercepting dynamic event listeners for registration URL...');
            
            // Set up click event interception before interacting with buttons
            let capturedUrls = [];
            
            // Intercept all click events and capture potential registration URLs
            await page.evaluate(() => {
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
                                        data.registrationUrl,
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
            
            const buttons = await page.locator(buttonSelector).all();
            
            for (let i = 0; i < Math.min(buttons.length, 3); i++) { // Limit to first 3 buttons to avoid excessive clicking
                try {
                    const button = buttons[i];
                    const isVisible = await button.isVisible();
                    
                    if (!isVisible) continue;
                    
                    // Check if button text suggests it's a registration button
                    const buttonText = await button.textContent() || '';
                    const isRegisterButton = buttonText.toLowerCase().includes('register') ||
                                           buttonText.toLowerCase().includes('join') ||
                                           buttonText.toLowerCase().includes('sign up');
                    
                    if (!isRegisterButton) continue;
                    
                    console.log(`Clicking potential registration button: "${buttonText}"`);
                    
                    // Click the button and wait briefly for any dynamic behavior
                    await button.click({ timeout: 5000 });
                    await this.delay(2000);
                    
                    // Check if any URLs were captured
                    capturedUrls = await page.evaluate(() => {
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
            await page.evaluate(() => {
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
     * Capture registration URL by monitoring navigation and popup events
     * @param {Page} page - Playwright page object
     * @param {string} selector - CSS selector for the cards
     * @param {number} cardIndex - Optional specific card index
     * @returns {Promise<string|null>} Registration URL or null
     */
    async captureEventBasedRegistrationUrl(page, selector, cardIndex = null) {
        try {
            console.log('Attempting to capture registration URL via navigation/popup events...');
            
            const buttonSelector = cardIndex !== null 
                ? `${selector}:nth-child(${cardIndex + 1}) button.el-button--primary, ${selector}:nth-child(${cardIndex + 1}) button[id="cardButton"]`
                : `${selector} button.el-button--primary, ${selector} button[id="cardButton"]`;
            
            const button = page.locator(buttonSelector).first();
            const isVisible = await button.isVisible();
            
            if (!isVisible) {
                console.log('No visible registration button found for event-based extraction');
                return null;
            }
            
            // Check button text
            const buttonText = await button.textContent() || '';
            const isRegisterButton = buttonText.toLowerCase().includes('register') ||
                                   buttonText.toLowerCase().includes('join') ||
                                   buttonText.toLowerCase().includes('sign up');
            
            if (!isRegisterButton) {
                console.log('Button does not appear to be a registration button');
                return null;
            }
            
            // Try popup monitoring first
            const popupUrl = await this.extractRegistrationUrlViaPopup(page, buttonSelector);
            if (popupUrl) {
                return popupUrl;
            }
            
            // Try navigation monitoring as fallback
            const navigationUrl = await this.extractRegistrationUrlViaNavigation(page, buttonSelector);
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
     * Extract registration URL from MySideline cards
     * @param {Page} page - Playwright page object
     * @param {string} selector - CSS selector for the cards
     * @param {number} cardIndex - Optional specific card index
     * @returns {Promise<string|null>} Registration URL or null
     */
    async extractRegistrationUrl(page, selector, cardIndex = null) {
        try {
            console.log(`Extracting registration URL${cardIndex !== null ? ` from card ${cardIndex + 1}` : ''}...`);
            
            // First try: Extract from static attributes and onclick handlers
            const staticUrl = await this.extractStaticRegistrationUrl(page, selector, cardIndex);
            if (staticUrl) {
                return staticUrl;
            }
            
            // Second try: Intercept dynamic event listeners
            const dynamicUrl = await this.interceptDynamicRegistrationUrl(page, selector, cardIndex);
            if (dynamicUrl) {
                return dynamicUrl;
            }
            
            // Third try: Monitor navigation/popup events
            const eventUrl = await this.captureEventBasedRegistrationUrl(page, selector, cardIndex);
            if (eventUrl) {
                return eventUrl;
            }
            
            console.log(`❌ No registration URL found${cardIndex !== null ? ` in card ${cardIndex + 1}` : ''}`);
            return null;
            
        } catch (error) {
            console.log(`Error extracting registration URL: ${error.message}`);
            return null;
        }
    }

    /**
     * Extract registration URL from static attributes and onclick handlers
     * @param {Page} page - Playwright page object
     * @param {string} selector - CSS selector for the cards
     * @param {number} cardIndex - Optional specific card index
     * @returns {Promise<string|null>} Registration URL or null
     */
    async extractStaticRegistrationUrl(page, selector, cardIndex = null) {
        try {
            const registrationUrl = await page.evaluate(({ selector: sel, cardIndex: index }) => {
                let cards;
                if (index !== null) {
                    const allCards = document.querySelectorAll(sel);
                    cards = allCards[index] ? [allCards[index]] : [];
                } else {
                    cards = document.querySelectorAll(sel);
                }
                
                for (let card of cards) {
                    // Look for registration buttons with various attributes
                    const registerButtons = card.querySelectorAll('button.el-button--primary, button[id="cardButton"], button:contains("Register"), .register-button, .registration-link');
                    
                    for (let button of registerButtons) {
                        // Check various attributes that might contain the registration URL
                        const urlSources = [
                            button.getAttribute('data-url'),
                            button.getAttribute('data-href'),
                            button.getAttribute('data-link'),
                            button.getAttribute('data-registration-url'),
                            button.getAttribute('href'),
                            button.getAttribute('onclick')
                        ];
                        
                        for (let urlSource of urlSources) {
                            if (urlSource) {
                                // If it's an onclick handler, extract URL from it
                                if (urlSource.includes('window.open') || urlSource.includes('location.href')) {
                                    const urlMatch = urlSource.match(/['"](https?:\/\/[^'"]+)['"]/);
                                    if (urlMatch && urlMatch[1]) {
                                        return urlMatch[1];
                                    }
                                }
                                // If it's already a URL
                                if (urlSource.startsWith('http')) {
                                    return urlSource;
                                }
                            }
                        }
                    }
                    
                    // Look for any links that might be registration related
                    const registrationLinks = card.querySelectorAll('a[href*="register"], a[href*="signup"], a[href*="join"]');
                    for (let link of registrationLinks) {
                        const href = link.getAttribute('href');
                        if (href && href.startsWith('http')) {
                            return href;
                        }
                    }
                }
                
                return null;
            }, { selector, cardIndex });
            
            if (registrationUrl) {
                console.log(`✅ Found static registration URL: ${registrationUrl}`);
                return registrationUrl;
            }
            
            return null;
            
        } catch (error) {
            console.log(`Error extracting static registration URL: ${error.message}`);
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
    async interceptDynamicRegistrationUrl(page, selector, cardIndex = null) {
        try {
            console.log('Intercepting dynamic event listeners for registration URL...');
            
            // Set up click event interception before interacting with buttons
            let capturedUrls = [];
            
            // Intercept all click events and capture potential registration URLs
            await page.evaluate(() => {
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
                                        data.registrationUrl,
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
            
            const buttons = await page.locator(buttonSelector).all();
            
            for (let i = 0; i < Math.min(buttons.length, 3); i++) { // Limit to first 3 buttons to avoid excessive clicking
                try {
                    const button = buttons[i];
                    const isVisible = await button.isVisible();
                    
                    if (!isVisible) continue;
                    
                    // Check if button text suggests it's a registration button
                    const buttonText = await button.textContent() || '';
                    const isRegisterButton = buttonText.toLowerCase().includes('register') ||
                                           buttonText.toLowerCase().includes('join') ||
                                           buttonText.toLowerCase().includes('sign up');
                    
                    if (!isRegisterButton) continue;
                    
                    console.log(`Clicking potential registration button: "${buttonText}"`);
                    
                    // Click the button and wait briefly for any dynamic behavior
                    await button.click({ timeout: 5000 });
                    await this.delay(2000);
                    
                    // Check if any URLs were captured
                    capturedUrls = await page.evaluate(() => {
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
            await page.evaluate(() => {
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
     * Capture registration URL by monitoring navigation and popup events
     * @param {Page} page - Playwright page object
     * @param {string} selector - CSS selector for the cards
     * @param {number} cardIndex - Optional specific card index
     * @returns {Promise<string|null>} Registration URL or null
     */
    async captureEventBasedRegistrationUrl(page, selector, cardIndex = null) {
        try {
            console.log('Attempting to capture registration URL via navigation/popup events...');
            
            const buttonSelector = cardIndex !== null 
                ? `${selector}:nth-child(${cardIndex + 1}) button.el-button--primary, ${selector}:nth-child(${cardIndex + 1}) button[id="cardButton"]`
                : `${selector} button.el-button--primary, ${selector} button[id="cardButton"]`;
            
            const button = page.locator(buttonSelector).first();
            const isVisible = await button.isVisible();
            
            if (!isVisible) {
                console.log('No visible registration button found for event-based extraction');
                return null;
            }
            
            // Check button text
            const buttonText = await button.textContent() || '';
            const isRegisterButton = buttonText.toLowerCase().includes('register') ||
                                   buttonText.toLowerCase().includes('join') ||
                                   buttonText.toLowerCase().includes('sign up');
            
            if (!isRegisterButton) {
                console.log('Button does not appear to be a registration button');
                return null;
            }
            
            // Try popup monitoring first
            const popupUrl = await this.extractRegistrationUrlViaPopup(page, buttonSelector);
            if (popupUrl) {
                return popupUrl;
            }
            
            // Try navigation monitoring as fallback
            const navigationUrl = await this.extractRegistrationUrlViaNavigation(page, buttonSelector);
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
     * Extract registration URL from MySideline cards
     * @param {Page} page - Playwright page object
     * @param {string} selector - CSS selector for the cards
     * @param {number} cardIndex - Optional specific card index
     * @returns {Promise<string|null>} Registration URL or null
     */
    async extractRegistrationUrl(page, selector, cardIndex = null) {
        try {
            console.log(`Extracting registration URL${cardIndex !== null ? ` from card ${cardIndex + 1}` : ''}...`);
            
            // First try: Extract from static attributes and onclick handlers
            const staticUrl = await this.extractStaticRegistrationUrl(page, selector, cardIndex);
            if (staticUrl) {
                return staticUrl;
            }
            
            // Second try: Intercept dynamic event listeners
            const dynamicUrl = await this.interceptDynamicRegistrationUrl(page, selector, cardIndex);
            if (dynamicUrl) {
                return dynamicUrl;
            }
            
            // Third try: Monitor navigation/popup events
            const eventUrl = await this.captureEventBasedRegistrationUrl(page, selector, cardIndex);
            if (eventUrl) {
                return eventUrl;
            }
            
            console.log(`❌ No registration URL found${cardIndex !== null ? ` in card ${cardIndex + 1}` : ''}`);
            return null;
            
        } catch (error) {
            console.log(`Error extracting registration URL: ${error.message}`);
            return null;
        }
    }

    /**
     * Extract registration URL from static attributes and onclick handlers
     * @param {Page} page - Playwright page object
     * @param {string} selector - CSS selector for the cards
     * @param {number} cardIndex - Optional specific card index
     * @returns {Promise<string|null>} Registration URL or null
     */
    async extractStaticRegistrationUrl(page, selector, cardIndex = null) {
        try {
            const registrationUrl = await page.evaluate(({ selector: sel, cardIndex: index }) => {
                let cards;
                if (index !== null) {
                    const allCards = document.querySelectorAll(sel);
                    cards = allCards[index] ? [allCards[index]] : [];
                } else {
                    cards = document.querySelectorAll(sel);
                }
                
                for (let card of cards) {
                    // Look for registration buttons with various attributes
                    const registerButtons = card.querySelectorAll('button.el-button--primary, button[id="cardButton"], button:contains("Register"), .register-button, .registration-link');
                    
                    for (let button of registerButtons) {
                        // Check various attributes that might contain the registration URL
                        const urlSources = [
                            button.getAttribute('data-url'),
                            button.getAttribute('data-href'),
                            button.getAttribute('data-link'),
                            button.getAttribute('data-registration-url'),
                            button.getAttribute('href'),
                            button.getAttribute('onclick')
                        ];
                        
                        for (let urlSource of urlSources) {
                            if (urlSource) {
                                // If it's an onclick handler, extract URL from it
                                if (urlSource.includes('window.open') || urlSource.includes('location.href')) {
                                    const urlMatch = urlSource.match(/['"](https?:\/\/[^'"]+)['"]/);
                                    if (urlMatch && urlMatch[1]) {
                                        return urlMatch[1];
                                    }
                                }
                                // If it's already a URL
                                if (urlSource.startsWith('http')) {
                                    return urlSource;
                                }
                            }
                        }
                    }
                    
                    // Look for any links that might be registration related
                    const registrationLinks = card.querySelectorAll('a[href*="register"], a[href*="signup"], a[href*="join"]');
                    for (let link of registrationLinks) {
                        const href = link.getAttribute('href');
                        if (href && href.startsWith('http')) {
                            return href;
                        }
                    }
                }
                
                return null;
            }, { selector, cardIndex });
            
            if (registrationUrl) {
                console.log(`✅ Found static registration URL: ${registrationUrl}`);
                return registrationUrl;
            }
            
            return null;
            
        } catch (error) {
            console.log(`Error extracting static registration URL: ${error.message}`);
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
    async interceptDynamicRegistrationUrl(page, selector, cardIndex = null) {
        try {
            console.log('Intercepting dynamic event listeners for registration URL...');
            
            // Set up click event interception before interacting with buttons
            let capturedUrls = [];
            
            // Intercept all click events and capture potential registration URLs
            await page.evaluate(() => {
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
                                        data.registrationUrl,
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
            
            const buttons = await page.locator(buttonSelector).all();
            
            for (let i = 0; i < Math.min(buttons.length, 3); i++) { // Limit to first 3 buttons to avoid excessive clicking
                try {
                    const button = buttons[i];
                    const isVisible = await button.isVisible();
                    
                    if (!isVisible) continue;
                    
                    // Check if button text suggests it's a registration button
                    const buttonText = await button.textContent() || '';
                    const isRegisterButton = buttonText.toLowerCase().includes('register') ||
                                           buttonText.toLowerCase().includes('join') ||
                                           buttonText.toLowerCase().includes('sign up');
                    
                    if (!isRegisterButton) continue;
                    
                    console.log(`Clicking potential registration button: "${buttonText}"`);
                    
                    // Click the button and wait briefly for any dynamic behavior
                    await button.click({ timeout: 5000 });
                    await this.delay(2000);
                    
                    // Check if any URLs were captured
                    capturedUrls = await page.evaluate(() => {
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
            await page.evaluate(() => {
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
     * Extract registration URL by monitoring navigation events
     * @param {Page} page - Playwright page object
     * @param {string} buttonSelector - Selector for the registration button
     * @returns {Promise<string|null>} Registration URL or null
     */
    async extractRegistrationUrlViaNavigation(page, buttonSelector) {
        try {
            console.log('Attempting to extract registration URL via navigation monitoring...');
            
            const registrationButton = page.locator(buttonSelector).first();
            const isVisible = await registrationButton.isVisible();
            
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
            await registrationButton.click();
            
            // Wait for navigation or timeout
            const navigationResponse = await navigationPromise;
            
            if (navigationResponse) {
                const registrationUrl = navigationResponse.url();
                console.log(`✅ Registration URL extracted via navigation: ${registrationUrl}`);
                
                // Navigate back to the original page
                await page.goBack({ waitUntil: 'domcontentloaded' });
                
                return registrationUrl;
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
    async extractRegistrationUrlViaPopup(page, buttonSelector) {
        try {
            console.log('Attempting to extract registration URL via popup monitoring...');
            
            
            const registrationButton = page.locator(buttonSelector).first();
            const isVisible = await registrationButton.isVisible();
            
            if (!isVisible) {
                console.log('Registration button not visible for popup extraction');
                return null;
            }
            
            // Set up popup promise before clicking
            const popupPromise = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
            
            // Click the button
            await registrationButton.click();
            
            // Wait for popup or timeout
            const popup = await popupPromise;
            
            if (popup) {
                const registrationUrl = popup.url();
                console.log(`✅ Registration URL extracted via popup: ${registrationUrl}`);
                
                // Close the popup
                await popup.close();
                
                return registrationUrl;
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
                    mySidelineEventId: `mock-${state.toLowerCase()}-${currentYear}-${index + 1}`,
                    isManuallyEntered: false,
                    maxTeams: 16,
                    feesDescription: `$${300 + (index * 50)} per team (Early bird discount available)`,
                    registrationDeadline: new Date(eventDate.getTime() - (14 * 24 * 60 * 60 * 1000)),
                    scheduleDetails: `Day-long tournament starting at ${8 + index}:00 AM. Multiple age divisions available.`,
                    ageCategories: ['35+', '40+', '45+', '50+'],
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
     * Validate extracted event data
     * @param {Array} events - Array of event objects
     * @returns {Object} Validation results object
     */
    validateExtractedData(events) {
        if (!Array.isArray(events)) {
            return {
                totalEvents: 0,
                validEvents: 0,
                eventsWithTitle: 0,
                eventsWithDate: 0,
                eventsWithLocation: 0,
                eventsWithRegistration: 0,
                issues: ['Input is not an array']
            };
        }

        const validation = {
            totalEvents: events.length,
            validEvents: 0,
            eventsWithTitle: 0,
            eventsWithDate: 0,
            eventsWithLocation: 0,
            eventsWithRegistration: 0,
            issues: []
        };
        
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            const eventNum = i + 1;
            let isValid = true;
            
            try {
                // Basic validation
                if (!event || typeof event !== 'object') {
                    validation.issues.push(`Event ${eventNum}: Invalid event object`);
                    continue;
                }

                // Title validation
                if (event.title && typeof event.title === 'string' && event.title.trim()) {
                    validation.eventsWithTitle++;
                } else {
                    validation.issues.push(`Event ${eventNum}: Missing or invalid title`);
                    isValid = false;
                }

                // Date validation
                if (event.date) {
                    let dateValid = false;
                    if (event.date instanceof Date && !isNaN(event.date.getTime())) {
                        dateValid = true;
                    } else if (typeof event.date === 'string' && event.date.trim()) {
                        const parsedDate = new Date(event.date.trim());
                        if (!isNaN(parsedDate.getTime())) {
                            event.date = parsedDate;
                            dateValid = true;
                        }
                    }
                    
                    if (dateValid) {
                        validation.eventsWithDate++;
                    } else {
                        validation.issues.push(`Event ${eventNum}: Invalid date format`);
                        isValid = false;
                    }
                } else {
                    validation.issues.push(`Event ${eventNum}: Missing date`);
                    isValid = false;
                }

                // Location validation
                if (event.locationAddress || event.location) {
                    const location = event.locationAddress || event.location;
                    if (typeof location === 'string' && location.trim()) {
                        validation.eventsWithLocation++;
                    }
                } else {
                    validation.issues.push(`Event ${eventNum}: Missing location information`);
                }

                // Registration validation
                if (event.registrationLink || event.registrationUrl) {
                    const regLink = event.registrationLink || event.registrationUrl;
                    if (typeof regLink === 'string' && regLink.trim()) {
                        validation.eventsWithRegistration++;
                    }
                } else {
                    validation.issues.push(`Event ${eventNum}: Missing registration link`);
                }

                // Clean up string fields
                if (event.description && typeof event.description === 'string') {
                    event.description = event.description.trim();
                }

                if (isValid) {
                    validation.validEvents++;
                }
                
            } catch (error) {
                console.error(`Error validating event ${eventNum}:`, error);
                validation.issues.push(`Event ${eventNum}: Validation error - ${error.message}`);
            }
        }
        
        return validation;
    }

    /**
     * Log extraction summary
     * @param {Array} events - Array of extracted events
     * @param {Object} validation - Validation results
     */
    logExtractionSummary(events, validation) {
        console.log('\n📊 MySideline Extraction Summary:');
        console.log(`   Total events found: ${validation.totalEvents}`);
        console.log(`   Valid events: ${validation.validEvents}`);
        console.log(`   Events with title: ${validation.eventsWithTitle}`);
        console.log(`   Events with date: ${validation.eventsWithDate}`);
        console.log(`   Events with location: ${validation.eventsWithLocation}`);
        console.log(`   Events with registration: ${validation.eventsWithRegistration}`);
        
        if (validation.issues.length > 0) {
            console.log('\n⚠️  Issues found:');
            validation.issues.forEach(issue => console.log(`   - ${issue}`));
        }
        
        if (events.length > 0) {
            console.log('\n📋 Sample events:');
            events.slice(0, 3).forEach((event, index) => {
                console.log(`   ${index + 1}. ${event.title} - ${event.date} - ${event.state}`);
            });
        }
    }

    /**
     * Clean up extracted text content
     * @param {string} text - Raw text content
     * @returns {string} Cleaned text
     */
    cleanTextContent(text) {
        if (!text) return '';
        
        return text
            .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
            .replace(/\n+/g, ' ')           // Replace newlines with spaces
            .replace(/\t+/g, ' ')           // Replace tabs with spaces
            .replace(/[^\x20-\x7E]/g, '')   // Remove non-printable characters
            .trim();                        // Remove leading/trailing whitespace
    }

    /**
     * Check if the service is properly configured
     * @returns {boolean} True if configured correctly
     */
    isProperlyConfigured() {
        const issues = [];
        
        if (!this.searchUrl) {
            issues.push('MYSIDELINE_URL environment variable is not set');
        }
        
        if (!this.timeout || this.timeout < 10000) {
            issues.push('MYSIDELINE_REQUEST_TIMEOUT is too low or not set');
        }
        
        if (!this.parserService) {
            issues.push('MySidelineEventParserService is not initialized');
        }
        
        if (issues.length > 0) {
            console.error('❌ MySidelineScraperService configuration issues:');
            issues.forEach(issue => console.error(`   - ${issue}`));
            return false;
        }
        
        return true;
    }

    /**
     * Get service configuration info
     * @returns {Object} Configuration details
     */
    getConfigurationInfo() {
        return {
            searchUrl: this.searchUrl,
            timeout: this.timeout,
            retryCount: this.retryCount,
            requestDelay: this.requestDelay,
            useHeadlessBrowser: this.useHeadlessBrowser,
            enableScraping: this.enableScraping,
            useMockData: this.useMockData,
            parserServiceInitialized: !!this.parserService
        };
    }

    /**
     * Launch browser with retry logic
     * @param {number} maxRetries - Maximum number of retry attempts
     * @returns {Promise<Object>} Browser instance
     */
    async launchBrowser(maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Try to launch browser
                this.browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                console.log('Browser launched successfully');
            } catch (error) {
                console.error('Failed to launch browser:', error.message);
                throw error;
            }
        }
    }

    /**
     * Expand click-expand elements within a specific card
     * @param {Page} page - Playwright page object
     * @param {number} cardIndex - Index of the card to expand
     * @returns {Promise<boolean>} True if expansion was successful
     */
    async expandCardClickExpandElements(page, cardIndex) {
        try {
            // Target click-expand elements within the specific card
            const cardSelector = `.el-card.is-always-shadow:nth-child(${cardIndex + 1}), [id^="clubsearch_"]:nth-child(${cardIndex + 1})`;
            const clickExpandSelector = `${cardSelector} .click-expand`;
            
            const clickExpandElements = await page.locator(clickExpandSelector).all();
            
            if (clickExpandElements.length === 0) {
                console.log(`No click-expand elements found in card ${cardIndex + 1}`);
                return false;
            }
            
            console.log(`Found ${clickExpandElements.length} click-expand elements in card ${cardIndex + 1}`);
            
            let expandedCount = 0;
            for (let i = 0; i < clickExpandElements.length; i++) {
                try {
                    const element = clickExpandElements[i];
                    
                    const isVisible = await element.isVisible();
                    if (!isVisible) {
                        console.log(`Click-expand element ${i + 1} in card ${cardIndex + 1} is not visible, skipping`);
                        continue;
                    }
                    
                    console.log(`Expanding element ${i + 1} in card ${cardIndex + 1}...`);
                    
                    await element.scrollIntoViewIfNeeded();
                    await this.delay(300);
                    await element.click();
                    await this.delay(800);
                    
                    // Wait for the specific expanded content to appear
                    await this.waitForCardExpandedContent(page, cardIndex, i);
                    expandedCount++;
                    
                    console.log(`✅ Expanded element ${i + 1} in card ${cardIndex + 1}`);
                    
                } catch (clickError) {
                    console.log(`Failed to expand element ${i + 1} in card ${cardIndex + 1}: ${clickError.message}`);
                }
            }
            
            if (expandedCount > 0) {
                console.log(`🔄 Waiting for expanded content to stabilize in card ${cardIndex + 1}...`);
                await this.delay(2000);
            }
            
            return expandedCount > 0;
            
        } catch (error) {
            console.log(`Error expanding card ${cardIndex + 1}: ${error.message}`);
            return false;
        }
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
        
        const fullContent = (cardData.fullContent || '').toLowerCase();
        const title = cardData.title.toLowerCase();
        const subtitle = (cardData.subtitle || '').toLowerCase();
        
        // Filter out Touch events at the scraping stage
        const containsTouch = fullContent.includes('touch') || title.includes('touch') || subtitle.includes('touch');
        if (containsTouch) {
            console.log(`❌ Filtering out Touch event: ${cardData.title}`);
            return false;
        }
        
        // Basic validation - just need minimum content and a title
        const hasMinimumContent = cardData.fullContent && cardData.fullContent.length > 50;
        
        return hasMinimumContent;
    }

    /**
     * Wait for expanded content to load within a specific card
     * @param {Page} page - Playwright page object
     * @param {number} cardIndex - Index of the card
     * @param {number} elementIndex - Index of the expand element within the card
     */
    async waitForCardExpandedContent(page, cardIndex, elementIndex) {
        try {
            const cardSelector = `.el-card.is-always-shadow:nth-child(${cardIndex + 1}), [id^="clubsearch_"]:nth-child(${cardIndex + 1})`;
            
            await page.waitForFunction((selector) => {
                const card = document.querySelector(selector);
                if (!card) return false;
                
                // Look for the actual MySideline expanded content selectors
                const customExpandElements = card.querySelectorAll('.custom-expand');
                
                // Check if any custom-expand elements have expanded (height: auto and content)
                for (let expandElement of customExpandElements) {
                    const style = expandElement.getAttribute('style') || '';
                    const hasAutoHeight = style.includes('height: auto') || style.includes('height:auto');
                    const hasContent = expandElement.textContent && expandElement.textContent.trim().length > 50;
                    
                    if (hasAutoHeight && hasContent) {
                        return true;
                    }
                }
                
                // Also check for other potential expanded content indicators
                const hasVisibleExpandedContent = card.querySelectorAll('.custom-expand p, .custom-expand div, .custom-expand a').length > 3;
                const hasContactInfo = card.textContent.includes('Club Contact') || card.textContent.includes('Email:') || card.textContent.includes('Number:');
                const hasAddressInfo = card.textContent.includes('maps.google.com') || card.querySelector('a[href*="maps.google.com"]');
                
                return hasVisibleExpandedContent || hasContactInfo || hasAddressInfo;
            }, { timeout: 5000 }, cardSelector);
            
            console.log(`✅ Expanded content detected in card ${cardIndex + 1}, element ${elementIndex + 1}`);
            
        } catch (waitError) {
            console.log(`Could not detect expanded content in card ${cardIndex + 1}, element ${elementIndex + 1}, continuing...`);
            await this.delay(1000);
        }
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

    /**
     * Close the browser instance
     */
    async closeBrowser() {
        if (this.browser) {
            console.log('🔄 Closing browser...');
            await this.browser.close();
            this.browser = null;
            this.page = null;
            console.log('✅ Browser closed');
        }
    }

    /**
     * Get browser status
     * @returns {Object} Browser status information
     */
    getBrowserStatus() {
        return {
            isInitialized: !!this.browser,
            hasPage: !!this.page,
            isHeadless: this.headless
        };
    }

    /**
     * Extract date information from text
     * @param {string} text - Text to extract dates from
     * @returns {Array} Array of extracted dates
     */
    extractDatesFromText(text) {
        const dates = [];
        
        // Common date patterns
        const datePatterns = [
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,           // MM/DD/YYYY or DD/MM/YYYY
            /(\d{1,2})-(\d{1,2})-(\d{4})/g,            // MM-DD-YYYY or DD-MM-YYYY
            /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/gi,
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/gi,
            /(\d{1,2})(st|nd|rd|th)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/gi
        ];
        
        datePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                dates.push(match[0]);
            }
        });
        
        return [...new Set(dates)]; // Remove duplicates
    }

    /**
     * Extract time information from text
     * @param {string} text - Text to extract times from
     * @returns {Array} Array of extracted times
     */
    extractTimesFromText(text) {
        const times = [];
        
        // Time patterns
        const timePatterns = [
            /\b(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)\b/g,
            /\b(\d{1,2})(\d{2})\s*(am|pm|AM|PM)\b/g,
            /\b(\d{1,2}):(\d{2})\s*(hours?|hrs?)\b/gi,
            /\b(\d{1,2}):(\d{2})\b/g
        ];
        
        timePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                times.push(match[0]);
            }
        });
        
        return [...new Set(times)]; // Remove duplicates
    }

    /**
     * Extract contact information from text
     * @param {string} text - Text to extract contact info from
     * @returns {Object} Extracted contact information
     */
    extractContactInfo(text) {
        const contact = {
            emails: [],
            phones: [],
            websites: []
        };
        
        // Email pattern
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emails = text.match(emailPattern);
        if (emails) {
            contact.emails = [...new Set(emails)];
        }
        
        // Phone pattern (Australian format)
        const phonePattern = /(?:\+61\s?)?(?:\(0\d\)\s?|\d{2}\s?)\d{4}\s?\d{4}|\b0\d{1}\s?\d{4}\s?\d{4}\b/g;
        const phones = text.match(phonePattern);
        if (phones) {
            contact.phones = [...new Set(phones)];
        }
        
        // Website pattern
        const websitePattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
        const websites = text.match(websitePattern);
        if (websites) {
            contact.websites = [...new Set(websites)];
        }
        
        return contact;
    }

    /**
     * Extract venue/location information from text
     * @param {string} text - Text to extract venue from
     * @returns {Object} Extracted venue information
     */
    extractVenueInfo(text) {
        const venue = {
            locations: [],
            addresses: []
        };
        
        // Look for common venue indicators
        const venuePatterns = [
            /(?:at|venue:|location:|held at)\s*([^.,\n]+)/gi,
            /([A-Z][a-z]+\s+(?:Park|Field|Ground|Stadium|Centre|Center|Club|Oval))/g,
            /(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln))/g
        ];
        
        venuePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const location = match[1] ? match[1].trim() : match[0].trim();
                if (location.length > 3) {
                    if (pattern.source.includes('Street|St|Road')) {
                        venue.addresses.push(location);
                    } else {
                        venue.locations.push(location);
                    }
                }
            }
        });
        
        // Remove duplicates
        venue.locations = [...new Set(venue.locations)];
        venue.addresses = [...new Set(venue.addresses)];
        
        return venue;
    }

    /**
     * Extract fee/cost information from text
     * @param {string} text - Text to extract fees from
     * @returns {Array} Array of extracted fee information
     */
    extractFeeInfo(text) {
        const fees = [];
        
        // Fee patterns
        const feePatterns = [
            /\$\d+(?:\.\d{2})?/g,
            /(?:fee|cost|price|entry|registration):\s*\$?\d+(?:\.\d{2})?/gi,
            /(?:free|no charge|complimentary)/gi
        ];
        
        feePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                fees.push(match[0]);
            }
        });
        
        return [...new Set(fees)]; // Remove duplicates
    }

    /**
     * Calculate relevance score for an event based on keywords
     * @param {Object} event - Event object with title and description
     * @returns {boolean} - True if event is relevant (score > 0.5), false otherwise
     */
    calculateRelevanceScore(event) {
        if (!event || (!event.title && !event.description)) {
            return false;
        }

        const keywords = ['rugby', 'league', 'nrl', 'masters', 'over', 'seniors', 'veterans'];
        const text = `${event.title || ''} ${event.description || ''}`.toLowerCase();
        
        let matches = 0;
        keywords.forEach(keyword => {
            if (text.includes(keyword)) {
                matches++;
            }
        });

        const score = matches / keywords.length;
        return score > 0.5;
    }
}

module.exports = MySidelineScraperService;