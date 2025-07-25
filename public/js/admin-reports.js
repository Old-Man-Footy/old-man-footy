/**
 * Admin Reports JavaScript
 * Handles admin reports functionality including report generation and printing.
 * Refactored into a testable object pattern.
 */

export const adminReportsManager = {
    // An object to hold references to DOM elements
    elements: {},

    /**
     * Initializes the manager by caching DOM elements, adding styles, and setting up event listeners.
     */
    initialize() {
        this.cacheElements();
        this.addPrintStyles();
        this.bindEvents();
        console.log('Admin reports functionality initialized successfully');
    },

    /**
     * Finds and stores all necessary DOM elements for easy access.
     */
    cacheElements() {
        this.elements = {
            printBtn: document.querySelector('[data-action="print"]'),
            exportBtn: document.querySelector('[data-action="export-report"]'),
            refreshBtn: document.querySelector('[data-action="refresh-report"]'),
        };
    },

    /**
     * Attaches all necessary event listeners to the DOM elements.
     */
    bindEvents() {
        if (this.elements.printBtn) {
            this.elements.printBtn.addEventListener('click', () => this.printReport());
        }
        if (this.elements.exportBtn) {
            this.elements.exportBtn.addEventListener('click', () => this.generateDetailedReport());
        }
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.refreshPage());
        }
    },

    /**
     * Triggers the browser's print functionality.
     */
    printReport() {
        window.print();
    },

    /**
     * Generates and downloads a detailed system report (currently triggers printing).
     */
    generateDetailedReport() {
        this.printReport();
    },

    /**
     * Reloads the current page.
     */
    refreshPage() {
        window.location.reload();
    },

    /**
     * Injects print-specific CSS styles into the document's head.
     */
    addPrintStyles() {
        const printStyles = `
            @media print {
                .btn, .card-header {
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                .no-print {
                    display: none !important;
                }
                .card {
                    break-inside: avoid;
                    margin-bottom: 1rem;
                }
            }
        `;
        const styleElement = document.createElement('style');
        styleElement.textContent = printStyles;
        document.head.appendChild(styleElement);
    }
};

// This part runs in the browser to initialize the application.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        adminReportsManager.initialize();
    });
}
