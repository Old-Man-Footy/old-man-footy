/**
 * Club Add Sponsor Form Handler
 * Handles intelligent duplicate detection and form submission
 */
document.addEventListener('DOMContentLoaded', function() {
    const sponsorNameInput = document.getElementById('sponsorName');
    const duplicateAlert = document.getElementById('duplicateAlert');
    const existingSponsorInfo = document.getElementById('existingSponsorInfo');
    const linkExistingBtn = document.getElementById('linkExistingBtn');
    const createNewBtn = document.getElementById('createNewBtn');
    const sponsorTypeInput = document.getElementById('sponsorTypeInput');
    const existingSponsorIdInput = document.getElementById('existingSponsorIdInput');
    const submitText = document.getElementById('submitText');
    const submitBtn = document.getElementById('submitBtn');
    const sponsorForm = document.getElementById('sponsorForm');

    let duplicateCheckTimeout;
    let existingSponsorData = null;

    /**
     * Check for duplicate sponsors as user types
     */
    sponsorNameInput.addEventListener('input', function() {
        const sponsorName = this.value.trim();
        
        // Clear existing timeout
        clearTimeout(duplicateCheckTimeout);
        
        // Hide duplicate alert if name is too short
        if (sponsorName.length < 3) {
            hideDuplicateAlert();
            return;
        }

        // Debounce the API call
        duplicateCheckTimeout = setTimeout(() => {
            checkForDuplicates(sponsorName);
        }, 500);
    });

    /**
     * Check for duplicate sponsors via API
     */
    async function checkForDuplicates(sponsorName) {
        try {
            const response = await fetch('/api/sponsors/check-duplicate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sponsorName })
            });

            const data = await response.json();

            if (data.isDuplicate && data.existingSponsor) {
                showDuplicateAlert(data.existingSponsor);
            } else {
                hideDuplicateAlert();
            }
        } catch (error) {
            console.error('Error checking for duplicates:', error);
            hideDuplicateAlert();
        }
    }

    /**
     * Show duplicate alert with existing sponsor info
     */
    function showDuplicateAlert(sponsor) {
        existingSponsorData = sponsor;
        
        // Populate existing sponsor info
        existingSponsorInfo.innerHTML = `
            <div class="d-flex align-items-center">
                ${sponsor.logoUrl ? 
                    `<img src="/${sponsor.logoUrl}" alt="${sponsor.sponsorName}" class="me-3 rounded" style="width: 48px; height: 48px; object-fit: contain;">` :
                    `<div class="me-3 bg-secondary rounded d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                        <i class="bi bi-building text-white"></i>
                    </div>`
                }
                <div>
                    <h6 class="mb-1">${sponsor.sponsorName}</h6>
                    <small class="text-muted">
                        ${sponsor.businessType ? sponsor.businessType : 'Business'}
                        ${sponsor.location ? ` • ${sponsor.location}` : ''}
                        ${sponsor.state ? ` • ${sponsor.state}` : ''}
                    </small>
                    ${sponsor.description ? `<div class="small text-muted mt-1">${sponsor.description}</div>` : ''}
                </div>
            </div>
        `;

        // Show the alert with animation
        duplicateAlert.style.display = 'block';
        setTimeout(() => {
            duplicateAlert.classList.add('show');
        }, 10);
    }

    /**
     * Hide duplicate alert
     */
    function hideDuplicateAlert() {
        existingSponsorData = null;
        duplicateAlert.classList.remove('show');
        setTimeout(() => {
            duplicateAlert.style.display = 'none';
        }, 150);
        
        // Reset form to create new sponsor mode
        resetToNewSponsorMode();
    }

    /**
     * Handle linking to existing sponsor
     */
    linkExistingBtn.addEventListener('click', function() {
        if (!existingSponsorData) return;

        // Set form to link existing sponsor
        sponsorTypeInput.value = 'existing';
        existingSponsorIdInput.value = existingSponsorData.id;
        submitText.textContent = 'Link Existing Sponsor';
        
        // Disable form fields since we're linking existing
        disableFormFields(true);
        
        // Update submit button style
        submitBtn.className = 'btn btn-success';
        submitBtn.innerHTML = '<i class="bi bi-link me-1"></i><span id="submitText">Link Existing Sponsor</span>';
        
        // Hide duplicate alert
        hideDuplicateAlert();
        
        // Show success feedback
        showLinkingFeedback();
    });

    /**
     * Handle creating new sponsor anyway
     */
    createNewBtn.addEventListener('click', function() {
        hideDuplicateAlert();
        resetToNewSponsorMode();
    });

    /**
     * Reset form to new sponsor creation mode
     */
    function resetToNewSponsorMode() {
        sponsorTypeInput.value = 'new';
        existingSponsorIdInput.value = '';
        submitText.textContent = 'Add Sponsor';
        disableFormFields(false);
        
        // Reset submit button style
        submitBtn.className = 'btn btn-primary';
        submitBtn.innerHTML = '<i class="bi bi-save me-1"></i><span id="submitText">Add Sponsor</span>';
        
        // Remove any linking feedback
        removeLinkingFeedback();
    }

    /**
     * Enable/disable form fields
     */
    function disableFormFields(disable) {
        const fields = sponsorForm.querySelectorAll('input:not([type="hidden"]), select, textarea');
        fields.forEach(field => {
            if (field.id !== 'sponsorName') { // Keep sponsor name enabled for editing
                field.disabled = disable;
                if (disable) {
                    field.classList.add('bg-light');
                } else {
                    field.classList.remove('bg-light');
                }
            }
        });
    }

    /**
     * Show linking feedback
     */
    function showLinkingFeedback() {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.id = 'linkingFeedback';
        feedbackDiv.className = 'alert alert-success mt-3';
        feedbackDiv.innerHTML = `
            <i class="bi bi-check-circle me-2"></i>
            <strong>Ready to link!</strong> You're about to link to the existing sponsor "${existingSponsorData.sponsorName}". 
            The form fields below are disabled since you're linking to an existing sponsor.
        `;
        
        // Insert after sponsor name field
        const sponsorNameGroup = sponsorNameInput.closest('.mb-3');
        sponsorNameGroup.parentNode.insertBefore(feedbackDiv, sponsorNameGroup.nextSibling);
    }

    /**
     * Remove linking feedback
     */
    function removeLinkingFeedback() {
        const feedback = document.getElementById('linkingFeedback');
        if (feedback) {
            feedback.remove();
        }
    }

    /**
     * Handle form submission
     */
    sponsorForm.addEventListener('submit', function(e) {
        // Show loading state
        const originalContent = submitBtn.innerHTML;
        const isLinking = sponsorTypeInput.value === 'existing';
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="bi bi-arrow-clockwise spin me-1"></i>${isLinking ? 'Linking...' : 'Creating...'}`;
        
        // Re-enable button after delay in case of errors
        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalContent;
        }, 10000);
    });

    /**
     * Handle sponsor name field focus/blur for better UX
     */
    sponsorNameInput.addEventListener('focus', function() {
        this.classList.add('border-primary');
    });

    sponsorNameInput.addEventListener('blur', function() {
        this.classList.remove('border-primary');
    });
});