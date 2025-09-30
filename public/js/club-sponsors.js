/**
 * Club Sponsors Manager
 */
export const clubSponsorsManager = {
    elements: {},

    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.initSortable();
        try { if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') console.log('Club sponsors functionality initialized'); } catch {}
    },

    cacheElements() {
        this.elements.sponsorList = document.getElementById('sponsor-order-list');
        this.elements.saveButton = document.getElementById('save-sponsor-order');
    },

    bindEvents() {
        const { saveButton } = this.elements;
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveNewOrder());
        }
    },

    initSortable() {
        const { sponsorList, saveButton } = this.elements;
        if (!sponsorList || sponsorList.children.length <= 1) return;
        try {
            if (typeof Sortable !== 'undefined' && sponsorList) {
                Sortable.create(sponsorList, {
                    handle: '.fa-grip-vertical',
                    animation: 150,
                    onEnd: function() {
                        if (saveButton) saveButton.style.display = 'block';
                    }
                });
            }
        } catch {}
    },

    saveNewOrder() {
        const { sponsorList } = this.elements;
        if (!sponsorList) return;
        const sponsorIds = Array.from(sponsorList.children).map(item => item.getAttribute('data-sponsor-id'));
        try {
            fetch('/clubs/manage/sponsors/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sponsorOrder: sponsorIds })
            })
            .then(r => r.json())
            .then(data => {
                if (data && data.success) {
                    try { location.reload(); } catch {}
                } else {
                    this.showAlert('Error updating sponsor order' + (data && data.message ? (': ' + data.message) : ''));
                }
            })
            .catch(() => this.showAlert('Error updating sponsor order'));
        } catch {}
    }
};

document.addEventListener('DOMContentLoaded', () => {
    try { clubSponsorsManager.initialize(); } catch {}
});