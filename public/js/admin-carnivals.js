/**
 * Admin Carnival Management JavaScript
 * Handles carnival management functionality including deletion confirmation
 */

/**
 * Confirm deletion of a carnival
 * @param {string} carnivalId - The ID of the carnival to delete
 * @param {string} carnivalTitle - The title of the carnival for display
 */
function confirmDelete(carnivalId, carnivalTitle) {
    // Set the carnival title in the modal
    const titleElement = document.getElementById('carnivalTitle');
    if (titleElement) {
        titleElement.textContent = carnivalTitle;
    }
    
    // Set the form action
    const deleteForm = document.getElementById('deleteForm');
    if (deleteForm) {
        deleteForm.action = `/admin/carnivals/${carnivalId}/delete`;
    }
    
    // Show the modal
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(deleteModal);
        modal.show();
    }
}

/**
 * Initialize admin carnival functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin carnival management functionality loaded...');
    
    // Setup delete button for carnival list page
    const deleteBtn = document.querySelector('[data-action="delete-carnival-btn"]');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', confirmDelete);
    }
    
    // Setup delete button for edit carnival page
    const editPageDeleteBtn = document.querySelector('[data-delete-carnival]');
    if (editPageDeleteBtn) {
        editPageDeleteBtn.addEventListener('click', function() {
            const carnivalId = this.getAttribute('data-delete-carnival');
            const carnivalTitle = this.getAttribute('data-carnival-title');
            confirmDelete(carnivalId, carnivalTitle);
        });
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
                alert('Please fill in all required fields.');
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