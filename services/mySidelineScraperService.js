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
        console.log('Launching browser to fetch events...');
        
        const browser = await chromium.launch({
            headless: this.useHeadlessBrowser,
            timeout: this.timeout
        });
        
        let context;
        try {
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
            if (context) {
                await context.close();
            }
            await browser.close();
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
     * Extract events from the page
     * @param {Page} page - Playwright page object
     * @returns {Promise<Array>} Array of extracted events
     */
    async extractEvents(page) {
        console.log('Extracting events from MySideline page...');
        
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

            await this.expandAllClickExpandElements(page);

            const events = await page.evaluate(() => {
                const foundElements = [];
                console.log('Starting MySideline Vue.js-optimized content extraction...');
                
                const mySidelineCards = document.querySelectorAll('.el-card.is-always-shadow, [id^="clubsearch_"]');
                console.log(`Found ${mySidelineCards.length} MySideline cards`);
                
                mySidelineCards.forEach((card, index) => {
                    try {
                        const cardText = card.textContent?.trim() || '';
                        
                        const titleElement = card.querySelector('.title, h3.title');
                        const subtitleElement = card.querySelector('.subtitle, h4.subtitle, #subtitle');
                        const imageElement = card.querySelector('.image__item, img');
                        const buttonElement = card.querySelector('.button-no-style');
                        const registerButton = card.querySelector('button.el-button--primary, button[id="cardButton"], button:has-text("Register")');
                        
                        const title = titleElement ? titleElement.textContent.trim() : '';
                        const subtitle = subtitleElement ? subtitleElement.textContent.trim() : '';
                        const imageSrc = imageElement ? imageElement.src : '';
                        const imageAlt = imageElement ? imageElement.alt : '';
                        
                        // Extract potential registration URL from button attributes
                        let registrationUrl = null;
                        if (registerButton) {
                            // Check for data attributes that might contain the URL
                            registrationUrl = registerButton.getAttribute('data-url') || 
                                           registerButton.getAttribute('data-href') || 
                                           registerButton.getAttribute('data-link') ||
                                           registerButton.getAttribute('data-registration-url') ||
                                           registerButton.getAttribute('onclick');
                            
                            // Check parent elements for URLs
                            if (!registrationUrl) {
                                let parent = registerButton.parentElement;
                                while (parent && parent !== document.body) {
                                    const parentHref = parent.getAttribute('href') || 
                                                     parent.getAttribute('data-url') ||
                                                     parent.getAttribute('data-href');
                                    if (parentHref) {
                                        registrationUrl = parentHref;
                                        break;
                                    }
                                    parent = parent.parentElement;
                                }
                            }
                            
                            // Look for nearby anchor tags
                            if (!registrationUrl) {
                                const nearbyLink = registerButton.closest('a') || 
                                                 registerButton.parentElement?.querySelector('a') ||
                                                 registerButton.nextElementSibling?.querySelector('a');
                                
                                if (nearbyLink && nearbyLink.href) {
                                    registrationUrl = nearbyLink.href;
                                }
                            }
                            
                            // Extract URL from onclick if it contains navigation
                            if (!registrationUrl && registerButton.getAttribute('onclick')) {
                                const onclickContent = registerButton.getAttribute('onclick');
                                const urlMatch = onclickContent.match(/(?:window\.open|location\.href|navigate)\s*\(\s*['"](.*?)['"]/) ||
                                               onclickContent.match(/['"](https?:\/\/[^'"]+)['"]/);
                                if (urlMatch && urlMatch[1]) {
                                    registrationUrl = urlMatch[1];
                                }
                            }
                        }
                        
                        const hasExpandedContent = card.querySelector('.expanded-content, .click-expand-content, .expanded-details');
                        let expandedDetails = '';
                        
                        if (hasExpandedContent) {
                            expandedDetails = hasExpandedContent.textContent?.trim() || '';
                        }
                        
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
                        
                        const dateMatches = fullContent.match(/(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4}|\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{4}|20\d{2})/gi) || [];
                        const hasLocation = /\b(NSW|QLD|VIC|SA|WA|NT|ACT|TAS|Australia|Brisbane|Sydney|Melbourne|Perth|Adelaide|Darwin|Hobart|Canberra)\b/i.test(fullContent);
                        const hasVenue = /\b(venue|ground|park|stadium|field|centre|center|club|oval)\b/i.test(fullContent);
                        const hasTime = /\b(\d{1,2}:\d{2}|\d{1,2}(am|pm))\b/i.test(fullContent);
                        const hasContact = /\b(contact|email|phone|mobile|call)\b/i.test(fullContent);
                        const hasFees = /\b(fee|cost|price|\$\d+|entry|registration)\b/i.test(fullContent);
                        const hasSubstantialContent = title.length > 5 && fullContent.length > 20;
                        
                        let relevanceScore = 0;
                        if (containsMasters) relevanceScore += 15;
                        if (containsNRL) relevanceScore += 12;
                        if (containsRugby || containsLeague) relevanceScore += 10;
                        if (containsCarnival || containsTournament || containsChampionship) relevanceScore += 8;
                        if (containsEvent || containsGala) relevanceScore += 6;
                        if (dateMatches.length > 0) relevanceScore += 5;
                        if (hasLocation) relevanceScore += 4;
                        if (title.length > 10) relevanceScore += 3;
                        if (subtitle.includes('Masters') || subtitle.includes('NRL')) relevanceScore += 7;
                        if (hasExpandedContent) relevanceScore += 5;
                        if (hasVenue) relevanceScore += 3;
                        if (hasTime) relevanceScore += 2;
                        if (hasContact) relevanceScore += 3;
                        if (hasFees) relevanceScore += 2;
                        
                        if (relevanceScore >= 10 && hasSubstantialContent) {
                            const cardId = card.id || card.getAttribute('id') || `mysideline-card-${index}`;
                            
                            // Filter out Touch events at the scraping stage
                            const containsTouch = fullContent.toLowerCase().includes('touch');
                            const titleContainsTouch = title.toLowerCase().includes('touch');
                            const subtitleContainsTouch = subtitle.toLowerCase().includes('touch');
                            const rightDivTouch = card.innerHTML.match(/<div[^>]*class="right"[^>]*>\s*touch\s*<\/div>/i);
                            

                            if (containsTouch || titleContainsTouch || subtitleContainsTouch || rightDivTouch) {
                                console.log(`Filtering out Touch event at scraper stage: ${title || 'Unknown'}`);
                                return; // Skip this card
                            }
                            
                            const elementData = {
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
                                relevanceScore: relevanceScore,
                                dates: dateMatches,
                                hasLocation: hasLocation,
                                cardIndex: index,
                                isMySidelineCard: true,
                                expandedDetails: expandedDetails,
                                hasExpandedContent: !!hasExpandedContent,
                                hasVenue: hasVenue,
                                hasTime: hasTime,
                                hasContact: hasContact,
                                hasFees: hasFees,
                                fullContent: fullContent,
                                registrationUrl: registrationUrl // Add extracted registration URL
                            };

                            foundElements.push(elementData);
                            console.log(`Found MySideline Masters card (score: ${relevanceScore}): ${title} ${hasExpandedContent ? '[EXPANDED]' : ''} ${registrationUrl ? '[REG_URL]' : ''}`);
                        }
                    } catch (err) {
                        console.log(`Error processing MySideline card ${index}:`, err.message);
                    }
                });
                
                if (foundElements.length === 0) {
                    console.log('No MySideline cards found, trying fallback selectors...');
                    
                    const fallbackSelectors = [
                        '.club-item', '.event-item', '.listing-item', '.search-item', '.result-item',
                        'article', 'section', '.row', '.col', '.container > div', '.content > div',
                        'div', 'span', 'p'
                    ];
                    
                    fallbackSelectors.forEach((selector, selectorIndex) => {
                        if (foundElements.length >= 10) return;
                        
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
                return uniqueElements.slice(0, 25);
            });

            // Now extract registration URLs by clicking buttons for events that don't have them
            const eventsWithRegistrationUrls = [];
            for (const event of events) {
                try {
                    let finalRegistrationUrl = event.registrationUrl;
                    
                    // If we didn't extract a URL from attributes, try clicking the button
                    if (!finalRegistrationUrl && event.isMySidelineCard) {
                        finalRegistrationUrl = await this.extractRegistrationUrl(page, '.el-card.is-always-shadow', event.cardIndex);
                    }
                    
                    // Create a new event object with the registration URL
                    const eventWithUrl = {
                        ...event,
                        registrationUrl: finalRegistrationUrl
                    };
                    
                    eventsWithRegistrationUrls.push(eventWithUrl);
                    
                } catch (error) {
                    console.log(`Error processing registration URL for event: ${error.message}`);
                    eventsWithRegistrationUrls.push(event);
                }
            }

            const standardEvents = [];
            for (const event of eventsWithRegistrationUrls) {
                try {
                    const standardEvent = this.parserService.parseEventFromElement(event);
                    if (standardEvent) {
                        standardEvents.push(standardEvent);
                        console.log(`Successfully parsed MySideline event: ${standardEvent.title} ${event.hasExpandedContent ? '[WITH EXPANDED DETAILS]' : ''} ${event.registrationUrl ? '[REG_URL: ' + event.registrationUrl + ']' : ''}`);
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
     * Extract registration URL from register button click
     * @param {Page} page - Playwright page object
     * @param {string} cardSelector - The card selector to target
     * @param {number} cardIndex - Index of the card to extract URL from
     * @returns {Promise<string|null>} The registration URL or null if not found
     */
    async extractRegistrationUrl(page, cardSelector, cardIndex) {
        try {
            // Look for register button within the specific card
            const registerButtonSelector = `${cardSelector}:nth-child(${cardIndex + 1}) button.el-button--primary, ${cardSelector}:nth-child(${cardIndex + 1}) button[id="cardButton"], ${cardSelector}:nth-child(${cardIndex + 1}) button:has-text("Register")`;
            
            console.log(`Looking for register button in card ${cardIndex + 1}...`);
            
            // Check if register button exists
            const buttonExists = await page.locator(registerButtonSelector).count() > 0;
            if (!buttonExists) {
                console.log(`No register button found in card ${cardIndex + 1}`);
                return null;
            }
            
            // Set up navigation listener before clicking
            let registrationUrl = null;
            const navigationPromise = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
            
            // Also listen for navigation on the current page
            const currentPageNavigation = page.waitForNavigation({ timeout: 10000 }).catch(() => null);
            
            console.log(`Clicking register button in card ${cardIndex + 1}...`);
            
            // Click the register button
            await page.locator(registerButtonSelector).first().click();
            await this.delay(2000);
            
            // Check for popup window (new tab/window)
            const popup = await navigationPromise;
            if (popup) {
                registrationUrl = popup.url();
                console.log(`Register button opened popup with URL: ${registrationUrl}`);
                await popup.close();
                return registrationUrl;
            }
            
            // Check for navigation on current page
            const navigation = await currentPageNavigation;
            if (navigation) {
                registrationUrl = page.url();
                console.log(`Register button navigated to: ${registrationUrl}`);
                // Navigate back to the original page
                await page.goBack();
                await this.delay(2000);
                return registrationUrl;
            }
            
            // Check for JavaScript-based redirects or data attributes
            const urlFromButton = await page.evaluate((selector) => {
                const button = document.querySelector(selector);
                if (!button) return null;
                
                // Check for data attributes that might contain the URL
                const dataUrl = button.getAttribute('data-url') || 
                               button.getAttribute('data-href') || 
                               button.getAttribute('data-link') ||
                               button.getAttribute('data-registration-url');
                
                if (dataUrl) return dataUrl;
                
                // Check parent elements for URLs
                let parent = button.parentElement;
                while (parent && parent !== document.body) {
                    const parentHref = parent.getAttribute('href') || 
                                     parent.getAttribute('data-url') ||
                                     parent.getAttribute('data-href');
                    if (parentHref) return parentHref;
                    parent = parent.parentElement;
                }
                
                // Look for nearby anchor tags
                const nearbyLink = button.closest('a') || 
                                 button.parentElement?.querySelector('a') ||
                                 button.nextElementSibling?.querySelector('a');
                
                if (nearbyLink && nearbyLink.href) {
                    return nearbyLink.href;
                }
                
                return null;
            }, registerButtonSelector);
            
            if (urlFromButton) {
                console.log(`Found registration URL from button attributes: ${urlFromButton}`);
                return urlFromButton;
            }
            
            console.log(`Could not extract registration URL from card ${cardIndex + 1}`);
            return null;
            
        } catch (error) {
            console.log(`Error extracting registration URL from card ${cardIndex + 1}: ${error.message}`);
            return null;
        }
    }

    /**
     * Click on all elements with class="click-expand" to reveal full event details
     * @param {Page} page - Playwright page object
     */
    async expandAllClickExpandElements(page) {
        console.log('Expanding all click-expand elements to get full event details...');
        
        try {
            const clickExpandElements = await page.locator('.click-expand').all();
            console.log(`Found ${clickExpandElements.length} click-expand elements`);
            
            if (clickExpandElements.length === 0) {
                console.log('No click-expand elements found, skipping expansion');
                return;
            }
            
            for (let i = 0; i < clickExpandElements.length; i++) {
                try {
                    const element = clickExpandElements[i];
                    
                    const isVisible = await element.isVisible();
                    if (!isVisible) {
                        console.log(`Click-expand element ${i + 1} is not visible, skipping`);
                        continue;
                    }
                    
                    console.log(`Clicking expand element ${i + 1} of ${clickExpandElements.length}...`);
                    
                    await element.scrollIntoViewIfNeeded();
                    await this.delay(500);
                    await element.click();
                    await this.delay(1000);
                    await this.waitForExpandedContent(page, i);
                    
                    console.log(`Successfully expanded element ${i + 1}`);
                    
                } catch (clickError) {
                    console.log(`Failed to click expand element ${i + 1}: ${clickError.message}`);
                }
                
                if (i < clickExpandElements.length - 1) {
                    await this.delay(800);
                }
            }
            
            console.log('Waiting for all expanded content to stabilize...');
            await this.delay(3000);
            
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
        }
    }

    /**
     * Wait for expanded content to load after clicking a click-expand element
     * @param {Page} page - Playwright page object
     * @param {number} elementIndex - Index of the element that was clicked
     */
    async waitForExpandedContent(page, elementIndex) {
        try {
            await page.waitForFunction(() => {
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
            console.log(`Could not detect expanded content for element ${elementIndex + 1}, continuing...`);
            await this.delay(1500);
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
     * Delay for a specified amount of time
     * @param {number} ms - Delay time in milliseconds
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = MySidelineScraperService;