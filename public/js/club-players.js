/**
 * Club Players Manager (clean)
 */
export const clubPlayersPageManager = {
    elements: {},
    debounceTimeout: null,

    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.initializeTooltips();
        try { if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') console.log('Club players page functionality initialized'); } catch {}
    },

    cacheElements() {
        this.elements.removePlayerModal = document.getElementById('removePlayerModal');
        this.elements.playerNameToRemove = document.getElementById('playerNameToRemove');
        this.elements.removePlayerForm = document.getElementById('removePlayerForm');
        this.elements.csvImportModal = document.getElementById('csvImportModal');
        this.elements.csvFileInput = document.getElementById('csvFile');
        this.elements.csvForm = this.elements.csvImportModal ? this.elements.csvImportModal.querySelector('form') : null;
        this.elements.templateLink = document.querySelector('a[href="/clubs/players/csv-template"]');
        this.elements.sortBySelect = document.getElementById('sortBy');
        this.elements.sortOrderSelect = document.getElementById('sortOrder');
        this.elements.searchInput = document.getElementById('search');
    },

    bindEvents() {
        const { removePlayerModal, csvImportModal, csvFileInput, csvForm, templateLink, sortBySelect, sortOrderSelect, searchInput } = this.elements;

        if (removePlayerModal) {
            removePlayerModal.addEventListener('show.bs.modal', (carnival) => this.handleRemoveModalShow(carnival));
        }

        if (csvImportModal && csvFileInput && csvForm) {
            csvFileInput.addEventListener('change', (e) => this.handleCsvFileChange(e));
            csvForm.addEventListener('submit', (e) => this.handleCsvFormSubmit(e));
            csvImportModal.addEventListener('hidden.bs.modal', () => this.resetCsvForm());
        }

        if (templateLink) {
            templateLink.addEventListener('click', () => {
                try { if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') console.log('CSV template downloaded'); } catch {}
            });
        }

        if (sortBySelect && sortOrderSelect) {
            const autoSubmitHandler = (carnival) => {
                clearTimeout(this.debounceTimeout);
                this.debounceTimeout = setTimeout(() => {
                    const form = carnival.target.closest('form');
                    if (form && typeof form.submit === 'function') form.submit();
                }, 500);
            };
            sortBySelect.addEventListener('change', autoSubmitHandler);
            sortOrderSelect.addEventListener('change', autoSubmitHandler);
        }

        if (searchInput) {
            const form = searchInput.closest('form');
            const searchButton = form ? form.querySelector('button[type="submit"]') : null;
            searchInput.addEventListener('input', function() {
                if (searchButton) {
                    searchButton.innerHTML = '<i class="bi bi-search me-1"></i>Search';
                }
            });
        }
    },

    initializeTooltips() {
        try {
            const triggers = Array.prototype.slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                triggers.forEach((el) => new bootstrap.Tooltip(el));
            }
        } catch {}
    },

    handleRemoveModalShow(carnival) {
        const button = carnival.relatedTarget;
        if (!button) return;
        const playerId = button.getAttribute('data-player-id');
        const playerName = button.getAttribute('data-player-name');
        const { playerNameToRemove, removePlayerForm } = this.elements;
        if (playerNameToRemove) playerNameToRemove.textContent = playerName || '';
        if (removePlayerForm) removePlayerForm.action = `/clubs/players/${playerId}`;
    },

    handleCsvFileChange(e) {
        const file = e.target.files && e.target.files[0];
        if (file) {
            const name = (file.name || '').toLowerCase();
            if (!name.endsWith('.csv')) {
                this.showAlert('Please select a CSV file.');
                e.target.value = '';
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                this.showAlert('File size must be less than 5MB.');
                e.target.value = '';
                return;
            }
            try { if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') console.log('CSV file selected:', file.name); } catch {}
        }
    },

    handleCsvFormSubmit(e) {
        const { csvFileInput, csvForm } = this.elements;
        const file = csvFileInput.files && csvFileInput.files[0];
        if (!file) {
            e.preventDefault();
            this.showAlert('Please select a CSV file to upload.');
            return;
        }
        const submitButton = csvForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Importing...';
        }
    },

    resetCsvForm() {
        const { csvForm } = this.elements;
        if (!csvForm) return;
        if (typeof csvForm.reset === 'function') csvForm.reset();
        const submitButton = csvForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="bi bi-upload me-1"></i>Import Players';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    try { clubPlayersPageManager.initialize(); } catch {}
});