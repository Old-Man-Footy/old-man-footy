/**
 * Admin Stats Page JavaScript
 * Handles date filtering, report exporting, and chart initialization functionality
 */

/**
 * Toggle custom date fields based on period selection
 * Shows or hides custom date fields depending on the selected period.
 * Handles missing elements gracefully.
 * @returns {void}
 */
export function toggleCustomDates() {
    const periodElement = document.getElementById('period');
    const startDateGroup = document.getElementById('startDateGroup');
    const endDateGroup = document.getElementById('endDateGroup');
    if (!periodElement || !startDateGroup || !endDateGroup) return;
    const period = periodElement.value;
    if (period === 'custom') {
        startDateGroup.style.display = 'block';
        endDateGroup.style.display = 'block';
    } else {
        startDateGroup.style.display = 'none';
        endDateGroup.style.display = 'none';
    }
}

/**
 * Export report functionality
 */
export async function exportReport() {
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
}

/**
 * Initialize charts and statistics functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check if Chart.js is available and chart element exists
    const chartElement = document.getElementById('myChart');
    if (typeof Chart !== 'undefined' && chartElement) {
        const ctx = chartElement.getContext('2d');
        const myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
                datasets: [{
                    label: '# of Votes',
                    data: [12, 19, 3, 5, 2, 3],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
});