/**
 * Standardized Logo Upload Handler
 * This module provides consistent file upload handling across all forms using logo-uploader.ejs
 */

/**
 * Creates a standardized logo file handler for any manager object
 * @param {Object} manager - The manager object (e.g., sponsorEditManager, clubManageManager)
 * @param {string} formDataKey - The key to use when appending to FormData (defaults to 'logo')
 * @returns {Function} - The standardized handleLogoFileSelected function
 */
export function createStandardLogoHandler(manager, formDataKey = 'logo') {
    return function(event) {
        console.log(`${manager.constructor?.name || 'Manager'}: Logo file selected`, event.detail);
        
        // Store the file using consistent property name
        manager.stagedFile = event.detail.file;
        
        if (manager.stagedFile) {
            console.log(`${manager.constructor?.name || 'Manager'}: File staged for form submission`, manager.stagedFile.name);
        }
    };
}

/**
 * Creates a standardized form submission handler that includes logo file
 * @param {Object} manager - The manager object
 * @param {string} formDataKey - The key to use when appending to FormData (defaults to 'logo')
 * @returns {Function} - The standardized form submission function
 */
export function createStandardFormSubmissionHandler(manager, formDataKey = 'logo') {
    return async function(event) {
        if (event) {
            event.preventDefault();
        }
        
        try {
            const form = manager.elements?.form || document.querySelector('form');
            if (!form) {
                throw new Error('Form element not found');
            }
            
            const formData = new FormData(form);
            
            // Add the staged logo file if one exists
            if (manager.stagedFile) {
                formData.append(formDataKey, manager.stagedFile);
                console.log(`Adding ${formDataKey} file to form submission:`, manager.stagedFile.name);
            }

            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });

            if (response.redirected) {
                window.location.href = response.url;
                return;
            }

            const result = await response.json();
            
            if (result.success) {
                // Handle successful submission
                if (typeof manager.handleSuccessfulSubmission === 'function') {
                    manager.handleSuccessfulSubmission();
                }
                
                // Clear staged file after successful upload
                manager.stagedFile = null;
                
                // Show success feedback
                if (typeof manager.showSuccessMessage === 'function') {
                    manager.showSuccessMessage(result.message || 'Changes saved successfully');
                }
            } else {
                // Handle validation errors or other failures
                if (typeof manager.handleFormErrors === 'function') {
                    manager.handleFormErrors(result.errors || [result.message]);
                } else {
                    console.error('Form submission failed:', result.message);
                    alert(result.message || 'An error occurred while saving changes');
                }
            }
            
        } catch (error) {
            console.error('Form submission error:', error);
            if (typeof manager.handleFormErrors === 'function') {
                manager.handleFormErrors(['Network error occurred while saving changes']);
            } else {
                alert('Network error occurred while saving changes');
            }
        }
    };
}

/**
 * Standard partial parameters for logo-uploader.ejs
 * Use this object to ensure consistent parameters across all forms
 */
export const STANDARD_LOGO_UPLOADER_PARAMS = {
    fieldName: 'logo',
    inputId: 'logoInput',
    maxFileSize: 10485760, // 10MB
    acceptedFormats: '.jpg,.jpeg,.png,.svg,.gif,.webp',
    helpText: 'Maximum 10MB. JPG, PNG, SVG, GIF, or WebP formats.',
    uploadText: 'Select or drop logo'
};

/**
 * Initializes standardized logo upload handling for a manager
 * @param {Object} manager - The manager object
 * @param {Object} options - Configuration options
 * @param {string} options.formDataKey - The key for FormData (defaults to 'logo')
 * @param {boolean} options.handleFormSubmission - Whether to handle form submission (defaults to true)
 */
export function initializeStandardLogoUpload(manager, options = {}) {
    const { formDataKey = 'logo', handleFormSubmission = true } = options;
    
    // Add standard logo file handler
    manager.handleLogoFileSelected = createStandardLogoHandler(manager, formDataKey);
    
    // Add standard form submission handler if requested
    if (handleFormSubmission) {
        manager.handleFormSubmit = createStandardFormSubmissionHandler(manager, formDataKey);
    }
    
    // Initialize stagedFile property if not exists
    if (!manager.hasOwnProperty('stagedFile')) {
        manager.stagedFile = null;
    }
    
    console.log(`Initialized standard logo upload for manager with formDataKey: ${formDataKey}`);
}
