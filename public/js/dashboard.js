/**
 * Dashboard JavaScript
 * Handles dashboard functionality including carnival filtering and user interactions
 */

/**
 * Dashboard filtering functionality with tab-specific support
 */
function showAll(target = null) {
    const selector = target ? `.${target}-carnival` : '.carnival-item';
    document.querySelectorAll(selector).forEach(item => {
        item.style.display = 'block';
    });
    updateActiveFilter('all', target);
}

function showUpcoming(target = null) {
    const now = new Date().getTime();
    const selector = target ? `.${target}-carnival` : '.carnival-item';
    document.querySelectorAll(selector).forEach(item => {
        const itemDate = parseInt(item.dataset.date);
        item.style.display = itemDate >= now ? 'block' : 'none';
    });
    updateActiveFilter('upcoming', target);
}

function showPast(target = null) {
    const now = new Date().getTime();
    const selector = target ? `.${target}-carnival` : '.carnival-item';
    document.querySelectorAll(selector).forEach(item => {
        const itemDate = parseInt(item.dataset.date);
        item.style.display = itemDate < now ? 'block' : 'none';
    });
    updateActiveFilter('past', target);
}

function updateActiveFilter(filter, target = null) {
    // Update only buttons for the specific target, or all if no target specified
    const buttonSelector = target ? `[data-target="${target}"]` : '[data-filter]';
    document.querySelectorAll(buttonSelector).forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find and activate the correct button
    const activeButtonSelector = target 
        ? `[data-filter="${filter}"][data-target="${target}"]`
        : `[data-filter="${filter}"]`;
    
    const activeBtn = document.querySelector(activeButtonSelector);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

/**
 * Confirmation function for delegate role transfer
 */
function confirmTransfer() {
    const select = document.getElementById('newPrimaryUserId');
    const selectedOption = select.options[select.selectedIndex];
    
    if (!select.value) {
        alert('Please select a delegate to transfer the role to.');
        return false;
    }
    
    const delegateName = selectedOption.text.split(' (')[0]; // Extract name without email
    const confirmMessage = `Are you sure you want to transfer the primary delegate role to ${delegateName}?\n\nThis action cannot be undone. You will lose your primary delegate privileges and ${delegateName} will become the new primary delegate.`;
    
    return confirm(confirmMessage);
}

/**
 * Dismiss checklist for new users
 */
function dismissChecklist() {
    const checklistCard = document.getElementById('quickStartChecklist');
    if (checklistCard) {
        checklistCard.style.display = 'none';
        // Save preference to localStorage
        localStorage.setItem('checklistDismissed', 'true');
    }
}

/**
 * Handle checklist item interactions
 */
function initializeChecklist() {
    const checklistItems = document.querySelectorAll('.checklist-item');
    
    checklistItems.forEach(checkbox => {
        // Load saved state from localStorage
        const step = checkbox.dataset.step;
        const savedState = localStorage.getItem(`checklist-${step}`);
        
        if (savedState === 'completed') {
            checkbox.checked = true;
            checkbox.disabled = true;
            
            // Add visual styling for completed items
            const listItem = checkbox.closest('.list-group-item');
            if (listItem) {
                listItem.classList.add('checklist-completed');
                
                // Update label styling
                const label = listItem.querySelector('label');
                if (label) {
                    label.style.opacity = '0.7';
                    label.style.textDecoration = 'line-through';
                }
                
                // Hide action button if present
                const actionButton = listItem.querySelector('.btn');
                if (actionButton) {
                    actionButton.style.display = 'none';
                }
            }
        }
        
        // Handle checkbox state changes
        checkbox.addEventListener('change', function() {
            const step = this.dataset.step;
            const listItem = this.closest('.list-group-item');
            const label = listItem.querySelector('label');
            const actionButton = listItem.querySelector('.btn');
            
            if (this.checked) {
                // Mark as completed
                this.disabled = true;
                localStorage.setItem(`checklist-${step}`, 'completed');
                
                // Add visual styling
                listItem.classList.add('checklist-completed');
                if (label) {
                    label.style.opacity = '0.7';
                    label.style.textDecoration = 'line-through';
                }
                if (actionButton) {
                    actionButton.style.display = 'none';
                }
                
                // Show success feedback
                showChecklistSuccess(this);
                
            } else {
                // This shouldn't happen since we disable completed items,
                // but handle it just in case
                this.disabled = false;
                localStorage.removeItem(`checklist-${step}`);
                
                // Remove visual styling
                listItem.classList.remove('checklist-completed');
                if (label) {
                    label.style.opacity = '1';
                    label.style.textDecoration = 'none';
                }
                if (actionButton) {
                    actionButton.style.display = 'inline-block';
                }
            }
        });
    });
}

/**
 * Show success animation for completed checklist items
 * @param {HTMLElement} checkbox - The completed checkbox element
 */
function showChecklistSuccess(checkbox) {
    // Create a temporary success icon
    const successIcon = document.createElement('i');
    successIcon.className = 'bi bi-check-circle-fill text-success position-absolute';
    successIcon.style.cssText = `
        font-size: 1.5rem;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
        animation: checklistSuccess 0.6s ease-out;
    `;
    
    // Position relative to the checkbox
    const container = checkbox.closest('.list-group-item');
    container.style.position = 'relative';
    container.appendChild(successIcon);
    
    // Remove after animation
    setTimeout(() => {
        if (successIcon.parentNode) {
            successIcon.remove();
        }
        container.style.position = '';
    }, 600);
}

/**
 * Initialize dashboard functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard page loaded, setting up functionality...');
    
    // Initialize with all carnivals showing for both tabs
    showAll('hosted');
    showAll('attending');
    
    // Setup filter button event listeners with delegation for tab-specific filtering
    document.addEventListener('click', function(event) {
        const filterButton = event.target.closest('[data-filter]');
        if (filterButton) {
            event.preventDefault();
            
            const filter = filterButton.dataset.filter;
            const target = filterButton.dataset.target;
            
            switch(filter) {
                case 'all':
                    showAll(target);
                    break;
                case 'upcoming':
                    showUpcoming(target);
                    break;
                case 'past':
                    showPast(target);
                    break;
            }
        }
    });
    
    // Setup dismiss checklist button
    const dismissBtn = document.querySelector('[data-action="dismiss-checklist"]');
    if (dismissBtn) {
        dismissBtn.addEventListener('click', dismissChecklist);
    }
    
    // Setup navigation buttons
    const navigationButtons = document.querySelectorAll('[data-action="navigate"]');
    navigationButtons.forEach(button => {
        button.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            if (target) {
                window.location.href = target;
            }
        });
    });
    
    // Setup transfer role form
    const transferForm = document.querySelector('[data-action="transfer-role"]');
    if (transferForm) {
        transferForm.addEventListener('submit', function(e) {
            if (!confirmTransfer()) {
                e.preventDefault();
            }
        });
    }
    
    // Check if checklist was previously dismissed
    const checklistDismissed = localStorage.getItem('checklistDismissed');
    if (checklistDismissed === 'true') {
        const checklistCard = document.querySelector('.card.border-info');
        if (checklistCard) {
            checklistCard.style.display = 'none';
        }
    }
    
    // Initialize Leave Club modal
    initializeLeaveClubModal();
    
    // Handle tab switching to reset filters
    const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabButtons.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(event) {
            const targetPane = event.target.getAttribute('data-bs-target');
            if (targetPane === '#hosted-carnivals') {
                showAll('hosted');
            } else if (targetPane === '#attending-carnivals') {
                showAll('attending');
            }
        });
    });
    
    // Initialize checklist functionality
    initializeChecklist();
    
    console.log('Dashboard functionality initialized successfully');
});

/**
 * Initialize Leave Club modal functionality
 */
function initializeLeaveClubModal() {
    const leaveClubModal = document.getElementById('leaveClubModal');
    
    if (!leaveClubModal) {
        return; // Modal doesn't exist on this page
    }
    
    const radioButtons = leaveClubModal.querySelectorAll('input[name="leaveAction"]');
    const delegateSelection = document.getElementById('delegateSelection');
    const delegateSelect = document.getElementById('newPrimaryDelegateId');
    const submitButton = leaveClubModal.querySelector('button[type="submit"]');
    
    // Handle radio button changes
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            if (delegateSelection) {
                if (this.value === 'transfer') {
                    // Show delegate selection dropdown
                    delegateSelection.style.display = 'block';
                    delegateSelect.required = true;
                } else {
                    // Hide delegate selection dropdown
                    delegateSelection.style.display = 'none';
                    delegateSelect.required = false;
                    delegateSelect.value = ''; // Clear selection
                }
            }
            
            // Update submit button text based on selection
            updateSubmitButtonText(this.value);
        });
    });
    
    // Handle form submission validation
    const leaveClubForm = leaveClubModal.querySelector('form');
    if (leaveClubForm) {
        leaveClubForm.addEventListener('submit', function(e) {
            const selectedAction = leaveClubModal.querySelector('input[name="leaveAction"]:checked');
            
            if (selectedAction && selectedAction.value === 'transfer') {
                if (!delegateSelect.value) {
                    e.preventDefault();
                    alert('Please select a delegate to transfer the primary role to.');
                    delegateSelect.focus();
                    return false;
                }
            }
            
            // Final confirmation for destructive actions
            const confirmCheckbox = leaveClubModal.querySelector('#confirmLeave');
            if (!confirmCheckbox.checked) {
                e.preventDefault();
                alert('Please confirm that you want to leave the club.');
                confirmCheckbox.focus();
                return false;
            }
            
            return true;
        });
    }
    
    // Initialize on modal show
    leaveClubModal.addEventListener('show.bs.modal', function() {
        // Reset form state
        const transferRadio = leaveClubModal.querySelector('#transferToDelegate');
        if (transferRadio && transferRadio.checked && delegateSelection) {
            delegateSelection.style.display = 'block';
            delegateSelect.required = true;
        }
        
        // Update submit button text
        const checkedRadio = leaveClubModal.querySelector('input[name="leaveAction"]:checked');
        if (checkedRadio) {
            updateSubmitButtonText(checkedRadio.value);
        }
    });
    
    /**
     * Update submit button text based on selected action
     * @param {string} actionValue - The selected action value
     */
    function updateSubmitButtonText(actionValue) {
        if (!submitButton) return;
        
        const icon = '<i class="bi bi-box-arrow-right"></i>';
        
        switch(actionValue) {
            case 'transfer':
                submitButton.innerHTML = `${icon} Leave & Transfer Role`;
                submitButton.className = 'btn btn-warning';
                break;
            case 'deactivate':
                submitButton.innerHTML = `${icon} Leave & Deactivate Club`;
                submitButton.className = 'btn btn-danger';
                break;
            case 'available':
            default:
                submitButton.innerHTML = `${icon} Leave Club`;
                submitButton.className = 'btn btn-danger';
                break;
        }
    }
}

/**
 * Global utility functions for the dashboard
 */
window.dashboard = {
    /**
     * Confirm delete action with custom message
     * @param {string} message - Confirmation message
     * @returns {boolean} User's confirmation choice
     */
    confirmDelete: function(message) {
        return confirm(message || 'Are you sure you want to delete this item? This action cannot be undone.');
    },
    
    /**
     * Show temporary success message
     * @param {string} message - Success message to display
     */
    showSuccessMessage: function(message) {
        // Create a temporary alert element
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alert);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
};