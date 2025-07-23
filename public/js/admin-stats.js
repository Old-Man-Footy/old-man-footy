/**
 * Admin Stats Page JavaScript
 * Handles date filtering, report exporting, and chart initialization functionality.
 * Refactored into a testable object pattern.
 */

export const adminStatsManager = {
    // An object to hold references to DOM elements
    elements: {},

    /**
     * Initializes the manager by caching DOM elements and setting up event listeners and charts.
     */
    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.toggleCustomDates(); // Run on init to set initial state
        this.initializeChart();
    },

    /**
     * Finds and stores all necessary DOM elements for easy access.
     */
    cacheElements() {
        this.elements = {
            periodSelect: document.getElementById('period'),
            startDateGroup: document.getElementById('startDateGroup'),
            endDateGroup: document.getElementById('endDateGroup'),
            exportButton: document.querySelector('[data-action="export-report"]'),
            chartElement: document.getElementById('myChart'),
        };
    },

    /**
     * Attaches all necessary event listeners to the DOM elements.
     */
    bindEvents() {
        if (this.elements.periodSelect) {
            this.elements.periodSelect.addEventListener('change', () => this.toggleCustomDates());
        }
        if (this.elements.exportButton) {
            this.elements.exportButton.addEventListener('click', () => this.exportReport());
        }
    },

    /**
     * Toggles the visibility of custom date fields based on the period selection.
     */
    toggleCustomDates() {
        const { periodSelect, startDateGroup, endDateGroup } = this.elements;
        if (!periodSelect || !startDateGroup || !endDateGroup) return;

        const isCustom = periodSelect.value === 'custom';
        startDateGroup.style.display = isCustom ? 'block' : 'none';
        endDateGroup.style.display = isCustom ? 'block' : 'none';
    },

    /**
     * Exports the current report as a CSV file.
     */
    async exportReport() {
        try {
            const params = new URLSearchParams(window.location.search);
            const response = await fetch('/admin/reports/export?' + params.toString());
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `system-report-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } else {
                alert('Error exporting report. Please try again.');
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('Error exporting report. Please try again.');
        }
    },

    /**
     * Initializes the Chart.js chart if the element and library are present.
     */
    initializeChart() {
        const { chartElement } = this.elements;
        if (typeof Chart !== 'undefined' && chartElement) {
            const ctx = chartElement.getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
                    datasets: [{
                        label: '# of Votes',
                        data: [12, 19, 3, 5, 2, 3],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.2)', 'rgba(54, 162, 235, 0.2)',
                            'rgba(255, 206, 86, 0.2)', 'rgba(75, 192, 192, 0.2)',
                            'rgba(153, 102, 255, 0.2)', 'rgba(255, 159, 64, 0.2)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)', 'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: { scales: { y: { beginAtZero: true } } }
            });
        }
    }
};

// This part runs in the browser to initialize the application.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        adminStatsManager.initialize();
    });
}
