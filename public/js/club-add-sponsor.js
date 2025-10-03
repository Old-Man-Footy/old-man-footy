/**
 * Club Add Sponsor Form Handler (Manager Object Pattern)
 * Handles intelligent duplicate detection and form submission
 */
export const clubAddSponsorManager = {
    elements: {},
    state: {
        duplicateCheckTimeout: null,
        existingSponsorData: null,
    },

    initialize() {
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        this.elements.sponsorNameInput = document.getElementById('sponsorName');
        this.elements.duplicateAlert = document.getElementById('duplicateAlert');
        this.elements.existingSponsorInfo = document.getElementById('existingSponsorInfo');
        this.elements.linkExistingBtn = document.getElementById('linkExistingBtn');
        this.elements.createNewBtn = document.getElementById('createNewBtn');
        this.elements.sponsorTypeInput = document.getElementById('sponsorTypeInput');
        this.elements.existingSponsorIdInput = document.getElementById('existingSponsorIdInput');
        this.elements.submitText = document.getElementById('submitText');
        this.elements.submitBtn = document.getElementById('submitBtn');
        this.elements.sponsorForm = document.getElementById('sponsorForm');
    },

    bindEvents() {
        if (this.elements.sponsorNameInput) {
            this.elements.sponsorNameInput.addEventListener('input', this.handleSponsorNameInput);
            this.elements.sponsorNameInput.addEventListener('focus', this.handleNameFocus);
            this.elements.sponsorNameInput.addEventListener('blur', this.handleNameBlur);
        }
        if (this.elements.linkExistingBtn) {
            this.elements.linkExistingBtn.addEventListener('click', this.handleLinkExistingClick);
        }
        if (this.elements.createNewBtn) {
            this.elements.createNewBtn.addEventListener('click', this.handleCreateNewClick);
        }
        if (this.elements.sponsorForm) {
            this.elements.sponsorForm.addEventListener('submit', this.handleFormSubmit);
        }
    },

    // Handlers
    handleSponsorNameInput: (e) => {
        const sponsorName = e.currentTarget.value.trim();
        clearTimeout(clubAddSponsorManager.state.duplicateCheckTimeout);
        if (sponsorName.length < 3) {
            clubAddSponsorManager.hideDuplicateAlert();
            return;
        }
        clubAddSponsorManager.state.duplicateCheckTimeout = setTimeout(() => {
            clubAddSponsorManager.checkForDuplicates(sponsorName);
        }, 500);
    },

    handleLinkExistingClick: () => {
        const data = clubAddSponsorManager.state.existingSponsorData;
        const el = clubAddSponsorManager.elements;
        if (!data) return;
        el.sponsorTypeInput.value = 'existing';
        el.existingSponsorIdInput.value = data.id;
        el.submitText.textContent = 'Link Existing Sponsor';
        clubAddSponsorManager.disableFormFields(true);
        el.submitBtn.className = 'btn btn-tertiary';
        el.submitBtn.innerHTML = '<i class="bi bi-link me-1"></i><span id="submitText">Link Existing Sponsor</span>';
    // When linking, only hide the duplicate alert UI without resetting state or form mode
    clubAddSponsorManager.hideDuplicateAlertUI();
        clubAddSponsorManager.showLinkingFeedback();
    },

    handleCreateNewClick: () => {
        clubAddSponsorManager.hideDuplicateAlert();
        clubAddSponsorManager.resetToNewSponsorMode();
    },

    handleFormSubmit: (e) => {
        const el = clubAddSponsorManager.elements;
        const originalContent = el.submitBtn.innerHTML;
        const isLinking = el.sponsorTypeInput.value === 'existing';
        el.submitBtn.disabled = true;
        el.submitBtn.innerHTML = `<i class="bi bi-arrow-clockwise spin me-1"></i>${isLinking ? 'Linking...' : 'Creating...'}`;
        setTimeout(() => {
            el.submitBtn.disabled = false;
            el.submitBtn.innerHTML = originalContent;
        }, 10000);
    },

    handleNameFocus: (e) => {
        e.currentTarget.classList.add('border-primary');
    },

    handleNameBlur: (e) => {
        e.currentTarget.classList.remove('border-primary');
    },

    // Core logic
    async checkForDuplicates(sponsorName) {
        try {
            const response = await fetch('/api/sponsors/check-duplicate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ sponsorName })
            });
            const data = await response.json();
            if (data.isDuplicate && data.existingSponsor) {
                this.showDuplicateAlert(data.existingSponsor);
            } else {
                this.hideDuplicateAlert();
            }
        } catch (error) {
            console.error('Error checking for duplicates:', error);
            this.hideDuplicateAlert();
        }
    },

    showDuplicateAlert(sponsor) {
        const el = this.elements;
        this.state.existingSponsorData = sponsor;
        el.existingSponsorInfo.innerHTML = `
            <div class="d-flex align-items-center">
               <div class="me-3 bg-secondary rounded d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                    <i class="bi bi-building text-white"></i>
                </div>
                <div>
                    <h6 class="mb-1">${sponsor.sponsorName}</h6>
                    <small class="text-muted">
                        ${sponsor.businessType ? sponsor.businessType : 'Business'}
                        ${sponsor.location ? ` • ${sponsor.location}` : ''}
                        ${sponsor.state ? ` • ${sponsor.state}` : ''}
                    </small>
                    ${sponsor.description ? `<div class="small text-muted mt-1">${sponsor.description}</div>` : ''}
                </div>
            </div>
        `;
        el.duplicateAlert.style.display = 'block';
        setTimeout(() => { el.duplicateAlert.classList.add('show'); }, 10);
    },

    hideDuplicateAlert() {
        const el = this.elements;
        // Fully hide and reset state
        this.hideDuplicateAlertUI();
        this.state.existingSponsorData = null;
        this.resetToNewSponsorMode();
    },

    // UI-only hide used when transitioning into link-existing flow
    hideDuplicateAlertUI() {
        const el = this.elements;
        el.duplicateAlert.classList.remove('show');
        setTimeout(() => { el.duplicateAlert.style.display = 'none'; }, 150);
    },

    resetToNewSponsorMode() {
        const el = this.elements;
        el.sponsorTypeInput.value = 'new';
        el.existingSponsorIdInput.value = '';
        el.submitText.textContent = 'Add Sponsor';
        this.disableFormFields(false);
        el.submitBtn.className = 'btn btn-primary';
        el.submitBtn.innerHTML = '<i class="bi bi-save me-1"></i><span id="submitText">Add Sponsor</span>';
        this.removeLinkingFeedback();
    },

    disableFormFields(disable) {
        const el = this.elements;
        const fields = el.sponsorForm.querySelectorAll('input:not([type="hidden"]), select, textarea');
        fields.forEach((field) => {
            if (field.id !== 'sponsorName') {
                field.disabled = disable;
                if (disable) field.classList.add('bg-light');
                else field.classList.remove('bg-light');
            }
        });
    },

    showLinkingFeedback() {
        const el = this.elements;
        const feedbackDiv = document.createElement('div');
        feedbackDiv.id = 'linkingFeedback';
        feedbackDiv.className = 'alert alert-success mt-3';
        feedbackDiv.innerHTML = `
            <i class="bi bi-check-circle me-2"></i>
            <strong>Ready to link!</strong> You're about to link to the existing sponsor "${this.state.existingSponsorData.sponsorName}". 
            The form fields below are disabled since you're linking to an existing sponsor.
        `;
        const sponsorNameGroup = el.sponsorNameInput.closest('.mb-3');
        sponsorNameGroup.parentNode.insertBefore(feedbackDiv, sponsorNameGroup.nextSibling);
    },

    removeLinkingFeedback() {
        const feedback = document.getElementById('linkingFeedback');
        if (feedback) feedback.remove();
    }
};

// Bootstrap the manager
document.addEventListener('DOMContentLoaded', () => {
    clubAddSponsorManager.initialize();
});