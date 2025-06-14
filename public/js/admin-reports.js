/**
 * Admin Reports JavaScript
 * Handles admin reports functionality including report generation and printing
 */

/**
 * Generate and download detailed system report
 */
function generateDetailedReport() {
    // Create a printable version of the report
    window.print();
}

/**
 * Initialize admin reports functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin reports page loaded, setting up functionality...');
    
    // Setup print button event listener
    const printBtn = document.querySelector('[data-action="print"]');
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            window.print();
        });
    }
    
    // Setup export report button event listener
    const exportBtn = document.querySelector('[data-action="export-report"]');
    if (exportBtn) {
        exportBtn.addEventListener('click', generateDetailedReport);
    }
    
    // Setup refresh report button event listener
    const refreshBtn = document.querySelector('[data-action="refresh-report"]');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            location.reload();
        });
    }
    
    // Add print-specific styles
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
    
    // Add print styles to document
    const styleElement = document.createElement('style');
    styleElement.textContent = printStyles;
    document.head.appendChild(styleElement);
    
    console.log('Admin reports functionality initialized successfully');
});