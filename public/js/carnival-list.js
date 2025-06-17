/**
 * Carnival List JavaScript
 * Handles auto-submit functionality for search and filter forms on the carnival list page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Auto-submit search after typing stops
    const searchInput = document.getElementById('search');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                // Auto-submit form after 1 second of no typing
                this.form.submit();
            }, 1000);
        });
    }

    // Auto-submit when state dropdown changes
    const stateSelect = document.getElementById('state');
    if (stateSelect) {
        stateSelect.addEventListener('change', function() {
            this.form.submit();
        });
    }

    // Auto-submit when upcoming checkbox changes
    const upcomingCheckbox = document.getElementById('upcoming');
    if (upcomingCheckbox) {
        upcomingCheckbox.addEventListener('change', function() {
            this.form.submit();
        });
    }
});