import { showAlert } from './utils/ui-helpers.js';

/**
 * Club Management Interface (Manager Object Pattern)
 * Handles form interactions for club profile management with AJAX submission
 */
export const clubManageManager = {
    elements: {},
    stagedFile: null, // To store the file from either click or drop

    initialize() {
        this.cacheElements();
        // Ensure form exists before binding events
        if (this.elements.form) {
            this.bindEvents();
        }
    },

    cacheElements() {
        this.elements.form = document.querySelector('form[action*="/clubs/edit"]');
        if (!this.elements.form) return; // Stop if form not found

        this.elements.descriptionTextarea = document.getElementById('description');
        this.elements.submitButton = this.elements.form.querySelector('button[type="submit"]');
    },

    bindEvents() {
        // Use .bind(this) to ensure 'this' inside handlers refers to clubManageManager
        this.elements.form.addEventListener('submit', this.handleFormSubmit.bind(this));

        // Form field event listeners
        if (this.elements.descriptionTextarea) {
            this.elements.descriptionTextarea.addEventListener('input', this.handleDescriptionInput.bind(this));
        }
    },

    // Handlers
    async handleFormSubmit(e) {
        e.preventDefault(); // Always prevent default for AJAX submission

        const form = this.elements.form;
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!String(field.value || '').trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
            }
        });

        if (!isValid) {
            showAlert('Please fill in all required fields.', 'danger');
            return;
        }

        // Use FormData to prepare for submission
        const formData = new FormData(form);

        // Optional: Disable button to prevent multiple submissions
        if (this.elements.submitButton) {
            this.elements.submitButton.disabled = true;
            this.elements.submitButton.textContent = 'Saving...';
        }

        try {
            console.log('Club manage: Submitting form with FormData keys:', Array.from(formData.keys()));
            console.log('Club manage: Form action:', form.action);
            console.log('Club manage: Form method:', form.method);
            console.log('Club manage: Staged file:', this.stagedFile ? this.stagedFile.name : 'None');
            
            const response = await fetch(form.action, {
                method: form.method,
                body: formData
            });

            console.log('Club manage: Response status:', response.status);
            console.log('Club manage: Response redirected:', response.redirected);
            console.log('Club manage: Response URL:', response.url);
            console.log('Club manage: Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Club manage: Form submission failed with status', response.status, ':', errorText);
                showAlert(`Server error (${response.status}): Please try again or contact support.`, 'danger');
                return;
            }

            // Try to parse JSON response first (modern API pattern)
            let responseData = null;
            const contentType = response.headers.get('content-type');
            console.log('Club manage: Response content-type:', contentType);
            
            if (contentType && contentType.includes('application/json')) {
                try {
                    responseData = await response.json();
                    console.log('Club manage: Parsed JSON response:', responseData);
                    
                    if (responseData.success) {
                        showAlert(responseData.message || 'Club profile updated successfully!', 'success');
                        return;
                    } else {
                        console.error('Club manage: JSON response indicated failure:', responseData);
                        showAlert(responseData.message || 'Failed to update club profile.', 'danger');
                        return;
                    }
                } catch (jsonError) {
                    console.error('Club manage: Failed to parse JSON response:', jsonError);
                    // Fall through to redirect handling
                }
            }

            // Server sends redirect response for successful form submissions (current pattern)
            if (response.redirected || response.status === 302) {
                console.log('Club manage: Handling redirect response');
                showAlert('Club profile updated successfully!', 'success');
                
                // Follow redirect after showing success message
                setTimeout(() => {
                    console.log('Club manage: Following redirect to:', response.url || '/clubs');
                    window.location.href = response.url || '/clubs';
                }, 1500);
                return;
            }

            // Fallback: handle as text response
            const responseText = await response.text();
            console.log('Club manage: Response text length:', responseText.length);
            console.log('Club manage: Response text preview:', responseText.substring(0, 200));
            
            // Check if response contains success indicators
            if (responseText.includes('alert-success') || response.status === 200) {
                console.log('Club manage: Detected success in HTML response');
                showAlert('Club profile updated successfully!', 'success');
                
                setTimeout(() => {
                    window.location.href = '/clubs';
                }, 1500);
            } else {
                console.warn('Club manage: Unexpected response format:', {
                    status: response.status,
                    contentType: contentType,
                    textLength: responseText.length,
                    preview: responseText.substring(0, 200)
                });
                showAlert('Unexpected response from server. Please refresh the page.', 'warning');
            }

        } catch (error) {
            // Enhanced network error handling
            console.error('Club manage: Submission failed with error:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                showAlert('Network connection failed. Please check your connection and try again.', 'danger');
            } else if (error.name === 'AbortError') {
                showAlert('Request was cancelled. Please try again.', 'warning');
            } else {
                showAlert('Submission failed due to a network error. Please try again.', 'danger');
            }
        } finally {
            // Re-enable the button
            if (this.elements.submitButton) {
                this.elements.submitButton.disabled = false;
                this.elements.submitButton.textContent = 'Save Changes';
            }
        }
    },

    handleDescriptionInput(e) {
        const ta = e.currentTarget;
        ta.style.height = 'auto';
        ta.style.height = `${ta.scrollHeight}px`;
    }
};

// Bootstrap in the browser
document.addEventListener('DOMContentLoaded', () => {
    clubManageManager.initialize();
});