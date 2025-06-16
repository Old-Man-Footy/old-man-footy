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
});