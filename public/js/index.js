/**
 * Index Page JS (Manager Object Pattern)
 * Carousel and subscription form functionality.
 */

export const indexPageManager = {
    elements: {},
    autoAdvanceTimer: null,
    currentSlide: 0,

    initialize() {
        this.cacheElements();
        this.injectStyles();
        this.bindEvents();
        this.initializeSubscriptionForm();
    },

    cacheElements() {
        this.elements.subscribeForm = document.getElementById('subscribeForm');
        this.elements.timestampField = document.getElementById('main_form_timestamp');
    },


    initializeSubscriptionForm() {
        const form = this.elements.subscribeForm;
        const timestampField = this.elements.timestampField;
        if (timestampField) timestampField.value = Date.now();
        if (!form) return;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const email = formData.get('email');
            const submitButton = form.querySelector('button[type="submit"]');
            if (!email) {
                this.showMessage('Please enter your email address.', 'error');
                return;
            }
            const selectedStates = Array.from(document.querySelectorAll('.state-checkbox:checked')).map((cb) => cb.value);
            if (!selectedStates || selectedStates.length === 0) {
                this.showMessage('Please select at least one state.', 'error');
                return;
            }
            const originalText = submitButton?.innerHTML || '';
            if (submitButton) {
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Subscribing...';
                submitButton.disabled = true;
            }
            const params = new URLSearchParams();
            for (const [key, value] of new FormData(form).entries()) params.append(key, value);
            fetch('/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            })
                .then((response) => {
                    const contentType = response.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        throw new Error(`Expected JSON response but received ${contentType || 'unknown content type'}`);
                    }
                    return response.json();
                })
                .then((data) => {
                    indexPageManager.handleSubscriptionResponse(data);
                })
                .catch(() => indexPageManager.showMessage('An unexpected error occurred. Please try again.', 'error'))
                .finally(() => {
                    if (submitButton) {
                        submitButton.innerHTML = originalText;
                        submitButton.disabled = false;
                    }
                });
        });
    },

    /**
     * Handle the subscription API response in a testable way.
     * @param {{ success?: boolean, message?: string }} data
     */
    handleSubscriptionResponse(data) {
        const form = this.elements.subscribeForm || document.getElementById('subscribeForm');
        const timestampField = this.elements.timestampField || document.getElementById('main_form_timestamp');
        if (data && data.success) {
            indexPageManager.showMessage("Thanks! You'll receive carnival notifications for the selected states.", 'success');
            form?.reset?.();
            if (timestampField) timestampField.value = Date.now();
        } else {
            indexPageManager.showMessage((data && data.message) || 'Something went wrong. Please try again.', 'error');
        }
    },

    showMessage(message, type = 'info') {
        document.querySelector('.subscription-message')?.remove();
        const messageEl = document.createElement('div');
        const cls = type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info';
        messageEl.className = `subscription-message alert alert-${cls} mt-3`;
        messageEl.textContent = message;
        messageEl.style.cssText = 'animation: slideInFromTop 0.3s ease-out;';
        const form = this.elements.subscribeForm || document.getElementById('subscribeForm');
        form?.parentNode?.insertBefore(messageEl, form.nextSibling);
        setTimeout(() => {
            if (!messageEl.parentNode) return;
            messageEl.style.animation = 'slideOutToTop 0.3s ease-in';
            setTimeout(() => messageEl.remove(), 300);
        }, 5000);
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    indexPageManager.initialize();
});