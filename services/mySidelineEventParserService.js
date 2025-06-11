const MySidelineDataService = require('./mySidelineDataService');

/**
 * MySideline Event Parser Service
 * Handles parsing and standardization of scraped MySideline event data
 */
class MySidelineEventParserService {
    constructor() {
        this.dataService = new MySidelineDataService();
    }

    /**
     * Parse event information from MySideline Vue.js card element (enhanced with expanded content)
     * @param {Object} element - The scraped MySideline card element data
     * @returns {Object|null} - Standardized event object or null
     */
    parseEventFromElement(element) {
        try {
            const title = element.title || '';
            const subtitle = element.subtitle || '';
            const fullText = element.fullContent || element.text || '';
            const expandedDetails = element.expandedDetails || '';
            const dates = element.dates || [];
            
            // Early filtering for Touch events - check before any processing
            if (this.shouldFilterTouchContent(element)) {
                return null;
            }

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
                eventName = this.dataService.extractEventName(fullText.split('\n').filter(line => line.trim()));
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
                eventDate = this.dataService.parseDate(dates[0]);
            }
            
            if (!eventDate) {
                // Try to extract date from subtitle (but don't include subtitle in title)
                const subtitleDateMatch = subtitle.match(/(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4}|\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{4})/);
                if (subtitleDateMatch) {
                    eventDate = this.dataService.parseDate(subtitleDateMatch[0]);
                }
            }
            
            // Try to extract additional details from expanded content
            const enhancedLocation = this.extractLocationFromExpandedContent(fullText, expandedDetails);
            const enhancedSchedule = this.extractScheduleFromExpandedContent(fullText, expandedDetails);
            const enhancedContact = this.extractContactFromExpandedContent(expandedDetails);
            const enhancedFees = this.extractFeesFromExpandedContent(expandedDetails);
            
            // Extract location and state (using enhanced location if available)
            const location = enhancedLocation || this.dataService.extractLocationFromMySidelineText(fullText);
            const state = this.dataService.extractStateFromMySidelineText(fullText, subtitle);
            
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

            // Build the event object
            const eventData = {
                title: eventName.trim(),
                date: eventDate, // Don't set a default date if none found
                locationAddress: location && location !== 'TBA - Check MySideline for details' ? location : null,
                organiserContactName: enhancedContact.name || null,
                organiserContactEmail: enhancedContact.email || null,
                organiserContactPhone: enhancedContact.phone || null,
                organiserContactWebsite: null, // Will be populated if found in contact extraction
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
                    fullContent: fullText,
                    // Include original element for additional filtering
                    originalElement: element
                }
            };

            // Final Touch filtering check on the processed event data
            if (this.dataService.shouldFilterTouchEvent(eventData, element)) {
                return null;
            }

            return eventData;
        } catch (error) {
            console.error('Error parsing MySideline element:', error);
            return null;
        }
    }

    /**
     * Check if scraped element content should be filtered out for Touch events
     * @param {Object} element - The scraped element data
     * @returns {boolean} - True if should be filtered out
     */
    shouldFilterTouchContent(element) {
        const checkText = (text) => {
            if (!text || typeof text !== 'string') return false;
            return text.toLowerCase().includes('touch');
        };

        // Check title and subtitle
        if (checkText(element.title)) {
            console.log(`Filtering out Touch event at parser stage (title): ${element.title}`);
            return true;
        }

        if (checkText(element.subtitle)) {
            console.log(`Filtering out Touch event at parser stage (subtitle): ${element.subtitle}`);
            return true;
        }

        // Check full content and expanded details
        if (checkText(element.fullContent || element.text)) {
            console.log(`Filtering out Touch event at parser stage (content): Contains 'touch'`);
            return true;
        }

        if (checkText(element.expandedDetails)) {
            console.log(`Filtering out Touch event at parser stage (expanded): Contains 'touch'`);
            return true;
        }

        // Check for div elements with class="right" containing only "Touch"
        if (element.innerHTML) {
            const rightDivMatch = element.innerHTML.match(/<div[^>]*class="right"[^>]*>\s*touch\s*<\/div>/i);
            if (rightDivMatch) {
                console.log(`Filtering out Touch event at parser stage (right div): Found touch in right div`);
                return true;
            }
        }

        return false;
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
                const parsedDate = this.dataService.parseDate(dateString);
                
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

module.exports = MySidelineEventParserService;