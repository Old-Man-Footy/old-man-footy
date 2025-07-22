import { describe, it, expect, beforeEach, vi } from 'vitest';
import MySidelineEventParserService from '/services/mySidelineEventParserService.mjs';

// Mock MySidelineDataService and its parseDate method
vi.mock('./mySidelineDataService.mjs', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      parseDate: vi.fn((dateString) => {
        // Simulate parsing: return ISO string for known formats, null otherwise
        // Accepts DD/MM/YYYY, DD-MM-YYYY, DD Month YYYY, DDth Month YYYY, Month DD, YYYY
        const patterns = [
          // 19/07/2025 or 19-07-2025
          /^(?<d>\d{1,2})[\/\-](?<m>\d{1,2})[\/\-](?<y>\d{4})$/,
          // 27th July 2024, 27 July 2024
          /^(?<d>\d{1,2})(?:st|nd|rd|th)?\s+(?<month>[A-Za-z]+)\s+(?<y>\d{4})$/,
          // Sep 20, 2024 or September 20, 2024
          /^(?<month>[A-Za-z]+)\s+(?<d>\d{1,2}),?\s+(?<y>\d{4})$/
        ];
        for (const p of patterns) {
          const m = dateString.match(p);
          if (m) {
            let { d, m: monthNum, y, month } = m.groups || {};
            if (!monthNum && month) {
              // Convert month name to number
              const months = [
                'january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december'
              ];
              monthNum =
                months.findIndex(
                  (mon) => mon.startsWith(month.toLowerCase())
                ) + 1;
            }
            if (d && monthNum && y) {
              return `${y.padStart(4, '0')}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            }
            if (d && month && y) {
              // Already handled above
              return `${y.padStart(4, '0')}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            }
          }
        }
        return null;
      })
    }))
  };
});

describe('MySidelineEventParserService', () => {
  let parser;

  beforeEach(() => {
    parser = new MySidelineEventParserService();
  });

  it('returns original title and null date if input is not a string', () => {
    expect(parser.extractAndStripDateFromTitle(null)).toEqual({ cleanTitle: null, extractedDate: null });
    expect(parser.extractAndStripDateFromTitle(undefined)).toEqual({ cleanTitle: undefined, extractedDate: null });
    expect(parser.extractAndStripDateFromTitle(123)).toEqual({ cleanTitle: 123, extractedDate: null });
  });

  it('extracts date in (DD/MM/YYYY) format from title', () => {
    const result = parser.extractAndStripDateFromTitle('Some Event (19/07/2025)');
    expect(result.cleanTitle).toBe('Some Event');
    expect(result.extractedDate).toBe('2025-07-19');
  });

  it('extracts date in (DD-MM-YYYY) format from title', () => {
    const result = parser.extractAndStripDateFromTitle('Another Event (05-12-2024)');
    expect(result.cleanTitle).toBe('Another Event');
    expect(result.extractedDate).toBe('2024-12-05');
  });

  it('extracts date in (DDth Month YYYY) format from title', () => {
    const result = parser.extractAndStripDateFromTitle('Carnival (27th July 2024)');
    expect(result.cleanTitle).toBe('Carnival');
    expect(result.extractedDate).toBe('2024-07-27');
  });

  it('extracts date in (Month DD, YYYY) format from title', () => {
    const result = parser.extractAndStripDateFromTitle('Special (Sep 20, 2024)');
    expect(result.cleanTitle).toBe('Special');
    expect(result.extractedDate).toBe('2024-09-20');
  });

  it('extracts date with - DD/MM/YYYY format', () => {
    const result = parser.extractAndStripDateFromTitle('Event Name - 21/06/2025');
    expect(result.cleanTitle).toBe('Event Name');
    expect(result.extractedDate).toBe('2025-06-21');
  });

  it('extracts date with | DDth Month YYYY format', () => {
    const result = parser.extractAndStripDateFromTitle('Event | 20th Sep 2024');
    expect(result.cleanTitle).toBe('Event');
    expect(result.extractedDate).toBe('2024-09-20');
  });

  it('extracts date at end: Title DD/MM/YYYY', () => {
    const result = parser.extractAndStripDateFromTitle('My Event 05/02/2026');
    expect(result.cleanTitle).toBe('My Event');
    expect(result.extractedDate).toBe('2026-02-05');
  });

  it('extracts date at end: Title DDth Month YYYY', () => {
    const result = parser.extractAndStripDateFromTitle('Carnival 20th Sep 2024');
    expect(result.cleanTitle).toBe('Carnival');
    expect(result.extractedDate).toBe('2024-09-20');
  });

  it('extracts date at end: Title Month DD, YYYY', () => {
    const result = parser.extractAndStripDateFromTitle('Special Sep 20, 2024');
    expect(result.cleanTitle).toBe('Special');
    expect(result.extractedDate).toBe('2024-09-20');
  });

  it('removes trailing and leading dashes or pipes', () => {
    const result = parser.extractAndStripDateFromTitle('- Event Name - 21/06/2025 -');
    expect(result.cleanTitle).toBe('Event Name');
    expect(result.extractedDate).toBe('2025-06-21');
  });

  it('removes brackets and normalizes whitespace', () => {
    const result = parser.extractAndStripDateFromTitle('  (Some Event) (19/07/2025)  ');
    expect(result.cleanTitle).toBe('Some Event');
    expect(result.extractedDate).toBe('2025-07-19');
  });

  it('returns original title and null date if no date is found', () => {
    const result = parser.extractAndStripDateFromTitle('Just a regular event');
    expect(result.cleanTitle).toBe('Just a regular event');
    expect(result.extractedDate).toBeNull();
  });

  it('returns original title and null date if date is unparseable', () => {
    // The mock parseDate returns null for unknown formats
    const result = parser.extractAndStripDateFromTitle('Event (notadate)');
    expect(result.cleanTitle).toBe('Event');
    expect(result.extractedDate).toBeNull();
  });
});