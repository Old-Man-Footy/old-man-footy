/**
 * Admin contact submission detail page manager.
 */
export const adminContactSubmissionManager = {
    elements: {},
    originalSubmitHtml: '',

    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.updateCharCount();
    },

    cacheElements() {
        this.elements.replyForm = document.getElementById('replyContactForm');
        this.elements.replyMessage = document.getElementById('replyMessage');
        this.elements.replyCharCount = document.getElementById('replyCharCount');
        this.elements.sendReplyBtn = document.getElementById('sendReplyBtn');
    },

    bindEvents() {
        this.elements.replyMessage?.addEventListener('input', this.handleReplyInput);
        this.elements.replyForm?.addEventListener('submit', this.handleReplySubmit);
    },

    handleReplyInput: () => {
        adminContactSubmissionManager.updateCharCount();
    },

    handleReplySubmit: () => {
        const manager = adminContactSubmissionManager;
        if (!manager.elements.sendReplyBtn) return;

        manager.originalSubmitHtml = manager.elements.sendReplyBtn.innerHTML;
        manager.elements.sendReplyBtn.disabled = true;
        manager.elements.sendReplyBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Sending...';
    },

    updateCharCount() {
        if (!this.elements.replyMessage || !this.elements.replyCharCount) {
            return;
        }

        const count = this.elements.replyMessage.value.length;
        this.elements.replyCharCount.textContent = `${count}/5000`;
        this.elements.replyCharCount.classList.remove('text-muted', 'text-warning', 'text-danger');

        if (count > 4700) {
            this.elements.replyCharCount.classList.add('text-danger');
        } else if (count > 4300) {
            this.elements.replyCharCount.classList.add('text-warning');
        } else {
            this.elements.replyCharCount.classList.add('text-muted');
        }
    },
};

document.addEventListener('DOMContentLoaded', () => {
    adminContactSubmissionManager.initialize();
});
