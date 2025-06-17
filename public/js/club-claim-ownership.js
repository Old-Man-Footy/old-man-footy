/**
 * Club Claim Ownership JavaScript
 * Handles form validation and interaction for club ownership claiming
 */

document.addEventListener('DOMContentLoaded', function() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][required]');
    const claimButton = document.getElementById('claimButton');
    
    function updateButtonState() {
        const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
        claimButton.disabled = !allChecked;
        
        if (allChecked) {
            claimButton.classList.remove('btn-secondary');
            claimButton.classList.add('btn-primary');
        } else {
            claimButton.classList.remove('btn-primary');
            claimButton.classList.add('btn-secondary');
        }
    }
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateButtonState);
    });
    
    // Initial state
    updateButtonState();
});