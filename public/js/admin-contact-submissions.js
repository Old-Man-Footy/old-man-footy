/**
 * Admin contact submissions page manager.
 * Handles subscriber email compose modal in both bulk and single-recipient modes.
 */
export const adminContactSubmissionsManager = {
    elements: {},
    state: {
        mode: 'bulk',
        currentSubscriberId: null,
        currentSubscriberEmail: ''
    },

    initialize() {
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        this.elements.modalElement = document.getElementById('subscriberEmailModal');
        this.elements.form = document.getElementById('subscriberEmailForm');
        this.elements.modalTitle = document.getElementById('subscriberEmailModalLabel');
        this.elements.modeHint = document.getElementById('subscriberEmailModeHint');
        this.elements.bulkNotificationTypeWrapper = document.getElementById('bulkNotificationTypeWrapper');
        this.elements.notificationTypeSelect = document.getElementById('subscriberEmailNotificationType');
        this.elements.singleSubscriberWrapper = document.getElementById('singleSubscriberWrapper');
        this.elements.singleSubscriberEmail = document.getElementById('singleSubscriberEmail');
        this.elements.subjectInput = document.getElementById('subscriberEmailSubject');
        this.elements.sendButton = document.getElementById('sendSubscriberEmailBtn');
        this.elements.triggers = document.querySelectorAll('[data-subscriber-email-trigger]');
    },

    bindEvents() {
        this.elements.triggers?.forEach((trigger) => {
            trigger.addEventListener('click', this.handleComposeTriggerClick);
        });

        this.elements.form?.addEventListener('submit', this.handleFormSubmit);

        this.elements.modalElement?.addEventListener('hidden.bs.modal', this.handleModalClosed);
    },

    handleComposeTriggerClick: (event) => {
        const trigger = event.currentTarget;
        const mode = trigger?.dataset?.subscriberEmailTrigger === 'single' ? 'single' : 'bulk';
        adminContactSubmissionsManager.setMode(mode, trigger?.dataset || {});
    },

    handleFormSubmit: () => {
        if (!adminContactSubmissionsManager.elements.sendButton) return;
        adminContactSubmissionsManager.elements.sendButton.disabled = true;
        adminContactSubmissionsManager.elements.sendButton.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Sending...';
    },

    handleModalClosed: () => {
        adminContactSubmissionsManager.resetForm();
    },

    setMode(mode, triggerData) {
        this.state.mode = mode;

        if (mode === 'single') {
            this.state.currentSubscriberId = triggerData.subscriberId || null;
            this.state.currentSubscriberEmail = triggerData.subscriberEmail || '';

            this.elements.form.action = `/admin/contact-submissions/subscribers/${this.state.currentSubscriberId}/email`;
            this.elements.modalTitle.innerHTML = '<i class="bi bi-envelope me-2"></i>Email Subscriber';
            this.elements.modeHint.textContent = 'This email will be sent to one subscriber with a personalised greeting.';

            this.elements.bulkNotificationTypeWrapper.classList.add('d-none');
            this.elements.notificationTypeSelect.disabled = true;

            this.elements.singleSubscriberWrapper.classList.remove('d-none');
            this.elements.singleSubscriberEmail.value = this.state.currentSubscriberEmail;

            this.elements.subjectInput.value = this.elements.subjectInput.value || 'Old Man Footy update';
            return;
        }

        this.state.currentSubscriberId = null;
        this.state.currentSubscriberEmail = '';

        this.elements.form.action = '/admin/contact-submissions/subscribers/email-by-type';
        this.elements.modalTitle.innerHTML = '<i class="bi bi-send me-2"></i>Send Subscriber Email';
        this.elements.modeHint.textContent = 'Choose a notification type and we will BCC all active subscribers with that preference.';

        this.elements.bulkNotificationTypeWrapper.classList.remove('d-none');
        this.elements.notificationTypeSelect.disabled = false;

        this.elements.singleSubscriberWrapper.classList.add('d-none');
        this.elements.singleSubscriberEmail.value = '';
    },

    resetForm() {
        this.elements.form?.reset();
        this.elements.sendButton.disabled = false;
        this.elements.sendButton.innerHTML = '<i class="bi bi-send me-1"></i> Send Email';
        this.setMode('bulk', {});
    }
};

document.addEventListener('DOMContentLoaded', () => {
    adminContactSubmissionsManager.initialize();
});
