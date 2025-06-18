/**
 * Maintenance Page JavaScript
 * Handles client-side functionality for the maintenance page
 * Follows project guidelines by keeping logic in external JS files
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Maintenance page loaded');
    
    // Update current time display
    updateCurrentTime();
    
    // Set up auto-refresh functionality
    setupAutoRefresh();
    
    // Set up refresh button enhancement
    setupRefreshButton();
});

/**
 * Update the current time display
 */
function updateCurrentTime() {
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        const now = new Date();
        const timeString = now.toLocaleString('en-AU', {
            timeZone: 'Australia/Sydney',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        timeElement.textContent = timeString;
    }
}

/**
 * Set up auto-refresh functionality to check if maintenance mode is disabled
 */
function setupAutoRefresh() {
    // Check maintenance status every 30 seconds
    setInterval(async function() {
        try {
            const response = await fetch('/api/maintenance/status');
            const data = await response.json();
            
            // If maintenance mode is disabled, redirect to home page
            if (!data.maintenanceMode) {
                console.log('Maintenance mode disabled, redirecting...');
                window.location.href = '/';
            }
        } catch (error) {
            console.log('Error checking maintenance status:', error);
            // If API is unreachable, maintenance mode might be disabled
            // Try to navigate to home page
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        }
        
        // Update timestamp
        updateCurrentTime();
    }, 30000); // 30 seconds
}

/**
 * Set up refresh button with loading state
 */
function setupRefreshButton() {
    const refreshButton = document.querySelector('.refresh-button');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            // Add loading state
            this.classList.add('loading');
            this.disabled = true;
            
            // Check maintenance status immediately
            checkMaintenanceStatus().then(() => {
                // If we're still here after 2 seconds, remove loading state
                setTimeout(() => {
                    this.classList.remove('loading');
                    this.disabled = false;
                }, 2000);
            });
        });
    }
}

/**
 * Check maintenance status and redirect if disabled
 */
async function checkMaintenanceStatus() {
    try {
        const response = await fetch('/api/maintenance/status');
        const data = await response.json();
        
        if (!data.maintenanceMode) {
            console.log('Maintenance mode disabled, redirecting...');
            window.location.href = '/';
            return true;
        }
        
        return false;
    } catch (error) {
        console.log('Error checking maintenance status, attempting redirect...');
        // If API fails, try to reload the page after a short delay
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        return false;
    }
}