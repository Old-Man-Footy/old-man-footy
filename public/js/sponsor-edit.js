/**
 * Sponsor Edit Page Manager
 * Handles sponsor editing functionality including form validation,
 * logo upload, and form submission
 */

export const sponsorEditManager = {
    elements: {},

    /** Staged file from logo uploader */
    stagedFile: null,

    /**
     * Initialize the sponsor edit functionality
     */
    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.initializeValidation();
    },

    /**
     * Cache DOM elements for efficient access
     */
    cacheElements() {
        this.elements = {
            form: document.querySelector('#sponsors-edit form'),
            submitBtn: document.getElementById('submitBtn'),
            nameInput: document.getElementById('name'),
            sponsorshipLevelSelect: document.getElementById('sponsorshipLevel'),
            clubSelect: document.getElementById('clubId'),
            emailInput: document.getElementById('contactEmail'),
            websiteInput: document.getElementById('website'),
            facebookInput: document.getElementById('facebookUrl'),
            instagramInput: document.getElementById('instagramUrl'),
            twitterInput: document.getElementById('twitterUrl'),
            linkedinInput: document.getElementById('linkedinUrl'),
            logoUploadSection: document.querySelector('.logo-upload-section'),
            visibilityCheckbox: document.getElementById('isPubliclyVisible')
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', this.handleFormSubmit);
        }

        // Real-time validation for required fields
        if (this.elements.nameInput) {
            this.elements.nameInput.addEventListener('blur', this.validateName);
            this.elements.nameInput.addEventListener('input', this.clearFieldError);
        }

        if (this.elements.sponsorshipLevelSelect) {
            this.elements.sponsorshipLevelSelect.addEventListener('change', this.validateSponsorshipLevel);
        }

        if (this.elements.clubSelect) {
            this.elements.clubSelect.addEventListener('change', this.validateClub);
        }

        // URL validation
        [this.elements.websiteInput, this.elements.facebookInput, 
         this.elements.instagramInput, this.elements.twitterInput, 
         this.elements.linkedinInput].forEach(input => {
            if (input) {
                input.addEventListener('blur', this.validateUrl);
                input.addEventListener('input', this.clearFieldError);
            }
        });

        // Email validation
        if (this.elements.emailInput) {
            this.elements.emailInput.addEventListener('blur', this.validateEmail);
            this.elements.emailInput.addEventListener('input', this.clearFieldError);
        }

        // Logo file selection from logo uploader
        document.addEventListener('logoFileSelected', this.handleLogoFileSelected);
    },

    /**
     * Initialize form validation
     */
    initializeValidation() {
        // Bootstrap form validation
        if (this.elements.form) {
            this.elements.form.classList.add('needs-validation');
        }
    },

    /**
     * Handle form submission
     */
    handleFormSubmit: async (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        const form = event.target;
        
        if (!form.checkValidity()) {
            sponsorEditManager.showValidationErrors();
            form.classList.add('was-validated');
            return;
        }
        
        try {
            // Disable submit button during processing
            if (sponsorEditManager.elements.submitBtn) {
                sponsorEditManager.elements.submitBtn.disabled = true;
            }
            
            // Create FormData from form
            const formData = new FormData(form);
            
            // Add staged file if available
            if (sponsorEditManager.stagedFile) {
                formData.append('logo', sponsorEditManager.stagedFile);
            }
            
            // Submit via AJAX
            const response = await fetch(form.action, {
                method: form.method || 'POST',
                body: formData
            });
            
            if (response.ok) {
                sponsorEditManager.showSubmissionFeedback(true);
                // Redirect after short delay for user feedback
                setTimeout(() => {
                    window.location.href = response.url || '/sponsors';
                }, 1500);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
        } catch (error) {
            console.error('Form submission error:', error);
            sponsorEditManager.showSubmissionFeedback(false, error.message);
        } finally {
            // Re-enable submit button
            if (sponsorEditManager.elements.submitBtn) {
                sponsorEditManager.elements.submitBtn.disabled = false;
            }
        }
        
        form.classList.add('was-validated');
    },

    /**
     * Handle logo file selection from logo uploader
     */
    handleLogoFileSelected: (event) => {
        const { file, previewUrl } = event.detail;
        sponsorEditManager.stagedFile = file;
        
        // Optional: Update UI to show selected file
        console.log('Logo file selected for sponsor:', file.name);
    },

    /**
     * Validate sponsor name
     */
    validateName: (event) => {
        const input = event.target;
        const value = input.value.trim();
        
        if (!value) {
            sponsorEditManager.setFieldError(input, 'Company name is required');
            return false;
        }
        
        if (value.length > 255) {
            sponsorEditManager.setFieldError(input, 'Company name must be less than 255 characters');
            return false;
        }
        
        sponsorEditManager.clearFieldError(input);
        return true;
    },

    /**
     * Validate sponsorship level selection
     */
    validateSponsorshipLevel: (event) => {
        const select = event.target;
        
        if (!select.value) {
            sponsorEditManager.setFieldError(select, 'Please select a sponsorship level');
            return false;
        }
        
        sponsorEditManager.clearFieldError(select);
        return true;
    },

    /**
     * Validate club selection
     */
    validateClub: (event) => {
        const select = event.target;
        
        if (!select.value) {
            sponsorEditManager.setFieldError(select, 'Please select an associated club');
            return false;
        }
        
        sponsorEditManager.clearFieldError(select);
        return true;
    },

    /**
     * Validate email address
     */
    validateEmail: (event) => {
        const input = event.target;
        const value = input.value.trim();
        
        if (value && !sponsorEditManager.isValidEmail(value)) {
            sponsorEditManager.setFieldError(input, 'Please enter a valid email address');
            return false;
        }
        
        sponsorEditManager.clearFieldError(input);
        return true;
    },

    /**
     * Validate URL fields
     */
    validateUrl: (event) => {
        const input = event.target;
        const value = input.value.trim();
        
        if (value && !sponsorEditManager.isValidUrl(value)) {
            sponsorEditManager.setFieldError(input, 'Please enter a valid URL starting with http:// or https://');
            return false;
        }
        
        sponsorEditManager.clearFieldError(input);
        return true;
    },

    /**
     * Check if email is valid
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Check if URL is valid
     */
    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    },

    /**
     * Set field error state
     */
    setFieldError(field, message) {
        field.classList.add('is-invalid');
        field.classList.remove('is-valid');
        
        let feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = message;
        }
    },

    /**
     * Clear field error state
     */
    clearFieldError: (event) => {
        const field = event?.target || event;
        if (!field) return;
        
        field.classList.remove('is-invalid');
        if (field.value.trim()) {
            field.classList.add('is-valid');
        } else {
            field.classList.remove('is-valid');
        }
    },

    /**
     * Show validation errors summary
     */
    showValidationErrors() {
        const errorFields = this.elements.form.querySelectorAll('.is-invalid');
        if (errorFields.length > 0) {
            // Focus on first error field
            errorFields[0].focus();
            
            // Show toast notification
            this.showToast('Please correct the highlighted errors before submitting.', 'error');
        }
    },

    /**
     * Show submission feedback
     */
    showSubmissionFeedback(success = true, errorMessage = null) {
        if (success) {
            this.showToast('Sponsor updated successfully!', 'success');
        } else {
            const message = errorMessage || 'Failed to update sponsor. Please try again.';
            this.showToast(message, 'danger');
        }
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Create and show toast notification
        const toastContainer = document.querySelector('.toast-container') || 
                             (() => {
                                 const container = document.createElement('div');
                                 container.className = 'toast-container position-fixed top-0 end-0 p-3';
                                 document.body.appendChild(container);
                                 return container;
                             })();

        const toastId = 'toast-' + Date.now();
        const bgClass = type === 'error' ? 'bg-danger' : type === 'success' ? 'bg-success' : 'bg-info';
        const iconClass = type === 'error' ? 'bi-exclamation-triangle' : type === 'success' ? 'bi-check-circle' : 'bi-info-circle';

        const toastHtml = `
            <div id="${toastId}" class="toast ${bgClass} text-white" role="alert">
                <div class="toast-body d-flex align-items-center">
                    <i class="bi ${iconClass} me-2"></i>
                    ${message}
                    <button type="button" class="btn-close btn-close-white ms-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
        toast.show();

        // Clean up after toast is hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    sponsorEditManager.initialize();
});
