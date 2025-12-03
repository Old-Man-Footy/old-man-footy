/**
 * Carnival Merge Manager
 * Handles the client-side functionality for merging carnivals
 */
export const carnivalMergeManager = {
    elements: {},
    state: {
        selectedCarnivals: []
    },

    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.updateSubmitButton();
    },

    cacheElements() {
        this.elements = {
            form: document.querySelector('#mergeForm'),
            checkboxes: document.querySelectorAll('input[name="sourceCarnivals"]'),
            selectAllBtn: document.querySelector('#selectAll'),
            selectNoneBtn: document.querySelector('#selectNone'),
            selectUnclaimedBtn: document.querySelector('#selectUnclaimed'),
            submitBtn: document.querySelector('#submitMerge'),
            selectedCountSpan: document.querySelector('#selectedCount'),
            confirmModal: new bootstrap.Modal(document.querySelector('#mergeConfirmModal')),
            confirmBtn: document.querySelector('#confirmMerge'),
            carnivalCards: document.querySelectorAll('.carnival-selection-card')
        };
    },

    bindEvents() {
        // Individual checkbox changes
        this.elements.checkboxes?.forEach(checkbox => {
            checkbox.addEventListener('change', this.handleCheckboxChange);
        });

        // Bulk selection buttons
        this.elements.selectAllBtn?.addEventListener('click', this.selectAll);
        this.elements.selectNoneBtn?.addEventListener('click', this.selectNone);
        this.elements.selectUnclaimedBtn?.addEventListener('click', this.selectUnclaimed);

        // Form submission
        this.elements.form?.addEventListener('submit', this.handleFormSubmit);

        // Confirmation modal
        this.elements.confirmBtn?.addEventListener('click', this.confirmMerge);

        // Card click handling (optional UX enhancement)
        this.elements.carnivalCards?.forEach(card => {
            card.addEventListener('click', this.handleCardClick);
        });
    },

    handleCheckboxChange: (event) => {
        const checkbox = event.target;
        const card = checkbox.closest('.carnival-selection-card');
        
        if (checkbox.checked) {
            card?.classList.add('border-primary', 'bg-light');
            carnivalMergeManager.state.selectedCarnivals.push(checkbox.value);
        } else {
            card?.classList.remove('border-primary', 'bg-light');
            const index = carnivalMergeManager.state.selectedCarnivals.indexOf(checkbox.value);
            if (index > -1) {
                carnivalMergeManager.state.selectedCarnivals.splice(index, 1);
            }
        }
        
        carnivalMergeManager.updateSubmitButton();
        carnivalMergeManager.updateSelectedCount();
    },

    handleCardClick: (event) => {
        // Only trigger if clicking on the card but not on the checkbox itself
        if (event.target.type !== 'checkbox' && !event.target.classList.contains('form-check-label')) {
            const checkbox = event.currentTarget.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.click();
            }
        }
    },

    selectAll: () => {
        carnivalMergeManager.elements.checkboxes?.forEach(checkbox => {
            if (!checkbox.checked) {
                checkbox.click();
            }
        });
    },

    selectNone: () => {
        carnivalMergeManager.elements.checkboxes?.forEach(checkbox => {
            if (checkbox.checked) {
                checkbox.click();
            }
        });
    },

    selectUnclaimed: () => {
        // First clear all selections
        carnivalMergeManager.selectNone();
        
        // Then select only unclaimed carnivals (those with the "Unclaimed" badge)
        document.querySelectorAll('.carnival-selection-card').forEach(card => {
            const hasUnclaimedBadge = card.querySelector('.badge.bg-secondary');
            if (hasUnclaimedBadge && hasUnclaimedBadge.textContent.trim() === 'Unclaimed') {
                const checkbox = card.querySelector('input[type="checkbox"]');
                if (checkbox && !checkbox.checked) {
                    checkbox.click();
                }
            }
        });
    },

    updateSubmitButton() {
        const hasSelections = this.state.selectedCarnivals.length > 0;
        
        if (this.elements.submitBtn) {
            this.elements.submitBtn.disabled = !hasSelections;
            
            if (hasSelections) {
                this.elements.submitBtn.classList.remove('btn-secondary');
                this.elements.submitBtn.classList.add('btn-danger');
            } else {
                this.elements.submitBtn.classList.remove('btn-danger');
                this.elements.submitBtn.classList.add('btn-secondary');
            }
        }
    },

    updateSelectedCount() {
        if (this.elements.selectedCountSpan) {
            this.elements.selectedCountSpan.textContent = this.state.selectedCarnivals.length;
        }
    },

    handleFormSubmit: (event) => {
        event.preventDefault();
        
        if (carnivalMergeManager.state.selectedCarnivals.length === 0) {
            carnivalMergeManager.showAlert('Please select at least one carnival to merge.', 'warning');
            return;
        }

        // Update modal with current selection count and show it
        carnivalMergeManager.updateSelectedCount();
        carnivalMergeManager.elements.confirmModal.show();
    },

    confirmMerge: () => {
        // Hide the modal
        carnivalMergeManager.elements.confirmModal.hide();
        
        // Show loading state
        carnivalMergeManager.showLoadingState();
        
        // Submit the form
        carnivalMergeManager.elements.form?.submit();
    },

    showLoadingState() {
        if (this.elements.confirmBtn) {
            this.elements.confirmBtn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i> Merging...';
            this.elements.confirmBtn.disabled = true;
        }
        
        if (this.elements.submitBtn) {
            this.elements.submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i> Merging...';
            this.elements.submitBtn.disabled = true;
        }

        // Disable all checkboxes and buttons
        this.elements.checkboxes?.forEach(checkbox => {
            checkbox.disabled = true;
        });
        
        document.querySelectorAll('button').forEach(button => {
            if (!button.classList.contains('btn-close')) {
                button.disabled = true;
            }
        });
    },

    showAlert(message, type = 'info') {
        // Create and show a Bootstrap alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Insert at the top of the container
        const container = document.querySelector('.container[data-page-id="carnivals-merge"]');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
            
            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                const alert = bootstrap.Alert.getOrCreateInstance(alertDiv);
                alert?.close();
            }, 5000);
        }
    }
};

// CSS for spinning animation
const style = document.createElement('style');
style.textContent = `
    .spin {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .carnival-selection-card {
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .carnival-selection-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    .carnival-selection-card.border-primary {
        box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25);
    }
    
    .bg-light-success {
        background-color: rgba(25, 135, 84, 0.1) !important;
    }
    
    .bg-light-warning {
        background-color: rgba(255, 193, 7, 0.1) !important;
    }
    
    .bg-light-danger {
        background-color: rgba(220, 53, 69, 0.1) !important;
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    carnivalMergeManager.initialize();
});
