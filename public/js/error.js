/**
 * Error Page JavaScript
 * Enhanced Go Back functionality with fallback behavior
 * Implements browser history navigation with proper error handling
 */

document.addEventListener('DOMContentLoaded', function() {
    const goBackBtn = document.getElementById('goBackBtn');
    
    if (goBackBtn) {
        goBackBtn.addEventListener('click', function() {
            try {
                // Check if there's history to go back to
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    // Fallback: redirect to home page if no history
                    window.location.href = '/';
                }
            } catch (error) {
                // Fallback: redirect to home page on any error
                console.warn('Error navigating back:', error);
                window.location.href = '/';
            }
        });
        
        // Optional: Add keyboard support for better accessibility
        goBackBtn.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                goBackBtn.click();
            }
        });
    }
});