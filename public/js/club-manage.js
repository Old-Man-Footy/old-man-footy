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
        this.elements.form = document.querySelector('form[action*="/clubs/manage"]');
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

        // Listen for logo file selection events from logo-uploader.js
        document.addEventListener('logoFileSelected', (event) => {
            this.handleLogoFileSelected(event);
        });
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

        // Append the staged file if it exists
        if (this.stagedFile) {
            // 'logo' should match the name attribute of your file input
            formData.append('logo', this.stagedFile);
        }

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
                        this.handleSuccessfulSubmission();
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
                this.handleSuccessfulSubmission();
                
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
                this.handleSuccessfulSubmission();
                
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
    },

    /**
     * Handle logo file selection from the external logo uploader
     * @param {CustomEvent} event - Event with file data
     */
    handleLogoFileSelected(event) {
        console.log('Club manage received logo file:', event.detail);
        this.stagedFile = event.detail.file || null;
        // The external logo uploader handles all UI feedback
        // We just need to store the file reference for AJAX submission
    },

    /**
     * Handle successful form submission (logo update and file reset)
     */
    handleSuccessfulSubmission() {
        console.log('Club manage: Handling successful submission');
        
        // Update logo preview if we had a file upload
        if (this.stagedFile) {
            console.log('Club manage: Updating logo display for file:', this.stagedFile.name);
            this.updateLogoDisplay();
        }
        
        // Reset staged file and notify uploader
        this.resetStagedFile();
    },

    /**
     * Update logo display in the UI after successful upload (enhanced with error handling)
     */
    updateLogoDisplay() {
        if (!this.stagedFile) {
            console.warn('Club manage: No staged file to display');
            return;
        }

        console.log('Club manage: Updating logo display for file:', this.stagedFile.name, 'Type:', this.stagedFile.type);
        
        // Find the logo preview element with enhanced selector matching
        const logoPreview = document.querySelector('#logoPreview, .logo-preview, [data-logo-preview], .club-logo img, .logo-container img');
        
        if (!logoPreview) {
            console.warn('Club manage: No logo preview element found');
            return;
        }
        
        console.log('Club manage: Found logo preview element:', logoPreview.tagName, logoPreview.className);
        
        // Validate file type before processing
        if (!this.stagedFile.type.startsWith('image/')) {
            console.error('Club manage: Staged file is not an image:', this.stagedFile.type);
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                console.log('Club manage: FileReader loaded successfully, updating preview');
                
                if (logoPreview.tagName === 'IMG') {
                    logoPreview.src = e.target.result;
                    logoPreview.style.display = 'block'; // Ensure visibility
                } else {
                    logoPreview.style.backgroundImage = `url(${e.target.result})`;
                    logoPreview.style.backgroundSize = 'cover';
                    logoPreview.style.backgroundPosition = 'center';
                }
                
                // Add visual feedback class
                logoPreview.classList.add('logo-updated');
                setTimeout(() => {
                    logoPreview.classList.remove('logo-updated');
                }, 2000);
                
                console.log('Club manage: Logo preview updated successfully');
            } catch (error) {
                console.error('Club manage: Error updating logo preview:', error);
            }
        };
        
        reader.onerror = (error) => {
            console.error('Club manage: FileReader error:', error);
        };
        
        reader.onabort = () => {
            console.warn('Club manage: FileReader was aborted');
        };
        
        try {
            reader.readAsDataURL(this.stagedFile);
        } catch (error) {
            console.error('Club manage: Error starting FileReader:', error);
        }
    },

    /**
     * Reset the staged file after successful submission
     */
    resetStagedFile() {
        this.stagedFile = null;
        
        // Dispatch event to notify logo uploader to reset its state
        document.dispatchEvent(new CustomEvent('logoUploadComplete'));
    }
};

// Bootstrap in the browser
document.addEventListener('DOMContentLoaded', () => {
    clubManageManager.initialize();
});