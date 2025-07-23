import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
// Import the manager object directly
import { adminReportsManager } from '/public/js/admin-reports.js';

/**
 * @file admin-reports.test.js
 * @description Unit tests for adminReportsManager.
 */

// Helper function to set up the DOM for each test
function setupDOM() {
    document.body.innerHTML = `
        <button data-action="print">Print</button>
        <button data-action="export-report">Export</button>
        <button data-action="refresh-report">Refresh</button>
    `;
}

describe('adminReportsManager', () => {
    beforeEach(() => {
        // Set up the DOM
        setupDOM();
        
        // Mock global functions
        vi.stubGlobal('print', vi.fn());
        
        // Manually mock the non-configurable window.location object
        const originalLocation = window.location;
        delete window.location;
        window.location = { ...originalLocation, reload: vi.fn() };

        // Initialize the manager, which caches elements and sets up listeners
        adminReportsManager.initialize();
    });

    afterEach(() => {
        // Clean up mocks and the DOM
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('should call window.print when the print button is clicked', () => {
        const printBtn = document.querySelector('[data-action="print"]');
        printBtn.click();
        expect(window.print).toHaveBeenCalledTimes(1);
    });

    it('should call generateDetailedReport (which calls print) when the export button is clicked', () => {
        const exportBtn = document.querySelector('[data-action="export-report"]');
        // Spy on the method to ensure it's called
        const generateReportSpy = vi.spyOn(adminReportsManager, 'generateDetailedReport');
        
        exportBtn.click();
        
        expect(generateReportSpy).toHaveBeenCalled();
        expect(window.print).toHaveBeenCalledTimes(1);
    });

    it('should call window.location.reload when the refresh button is clicked', () => {
        const refreshBtn = document.querySelector('[data-action="refresh-report"]');
        refreshBtn.click();
        expect(window.location.reload).toHaveBeenCalledTimes(1);
    });

    it('should add print styles to the document head', () => {
        // The initialize method already called addPrintStyles
        const styleElement = document.head.querySelector('style');
        expect(styleElement).not.toBeNull();
        expect(styleElement.textContent).toContain('@media print');
        expect(styleElement.textContent).toContain('.no-print');
    });

    it('should not throw an error if buttons are missing', () => {
        // Clear the DOM so no elements are found
        document.body.innerHTML = '';
        // The initialize method should run without throwing an error
        expect(() => adminReportsManager.initialize()).not.toThrow();
    });
});
