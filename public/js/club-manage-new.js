/**
 * Club Management Interface (Manager Object Pattern)
 * Handles form interactions for club profile management with AJAX submission
 * Works with logo-uploader.js for file upload functionality
 */
export const clubManageManager = {
    elements: {},
    stagedFile: null, // To store the file from logo uploader

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
        document.addEventListener('logoFileSelected', this.handleLogoFileSelected.bind(this));
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
            alert('Please fill in all required fields.');
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
            const response = await fetch(form.action, {
                method: form.method,
                body: formData,
                // Headers might not be needed as browser sets multipart/form-data
            });

            if (response.ok) {
                // Handle success - maybe redirect or show a success message
                alert('Club saved successfully!');
                // window.location.href = '/success-page'; // Example redirect
            } else {
                // Handle server errors
                const errorData = await response.json();
                alert(`Error: ${errorData.message || 'An unknown error occurred.'}`);
            }
        } catch (error) {
            // Handle network errors
            console.error('Submission failed:', error);
            alert('Submission failed due to a network error.');
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
     * Handle logo file selection from logo-uploader.js
     * @param {CustomEvent} e - Logo file selected event
     */
    handleLogoFileSelected(e) {
        const { file, inputName } = e.detail;
        
        // Only handle logo files for this form
        if (inputName === 'logo' || !inputName) {
            this.stagedFile = file;
            console.log(file ? `Logo file staged: ${file.name}` : 'Logo file removed');
        }
    }
};

// Bootstrap in the browser
document.addEventListener('DOMContentLoaded', () => {
    clubManageManager.initialize();
});
