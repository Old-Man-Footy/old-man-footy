/**
 * Add Club Auto-Populate JavaScript
 * Handles auto-population of team name and contact information when a club is selected
 *
 * Following project patterns:
 * - External JavaScript files in /public/js/
 * - Clean separation from EJS templates
 * - Data passed via data attributes
 */

/**
 * Initialize club selection auto-population functionality
 * @public
 */
export function initializeClubAutoPopulation() {
    const clubSelect = document.getElementById('clubId');
    const teamNameInput = document.getElementById('teamName');
    const contactPersonInput = document.getElementById('contactPerson');
    const contactEmailInput = document.getElementById('contactEmail');
    const contactPhoneInput = document.getElementById('contactPhone');
    
    if (!clubSelect) return;
    
    // Remove any previous listeners to avoid duplicate handlers in tests
    clubSelect.replaceWith(clubSelect.cloneNode(true));
    const newClubSelect = document.getElementById('clubId');

    newClubSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption.value === '') {
            clearAutoPopulatedFields();
            return;
        }
        const clubName = selectedOption.getAttribute('data-club-name') || '';
        const contactPerson = selectedOption.getAttribute('data-contact-person') || '';
        const contactEmail = selectedOption.getAttribute('data-contact-email') || '';
        const contactPhone = selectedOption.getAttribute('data-contact-phone') || '';
        if (teamNameInput && clubName) {
            teamNameInput.value = clubName;
            teamNameInput.classList.add('auto-populated');
            setTimeout(() => teamNameInput.classList.remove('auto-populated'), 2000);
        }
        if (contactPersonInput && contactPerson) {
            contactPersonInput.value = contactPerson;
            contactPersonInput.classList.add('auto-populated');
            setTimeout(() => contactPersonInput.classList.remove('auto-populated'), 2000);
        }
        if (contactEmailInput && contactEmail) {
            contactEmailInput.value = contactEmail;
            contactEmailInput.classList.add('auto-populated');
            setTimeout(() => contactEmailInput.classList.remove('auto-populated'), 2000);
        }
        if (contactPhoneInput && contactPhone) {
            contactPhoneInput.value = contactPhone;
            contactPhoneInput.classList.add('auto-populated');
            setTimeout(() => contactPhoneInput.classList.remove('auto-populated'), 2000);
        }
    });
}

/**
 * Clear all auto-populated fields
 * @private
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

// Attach on DOMContentLoaded for browser usage
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeClubAutoPopulation();
    });
}