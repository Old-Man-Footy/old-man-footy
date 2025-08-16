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
        // Read carousel images and expose globally (legacy compatibility)
        const container = document.querySelector('[data-carousel-images]');
        try {
            window.carouselImages = container ? JSON.parse(container.dataset.carouselImages || '[]') : [];
        } catch {
            window.carouselImages = [];
        }
        if (Array.isArray(window.carouselImages) && window.carouselImages.length > 0) {
            this.initializeCarousel();
        }
        this.initializeSubscriptionForm();
    },

    cacheElements() {
        this.elements.carousel = document.getElementById('imageCarousel');
        this.elements.track = document.querySelector('.carousel-track');
        this.elements.slides = this.elements.track ? Array.from(this.elements.track.children) : [];
        this.elements.nextButton = document.getElementById('carouselNext');
        this.elements.prevButton = document.getElementById('carouselPrev');
        this.elements.dotsNav = document.querySelector('.carousel-nav');
        this.elements.dots = this.elements.dotsNav ? Array.from(this.elements.dotsNav.children) : [];
        this.elements.subscribeForm = document.getElementById('subscribeForm');
        this.elements.timestampField = document.getElementById('main_form_timestamp');
    },

    bindEvents() {
        // Carousel controls
        if (this.elements.nextButton) {
            this.elements.nextButton.addEventListener('click', () => this.moveToSlide(this.nextIndex()));
        }
        if (this.elements.prevButton) {
            this.elements.prevButton.addEventListener('click', () => this.moveToSlide(this.prevIndex()));
        }
        if (this.elements.dotsNav) {
            this.elements.dotsNav.addEventListener('click', (e) => {
                const dot = e.target.closest('.carousel-indicator');
                if (!dot) return;
                const idx = parseInt(dot.dataset.slide);
                this.moveToSlide(idx);
            });
        }
    },

    injectStyles() {
        if (document.getElementById('index-page-animations')) return;
        const style = document.createElement('style');
        style.id = 'index-page-animations';
        style.textContent = `
            @keyframes slideInFromTop { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes slideOutToTop { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-20px); opacity: 0; } }
        `;
        document.head.appendChild(style);
    },

    initializeCarousel() {
        const slides = this.elements.slides;
        if (!slides || slides.length === 0) return;
        const slideWidth = slides[0].getBoundingClientRect().width || slides[0].offsetWidth || 0;
        slides.forEach((slide, index) => {
            slide.style.left = `${slideWidth * index}px`;
        });
        // Set initial classes
        slides.forEach((s) => s.classList.remove('current-slide'));
        this.elements.dots.forEach((d) => d.classList.remove('current-slide'));
        slides[0]?.classList.add('current-slide');
        this.elements.dots[0]?.classList.add('current-slide');
        this.currentSlide = 0;
        this.startAutoAdvance();
    },

    nextIndex() {
        const total = this.elements.slides.length;
        return this.currentSlide === total - 1 ? 0 : this.currentSlide + 1;
    },

    prevIndex() {
        const total = this.elements.slides.length;
        return this.currentSlide === 0 ? total - 1 : this.currentSlide - 1;
    },

    moveToSlide(targetIndex) {
        const slides = this.elements.slides;
        const track = this.elements.track;
        if (!slides || !track || targetIndex < 0 || targetIndex >= slides.length) return;
        const targetSlide = slides[targetIndex];
        track.style.transform = `translateX(-${targetSlide.style.left})`;
        slides.forEach((s) => s.classList.remove('current-slide'));
        this.elements.dots.forEach((d) => d.classList.remove('current-slide'));
        targetSlide.classList.add('current-slide');
        this.elements.dots[targetIndex]?.classList.add('current-slide');
        this.currentSlide = targetIndex;
    },

    startAutoAdvance() {
        if (this.autoAdvanceTimer) clearInterval(this.autoAdvanceTimer);
        this.autoAdvanceTimer = setInterval(() => this.moveToSlide(this.nextIndex()), 5000);
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