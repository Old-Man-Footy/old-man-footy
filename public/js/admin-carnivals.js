/**
 * Admin Carnival Management JavaScript
 * Handles carnival management functionality including status toggle confirmation
 *
 * @module admin-carnivals
 */

export const adminCarnivalsManager = {
      elements: {},
    
      initialize() {
        this.cacheElements();
        this.bindEvents();
        console.log('Admin carnival management functionality initialized successfully');
      },
    
      cacheElements() {
        this.elements.statusToggleModal = document.getElementById('statusToggleModal');
        this.elements.confirmStatusToggle = document.getElementById('confirmStatusToggle');
        this.elements.toastContainer = document.getElementById('toast-container');
        // Cache other elements as needed
      },
    
      bindEvents() {
        // Setup status toggle buttons
        const statusToggleButtons = document.querySelectorAll('[data-toggle-carnival-status]');
        statusToggleButtons.forEach(button => {
          button.addEventListener('click', (event) => {
            const carnivalId = button.getAttribute('data-toggle-carnival-status');
            const carnivalTitle = button.getAttribute('data-carnival-title');
            const currentStatus = button.getAttribute('data-current-status') === 'true';
            this.showStatusToggleModal(carnivalId, carnivalTitle, currentStatus);
          });
        });
    
        // Setup confirm button in modal
        if (this.elements.confirmStatusToggle) {
          this.elements.confirmStatusToggle.addEventListener('click', this.confirmStatusToggle.bind(this));
        }
      },
    
      showStatusToggleModal(carnivalId, carnivalTitle, isActive) {
        this.currentCarnivalId = carnivalId;
        this.currentCarnivalTitle = carnivalTitle;
        this.currentStatus = isActive;
    
        // Update modal content based on current status
        const titleElement = document.getElementById('toggleCarnivalTitle');
        const messageElement = document.getElementById('statusToggleMessage');
        const warningElement = document.getElementById('statusWarningText');
        const actionTextElement = document.getElementById('toggleActionText');
        const confirmButton = this.elements.confirmStatusToggle;
    
        if (titleElement) titleElement.textContent = carnivalTitle;
    
        if (isActive) {
          messageElement.textContent = 'Are you sure you want to deactivate this carnival?';
          warningElement.textContent = 'Deactivated carnivals will no longer be visible on the site';
          actionTextElement.textContent = 'Deactivate';
          confirmButton.className = 'btn btn-danger';
          confirmButton.innerHTML = '<i class="bi bi-eye-slash"></i> Deactivate Carnival';
        } else {
          messageElement.textContent = 'Are you sure you want to reactivate this carnival?';
          warningElement.textContent = 'Reactivated carnivals will become visible on the site again';
          actionTextElement.textContent = 'Reactivate';
          confirmButton.className = 'btn btn-light';
          confirmButton.innerHTML = '<i class="bi bi-eye"></i> Reactivate Carnival';
        }
    
        // Show the modal
        if (this.elements.statusToggleModal && typeof bootstrap !== 'undefined') {
          const modal = new bootstrap.Modal(this.elements.statusToggleModal);
          modal.show();
        }
      },
    
      // **THE FIX IS HERE:** Converted to async/await to make it fully awaitable in tests.
      async confirmStatusToggle() {
        if (!this.currentCarnivalId) {
          console.error('No carnival ID set for status toggle');
          return;
        }
    
        const confirmButton = this.elements.confirmStatusToggle;
        const originalContent = confirmButton.innerHTML;
        confirmButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Processing...';
        confirmButton.disabled = true;
    
        try {
          const response = await fetch(`/admin/carnivals/${this.currentCarnivalId}/toggle-status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ isActive: !this.currentStatus })
          });
          const data = await response.json();
    
          if (data.success) {
            this.showToast('success', data.message);
            setTimeout(() => window.location.reload(), 1000);
          } else {
            this.showToast('error', data.message || 'Error updating carnival status');
          }
        } catch (error) {
          console.error('Error toggling carnival status:', error);
          this.showToast('error', 'Error updating carnival status');
        } finally {
          confirmButton.innerHTML = originalContent;
          confirmButton.disabled = false;
    
          if (this.elements.statusToggleModal && typeof bootstrap !== 'undefined') {
            const modal = bootstrap.Modal.getInstance(this.elements.statusToggleModal);
            if (modal) modal.hide();
          }
        }
      },
    
      showToast(type, message) {
        if (!this.elements.toastContainer) {
          this.elements.toastContainer = document.createElement('div');
          this.elements.toastContainer.id = 'toast-container';
          this.elements.toastContainer.className = 'position-fixed top-0 end-0 p-3';
          this.elements.toastContainer.style.zIndex = '9999';
          document.body.appendChild(this.elements.toastContainer);
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
    
        this.elements.toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
        const toastElement = document.getElementById(toastId);
        if (toastElement && typeof bootstrap !== 'undefined') {
          const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
          toast.show();
    
          toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
          });
        }
      }
    };
    
    document.addEventListener('DOMContentLoaded', () => {
      adminCarnivalsManager.initialize();
    });
    