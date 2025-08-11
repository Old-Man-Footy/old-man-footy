/**
 * Club Players Form - Client-side JavaScript
 * 
 * Handles interactive functionality for add/edit player forms.
 * Follows coding guidelines with external JavaScript files.
 */

export const clubPlayersFormManager = {
    elements: {},

    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.initializeFormEnhancements();
        this.initializeCharacterCounter();
        this.initializeDateValidation();
        console.log('Club Players Form Manager initialized');
    },

    cacheElements() {
        this.elements.form = document.querySelector('form[action*="/clubs/players"]');
        this.elements.notesField = document.getElementById('notes');
        this.elements.notesCounter = document.getElementById('notesCounter');
        this.elements.dobField = document.getElementById('dateOfBirth');
        this.elements.nameFields = document.querySelectorAll('#firstName, #lastName');
        this.elements.emailField = document.getElementById('email');
        this.elements.submitButton = document.querySelector('button[type="submit"]');
    },

    bindEvents() {
        if (!this.elements.form) return;

        // Form validation events
        const inputs = this.elements.form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });

        // Form submission
        this.elements.form.addEventListener('submit', this.handleFormSubmit);

        // Character counter
        if (this.elements.notesField) {
            this.elements.notesField.addEventListener('input', this.updateCharacterCounter);
        }

        // Date validation
        if (this.elements.dobField) {
            this.elements.dobField.addEventListener('change', this.handleDateChange);
            this.elements.dobField.addEventListener('blur', this.handleDateBlur);
        }

        // Name field enhancements
        this.elements.nameFields.forEach(field => {
            field.addEventListener('input', this.handleNameInput);
        });

        // Email field enhancements
        if (this.elements.emailField) {
            this.elements.emailField.addEventListener('blur', this.handleEmailBlur);
        }
    },

    handleFormSubmit: (event) => {
        if (!clubPlayersFormManager.validateForm(clubPlayersFormManager.elements.form)) {
            event.preventDefault();
            clubPlayersFormManager.showFormErrors();
        } else {
            clubPlayersFormManager.showSubmissionLoading();
        }
    },

    updateCharacterCounter: () => {
        const { notesField, notesCounter } = clubPlayersFormManager.elements;
        if (!notesField || !notesCounter) return;

        const length = notesField.value.length;
        notesCounter.textContent = length;
        
        // Add visual feedback for character count
        notesCounter.className = '';
        if (length > 800) {
            notesCounter.classList.add('text-warning');
        }
        if (length > 950) {
            notesCounter.classList.add('text-danger');
        }
        if (length >= 1000) {
            notesCounter.classList.add('fw-bold');
        }
    },

    handleDateChange: () => {
        const dobField = clubPlayersFormManager.elements.dobField;
        clubPlayersFormManager.validateAge(dobField);
        clubPlayersFormManager.updateAgeDisplay(dobField);
    },

    handleDateBlur: () => {
        const dobField = clubPlayersFormManager.elements.dobField;
        clubPlayersFormManager.validateAge(dobField);
    },

    handleNameInput: (event) => {
        const value = event.target.value;
        const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        if (value !== capitalizedValue) {
            event.target.value = capitalizedValue;
        }
    },

    handleEmailBlur: () => {
        const emailField = clubPlayersFormManager.elements.emailField;
        emailField.value = emailField.value.toLowerCase().trim();
    },

    initializeFormEnhancements() {
        // This method is called during initialization to set up any initial state
        // that doesn't require event binding
    },

    initializeCharacterCounter() {
        if (this.elements.notesField && this.elements.notesCounter) {
            this.updateCharacterCounter();
        }
    },

    initializeDateValidation() {
        if (!this.elements.dobField) return;

        // Set reasonable min date (100 years ago)
        const today = new Date();
        const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
        this.elements.dobField.min = minDate.toISOString().split('T')[0];
    },

    /**
     * Validate a single form field
     * @param {HTMLElement} field - Field to validate
     */
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        switch (field.id) {
            case 'firstName':
            case 'lastName':
                if (!value) {
                    isValid = false;
                    errorMessage = `${field.id === 'firstName' ? 'First' : 'Last'} name is required`;
                } else if (!/^[a-zA-Z]+$/.test(value)) {
                    isValid = false;
                    errorMessage = 'Name must contain only letters';
                } else if (value.length > 50) {
                    isValid = false;
                    errorMessage = 'Name must be 50 characters or less';
                }
                break;

            case 'email':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Email is required';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email address';
                }
                break;

            case 'dateOfBirth':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Date of birth is required';
                } else {
                    const ageValidation = this.validateAge(field);
                    isValid = ageValidation.isValid;
                    errorMessage = ageValidation.message;
                }
                break;

            case 'notes':
                if (value.length > 1000) {
                    isValid = false;
                    errorMessage = 'Notes cannot exceed 1000 characters';
                }
                break;
        }

        // Update field styling
        field.classList.remove('is-valid', 'is-invalid');
        if (value) { // Only show validation states if field has content
            field.classList.add(isValid ? 'is-valid' : 'is-invalid');
        }

        return { isValid, message: errorMessage };
    },

    /**
     * Clear error styling from a field
     * @param {HTMLElement} field - Field to clear
     */
    clearFieldError(field) {
        field.classList.remove('is-invalid');
    },

    /**
     * Validate age based on date of birth
     * @param {HTMLElement} dobField - Date of birth field
     */
    validateAge(dobField) {
        const value = dobField.value;
        if (!value) return { isValid: false, message: 'Date of birth is required' };

        const birthDate = new Date(value);
        const today = new Date();
        
        if (birthDate > today) {
            return { isValid: false, message: 'Date of birth cannot be in the future' };
        }

        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
            ? age - 1 : age;

        if (adjustedAge < 16) {
            return { isValid: false, message: 'Player must be at least 16 years old' };
        }
        
        if (adjustedAge > 100) {
            return { isValid: false, message: 'Please check the date of birth' };
        }

        return { isValid: true, message: '' };
    },

    /**
     * Update age display with Masters eligibility
     * @param {HTMLElement} dobField - Date of birth field
     */
    updateAgeDisplay(dobField) {
        const value = dobField.value;
        if (!value) return;

        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
            ? age - 1 : age;

        // Create or update age display
        let ageDisplay = dobField.parentNode.querySelector('.age-display');
        if (!ageDisplay) {
            ageDisplay = document.createElement('div');
            ageDisplay.className = 'age-display form-text mt-1';
            dobField.parentNode.appendChild(ageDisplay);
        }

        if (adjustedAge >= 16 && adjustedAge <= 100) {
            const mastersEligible = adjustedAge >= 35;
            const eligibilityText = mastersEligible 
                ? '<span class="text-success">✓ Masters eligible</span>'
                : '<span class="text-warning">⚠ Under 35 - Not Masters eligible</span>';
            
            ageDisplay.innerHTML = `Age: ${adjustedAge} years old - ${eligibilityText}`;
        } else {
            ageDisplay.innerHTML = '';
        }
    },

    /**
     * Validate entire form
     * @param {HTMLElement} form - Form to validate
     */
    validateForm(form) {
        const requiredFields = form.querySelectorAll('input[required], textarea[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            const validation = this.validateField(field);
            if (!validation.isValid) {
                isValid = false;
            }
        });

        return isValid;
    },

    /**
     * Show form validation errors
     */
    showFormErrors() {
        const firstInvalidField = document.querySelector('.is-invalid');
        if (firstInvalidField) {
            firstInvalidField.focus();
            firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    /**
     * Show loading state during form submission
     */
    showSubmissionLoading() {
        const submitButton = this.elements.submitButton;
        if (submitButton) {
            submitButton.disabled = true;
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';
            
            // Store original text for potential restoration
            submitButton.setAttribute('data-original-text', originalText);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    clubPlayersFormManager.initialize();
});