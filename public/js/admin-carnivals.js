/**
 * Admin Carnival Management JavaScript
 * Handles carnival management functionality including status toggle confirmation
 */

let currentCarnivalId = null;
let currentCarnivalTitle = null;
let currentStatus = null;

/**
 * Show status toggle confirmation modal
 * @param {string} carnivalId - The ID of the carnival to toggle
 * @param {string} carnivalTitle - The title of the carnival for display
 * @param {boolean} isActive - Current status of the carnival
 */
function showStatusToggleModal(carnivalId, carnivalTitle, isActive) {
    currentCarnivalId = carnivalId;
    currentCarnivalTitle = carnivalTitle;
    currentStatus = isActive;
    
    // Set the carnival title in the modal
    const titleElement = document.getElementById('toggleCarnivalTitle');
    if (titleElement) {
        titleElement.textContent = carnivalTitle;
    }
    
    // Update modal content based on current status
    const messageElement = document.getElementById('statusToggleMessage');
    const warningElement = document.getElementById('statusWarningText');
    const actionTextElement = document.getElementById('toggleActionText');
    const confirmButton = document.getElementById('confirmStatusToggle');
    
    if (isActive) {
        // Currently active, will deactivate
        messageElement.textContent = 'Are you sure you want to deactivate this carnival?';
        warningElement.textContent = 'Deactivated carnivals will no longer be visible on the site';
        actionTextElement.textContent = 'Deactivate';
        confirmButton.className = 'btn btn-danger';
        confirmButton.innerHTML = '<i class="bi bi-eye-slash"></i> <span id="toggleActionText">Deactivate</span> Carnival';
    } else {
        // Currently inactive, will reactivate
        messageElement.textContent = 'Are you sure you want to reactivate this carnival?';
        warningElement.textContent = 'Reactivated carnivals will become visible on the site again';
        actionTextElement.textContent = 'Reactivate';
        confirmButton.className = 'btn btn-success';
        confirmButton.innerHTML = '<i class="bi bi-eye"></i> <span id="toggleActionText">Reactivate</span> Carnival';
    }
    
    // Show the modal
    const statusToggleModal = document.getElementById('statusToggleModal');
    if (statusToggleModal && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(statusToggleModal);
        modal.show();
    }
}

/**
 * Confirm and execute status toggle
 */
function confirmStatusToggle() {
    if (!currentCarnivalId) {
        console.error('No carnival ID set for status toggle');
        return;
    }
    
    const newStatus = !currentStatus;
    
    // Show loading state
    const confirmButton = document.getElementById('confirmStatusToggle');
    const originalContent = confirmButton.innerHTML;
    confirmButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Processing...';
    confirmButton.disabled = true;
    
    // Send AJAX request to toggle status
    fetch(`/admin/carnivals/${currentCarnivalId}/toggle-status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
            isActive: newStatus
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            showToast('success', data.message);
            
            // Reload the page to reflect changes
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showToast('error', data.message || 'Error updating carnival status');
        }
    })
    .catch(error => {
        console.error('Error toggling carnival status:', error);
        showToast('error', 'Error updating carnival status');
    })
    .finally(() => {
        // Restore button state
        confirmButton.innerHTML = originalContent;
        confirmButton.disabled = false;
        
        // Close modal
        const statusToggleModal = document.getElementById('statusToggleModal');
        if (statusToggleModal && typeof bootstrap !== 'undefined') {
            const modal = bootstrap.Modal.getInstance(statusToggleModal);
            if (modal) {
                modal.hide();
            }
        }
    });
}

/**
 * Show toast notification
 * @param {string} type - Type of toast (success, error, warning, info)
 * @param {string} message - Message to display
 */
function showToast(type, message) {
    // Create toast element if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center bg-${type === 'success' ? 'success' : 'danger'} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    if (toastElement && typeof bootstrap !== 'undefined') {
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 5000
        });
        toast.show();
        
        // Remove toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
}

/**
 * Initialize admin carnival functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin carnival management functionality loaded...');
    
    // Setup status toggle buttons
    const statusToggleButtons = document.querySelectorAll('[data-toggle-carnival-status]');
    statusToggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const carnivalId = this.getAttribute('data-toggle-carnival-status');
            const carnivalTitle = this.getAttribute('data-carnival-title');
            const currentStatus = this.getAttribute('data-current-status') === 'true';
            
            showStatusToggleModal(carnivalId, carnivalTitle, currentStatus);
        });
    });
    
    // Setup confirm button in modal
    const confirmButton = document.getElementById('confirmStatusToggle');
    if (confirmButton) {
        confirmButton.addEventListener('click', confirmStatusToggle);
    }
    
    // Form validation for edit carnival page
    const editForm = document.querySelector('form[action*="/edit"]');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            const requiredFields = this.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    field.classList.add('is-invalid');
                    isValid = false;
                } else {
                    field.classList.remove('is-invalid');
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                showToast('error', 'Please fill in all required fields.');
            }
        });
    }
    
    // Auto-resize textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });
    
    console.log('Admin carnival management functionality initialized successfully');
});