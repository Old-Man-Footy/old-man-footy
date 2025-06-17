/**
 * Club Players Management - Client-side JavaScript
 * Handles interactive functionality for the club players page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Handle remove player modal
    const removePlayerModal = document.getElementById('removePlayerModal');
    if (removePlayerModal) {
        removePlayerModal.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            const playerId = button.getAttribute('data-player-id');
            const playerName = button.getAttribute('data-player-name');
            
            // Update modal content
            const playerNameElement = document.getElementById('playerNameToRemove');
            const removeForm = document.getElementById('removePlayerForm');
            
            if (playerNameElement) {
                playerNameElement.textContent = playerName;
            }
            
            if (removeForm) {
                removeForm.action = `/clubs/players/${playerId}`;
            }
        });
    }

    // Handle CSV import modal
    const csvImportModal = document.getElementById('csvImportModal');
    const csvFileInput = document.getElementById('csvFile');
    const csvForm = csvImportModal ? csvImportModal.querySelector('form') : null;

    if (csvImportModal && csvFileInput && csvForm) {
        // File validation
        csvFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                if (!file.name.toLowerCase().endsWith('.csv')) {
                    alert('Please select a CSV file.');
                    e.target.value = '';
                    return;
                }

                // Validate file size (5MB limit)
                if (file.size > 5 * 1024 * 1024) {
                    alert('File size must be less than 5MB.');
                    e.target.value = '';
                    return;
                }

                console.log('CSV file selected:', file.name, 'Size:', (file.size / 1024).toFixed(2) + 'KB');
            }
        });

        // Form submission handling
        csvForm.addEventListener('submit', function(e) {
            const file = csvFileInput.files[0];
            if (!file) {
                e.preventDefault();
                alert('Please select a CSV file to upload.');
                return;
            }

            // Show loading state
            const submitButton = csvForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Importing...';
            }

            // Form will submit normally, loading state will be reset on page reload
        });

        // Reset form when modal is hidden
        csvImportModal.addEventListener('hidden.bs.modal', function() {
            csvForm.reset();
            const submitButton = csvForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="bi bi-upload me-1"></i>Import Players';
            }
        });
    }

    // CSV template download analytics
    const templateLink = document.querySelector('a[href="/clubs/players/csv-template"]');
    if (templateLink) {
        templateLink.addEventListener('click', function() {
            console.log('CSV template downloaded');
        });
    }

    // Auto-submit search form on sort change (optional enhancement)
    const sortBySelect = document.getElementById('sortBy');
    const sortOrderSelect = document.getElementById('sortOrder');
    
    if (sortBySelect && sortOrderSelect) {
        const autoSubmitHandler = function() {
            // Add a small delay to allow for rapid changes
            clearTimeout(window.sortTimeout);
            window.sortTimeout = setTimeout(() => {
                const form = this.closest('form');
                if (form) {
                    form.submit();
                }
            }, 500);
        };
        
        sortBySelect.addEventListener('change', autoSubmitHandler);
        sortOrderSelect.addEventListener('change', autoSubmitHandler);
    }

    // Search input enhancement
    const searchInput = document.getElementById('search');
    if (searchInput) {
        // Add search icon feedback
        const searchButton = searchInput.closest('form').querySelector('button[type="submit"]');
        
        searchInput.addEventListener('input', function() {
            if (this.value.length > 0) {
                if (searchButton) {
                    searchButton.innerHTML = '<i class="bi bi-search me-1"></i>Search';
                }
            } else {
                if (searchButton) {
                    searchButton.innerHTML = '<i class="bi bi-search me-1"></i>Search';
                }
            }
        });
    }
    
    console.log('Club players page functionality initialized');
});