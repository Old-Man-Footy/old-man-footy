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
        this.initializeEditPageFunctionality();
        console.log('Admin carnival management functionality initialized successfully');
      },
    
      cacheElements() {
        // Active Toggle Modal (Deactivate/Activate - isActive field)
        this.elements.activeToggleModal = document.getElementById('activeToggleModal');
        this.elements.confirmActiveToggle = document.getElementById('confirmActiveToggle');
        
        // Status Toggle Modal (Disable/Enable - isDisabled field)  
        this.elements.statusToggleModal = document.getElementById('statusToggleModal');
        this.elements.confirmStatusToggle = document.getElementById('confirmStatusToggle');
        this.elements.toastContainer = document.getElementById('toast-container');
        
        // Cache edit page elements
        this.elements.endDateContainer = document.getElementById('endDateContainer');
        this.elements.logoPreviewImages = document.querySelectorAll('.admin-carnival-logo-preview');
        this.elements.promoPreviewImages = document.querySelectorAll('.admin-carnival-promo-preview');
        this.elements.fileInputs = document.querySelectorAll('.admin-file-input-hidden');
        this.elements.fileUploadAreas = document.querySelectorAll('.file-upload-area');
        this.elements.isMultiDayCheckbox = document.getElementById('isMultiDay');
        this.elements.endDateInput = document.getElementById('endDate');
        this.elements.dateLabel = document.getElementById('dateLabel');
        this.elements.startDateInput = document.getElementById('date');
        this.elements.mySidelineIdInput = document.getElementById('mySidelineId');
        this.elements.registrationLinkInput = document.getElementById('registrationLink');
        this.elements.linkStatusElement = document.getElementById('linkStatus');
        this.elements.testLinkBtn = document.getElementById('testLinkBtn');
        this.elements.form = document.querySelector('form[data-mysideline-carnival-url]');
        this.elements.getLocationBtn = document.getElementById('getLocationBtn');
      },
    
      bindEvents() {
        // Setup active toggle buttons (Deactivate/Activate - isActive field)
        const activeToggleButtons = document.querySelectorAll('[data-toggle-carnival-active]');
        activeToggleButtons.forEach(button => {
          button.addEventListener('click', (carnival) => {
            const carnivalId = button.getAttribute('data-toggle-carnival-active');
            const carnivalTitle = button.getAttribute('data-carnival-title');
            const currentActive = button.getAttribute('data-current-active') === 'true';
            this.showActiveToggleModal(carnivalId, carnivalTitle, currentActive);
          });
        });

        // Setup status toggle buttons (Disable/Enable - isDisabled field)
        const statusToggleButtons = document.querySelectorAll('[data-toggle-carnival-status]');
        statusToggleButtons.forEach(button => {
          button.addEventListener('click', (carnival) => {
            const carnivalId = button.getAttribute('data-toggle-carnival-status');
            const carnivalTitle = button.getAttribute('data-carnival-title');
            const currentStatus = button.getAttribute('data-current-status') === 'true';
            this.showStatusToggleModal(carnivalId, carnivalTitle, currentStatus);
          });
        });
    
        // Setup confirm buttons in modals
        if (this.elements.confirmStatusToggle) {
          this.elements.confirmStatusToggle.addEventListener('click', this.confirmStatusToggle.bind(this));
        }
        if (this.elements.confirmActiveToggle) {
          this.elements.confirmActiveToggle.addEventListener('click', this.confirmActiveToggle.bind(this));
        }

        // Setup delete carnival functionality
        const deleteButtons = document.querySelectorAll('[data-delete-carnival]');
        deleteButtons.forEach(button => {
          button.addEventListener('click', (e) => {
            const carnivalId = button.getAttribute('data-delete-carnival');
            const carnivalTitle = button.getAttribute('data-carnival-title');
            this.showDeleteModal(carnivalId, carnivalTitle);
          });
        });
      },

      initializeEditPageFunctionality() {
        // Only initialize if we're on the edit page
        if (!this.elements.form) return;
        
        this.initializePageStyling();
        this.initializeFileUploads();
        this.initializeMultiDayCarnivalFunctionality();
        this.initializeMySidelineIntegration();
        this.initializeLocationLookup();
      },

      initializePageStyling() {
        if (this.elements.endDateContainer) {
            const hasEndDate = this.elements.endDateContainer.dataset.hasEndDate === 'true';
            if (!hasEndDate) {
                this.elements.endDateContainer.style.display = 'none';
            }
        }
        this.elements.logoPreviewImages.forEach(img => {
            img.style.height = '150px';
            img.style.objectFit = 'contain';
        });
        this.elements.promoPreviewImages.forEach(img => {
            img.style.height = '150px';
            img.style.objectFit = 'cover';
        });
        this.elements.fileInputs.forEach(input => {
            input.style.display = 'none';
        });
      },

      initializeFileUploads() {
        this.elements.fileUploadAreas.forEach(area => {
            area.addEventListener('click', this.handleFileAreaClick);
        });
      },

      handleFileAreaClick: function(carnival) {
        const area = carnival.currentTarget;
        const input = area?.querySelector('input[type="file"]');
        if (input) input.click();
      },

      initializeMultiDayCarnivalFunctionality() {
        const { isMultiDayCheckbox, endDateContainer, endDateInput, dateLabel, startDateInput } = this.elements;
        if (!isMultiDayCheckbox || !endDateContainer || !endDateInput || !dateLabel || !startDateInput) return;

        isMultiDayCheckbox.addEventListener('change', () => this.toggleEndDateVisibility());
        startDateInput.addEventListener('change', () => {
            if (isMultiDayCheckbox.checked) this.updateEndDateMin();
        });
        endDateInput.addEventListener('change', () => this.validateEndDate());

        if (isMultiDayCheckbox.checked) {
            this.toggleEndDateVisibility(true);
        }
      },

      toggleEndDateVisibility(isInitialLoad = false) {
        const { isMultiDayCheckbox, endDateContainer, endDateInput, dateLabel } = this.elements;
        const isChecked = isMultiDayCheckbox.checked;

        endDateContainer.style.display = isChecked ? 'block' : 'none';
        dateLabel.textContent = isChecked ? 'Carnival Start Date *' : 'Carnival Date *';
        endDateInput.required = isChecked;

        if (isChecked) {
            this.updateEndDateMin();
        } else if (!isInitialLoad) {
            endDateInput.value = '';
        }
      },

      updateEndDateMin() {
        const { startDateInput, endDateInput } = this.elements;
        if (startDateInput.value) {
            const startDate = new Date(startDateInput.value);
            startDate.setDate(startDate.getDate() + 1);
            const minEndDate = startDate.toISOString().split('T')[0];
            endDateInput.min = minEndDate;
            if (endDateInput.value && endDateInput.value <= startDateInput.value) {
                endDateInput.value = minEndDate;
            }
        }
      },

      validateEndDate() {
        const { startDateInput, endDateInput } = this.elements;
        if (endDateInput.value && startDateInput.value) {
            if (endDateInput.value <= startDateInput.value) {
                endDateInput.setCustomValidity('End date must be after the start date');
                endDateInput.classList.add('is-invalid');
            } else {
                endDateInput.setCustomValidity('');
                endDateInput.classList.remove('is-invalid');
            }
        }
      },

      initializeMySidelineIntegration() {
        const { mySidelineIdInput, registrationLinkInput } = this.elements;
        if (!mySidelineIdInput || !registrationLinkInput) return;

        mySidelineIdInput.addEventListener('input', () => this.handleMySidelineIdChange());
        registrationLinkInput.addEventListener('input', () => this.handleRegistrationLinkChange());

        if (mySidelineIdInput.value) {
            this.handleMySidelineIdChange();
        } else if (registrationLinkInput.value) {
            this.handleRegistrationLinkChange();
        }
      },

      handleMySidelineIdChange() {
        const { mySidelineIdInput } = this.elements;
        const eventId = mySidelineIdInput.value.trim();
        if (!eventId) {
            this.updateRegistrationLink('', 'Player registration link - will auto-update when MySideline ID is entered');
            return;
        }
        const cleanId = eventId.replace(/\D/g, '');
        if (!cleanId) {
            this.updateRegistrationLink('', 'Please enter a valid numeric MySideline carnival ID', 'text-warning');
            return;
        }
        if (cleanId !== eventId) {
            mySidelineIdInput.value = cleanId;
        }
        const mySidelineUrl = this.generateMySidelineUrl(cleanId);
        this.updateRegistrationLink(mySidelineUrl, `✓ Registration link auto-generated from MySideline carnival ${cleanId}`, 'text-success');
      },

      handleRegistrationLinkChange() {
        const { registrationLinkInput, linkStatusElement, testLinkBtn, mySidelineIdInput } = this.elements;
        const url = registrationLinkInput.value.trim();
        if (!url) {
            this.updateRegistrationLink('', 'Player registration link - will auto-update when MySideline ID is entered');
            return;
        }
        if (this.isValidUrl(url)) {
            const mySidelineMatch = url.match(/mysideline\.com\/register\/(\d+)/);
            if (mySidelineMatch) {
                const extractedId = mySidelineMatch[1];
                this.updateRegistrationLink(url, `✓ MySideline registration link (Carnival ID: ${extractedId})`, 'text-success');
                if (!mySidelineIdInput.value || mySidelineIdInput.value !== extractedId) {
                    mySidelineIdInput.value = extractedId;
                }
            } else {
                this.updateRegistrationLink(url, '✓ Custom registration link', 'text-dark');
            }
        } else {
            this.updateRegistrationLink(url, '⚠ Please enter a valid URL', 'text-warning');
        }
      },

      generateMySidelineUrl(eventId) {
        const { form } = this.elements;
        const mySidelineBaseUrl = form ? form.dataset.mysidelineCarnivalUrl : '';
        if (!eventId || !mySidelineBaseUrl) return '';
        return `${mySidelineBaseUrl}${eventId}`;
      },

      updateRegistrationLink(url, status, statusClass = 'text-muted') {
        const { registrationLinkInput, linkStatusElement, testLinkBtn } = this.elements;
        
        if (registrationLinkInput) {
            registrationLinkInput.value = url;
        }
        
        if (linkStatusElement) {
            linkStatusElement.textContent = status;
            linkStatusElement.className = `form-text ${statusClass}`;
        }
        
        if (testLinkBtn) {
            if (url && this.isValidUrl(url)) {
                testLinkBtn.style.display = 'block';
                testLinkBtn.onclick = () => window.open(url, '_blank');
            } else {
                testLinkBtn.style.display = 'none';
            }
        }
      },

      isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
      },

      initializeLocationLookup() {
        if (this.elements.getLocationBtn) {
            this.elements.getLocationBtn.addEventListener('click', () => this.getLocationFromAddress());
        }
      },

      async getLocationFromAddress() {
        const locationAddress = document.getElementById('locationAddress');
        const locationLatitude = document.getElementById('locationLatitude');
        const locationLongitude = document.getElementById('locationLongitude');
        
        if (!locationAddress || !locationLatitude || !locationLongitude) return;
        
        const address = locationAddress.value.trim();
        if (!address) {
            this.showToast('error', 'Please enter an address first');
            return;
        }

        const btn = this.elements.getLocationBtn;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Looking up...';
        btn.disabled = true;

        try {
            // Using a simple geocoding service (you may want to use Google Maps API or similar)
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                
                locationLatitude.value = lat.toFixed(6);
                locationLongitude.value = lon.toFixed(6);
                
                this.showToast('success', 'GPS coordinates updated successfully');
            } else {
                this.showToast('error', 'Could not find coordinates for this address');
            }
        } catch (error) {
            console.error('Error geocoding address:', error);
            this.showToast('error', 'Error looking up coordinates');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
      },

      showDeleteModal(carnivalId, carnivalTitle) {
        const modal = document.getElementById('deleteModal');
        const titleElement = document.getElementById('carnivalTitle');
        const deleteForm = document.getElementById('deleteForm');
        
        if (titleElement) titleElement.textContent = carnivalTitle;
        if (deleteForm) deleteForm.action = `/admin/carnivals/${carnivalId}/delete`;
        
        if (modal && typeof bootstrap !== 'undefined') {
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();
        }
      },
    
      // Active Toggle Modal (Deactivate/Activate - isActive field)
      showActiveToggleModal(carnivalId, carnivalTitle, isActive) {
        this.currentCarnivalId = carnivalId;
        this.currentCarnivalTitle = carnivalTitle;
        this.currentActiveStatus = isActive;

        // Update modal content based on current active status
        const modal = this.elements.activeToggleModal;
        if (!modal) return;

        const titleElement = modal.querySelector('#toggleActiveTitle');
        const messageElement = modal.querySelector('#activeToggleMessage');
        const warningElement = modal.querySelector('#activeWarningText');
        const confirmButton = this.elements.confirmActiveToggle;

        if (titleElement) titleElement.textContent = carnivalTitle;

        if (isActive) {
          messageElement.textContent = 'Are you sure you want to deactivate this carnival?';
          warningElement.textContent = 'Deactivated carnivals will hide registration and contact information from visitors.';
          confirmButton.className = 'btn btn-warning';
          confirmButton.innerHTML = '<i class="bi bi-pause-circle"></i> Deactivate Carnival';
        } else {
          messageElement.textContent = 'Are you sure you want to activate this carnival?';
          warningElement.textContent = 'Activated carnivals will show registration and contact information to visitors.';
          confirmButton.className = 'btn btn-success';
          confirmButton.innerHTML = '<i class="bi bi-play-circle"></i> Activate Carnival';
        }

        // Show the active toggle modal
        if (typeof bootstrap !== 'undefined') {
          const bootstrapModal = new bootstrap.Modal(modal);
          bootstrapModal.show();
        }
      },

      // Status Toggle Modal (Disable/Enable - isDisabled field)
      showStatusToggleModal(carnivalId, carnivalTitle, isDisabled) {
        this.currentCarnivalId = carnivalId;
        this.currentCarnivalTitle = carnivalTitle;
        this.currentStatus = isDisabled;
    
        // Update modal content based on current status
        const titleElement = document.getElementById('toggleCarnivalTitle');
        const messageElement = document.getElementById('statusToggleMessage');
        const warningElement = document.getElementById('statusWarningText');
        const actionTextElement = document.getElementById('toggleActionText');
        const confirmButton = this.elements.confirmStatusToggle;
    
        if (titleElement) titleElement.textContent = carnivalTitle;
    
        if (isDisabled) {
          // Carnival is currently disabled, offer to enable it
          messageElement.textContent = 'Are you sure you want to enable this carnival?';
          warningElement.textContent = 'Enabled carnivals will be visible on the site again';
          actionTextElement.textContent = 'Enable';
          confirmButton.className = 'btn btn-success';
          confirmButton.innerHTML = '<i class="bi bi-eye"></i> Enable Carnival';
        } else {
          // Carnival is currently enabled, offer to disable it
          messageElement.textContent = 'Are you sure you want to disable this carnival?';
          warningElement.textContent = 'Disabled carnivals will no longer be visible on the site';
          actionTextElement.textContent = 'Disable';
          confirmButton.className = 'btn btn-danger';
          confirmButton.innerHTML = '<i class="bi bi-eye-slash"></i> Disable Carnival';
        }
    
        // Show the modal
        if (this.elements.statusToggleModal && typeof bootstrap !== 'undefined') {
          const modal = new bootstrap.Modal(this.elements.statusToggleModal);
          modal.show();
        }
      },
    
      // Active Toggle Confirmation (Deactivate/Activate - isActive field)
      async confirmActiveToggle() {
        if (!this.currentCarnivalId) {
          console.error('No carnival ID set for active toggle');
          return;
        }

        const confirmButton = this.elements.confirmActiveToggle;
        const originalContent = confirmButton.innerHTML;
        confirmButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Processing...';
        confirmButton.disabled = true;

        try {
          const response = await fetch(`/admin/carnivals/${this.currentCarnivalId}/toggle-active`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ isActive: !this.currentActiveStatus })
          });

          const data = await response.json();

          if (data.success) {
            this.showToast('success', data.message);
            setTimeout(() => window.location.reload(), 1000);
          } else {
            this.showToast('error', data.message || 'Error updating carnival active status');
          }
        } catch (error) {
          console.error('Error toggling carnival active status:', error);
          this.showToast('error', 'Error updating carnival active status');
        } finally {
          confirmButton.innerHTML = originalContent;
          confirmButton.disabled = false;

          // Hide the active toggle modal
          const modal = this.elements.activeToggleModal;
          if (modal && typeof bootstrap !== 'undefined') {
            const bootstrapModal = bootstrap.Modal.getInstance(modal);
            if (bootstrapModal) bootstrapModal.hide();
          }
        }
      },

      // Status Toggle Confirmation (Disable/Enable - isDisabled field)
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
            body: JSON.stringify({ isDisabled: !this.currentStatus })
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
    