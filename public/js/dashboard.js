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
    
    console.log('Dashboard functionality initialized successfully');
});