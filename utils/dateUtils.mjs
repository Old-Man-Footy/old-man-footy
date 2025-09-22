/**
 * Date Utility Functions
 * 
 * Provides robust date parsing and formatting utilities for the application
 */

/**
 * A robust function to parse various date string formats into a Date object (local time).
 * This handles common formats that might come from Excel/CSV exports.
 * 
 * Supported formats:
 * - DD/MM/YYYY (e.g., "19/07/2025")
 * - DD-MM-YYYY (e.g., "19-07-2025") 
 * - YYYY-MM-DD (e.g., "2025-07-19")
 * - DD Month YYYY (e.g., "27 July 2024", "27th July 2024")
 * - Month DD, YYYY (e.g., "July 27, 2024")
 * - MM/DD/YYYY (US format, detected when day > 12)
 * - Excel serial dates (numbers)
 *
 * @param {string|number} dateInput - The date string or number to parse
 * @returns {Date|null} A valid Date object or null if parsing fails
 */
export function parseFlexibleDate(dateInput) {
    if (!dateInput && dateInput !== 0) {
        return null;
    }

    // Handle Excel serial date numbers
    if (typeof dateInput === 'number' || (typeof dateInput === 'string' && !isNaN(dateInput) && !isNaN(parseFloat(dateInput)))) {
        const serialDate = parseFloat(dateInput);
        
        // Excel serial dates start from 1900-01-01 (but Excel incorrectly treats 1900 as a leap year)
        // Serial date 1 = 1900-01-01
        if (serialDate > 0 && serialDate < 100000) { // reasonable range for Excel dates
            // Excel uses 1900-01-01 as day 1, but has a leap year bug treating 1900 as leap year
            // Day 60 is Feb 29, 1900 which doesn't exist, so we need to handle this
            
            // Calculate days from the Excel epoch (1900-01-01)
            let daysFromEpoch = Math.floor(serialDate) - 1; // -1 because Excel day 1 is 1900-01-01
            
            // Account for Excel's leap year bug: if day >= 60, subtract 1 day
            if (serialDate >= 60) {
                daysFromEpoch -= 1;
            }
            
            // Create date starting from 1900-01-01
            const excelEpoch = new Date(1900, 0, 1); // January 1, 1900
            const jsDate = new Date(excelEpoch.getTime() + daysFromEpoch * 24 * 60 * 60 * 1000);
            
            if (!isNaN(jsDate.getTime()) && jsDate.getFullYear() >= 1900 && jsDate.getFullYear() < 2100) {
                return jsDate;
            }
        }
        else if (serialDate <= 0 || serialDate >= 100000) {
            // If number is out of range, return null
            return null;
        }
    }

    const dateString = String(dateInput).trim();
    
    // Return null for empty strings
    if (!dateString) {
        return null;
    }

    // --- 1. Normalise the string ---
    // Remove ordinal suffixes (st, nd, rd, th) from days
    const cleanString = dateString.replace(/(\d+)(st|nd|rd|th)/i, '$1');

    let match;

    // --- 2. Define patterns for parsing ---
    // Pattern 1: YYYY-MM-DD (ISO format)
    const patternISO = /^(\d{4})[-\s](\d{1,2})[-\s](\d{1,2})$/;
    match = cleanString.match(patternISO);
    if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        
        // Validate month and day ranges
        if (month < 1 || month > 12 || day < 1 || day > 31) {
            return null;
        }
        
        const date = new Date(year, month - 1, day);
        // Check if date rolled over (invalid date like Feb 30)
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            return date;
        }
        return null;
    }

    // Pattern 2: DD/MM/YYYY or DD-MM-YYYY (European/Australian format)
    const patternDMY = /^(\d{1,2})[\s\/\-](\d{1,2})[\s\/\-](\d{4})$/;
    match = cleanString.match(patternDMY);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        
        // Always try DD/MM/YYYY first if month is valid
        if (month <= 12) {
            const date = new Date(year, month - 1, day);
            if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
                return date;
            }
        } else if (day <= 12 && month > 12) {          
            // If month > 12 and day <= 12, try MM/DD/YYYY (US format)
            if (month <= 31) {
                const dateUS = new Date(year, day - 1, month);
                if (dateUS.getFullYear() === year && dateUS.getMonth() === day - 1 && dateUS.getDate() === month) {
                    return dateUS;
                }
            }
            return null;
        }
        return null;      
    }
    

    // Pattern 3: MM/DD/YYYY (US format) - only try this if day/month are ambiguous
    const patternMDY = /^(\d{1,2})[\s\/\-](\d{1,2})[\s\/\-](\d{4})$/;
    match = cleanString.match(patternMDY);
    if (match) {
        const first = parseInt(match[1], 10);
        const second = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        
        // Validate ranges
        if (first < 1 || first > 12 || second < 1 || second > 31) {
            return null;
        }
        
        // Only try MM/DD/YYYY if first number > 12 (clearly a month) or both are <= 12
        if (first > 12 || (first <= 12 && second <= 12)) {
            const date = new Date(year, first - 1, second);
            if (date.getFullYear() === year && date.getMonth() === first - 1 && date.getDate() === second) {
                return date;
            }
        }
        return null;
    }

    // Pattern 4: DD Month YYYY and Month DD, YYYY
    const patternMonthName = /^(?:(\d{1,2})\s+([a-zA-Z]{3,})\s+(\d{4}))|(?:([a-zA-Z]{3,})\s+(\d{1,2}),?\s+(\d{4}))$/i;
    match = cleanString.match(patternMonthName);
    if (match) {
        const day = parseInt(match[1] || match[5], 10);
        const monthStr = match[2] || match[4];
        const year = parseInt(match[3] || match[6], 10);
        
        // Validate day range
        if (day < 1 || day > 31) {
            return null;
        }
        
        // Parse month name to index
        const monthIndex = getMonthIndex(monthStr);
        if (monthIndex >= 0) {
            const date = new Date(year, monthIndex, day);
            if (date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day) {
                return date;
            }
        }
        return null;
    }

    // --- 3. Fallback for any other valid formats ---
    const fallbackDate = new Date(cleanString);
    if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate;
    }

    // Return null if no patterns matched or date was invalid
    return null;
}

/**
 * Get month index from month name or abbreviation
 * @param {string} monthStr - Month name or abbreviation
 * @returns {number} Month index (0-11) or -1 if not found
 */
export function getMonthIndex(monthStr) {
    const months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
    ];
    
    const monthAbbrevs = [
        'jan', 'feb', 'mar', 'apr', 'may', 'jun',
        'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ];
    
    const lowerMonth = monthStr.toLowerCase();
    
    // Check full month names
    let index = months.indexOf(lowerMonth);
    if (index >= 0) return index;
    
    // Check abbreviations
    index = monthAbbrevs.indexOf(lowerMonth);
    if (index >= 0) return index;
    
    // Try JavaScript's built-in parsing as fallback
    const testDate = new Date(Date.parse(monthStr + " 1, 2000"));
    if (!isNaN(testDate.getTime())) {
        return testDate.getMonth();
    }
    
    return -1;
}

/**
 * Format a date to YYYY-MM-DD string (database format)
 * @param {Date} date - Date object to format
 * @returns {string|null} Formatted date string or null if invalid
 */
export function formatDateForDatabase(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return null;
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Validate if a date string can be parsed and is a reasonable birth date
 * @param {string} dateString - Date string to validate
 * @returns {Object} Validation result with success flag and parsed date
 */
export function validateBirthDate(dateString) {
    const parsedDate = parseFlexibleDate(dateString);
    
    if (!parsedDate) {
        return {
            success: false,
            error: 'Invalid date format',
            date: null
        };
    }
    
    const now = new Date();
    const minAge = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate()); // 100 years ago
    const maxAge = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate()); // 5 years ago (min age for players)
    
    if (parsedDate < minAge) {
        return {
            success: false,
            error: 'Birth date is too far in the past (over 100 years ago)',
            date: parsedDate
        };
    }
    
    if (parsedDate > maxAge) {
        return {
            success: false,
            error: 'Birth date is too recent (must be at least 5 years old)',
            date: parsedDate
        };
    }
    
    return {
        success: true,
        date: parsedDate,
        formattedDate: formatDateForDatabase(parsedDate)
    };
}
