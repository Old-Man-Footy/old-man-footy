/**
 * Club Players Form Manager
 */
export const clubPlayersFormManager = {
    elements: {},

    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.initializeCharacterCounter();
        this.initializeDateValidation();
        this.initializeFormEnhancements();
    },

    cacheElements() {
        this.elements.form = document.querySelector('form[action*="/clubs/players"]');
        this.elements.notesField = document.getElementById('notes');
        this.elements.counter = document.getElementById('notesCounter');
        this.elements.dobField = document.getElementById('dateOfBirth');
        this.elements.firstName = document.getElementById('firstName');
        this.elements.lastName = document.getElementById('lastName');
        this.elements.email = document.getElementById('email');
        this.elements.submitButton = document.querySelector('button[type="submit"]');
    },

    bindEvents() {
        const form = this.elements.form;
        if (form) {
            const inputs = form.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input.addEventListener('blur', () => this.validateField(input));
                input.addEventListener('input', () => this.clearFieldError(input));
            });
            form.addEventListener('submit', (carnival) => {
                if (!this.validateForm(form)) {
                    carnival.preventDefault();
                    this.showFormErrors();
                } else {
                    this.showSubmissionLoading();
                }
            });
        }
    },

    initializeCharacterCounter() {
        const notesField = this.elements.notesField;
        const counter = this.elements.counter;
        if (!notesField || !counter) return;
        const updateCounter = () => {
            const length = notesField.value.length;
            counter.textContent = length;
            counter.className = '';
            if (length > 800) counter.classList.add('text-warning');
            if (length > 950) counter.classList.add('text-danger');
            if (length >= 1000) counter.classList.add('fw-bold');
        };
        notesField.addEventListener('input', updateCounter);
        updateCounter();
    },

    initializeDateValidation() {
        const dobField = this.elements.dobField;
        if (!dobField) return;
        const today = new Date();
        const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
        dobField.min = minDate.toISOString().split('T')[0];
        dobField.addEventListener('change', () => {
            this.validateAge(dobField);
            this.updateAgeDisplay(dobField);
        });
        dobField.addEventListener('blur', () => {
            this.validateAge(dobField);
        });
    },

    initializeFormEnhancements() {
        const nameFields = document.querySelectorAll('#firstName, #lastName');
        nameFields.forEach(field => {
            field.addEventListener('input', (carnival) => {
                const value = carnival.target.value;
                const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                if (value !== capitalizedValue) {
                    carnival.target.value = capitalizedValue;
                }
            });
        });
        const emailField = this.elements.email;
        if (emailField) {
            emailField.addEventListener('blur', () => {
                emailField.value = emailField.value.toLowerCase().trim();
            });
        }
    },

    validateField(field) {
        const value = (field.value || '').trim();
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
        field.classList.remove('is-valid', 'is-invalid');
        if (value) field.classList.add(isValid ? 'is-valid' : 'is-invalid');
        return { isValid, message: errorMessage };
    },

    clearFieldError(field) {
        field.classList.remove('is-invalid');
    },

    validateAge(dobField) {
        const value = dobField.value;
        if (!value) return { isValid: false, message: 'Date of birth is required' };
        const birthDate = new Date(value);
        const today = new Date();
        if (birthDate > today) return { isValid: false, message: 'Date of birth cannot be in the future' };
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
        if (adjustedAge < 16) return { isValid: false, message: 'Player must be at least 16 years old' };
        if (adjustedAge > 100) return { isValid: false, message: 'Please check the date of birth' };
        return { isValid: true, message: '' };
    },

    updateAgeDisplay(dobField) {
        const value = dobField.value;
        if (!value) return;
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
        let ageDisplay = dobField.parentNode.querySelector('.age-display');
        if (!ageDisplay) {
            ageDisplay = document.createElement('div');
            ageDisplay.className = 'age-display form-text mt-1';
            dobField.parentNode.appendChild(ageDisplay);
        }
        if (adjustedAge >= 16 && adjustedAge <= 100) {
            const mastersEligible = adjustedAge >= 35;
            const eligibilityText = mastersEligible ? '<span class="text-success">✓ Masters eligible</span>' : '<span class="text-warning">⚠ Under 35 - Not Masters eligible</span>';
            ageDisplay.innerHTML = `Age: ${adjustedAge} years old - ${eligibilityText}`;
        } else {
            ageDisplay.innerHTML = '';
        }
    },

    validateForm(form) {
        const requiredFields = form.querySelectorAll('input[required], textarea[required]');
        let isValid = true;
        requiredFields.forEach(field => {
            const res = this.validateField(field);
            if (!res.isValid) isValid = false;
        });
        return isValid;
    },

    showFormErrors() {
        const firstInvalidField = document.querySelector('.is-invalid');
        if (firstInvalidField) {
            try { firstInvalidField.focus(); } catch {}
            try { firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
        }
    },

    showSubmissionLoading() {
        const submitButton = this.elements.submitButton || document.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';
            submitButton.setAttribute('data-original-text', originalText);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    try { clubPlayersFormManager.initialize(); } catch {}
});