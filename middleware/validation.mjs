/**
 * Enhanced Validation Middleware
 * 
 * Provides additional validation functions with improved security
 * and more descriptive error messages following MVC best practices.
 */

import { body } from 'express-validator';

/**
 * Enhanced email validation with security checks
 * @param {string} fieldName - Name of the field being validated
 * @param {boolean} required - Whether the field is required
 * @param {Object} options - Additional validation options
 * @returns {Object} Express-validator chain
 */
const validateEmail = (fieldName = 'email', required = true, options = {}) => {
    const {
        maxLength = 254, // RFC 5321 standard
        customMessage = null,
        normalizeEmail = true
    } = options;

    let validationChain;

    if (required) {
        validationChain = body(fieldName)
            .notEmpty()
            .withMessage(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`);
    } else {
        validationChain = body(fieldName)
            .optional({ nullable: true, checkFalsy: true });
    }

    return validationChain
        .trim()
        .isLength({ max: maxLength })
        .withMessage(`Email address must not exceed ${maxLength} characters`)
        .custom((value) => {
            if (!value) return true; // Skip if empty and optional

            // Additional security checks first (before isEmail)
            const email = value.toLowerCase().trim();

            // Block common disposable email domains
            const disposableDomains = [
                '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 
                'mailinator.com', 'yopmail.com', 'throwaway.email'
            ];
            
            const domain = email.split('@')[1];
            if (domain && disposableDomains.includes(domain)) {
                throw new Error('Disposable email addresses are not allowed. Please use a permanent email address.');
            }

            // Block emails with suspicious patterns
            if (email.includes('..') || email.includes('++') || email.includes('--')) {
                throw new Error('Email address contains invalid character sequences.');
            }

            // Ensure email doesn't start or end with special characters in local part
            if (email.includes('@')) {
                const localPart = email.split('@')[0];
                if (localPart.startsWith('.') || localPart.endsWith('.') || 
                    localPart.startsWith('+') || localPart.startsWith('-')) {
                    throw new Error('Email address format is invalid.');
                }
            }

            return true;
        })
        .isEmail({
            allow_display_name: false,
            require_display_name: false,
            allow_utf8_local_part: false,
            require_tld: true,
            allow_ip_domain: false,
            domain_specific_validation: false,
            blacklisted_chars: '',
            host_blacklist: []
        })
        .withMessage(customMessage || 'Please provide a valid email address (e.g., user@example.com)')
        .if(() => normalizeEmail)
        .normalizeEmail({
            gmail_lowercase: true,
            gmail_remove_dots: false,
            gmail_remove_subaddress: false,
            outlookdotcom_lowercase: true,
            outlookdotcom_remove_subaddress: false,
            yahoo_lowercase: true,
            yahoo_remove_subaddress: false,
            icloud_lowercase: true,
            icloud_remove_subaddress: false
        });
};

/**
 * Standard email validation for required fields
 */
const requiredEmail = (fieldName = 'email', customMessage = null) => {
    return validateEmail(fieldName, true, { customMessage });
};

/**
 * Optional email validation
 */
const optionalEmail = (fieldName = 'email', customMessage = null) => {
    return validateEmail(fieldName, false, { customMessage });
};

/**
 * Contact email validation with club-specific message
 */
const contactEmail = (fieldName = 'contactEmail') => {
    return validateEmail(fieldName, false, {
        customMessage: 'Please provide a valid contact email address for communication purposes'
    });
};

/**
 * Organiser email validation for carnivals
 */
const organiserEmail = (fieldName = 'organiserContactEmail') => {
    return validateEmail(fieldName, true, {
        customMessage: 'A valid organiser email address is required for carnival communications'
    });
};

/**
 * Player email validation with uniqueness message
 */
const playerEmail = (fieldName = 'email') => {
    return validateEmail(fieldName, true, {
        customMessage: 'Please provide a valid and unique email address for the player'
    });
};

/**
 * Admin email validation with enhanced security
 */
const adminEmail = (fieldName = 'email') => {
    return validateEmail(fieldName, true, {
        customMessage: 'Administrator accounts require a valid corporate or institutional email address'
    });
};

export {
    validateEmail,
    requiredEmail,
    optionalEmail,
    contactEmail,
    organiserEmail,
    playerEmail,
    adminEmail
};