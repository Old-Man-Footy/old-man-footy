/**
 * Carnival Management JavaScript
 * Handles carnival-related functionality including registration, unregistration, and ownership
 */

/**
 * Unregister from carnival functionality
 */
function unregisterFromCarnival() {
    const confirmMessage = 'Are you sure you want to unregister your club from this carnival? This action cannot be undone.';
    if (confirm(confirmMessage)) {
        // Find and submit the unregister form
        const unregisterForm = document.querySelector('[data-action="unregister-carnival"]');
        if (unregisterForm) {
            unregisterForm.submit();
        }
    }
}

/**
 * Take ownership of carnival functionality
 */
function takeOwnership() {
    const confirmMessage = 'Are you sure you want to take ownership of this event for your club? This will allow you to manage and edit the event details.';
    if (confirm(confirmMessage)) {
        // Find and submit the ownership form
        const ownershipForm = document.querySelector('[data-action="take-ownership"]');
        if (ownershipForm) {
            ownershipForm.submit();
        }
    }
}

/**
 * Initialize carnival management functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Carnival management functionality loaded...');
    
    // Setup unregister button
    const unregisterBtn = document.querySelector('[data-action="unregister"]');
    if (unregisterBtn) {
        unregisterBtn.addEventListener('click', unregisterFromCarnival);
    }
    
    // Setup take ownership button
    const ownershipBtn = document.querySelector('[data-action="take-ownership-btn"]');
    if (ownershipBtn) {
        ownershipBtn.addEventListener('click', takeOwnership);
    }
    
    // Setup confirmation dialogs for forms with data-confirm attributes
    document.querySelectorAll('[data-confirm]').forEach(form => {
        form.addEventListener('submit', function(e) {
            const message = this.getAttribute('data-confirm');
            if (!confirm(message)) {
                e.preventDefault();
            }
        });
    });
    
    console.log('Carnival management functionality initialized successfully');
});