/**
 * Unit tests for dateUtils.mjs
 * Tests date parsing, validation, and formatting utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseFlexibleDate, formatDateForDatabase, validateBirthDate } from '../../utils/dateUtils.mjs';

describe('dateUtils', () => {
    beforeEach(() => {
        // Reset any mocked functions
        vi.restoreAllMocks();
    });

    describe('parseFlexibleDate', () => {
        describe('null and empty input handling', () => {
            it('should return null for null input', () => {
                expect(parseFlexibleDate(null)).toBeNull();
            });

            it('should return null for undefined input', () => {
                expect(parseFlexibleDate(undefined)).toBeNull();
            });

            it('should return null for empty string', () => {
                expect(parseFlexibleDate('')).toBeNull();
            });

            it('should return null for whitespace-only string', () => {
                expect(parseFlexibleDate('   ')).toBeNull();
            });

            it('should not handle zero as a valid Excel serial date', () => {
                expect(parseFlexibleDate(0)).toBeNull();
            });
        });

        describe('Excel serial date numbers', () => {
            it('should parse Excel serial date 1 (1900-01-01)', () => {
                const result = parseFlexibleDate(1);
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(1900);
                expect(result.getMonth()).toBe(0); // January
                expect(result.getDate()).toBe(1);
            });

            it('should parse Excel serial date 44627 (2022-03-07)', () => {
                const result = parseFlexibleDate(44627);
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(2022);
                expect(result.getMonth()).toBe(2); // March
                expect(result.getDate()).toBe(7);
            });

            it('should handle Excel leap year bug (day 60 and beyond)', () => {
                // Day 60 in Excel is Feb 29, 1900 (which doesn't exist)
                // Day 61 should be March 1, 1900
                const result = parseFlexibleDate(61);
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(1900);
                expect(result.getMonth()).toBe(2); // March
                expect(result.getDate()).toBe(1);
            });

            it('should parse string representation of Excel serial dates', () => {
                const result = parseFlexibleDate('44627');
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(2022);
            });

            it('should reject unreasonable serial date numbers', () => {
                expect(parseFlexibleDate(-1)).toBeNull();
                expect(parseFlexibleDate(999999)).toBeNull();
            });
        });

        describe('ISO format (YYYY-MM-DD)', () => {
            it('should parse standard ISO date format', () => {
                const result = parseFlexibleDate('2024-07-19');
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(2024);
                expect(result.getMonth()).toBe(6); // July
                expect(result.getDate()).toBe(19);
            });

            it('should parse ISO format with single digit month/day', () => {
                const result = parseFlexibleDate('2024-7-9');
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(2024);
                expect(result.getMonth()).toBe(6); // July
                expect(result.getDate()).toBe(9);
            });

            it('should parse ISO format with spaces as separators', () => {
                const result = parseFlexibleDate('2024 07 19');
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(2024);
                expect(result.getMonth()).toBe(6); // July
                expect(result.getDate()).toBe(19);
            });

            it('should reject invalid ISO dates', () => {
                expect(parseFlexibleDate('2024-13-01')).toBeNull(); // Invalid month
                expect(parseFlexibleDate('2024-02-30')).toBeNull(); // Invalid day
                expect(parseFlexibleDate('24-07-19')).toBeNull(); // Invalid year format
            });
        });

        describe('European/Australian format (DD/MM/YYYY)', () => {
            it('should parse DD/MM/YYYY format', () => {
                const result = parseFlexibleDate('19/07/2024');
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(2024);
                expect(result.getMonth()).toBe(6); // July
                expect(result.getDate()).toBe(19);
            });

            it('should parse DD-MM-YYYY format', () => {
                const result = parseFlexibleDate('19-07-2024');
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(2024);
                expect(result.getMonth()).toBe(6); // July
                expect(result.getDate()).toBe(19);
            });

            it('should parse single digit day/month', () => {
                const result = parseFlexibleDate('9/7/2024');
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(2024);
                expect(result.getMonth()).toBe(6); // July
                expect(result.getDate()).toBe(9);
            });

            it('should handle unambiguous dates (day > 12)', () => {
                const result = parseFlexibleDate('15/03/2024');
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(2024);
                expect(result.getMonth()).toBe(2); // March
                expect(result.getDate()).toBe(15);
            });
        });

        describe('US format (MM/DD/YYYY)', () => {
            it('should parse MM/DD/YYYY when month > 12', () => {
                const result = parseFlexibleDate('01/13/2024');
                expect(result.getFullYear()).toBe(2024);
                expect(result.getMonth()).toBe(0);
                expect(result.getDate()).toBe(13);
            });

            it('should handle ambiguous dates by preferring DD/MM/YYYY', () => {
                // 03/05/2024 could be March 5 or May 3
                // Should be interpreted as 3rd May 2024 (DD/MM/YYYY)
                const result = parseFlexibleDate('03/05/2024');
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(2024);
                expect(result.getMonth()).toBe(4); // May (index 4)
                expect(result.getDate()).toBe(3);
            });
        });

        describe('Month name formats', () => {
            it('should parse DD Month YYYY format', () => {
                const result = parseFlexibleDate('19 July 2024');
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(2024);
                expect(result.getMonth()).toBe(6); // July
                expect(result.getDate()).toBe(19);
            });

            it('should parse Month DD, YYYY format', () => {
                const result = parseFlexibleDate('July 19, 2024');
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(2024);
                expect(result.getMonth()).toBe(6); // July
                expect(result.getDate()).toBe(19);
            });

            it('should parse Month DD YYYY format (without comma)', () => {
                const result = parseFlexibleDate('July 19 2024');
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(2024);
                expect(result.getMonth()).toBe(6); // July
                expect(result.getDate()).toBe(19);
            });

            it('should handle ordinal suffixes', () => {
                const result = parseFlexibleDate('19th July 2024');
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(2024);
                expect(result.getMonth()).toBe(6); // July
                expect(result.getDate()).toBe(19);
            });

            it('should parse abbreviated month names', () => {
                const result = parseFlexibleDate('19 Jul 2024');
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(2024);
                expect(result.getMonth()).toBe(6); // July
                expect(result.getDate()).toBe(19);
            });

            it('should handle case insensitive month names', () => {
                const result = parseFlexibleDate('19 JULY 2024');
                expect(result).toBeInstanceOf(Date);
                expect(result.getFullYear()).toBe(2024);
                expect(result.getMonth()).toBe(6); // July
                expect(result.getDate()).toBe(19);
            });

            it('should reject invalid month names', () => {
                expect(parseFlexibleDate('19 Blarch 2024')).toBeNull();
            });
        });

        describe('Edge cases and invalid inputs', () => {
            it('should reject completely invalid strings', () => {
                expect(parseFlexibleDate('not a date')).toBeNull();
                expect(parseFlexibleDate('abc/def/ghij')).toBeNull();
                expect(parseFlexibleDate('!!!')).toBeNull();
            });

            it('should reject impossible dates', () => {
                expect(parseFlexibleDate('30/02/2024')).toBeNull(); // Feb 30th
                expect(parseFlexibleDate('31/04/2024')).toBeNull(); // April 31st
            });

            it('should handle leap year correctly', () => {
                const result = parseFlexibleDate('29/02/2024'); // 2024 is a leap year
                expect(result).toBeInstanceOf(Date);
                expect(result.getDate()).toBe(29);
                expect(result.getMonth()).toBe(1); // February

                expect(parseFlexibleDate('29/02/2023')).toBeNull(); // 2023 is not a leap year
            });

            it('should handle various separators', () => {
                expect(parseFlexibleDate('19.07.2024')).toBeNull(); // Dots not supported in current implementation
                expect(parseFlexibleDate('19 07 2024')).toBeInstanceOf(Date); // Spaces supported
            });
        });

        describe('Fallback parsing', () => {
            it('should use JavaScript Date constructor as fallback', () => {
                // JavaScript can parse many ISO-like formats
                const result = parseFlexibleDate('2024-07-19T10:30:00Z');
                expect(result).toBeInstanceOf(Date);
            });

            it('should reject fallback dates that are invalid', () => {
                const result = parseFlexibleDate('invalid date string');
                expect(result).toBeNull();
            });
        });
    });

    describe('formatDateForDatabase', () => {
        it('should format a valid date to YYYY-MM-DD', () => {
            const date = new Date(2024, 6, 19); // July 19, 2024
            const result = formatDateForDatabase(date);
            expect(result).toBe('2024-07-19');
        });

        it('should pad single digit months and days with zeros', () => {
            const date = new Date(2024, 0, 5); // January 5, 2024
            const result = formatDateForDatabase(date);
            expect(result).toBe('2024-01-05');
        });

        it('should return null for invalid Date objects', () => {
            const invalidDate = new Date('invalid');
            expect(formatDateForDatabase(invalidDate)).toBeNull();
        });

        it('should return null for non-Date objects', () => {
            expect(formatDateForDatabase('2024-07-19')).toBeNull();
            expect(formatDateForDatabase(null)).toBeNull();
            expect(formatDateForDatabase(undefined)).toBeNull();
            expect(formatDateForDatabase({})).toBeNull();
        });

        it('should handle edge dates correctly', () => {
            // Test leap day
            const leapDay = new Date(2024, 1, 29); // Feb 29, 2024
            expect(formatDateForDatabase(leapDay)).toBe('2024-02-29');

            // Test end of year
            const endOfYear = new Date(2024, 11, 31); // Dec 31, 2024
            expect(formatDateForDatabase(endOfYear)).toBe('2024-12-31');

            // Test beginning of year
            const beginningOfYear = new Date(2024, 0, 1); // Jan 1, 2024
            expect(formatDateForDatabase(beginningOfYear)).toBe('2024-01-01');
        });
    });

    describe('validateBirthDate', () => {
        // Use real dates for testing - this is more reliable than mocking

        describe('successful validation', () => {
            it('should validate a reasonable birth date', () => {
                // Use a date that's 25 years old - well within valid range
                const currentYear = new Date().getFullYear();
                const birthYear = currentYear - 25;
                const birthDate = `${birthYear}-03-15`;
                const result = validateBirthDate(birthDate);
                expect(result.success).toBe(true);
                expect(result.date).toBeInstanceOf(Date);
                expect(result.formattedDate).toBe(birthDate);
                expect(result.error).toBeUndefined();
            });

            it('should validate birth dates in various formats', () => {
                // Use a year that's 25 years ago for testing
                const currentYear = new Date().getFullYear();
                const birthYear = currentYear - 25;
                const expectedDate = `${birthYear}-03-15`;
                
                const formats = [
                    `15/03/${birthYear}`,
                    `15-03-${birthYear}`,
                    `${birthYear}-03-15`,
                    `15 March ${birthYear}`,
                    `March 15, ${birthYear}`
                ];

                formats.forEach(format => {
                    const result = validateBirthDate(format);
                    expect(result.success).toBe(true);
                    expect(result.date).toBeInstanceOf(Date);
                    expect(result.formattedDate).toBe(expectedDate);
                });
            });

            it('should validate minimum age boundary (exactly 5 years old)', () => {
                // Calculate a date that's exactly 5 years ago
                const now = new Date();
                const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
                const dateString = fiveYearsAgo.toISOString().split('T')[0];
                const result = validateBirthDate(dateString);
                expect(result.success).toBe(true);
            });
        });

        describe('validation failures', () => {
            it('should reject invalid date formats', () => {
                const result = validateBirthDate('not a date');
                expect(result.success).toBe(false);
                expect(result.error).toBe('Invalid date format');
                expect(result.date).toBeNull();
            });

            it('should reject null and undefined inputs', () => {
                expect(validateBirthDate(null).success).toBe(false);
                expect(validateBirthDate(undefined).success).toBe(false);
                expect(validateBirthDate('').success).toBe(false);
            });

            it('should reject dates that are too far in the past', () => {
                // Calculate a date that's more than 100 years ago
                const currentYear = new Date().getFullYear();
                const tooOldDate = `${currentYear - 101}-01-01`;
                const result = validateBirthDate(tooOldDate);
                expect(result.success).toBe(false);
                expect(result.error).toBe('Birth date is too far in the past (over 100 years ago)');
                expect(result.date).toBeInstanceOf(Date);
            });

            it('should reject dates that are too recent', () => {
                // Calculate a date that's less than 5 years ago
                const currentYear = new Date().getFullYear();
                const tooRecentDate = `${currentYear - 3}-01-01`;
                const result = validateBirthDate(tooRecentDate);
                expect(result.success).toBe(false);
                expect(result.error).toBe('Birth date is too recent (must be at least 5 years old)');
                expect(result.date).toBeInstanceOf(Date);
            });

            it('should reject future dates', () => {
                // Calculate a future date
                const currentYear = new Date().getFullYear();
                const futureDate = `${currentYear + 1}-01-01`;
                const result = validateBirthDate(futureDate);
                expect(result.success).toBe(false);
                expect(result.error).toBe('Birth date is too recent (must be at least 5 years old)');
            });

            it('should reject impossible dates', () => {
                const result = validateBirthDate('30/02/1995'); // Feb 30th doesn't exist
                expect(result.success).toBe(false);
                expect(result.error).toBe('Invalid date format');
            });
        });

        describe('edge cases', () => {
            it('should handle Excel serial dates', () => {
                // Excel serial date for March 15, 1995
                const result = validateBirthDate('34772');
                expect(result.success).toBe(true);
                expect(result.date.getFullYear()).toBe(1995);
                expect(result.date.getMonth()).toBe(2); // March
                expect(result.date.getDate()).toBe(14);
            });

            it('should handle whitespace in date strings', () => {
                const result = validateBirthDate('  1995-03-15  ');
                expect(result.success).toBe(true);
                expect(result.formattedDate).toBe('1995-03-15');
            });

            it('should handle ordinal suffixes in dates', () => {
                const result = validateBirthDate('15th March 1995');
                expect(result.success).toBe(true);
                expect(result.formattedDate).toBe('1995-03-15');
            });
        });

        describe('return value structure', () => {
            it('should return correct structure for valid dates', () => {
                const result = validateBirthDate('1995-03-15');
                expect(result).toHaveProperty('success');
                expect(result).toHaveProperty('date');
                expect(result).toHaveProperty('formattedDate');
                expect(result).not.toHaveProperty('error');
            });

            it('should return correct structure for invalid dates', () => {
                const result = validateBirthDate('invalid');
                expect(result).toHaveProperty('success');
                expect(result).toHaveProperty('error');
                expect(result).toHaveProperty('date');
                expect(result).not.toHaveProperty('formattedDate');
            });

            it('should include date object even for age validation failures', () => {
                // Use a recent date that's less than 5 years old
                const currentYear = new Date().getFullYear();
                const recentDate = `${currentYear - 2}-01-01`;
                const result = validateBirthDate(recentDate);
                expect(result.success).toBe(false);
                expect(result.date).toBeInstanceOf(Date);
                expect(result.error).toContain('too recent');
            });
        });
    });

    describe('integration tests', () => {
        it('should handle a complete CSV import workflow', () => {
            // Use years that are within valid age range (6-99 years old)
            const currentYear = new Date().getFullYear();
            const validYear1 = currentYear - 25; // 25 years old
            const validYear2 = currentYear - 30; // 30 years old
            const validYear3 = currentYear - 40; // 40 years old
            const validYear4 = currentYear - 20; // 20 years old
            
            const csvDates = [
                `15/03/${validYear1}`,     // DD/MM/YYYY
                `03-15-${validYear2}`,     // MM/DD/YYYY
                `${validYear2}-12-25`,     // YYYY-MM-DD
                `January 1, ${validYear3}`, // Month DD, YYYY
            ];

            const results = csvDates.map(date => validateBirthDate(date));

            // First date should succeed
            expect(results[0].success).toBe(true);
            expect(results[0].formattedDate).toBe(`${validYear1}-03-15`);

            // Second date should succeed as US format
            expect(results[1].success).toBe(true);
            expect(results[1].formattedDate).toBe(`${validYear2}-03-15`);

            // Third date should succeed
            expect(results[2].success).toBe(true);
            expect(results[2].formattedDate).toBe(`${validYear2}-12-25`);

            // Fourth date should succeed
            expect(results[3].success).toBe(true);
            expect(results[3].formattedDate).toBe(`${validYear3}-01-01`);
        });

        it('should handle various Excel export formats', () => {
            const excelFormats = [
                '15/03/1995',      // European format
                '15-03-1995',      // With dashes
                '15 March 1995',   // With month name
                '15th March 1995', // With ordinal
                '34773'            // Serial date
            ];

            excelFormats.forEach(format => {
                const result = validateBirthDate(format);
                expect(result.date.getFullYear()).toBe(1995);
                expect(result.date.getMonth()).toBe(2); // March
                expect(result.date.getDate()).toBe(15);
            });
        });
    });
});
