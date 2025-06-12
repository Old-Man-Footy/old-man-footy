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
            // Dates in brackets: (DD/MM/YYYY), (DD-MM-YYYY), (DD Month YYYY), (DDth Month YYYY)
            {
                // New pattern for dates with ordinal indicators like "27th July 2024"
                pattern: /\s*\((\d{1,2}(?:st|nd|rd|th)[\s]+\w+[\s]+\d{4})\)\s*/gi,
                extract: (match) => match[1]
            },
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

    
}

module.exports = MySidelineEventParserService;