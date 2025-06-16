/**
 * Club Players Form - Client-side JavaScript
 * 
 * Handles interactive functionality for add/edit player forms.
 * Follows coding guidelines with external JavaScript files.
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeFormValidation();
    initializeCharacterCounter();
    initializeDateValidation();
    initializeFormEnhancements();
});

/**
 * Initialize form validation enhancements
 */
function initializeFormValidation() {
    const form = document.querySelector('form[action*="/clubs/players"]');
    if (!form) return;

    // Add real-time validation feedback
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearFieldError(input));
    });

    // Enhance form submission
    form.addEventListener('submit', (event) => {
        if (!validateForm(form)) {
            event.preventDefault();
            showFormErrors();
        } else {
            showSubmissionLoading();
        }
    });
}

/**
 * Initialize character counter for notes field
 */
function initializeCharacterCounter() {
    const notesField = document.getElementById('notes');
    const counter = document.getElementById('notesCounter');
    
    if (!notesField || !counter) return;

    const updateCounter = () => {
        const length = notesField.value.length;
        counter.textContent = length;
        
        // Add visual feedback for character count
        counter.className = '';
        if (length > 800) {
            counter.classList.add('text-warning');
        }
        if (length > 950) {
            counter.classList.add('text-danger');
        }
        if (length >= 1000) {
            counter.classList.add('fw-bold');
        }
    };

    // Update counter on input
    notesField.addEventListener('input', updateCounter);
    
    // Initialize counter
    updateCounter();
}

/**
 * Initialize date validation for date of birth
 */
function initializeDateValidation() {
    const dobField = document.getElementById('dateOfBirth');
    if (!dobField) return;

    // Set reasonable min date (100 years ago)
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    dobField.min = minDate.toISOString().split('T')[0];

    // Real-time age calculation and validation
    dobField.addEventListener('change', () => {
        validateAge(dobField);
        updateAgeDisplay(dobField);
    });

    dobField.addEventListener('blur', () => {
        validateAge(dobField);
    });
}

/**
 * Initialize form enhancements
 */
function initializeFormEnhancements() {
    // Auto-capitalize names
    const nameFields = document.querySelectorAll('#firstName, #lastName');
    nameFields.forEach(field => {
        field.addEventListener('input', (event) => {
            const value = event.target.value;
            const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
            if (value !== capitalizedValue) {
                event.target.value = capitalizedValue;
            }
        });
    });

    // Email field enhancements
    const emailField = document.getElementById('email');
    if (emailField) {
        emailField.addEventListener('blur', () => {
            emailField.value = emailField.value.toLowerCase().trim();
        });
    }
}

/**
 * Validate a single form field
 * @param {HTMLElement} field - Field to validate
 */
function validateField(field) {
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
                const ageValidation = validateAge(field);
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
}

/**
 * Clear error styling from a field
 * @param {HTMLElement} field - Field to clear
 */
function clearFieldError(field) {
    field.classList.remove('is-invalid');
}

/**
 * Validate age based on date of birth
 * @param {HTMLElement} dobField - Date of birth field
 */
function validateAge(dobField) {
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
}

/**
 * Update age display with Masters eligibility
 * @param {HTMLElement} dobField - Date of birth field
 */
function updateAgeDisplay(dobField) {
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
}

/**
 * Validate entire form
 * @param {HTMLElement} form - Form to validate
 */
function validateForm(form) {
    const requiredFields = form.querySelectorAll('input[required], textarea[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        const validation = validateField(field);
        if (!validation.isValid) {
            isValid = false;
        }
    });

    return isValid;
}

/**
 * Show form validation errors
 */
function showFormErrors() {
    const firstInvalidField = document.querySelector('.is-invalid');
    if (firstInvalidField) {
        firstInvalidField.focus();
        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * Show loading state during form submission
 */
function showSubmissionLoading() {
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';
        
        // Store original text for potential restoration
        submitButton.setAttribute('data-original-text', originalText);
    }
}