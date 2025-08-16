/**
 * Registration Form Validation and Club Selection Logic
 */
export const registrationFormManager = {
    elements: {},
    clubs: new Map(),

    initialize() {
        this.cacheElements();
        this.loadClubs();
        this.bindEvents();
        this.handleClubNameChange();
    },

    cacheElements() {
        this.elements.clubNameInput = document.getElementById('clubName');
        this.elements.clubStateSelect = document.getElementById('clubState');
        this.elements.locationInput = document.getElementById('location');
        this.elements.stateRequired = document.getElementById('stateRequired');
        this.elements.locationRequired = document.getElementById('locationRequired');
        this.elements.stateHelpText = document.getElementById('stateHelpText');
        this.elements.locationHelpText = document.getElementById('locationHelpText');
        this.elements.form = document.querySelector('form');
        this.elements.deactivatedClubWarning = document.getElementById('deactivatedClubWarning');
        this.elements.reactivationCheckbox = document.getElementById('confirmReactivation');
        this.elements.clubList = document.getElementById('clubList');
    },

    loadClubs() {
        this.clubs.clear();
        const list = this.elements.clubList;
        if (!list) return;
        Array.from(list.options || []).forEach((option) => {
            this.clubs.set(option.value, {
                state: option.getAttribute('data-state') || '',
                location: option.getAttribute('data-location') || '',
                isActive: option.getAttribute('data-active') === 'true'
            });
        });
    },

    bindEvents() {
        const nameInput = this.elements.clubNameInput;
        if (nameInput) {
            nameInput.addEventListener('input', () => this.handleClubNameChange());
            nameInput.addEventListener('blur', () => this.handleClubNameChange());
        }
        if (this.elements.reactivationCheckbox) {
            this.elements.reactivationCheckbox.addEventListener('change', (e) => {
                const checked = e.target.checked;
                if (checked) {
                    this.elements.stateHelpText.textContent = 'Will be updated when club is reactivated';
                    this.elements.locationHelpText.textContent = 'Will be updated when club is reactivated';
                } else {
                    this.elements.stateHelpText.textContent = 'Pre-filled from deactivated club (will be updated if reactivated)';
                    this.elements.locationHelpText.textContent = 'Pre-filled from deactivated club (will be updated if reactivated)';
                }
            });
        }
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    },

    isExistingClub(name) {
        return this.clubs.has((name || '').trim());
    },

    getClubData(name) {
        return this.clubs.get((name || '').trim()) || null;
    },

    toggleDeactivatedClubWarning(show, clubData = null) {
        const warn = this.elements.deactivatedClubWarning;
        if (!warn) return;
        if (show && clubData && !clubData.isActive) {
            warn.style.display = 'block';
            const warningText = warn.querySelector('p');
            if (warningText) warningText.textContent = `"${this.elements.clubNameInput.value.trim()}" is currently deactivated. You can reactivate it and become the primary delegate.`;
            const cb = this.elements.reactivationCheckbox || document.getElementById('confirmReactivation');
            if (cb) cb.checked = false;
        } else {
            warn.style.display = 'none';
        }
    },

    updateFieldsForClub(isNewClub, clubData = null) {
        const stateHelp = this.elements.stateHelpText;
        const locHelp = this.elements.locationHelpText;
        const stateReq = this.elements.stateRequired;
        const locReq = this.elements.locationRequired;
        const stateSel = this.elements.clubStateSelect;
        const locInput = this.elements.locationInput;
        if (isNewClub) {
            stateHelp.textContent = 'Required for new clubs';
            locHelp.textContent = 'General location for your club. Required for new clubs.';
            stateReq.style.display = 'inline';
            locReq.style.display = 'inline';
            if (stateSel.value === '' && locInput.value === '') {
                stateSel.classList.remove('is-valid');
                locInput.classList.remove('is-valid');
            }
            this.toggleDeactivatedClubWarning(false);
        } else if (clubData) {
            stateSel.value = clubData.state;
            locInput.value = clubData.location;
            if (clubData.isActive) {
                stateHelp.textContent = 'Auto-populated from existing club data';
                locHelp.textContent = 'Auto-populated from existing club data';
                stateReq.style.display = 'inline';
                locReq.style.display = 'inline';
                stateSel.classList.add('is-valid');
                stateSel.classList.remove('is-invalid');
                locInput.classList.add('is-valid');
                locInput.classList.remove('is-invalid');
                stateSel.setCustomValidity('');
                locInput.setCustomValidity('');
                this.toggleDeactivatedClubWarning(false);
            } else {
                stateHelp.textContent = 'Pre-filled from deactivated club (will be updated if reactivated)';
                locHelp.textContent = 'Pre-filled from deactivated club (will be updated if reactivated)';
                stateReq.style.display = 'inline';
                locReq.style.display = 'inline';
                stateSel.classList.add('is-valid');
                stateSel.classList.remove('is-invalid');
                locInput.classList.add('is-valid');
                locInput.classList.remove('is-invalid');
                this.toggleDeactivatedClubWarning(true, clubData);
            }
        }
        stateSel.required = true;
        locInput.required = true;
    },

    handleClubNameChange() {
        const input = this.elements.clubNameInput;
        const clubName = input?.value.trim() || '';
        if (clubName === '') {
            this.updateFieldsForClub(true);
            return;
        }
        const isExisting = this.isExistingClub(clubName);
        const clubData = isExisting ? this.getClubData(clubName) : null;
        this.updateFieldsForClub(!isExisting, clubData);
        if (isExisting) {
            if (clubData && clubData.isActive) {
                input.classList.add('is-valid');
                input.classList.remove('is-invalid', 'is-warning');
            } else if (clubData && !clubData.isActive) {
                input.classList.add('is-warning');
                input.classList.remove('is-valid', 'is-invalid');
                if (!document.getElementById('warningStyles')) {
                    const style = document.createElement('style');
                    style.id = 'warningStyles';
                    style.textContent = `
                        .is-warning { border-color: #ffc107 !important; background-color: #fff3cd; }
                        .is-warning:focus { border-color: #ffc107 !important; box-shadow: 0 0 0 0.2rem rgba(255,193,7,.25) !important; }
                    `;
                    document.head.appendChild(style);
                }
            }
        } else {
            input.classList.remove('is-valid', 'is-invalid', 'is-warning');
        }
    },

    handleSubmit(e) {
        const form = this.elements.form;
        const name = this.elements.clubNameInput.value.trim();
        const isExisting = this.isExistingClub(name);
        const data = isExisting ? this.getClubData(name) : null;
        let hasErrors = false;
        if (data && !data.isActive) {
            const reactivationChecked = this.elements.reactivationCheckbox?.checked || false;
            if (!reactivationChecked) {
                e.preventDefault();
                hasErrors = true;
                let errorDiv = document.getElementById('reactivationError');
                if (!errorDiv) {
                    errorDiv = document.createElement('div');
                    errorDiv.id = 'reactivationError';
                    errorDiv.className = 'alert alert-danger mt-3';
                    errorDiv.innerHTML = '<i class="bi bi-exclamation-triangle"></i> You must confirm that you want to reactivate this deactivated club.';
                    this.elements.deactivatedClubWarning.appendChild(errorDiv);
                }
                try { this.elements.deactivatedClubWarning.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
                return;
            } else {
                const errorDiv = document.getElementById('reactivationError');
                if (errorDiv) errorDiv.remove();
            }
        }
        // Validate state and location
        const stateSel = this.elements.clubStateSelect;
        const locInput = this.elements.locationInput;
        if (!stateSel.value) {
            stateSel.setCustomValidity("Please select your club's state.");
            stateSel.classList.add('is-invalid');
            hasErrors = true;
        } else {
            stateSel.setCustomValidity('');
            stateSel.classList.remove('is-invalid');
        }
        if (!locInput.value.trim()) {
            locInput.setCustomValidity("Please provide your club's location.");
            locInput.classList.add('is-invalid');
            hasErrors = true;
        } else {
            locInput.setCustomValidity('');
            locInput.classList.remove('is-invalid');
        }
        if (!form.checkValidity() || hasErrors) {
            e.preventDefault();
            e.stopPropagation();
        }
        form.classList.add('was-validated');
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => registrationFormManager.initialize());