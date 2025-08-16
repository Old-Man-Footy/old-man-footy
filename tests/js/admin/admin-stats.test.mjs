import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
// Import the manager object directly
import { adminStatsManager } from '/public/js/admin-stats.js';

/**
 * @file admin-stats.test.js
 * @description Unit tests for adminStatsManager.
 */

// Helper function to set up the DOM for each test
function setupDOM() {
    document.body.innerHTML = `
        <select id="period">
            <option value="week">This Week</option>
            <option value="custom">Custom</option>
        </select>
        <div class="custom-date-group" id="startDateGroup" style="display: none;"></div>
        <div class="custom-date-group" id="endDateGroup" style="display: none;"></div>
        <button data-action="export-report">Export</button>
        <canvas id="myChart"></canvas>
    `;
}

describe('adminStatsManager', () => {
    beforeEach(() => {
        // Set up the DOM
        setupDOM();
        
        // Mock global objects
        vi.stubGlobal('alert', vi.fn());
        vi.stubGlobal('fetch', vi.fn());
        vi.stubGlobal('URL', {
            createObjectURL: vi.fn(() => 'blob:mock-url'),
            revokeObjectURL: vi.fn(),
        });
        
        // Mock the Chart.js constructor
        vi.stubGlobal('Chart', vi.fn(() => ({
            // Mock chart instance methods if needed
        })));
    });

    afterEach(() => {
        // Clean up mocks and the DOM
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    describe('Date Filtering', () => {
        it('should show custom date fields when period is "custom"', () => {
            const periodSelect = document.getElementById('period');
            const startDateGroup = document.getElementById('startDateGroup');
            
            // Initialize the manager to set up listeners
            adminStatsManager.initialize();
            
            // Simulate selecting 'Custom'
            periodSelect.value = 'custom';
            periodSelect.dispatchEvent(new Event('change'));

            expect(startDateGroup.style.display).toBe('block');
        });

        it('should hide custom date fields when period is not "custom"', () => {
            const periodSelect = document.getElementById('period');
            const startDateGroup = document.getElementById('startDateGroup');
            
            // Start with them visible
            startDateGroup.style.display = 'block';
            
            adminStatsManager.initialize();
            
            // Simulate selecting 'This Week'
            periodSelect.value = 'week';
            periodSelect.dispatchEvent(new Event('change'));

            expect(startDateGroup.style.display).toBe('none');
        });
    });

    describe('Report Exporting', () => {
        it('should trigger a download on successful export', async () => {
            // Mock a successful fetch response
            fetch.mockResolvedValue({
                ok: true,
                blob: () => Promise.resolve(new Blob(['csv,content'])),
            });
            
            adminStatsManager.initialize();
            const exportButton = document.querySelector('[data-action="export-report"]');
            
            // Simulate a click
            exportButton.click();

            // Wait for the async operations to complete
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(fetch).toHaveBeenCalled();
            expect(URL.createObjectURL).toHaveBeenCalled();
        });

        it('should show an alert on a failed export', async () => {
            // Mock a failed fetch response
            fetch.mockResolvedValue({ ok: false });
            
            adminStatsManager.initialize();
            const exportButton = document.querySelector('[data-action="export-report"]');
            
            exportButton.click();
            
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(alert).toHaveBeenCalledWith('Error exporting report. Please try again.');
        });
    });

    describe('Chart Initialization', () => {
        it('should create a new Chart if the element and library exist', () => {
            adminStatsManager.initialize();
            expect(Chart).toHaveBeenCalled();
        });

        it('should not throw an error if Chart.js is not available', () => {
            // Undefine Chart for this test
            vi.stubGlobal('Chart', undefined);
            expect(() => adminStatsManager.initialize()).not.toThrow();
        });
    });
});
