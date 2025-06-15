/**
 * Dashboard JavaScript
 * Handles dashboard functionality including carnival filtering and user interactions
 */

/**
 * Dashboard filtering functionality
 */
function showAll() {
    document.querySelectorAll('.carnival-item').forEach(item => {
        item.style.display = 'block';
    });
    updateActiveFilter('all');
}

function showUpcoming() {
    const now = new Date().getTime();
    document.querySelectorAll('.carnival-item').forEach(item => {
        const itemDate = parseInt(item.dataset.date);
        item.style.display = itemDate >= now ? 'block' : 'none';
    });
    updateActiveFilter('upcoming');
}

function showPast() {
    const now = new Date().getTime();
    document.querySelectorAll('.carnival-item').forEach(item => {
        const itemDate = parseInt(item.dataset.date);
        item.style.display = itemDate < now ? 'block' : 'none';
    });
    updateActiveFilter('past');
}

function updateActiveFilter(filter) {
    document.querySelectorAll('.btn-outline-secondary').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (filter === 'all') {
        const allBtn = document.querySelector('[data-filter="all"]');
        if (allBtn) allBtn.classList.add('active');
    } else if (filter === 'upcoming') {
        const upcomingBtn = document.querySelector('[data-filter="upcoming"]');
        if (upcomingBtn) upcomingBtn.classList.add('active');
    } else if (filter === 'past') {
        const pastBtn = document.querySelector('[data-filter="past"]');
        if (pastBtn) pastBtn.classList.add('active');
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
    const checklistCard = document.querySelector('.card.border-info');
    if (checklistCard) {
        checklistCard.style.display = 'none';
        // Save preference to localStorage
        localStorage.setItem('checklistDismissed', 'true');
    }
}

/**
 * Initialize dashboard functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard page loaded, setting up functionality...');
    
    // Initialize with all carnivals showing
    showAll();
    
    // Setup filter button event listeners
    const allBtn = document.querySelector('[data-filter="all"]');
    const upcomingBtn = document.querySelector('[data-filter="upcoming"]');
    const pastBtn = document.querySelector('[data-filter="past"]');
    
    if (allBtn) {
        allBtn.addEventListener('click', showAll);
    }
    if (upcomingBtn) {
        upcomingBtn.addEventListener('click', showUpcoming);
    }
    if (pastBtn) {
        pastBtn.addEventListener('click', showPast);
    }
    
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