import MySidelineDataService from './mySidelineDataService.mjs';

/**
 * MySideline Event Parser Service
 * Handles parsing and standardization of scraped MySideline event data
 */
class MySidelineEventParserService {
    constructor() {
        this.dataService = new MySidelineDataService();
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
            {
                // Combined pattern for dates in various formats within brackets.
                // Handles: (DD/MM/YYYY), (DD-MM-YYYY), (DD Month YYYY), (DDth Month YYYY), (Month DD, YYYY)
                // Examples: (19/07/2025), (27th July 2024), (Sep 20, 2024)
                pattern: /\s*\(((?:\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{4})|(?:\d{1,2}(?:st|nd|rd|th)?\s+[a-zA-Z]{3,}\s+\d{4})|(?:[a-zA-Z]{3,}\s+\d{1,2},?\s+\d{4}))\)\s*/gi,
                extract: (match) => match[1].trim()
            },
            {
                // Combined pattern for dates with prefixes like '-' or '|'.
                // Handles: - DD/MM/YYYY, | DD Month YYYY, - DDth Month YYYY
                // Examples: - 21/06/2025, | 20th Sep 2024
                pattern: /\s*[\-\|]\s*((?:\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{4})|(?:\d{1,2}(?:st|nd|rd|th)?\s+[a-zA-Z]{3,}\s+\d{4})|(?:[a-zA-Z]{3,}\s+\d{1,2},?\s+\d{4}))\s*/gi,
                extract: (match) => match[1].trim()
            },
            {
                // Combined pattern for dates found at the very end of a string.
                // Handles: Title DD/MM/YYYY, Title DDth Month YYYY
                // Examples: Carnival 20th Sep 2024, Another Event 5 Feb 2026
                pattern: /\s+((?:\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{4})|(?:\d{1,2}(?:st|nd|rd|th)?\s+[a-zA-Z]{3,}\s+\d{4})|(?:[a-zA-Z]{3,}\s+\d{1,2},?\s+\d{4}))\s*$/gi,
                extract: (match) => match[1].trim()
            }
        ];

        // Try each pattern to find and extract date
        for (const { pattern, extract } of datePatterns) {
            // Reset regex state for global patterns
            pattern.lastIndex = 0; 
            const match = pattern.exec(cleanTitle);
            if (match) {
                const dateString = extract(match);
                    let parsedDate = this.dataService.parseDate(dateString);
                if (parsedDate) {
                    // Always format as 'YYYY-MM-DD'
                    if (/^\d{4}-\d{2}-\d{2}$/.test(parsedDate)) {
                        extractedDate = parsedDate;
                    } else {
                        // If ISO string, convert to 'YYYY-MM-DD'
                        try {
                            const d = new Date(parsedDate);
                            extractedDate = d.toISOString().slice(0, 10);
                        } catch {
                            extractedDate = null;
                        }
                    }
                    // Remove the matched date pattern from the title
                    cleanTitle = cleanTitle.replace(pattern, ' ').trim();
                    // Clean up any double spaces
                    cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();
                    extractedDate = parsedDate;
                    console.log(`Extracted date "${dateString}" from title. Clean title: "${cleanTitle}"`);
                    break;
                } 
                else {
                    console.warn(`Failed to parse date from string: "${dateString}"`);
                }
            }
        }

        // Only remove brackets containing dates, not all brackets
        cleanTitle = cleanTitle
            .replace(/\s*[\-\|]\s*$/, '') // Remove trailing dashes or pipes
            .replace(/^\s*[\-\|]\s*/, '') // Remove leading dashes or pipes
            .replace(/\(.*\)/, '') // Remove Brackets
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

        // If cleanTitle is empty, try to recover original event name from brackets
        if (!cleanTitle) {
            const eventMatch = title.match(/\(([^\d]+)\)/);
            if (eventMatch && eventMatch[1]) {
                cleanTitle = eventMatch[1].trim();
            }
        }

        return {
            cleanTitle: cleanTitle,
            extractedDate: extractedDate
        };
    }

    
}

export default MySidelineEventParserService;