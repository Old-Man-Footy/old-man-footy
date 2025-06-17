/**
 * Carnival New JavaScript
 * Handles file upload interactions, duplicate warnings, and MySideline link generation for new carnival creation
 */

document.addEventListener('DOMContentLoaded', function() {
    // Make file upload areas clickable
    document.querySelectorAll('.file-upload-area').forEach(area => {
        area.addEventListener('click', function() {
            const input = this.querySelector('input[type="file"]');
            if (input) {
                input.click();
            }
        });
    });

    // Show/hide MySideline link button based on title input
    const titleInput = document.getElementById('title');
    const buttonContainer = document.getElementById('mysidelineButtonContainer');
    
    if (titleInput && buttonContainer) {
        titleInput.addEventListener('input', function() {
            const title = this.value.trim();
            if (title.length > 0) {
                buttonContainer.style.display = 'block';
            } else {
                buttonContainer.style.display = 'none';
            }
        });
    }

    // Generate MySideline link
    const generateBtn = document.getElementById('generateMysidelineBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', function() {
            const title = document.getElementById('title').value.trim();
            const registrationLink = document.getElementById('registrationLink');
            
            if (title.length > 0) {
                // Generate MySideline registration link with URL encoded title
                const encodedTitle = encodeURIComponent(title);
                const mysidelineUrl = `https://profile.mysideline.com.au/register/clubsearch/?source=rugby-league&criteria=${encodedTitle}`;
                registrationLink.value = mysidelineUrl;
                
                // Add visual feedback
                registrationLink.focus();
                registrationLink.select();
                
                // Show a brief success indicator
                const btn = this;
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="bi bi-check-circle"></i> Generated!';
                btn.classList.remove('btn-outline-success');
                btn.classList.add('btn-success');
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.classList.remove('btn-success');
                    btn.classList.add('btn-outline-success');
                }, 2000);
            }
        });
    }
});

// Global functions for duplicate warning handling
function proceedAnyway() {
    // Set the hidden field to true and submit the form
    document.getElementById('forceCreate').value = 'true';
    document.getElementById('carnivalForm').submit();
}

function clearForm() {
    // Clear the form fields
    document.getElementById('carnivalForm').reset();
}