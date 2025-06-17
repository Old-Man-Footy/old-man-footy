/**
 * Add Club Auto-Populate JavaScript
 * Handles auto-population of team name and contact information when a club is selected
 * 
 * Following project patterns:
 * - External JavaScript files in /public/js/
 * - Clean separation from EJS templates
 * - Data passed via data attributes
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeClubAutoPopulation();
});

/**
 * Initialize club selection auto-population functionality
 */
function initializeClubAutoPopulation() {
    const clubSelect = document.getElementById('clubId');
    const teamNameInput = document.getElementById('teamName');
    const contactPersonInput = document.getElementById('contactPerson');
    const contactEmailInput = document.getElementById('contactEmail');
    const contactPhoneInput = document.getElementById('contactPhone');
    
    if (!clubSelect) return;
    
    // Listen for club selection changes
    clubSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        
        if (selectedOption.value === '') {
            // Clear all fields if no club is selected
            clearAutoPopulatedFields();
            return;
        }
        
        // Get club data from the selected option's data attributes
        const clubName = selectedOption.getAttribute('data-club-name') || '';
        const contactPerson = selectedOption.getAttribute('data-contact-person') || '';
        const contactEmail = selectedOption.getAttribute('data-contact-email') || '';
        const contactPhone = selectedOption.getAttribute('data-contact-phone') || '';
        
        // Auto-populate team name with club name (user can still modify)
        if (teamNameInput && clubName) {
            teamNameInput.value = clubName;
            // Add visual feedback that the field was auto-populated
            teamNameInput.classList.add('auto-populated');
            setTimeout(() => teamNameInput.classList.remove('auto-populated'), 2000);
        }
        
        // Auto-populate contact person if available
        if (contactPersonInput && contactPerson) {
            contactPersonInput.value = contactPerson;
            contactPersonInput.classList.add('auto-populated');
            setTimeout(() => contactPersonInput.classList.remove('auto-populated'), 2000);
        }
        
        // Auto-populate contact email if available
        if (contactEmailInput && contactEmail) {
            contactEmailInput.value = contactEmail;
            contactEmailInput.classList.add('auto-populated');
            setTimeout(() => contactEmailInput.classList.remove('auto-populated'), 2000);
        }
        
        // Auto-populate contact phone if available
        if (contactPhoneInput && contactPhone) {
            contactPhoneInput.value = contactPhone;
            contactPhoneInput.classList.add('auto-populated');
            setTimeout(() => contactPhoneInput.classList.remove('auto-populated'), 2000);
        }
        
        console.log(`Auto-populated fields for club: ${clubName}`);
    });
}

/**
 * Clear all auto-populated fields
 */
function clearAutoPopulatedFields() {
    const fields = [
        document.getElementById('teamName'),
        document.getElementById('contactPerson'),
        document.getElementById('contactEmail'),
        document.getElementById('contactPhone')
    ];
    
    fields.forEach(field => {
        if (field) {
            field.value = '';
            field.classList.remove('auto-populated');
        }
    });
}