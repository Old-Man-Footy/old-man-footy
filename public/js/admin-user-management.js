/**
 * Admin User Management JavaScript
 * Handles all user management functionality for admin pages
 * Consolidates functionality for both user list and edit user pages
 */

/**
 * Reset user password via admin action
 * @param {string} userId - The ID of the user to reset password for
 * @param {string} userName - The name of the user for confirmation
 */
async function resetPassword(userId, userName) {
    if (!confirm(`Are you sure you want to send a password reset email to ${userName}?`)) {
        return;
    }

    try {
        const response = await fetch(`/admin/users/${userId}/password-reset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const result = await response.json();

        if (result.success) {
            alert(`Password reset email sent successfully to ${userName}`);
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        alert('An error occurred while sending the password reset email');
    }
}

/**
 * Toggle user active status (used on users list page)
 * @param {HTMLElement} button - The button element that was clicked
 */
async function toggleUserStatus(button) {
    const userId = button.getAttribute('data-user-id');
    const newStatus = button.getAttribute('data-new-status') === 'true';
    const userName = button.getAttribute('data-user-name');
    
    const action = newStatus ? 'activate' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} ${userName}?`)) {
        return;
    }

    try {
        const requestUrl = `/admin/users/${userId}/toggle-status`;
        const requestData = { isActive: newStatus };
        
        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
            alert(result.message);
            window.location.reload();
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error('Error toggling user status:', error);
        alert(`An error occurred while updating the user status: ${error.message}`);
    }
}

/**
 * Delete user via admin action
 * @param {string} userId - The ID of the user to delete
 * @param {string} userName - The name of the user for confirmation
 * @param {boolean} isEditPage - Whether this is called from the edit page (affects redirect)
 */
async function deleteUser(userId, userName, isEditPage = false) {
    if (!confirm(`Are you sure you want to permanently delete ${userName}? This action cannot be undone.`)) {
        return;
    }

    // Second confirmation for destructive action
    if (!confirm(`FINAL WARNING: This will permanently delete ${userName} and all associated data. Are you absolutely sure?`)) {
        return;
    }

    try {
        const response = await fetch(`/admin/users/${userId}/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message);
            
            // Redirect based on page context
            if (isEditPage) {
                window.location.href = '/admin/users';
            } else {
                window.location.reload();
            }
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('An error occurred while deleting the user');
    }
}

/**
 * Initialize form validation for edit user page
 */
function initializeEditUserForm() {
    const clubSelect = document.getElementById('clubId');
    const primaryDelegateCheckbox = document.getElementById('isPrimaryDelegate');
    
    // Auto-check primary delegate when club is selected
    if (clubSelect && primaryDelegateCheckbox) {
        clubSelect.addEventListener('change', function() {
            if (this.value && !primaryDelegateCheckbox.checked) {
                // Suggest making them primary delegate if they're assigned to a club
                const shouldBePrimary = confirm('Would you like to make this user the primary delegate for the selected club?');
                if (shouldBePrimary) {
                    primaryDelegateCheckbox.checked = true;
                }
            }
        });
        
        // Warn if removing primary delegate status
        primaryDelegateCheckbox.addEventListener('change', function() {
            if (!this.checked && clubSelect.value) {
                const confirmRemoval = confirm('Are you sure you want to remove primary delegate status? This may affect club management capabilities.');
                if (!confirmRemoval) {
                    this.checked = true;
                }
            }
        });
    }
}

/**
 * Initialize event listeners for user list page
 */
function initializeUserListPage() {
    console.log('Admin users list page loaded, setting up event listeners...');
    
    // Add event listeners for toggle status buttons
    document.querySelectorAll('[data-action="toggle-status"]').forEach(button => {
        button.addEventListener('click', function() {
            toggleUserStatus(this);
        });
    });
    
    // Add event listeners for password reset buttons
    document.querySelectorAll('[data-action="reset-password"]').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const userName = this.getAttribute('data-user-name');
            resetPassword(userId, userName);
        });
    });
    
    // Add event listeners for delete user buttons
    document.querySelectorAll('[data-action="delete-user"]').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const userName = this.getAttribute('data-user-name');
            deleteUser(userId, userName, false);
        });
    });
    
    console.log('User list event listeners set up successfully');
}

/**
 * Initialize event listeners for edit user page
 */
function initializeEditUserPage() {
    // Setup event listeners for buttons with data attributes
    const resetPasswordBtn = document.querySelector('[data-action="reset-password"]');
    if (resetPasswordBtn) {
        resetPasswordBtn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const userName = this.getAttribute('data-user-name');
            resetPassword(userId, userName);
        });
    }

    const deleteUserBtn = document.querySelector('[data-action="delete-user"]');
    if (deleteUserBtn) {
        deleteUserBtn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const userName = this.getAttribute('data-user-name');
            deleteUser(userId, userName, true);
        });
    }

    // Add event listeners for toggle status buttons (can exist on edit page too)
    document.querySelectorAll('[data-action="toggle-status"]').forEach(button => {
        button.addEventListener('click', function() {
            toggleUserStatus(this);
        });
    });
    
    // Initialize form validation
    initializeEditUserForm();
}

/**
 * Initialize event listeners when the DOM is loaded
 * Automatically detects page context and initializes appropriate functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin user management script loaded');
    
    // Debug page detection
    const hasToggleButtons = document.querySelectorAll('[data-action="toggle-status"]').length > 0;
    const hasDeleteButtons = document.querySelectorAll('[data-action="delete-user"]').length > 0;
    const hasResetButtons = document.querySelectorAll('[data-action="reset-password"]').length > 0;
    const isEditPage = document.getElementById('clubId') !== null;
    
    console.log('🔍 Page detection results:', {
        hasToggleButtons,
        hasDeleteButtons,
        hasResetButtons,
        isEditPage,
        currentURL: window.location.pathname
    });
    
    // Force initialization regardless of page detection
    if (hasToggleButtons || hasDeleteButtons || hasResetButtons) {
        console.log('📋 Found action buttons, setting up event listeners...');
        
        // Add event listeners for toggle status buttons
        const toggleButtons = document.querySelectorAll('[data-action="toggle-status"]');
        console.log(`Found ${toggleButtons.length} toggle buttons`);
        toggleButtons.forEach((button, index) => {
            console.log(`Setting up toggle button ${index + 1}:`, button);
            button.addEventListener('click', function() {
                console.log('🔄 Toggle button clicked:', this);
                toggleUserStatus(this);
            });
        });
        
        // Add event listeners for delete user buttons
        const deleteButtons = document.querySelectorAll('[data-action="delete-user"]');
        console.log(`Found ${deleteButtons.length} delete buttons`);
        deleteButtons.forEach((button, index) => {
            console.log(`Setting up delete button ${index + 1}:`, button);
            button.addEventListener('click', function() {
                console.log('🗑️ Delete button clicked:', this);
                const userId = this.getAttribute('data-user-id');
                const userName = this.getAttribute('data-user-name');
                deleteUser(userId, userName, isEditPage);
            });
        });
        
        // Add event listeners for password reset buttons
        const resetButtons = document.querySelectorAll('[data-action="reset-password"]');
        console.log(`Found ${resetButtons.length} reset buttons`);
        resetButtons.forEach((button, index) => {
            console.log(`Setting up reset button ${index + 1}:`, button);
            button.addEventListener('click', function() {
                console.log('🔑 Reset button clicked:', this);
                const userId = this.getAttribute('data-user-id');
                const userName = this.getAttribute('data-user-name');
                resetPassword(userId, userName);
            });
        });
        
        console.log('✅ All event listeners attached successfully');
        
        // Initialize form validation if on edit page
        if (isEditPage) {
            initializeEditUserForm();
        }
        
    } else {
        console.log('❌ No action buttons found on this page');
    }
});