/**
 * State Selector Component JavaScript
 * Handles the interactive dropdown state selector functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    const stateToggle = document.getElementById('stateToggle');
    const stateMenu = document.getElementById('stateMenu');
    const selectAllBtn = document.getElementById('selectAll');
    const selectNoneBtn = document.getElementById('selectNone');
    const selectedText = stateToggle?.querySelector('.selected-text');
    const stateCheckboxes = document.querySelectorAll('.state-checkbox');

    if (!stateToggle || !stateMenu || !selectedText) return;

    /**
     * Update the display text based on selected states
     */
    function updateSelectedText() {
        const selected = Array.from(stateCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        if (selected.length === 0) {
            selectedText.textContent = 'Choose states...';
            selectedText.classList.remove('has-selection');
        } else if (selected.length === 1) {
            selectedText.textContent = selected[0];
            selectedText.classList.add('has-selection');
        } else if (selected.length <= 3) {
            selectedText.textContent = selected.join(', ');
            selectedText.classList.add('has-selection');
        } else {
            selectedText.textContent = `${selected.length} states selected`;
            selectedText.classList.add('has-selection');
        }

        // Update form validation
        updateValidation();
    }

    /**
     * Update form validation state
     */
    function updateValidation() {
        const hasSelection = Array.from(stateCheckboxes).some(cb => cb.checked);
        const container = document.querySelector('.state-selector-container');
        const invalidFeedback = container?.querySelector('.invalid-feedback');

        if (hasSelection) {
            stateToggle.classList.remove('is-invalid');
            if (invalidFeedback) {
                invalidFeedback.style.display = 'none';
            }
        }
    }

    /**
     * Toggle dropdown visibility
     */
    function toggleDropdown() {
        const isOpen = stateMenu.classList.contains('show');
        
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }

    /**
     * Open dropdown
     */
    function openDropdown() {
        stateMenu.classList.add('show');
        stateToggle.setAttribute('aria-expanded', 'true');
        
        // Position dropdown (handle mobile positioning)
        if (window.innerWidth <= 767) {
            stateMenu.style.position = 'fixed';
            stateMenu.style.top = 'auto';
            stateMenu.style.bottom = '1rem';
            stateMenu.style.left = '1rem';
            stateMenu.style.right = '1rem';
        }
    }

    /**
     * Close dropdown
     */
    function closeDropdown() {
        stateMenu.classList.remove('show');
        stateToggle.setAttribute('aria-expanded', 'false');
    }

    /**
     * Handle clicks outside dropdown
     */
    function handleClickOutside(carnival) {
        if (!stateToggle.contains(carnival.target) && !stateMenu.contains(carnival.target)) {
            closeDropdown();
        }
    }

    /**
     * Select all states
     */
    function selectAll() {
        stateCheckboxes.forEach(cb => {
            cb.checked = true;
        });
        updateSelectedText();
    }

    /**
     * Clear all selections
     */
    function selectNone() {
        stateCheckboxes.forEach(cb => {
            cb.checked = false;
        });
        updateSelectedText();
    }

    // Carnival listeners
    stateToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleDropdown();
    });

    stateToggle.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleDropdown();
        }
        if (e.key === 'Escape') {
            closeDropdown();
        }
    });

    // Handle checkbox changes
    stateCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateSelectedText();
        });
    });

    // Handle select all/none buttons
    selectAllBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        selectAll();
    });

    selectNoneBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        selectNone();
    });

    // Prevent dropdown from closing when clicking inside
    stateMenu.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', handleClickOutside);

    // Close dropdown on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDropdown();
        }
    });

    // Handle window resize for mobile positioning
    window.addEventListener('resize', function() {
        if (stateMenu.classList.contains('show')) {
            if (window.innerWidth <= 767) {
                stateMenu.style.position = 'fixed';
                stateMenu.style.top = 'auto';
                stateMenu.style.bottom = '1rem';
                stateMenu.style.left = '1rem';
                stateMenu.style.right = '1rem';
            } else {
                stateMenu.style.position = 'absolute';
                stateMenu.style.top = '100%';
                stateMenu.style.bottom = 'auto';
                stateMenu.style.left = '0';
                stateMenu.style.right = '0';
            }
        }
    });

    // Form validation on submit
    const form = document.getElementById('subscribeForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            const hasSelection = Array.from(stateCheckboxes).some(cb => cb.checked);
            
            if (!hasSelection) {
                e.preventDefault();
                stateToggle.classList.add('is-invalid');
                
                const container = document.querySelector('.state-selector-container');
                const invalidFeedback = container?.querySelector('.invalid-feedback');
                if (invalidFeedback) {
                    invalidFeedback.style.display = 'block';
                }
                
                // Scroll to the state selector
                stateToggle.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
        });
    }

    // Initialize display
    updateSelectedText();
});