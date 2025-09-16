/**
 * Club Management Interface (Manager Object Pattern)
 * Handles form interactions for club profile management
 */
export const clubManageManager = {
    elements: {},

    initialize() {
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        this.elements.form = document.querySelector('form[action*="/clubs/manage"]');
        this.elements.descriptionTextarea = document.getElementById('description');
        this.elements.fileUploadArea = document.querySelector('.file-upload-area');
        this.elements.fileInput = document.getElementById('logo');
    },

    bindEvents() {
        const el = this.elements;
        if (el.form) el.form.addEventListener('submit', this.handleFormSubmit);
        if (el.descriptionTextarea) el.descriptionTextarea.addEventListener('input', this.handleDescriptionInput);
        if (el.fileUploadArea && el.fileInput) {
            el.fileUploadArea.addEventListener('click', this.handleUploadAreaClick);
            el.fileInput.addEventListener('change', this.handleFileInputChange);
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((evt) => {
                el.fileUploadArea.addEventListener(evt, clubManageManager.preventDefaults, false);
            });
            ['dragenter', 'dragover'].forEach((evt) => {
                el.fileUploadArea.addEventListener(evt, clubManageManager.highlight, false);
            });
            ['dragleave', 'drop'].forEach((evt) => {
                el.fileUploadArea.addEventListener(evt, clubManageManager.unhighlight, false);
            });
            el.fileUploadArea.addEventListener('drop', this.handleDrop, false);
        }
    },

    // Handlers
    handleFormSubmit: (e) => {
        const form = clubManageManager.elements.form;
        const requiredFields = form ? form.querySelectorAll('[required]') : [];
        let isValid = true;
        requiredFields.forEach((field) => {
            if (!String(field.value || '').trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
            }
        });
        if (!isValid) {
            e.preventDefault?.();
            try { window.alert && window.alert('Please fill in all required fields.'); } catch (_) {}
        }
    },

    handleDescriptionInput: (e) => {
        const ta = e.currentTarget;
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
    },

    handleUploadAreaClick: () => {
        clubManageManager.elements.fileInput?.click();
    },

    handleFileInputChange: (e) => {
        const el = clubManageManager.elements;
        const file = e.currentTarget.files && e.currentTarget.files[0];
        const uploadText = el.fileUploadArea?.querySelector('.upload-text');
        if (!uploadText || !el.fileUploadArea) return;
        if (file) {
            uploadText.textContent = `Selected: ${file.name}`;
            el.fileUploadArea.classList.add('file-selected');
        } else {
            uploadText.textContent = 'Click or drag to upload club logo';
            el.fileUploadArea.classList.remove('file-selected');
        }
    },

    preventDefaults: (e) => {
        e.preventDefault();
        e.stopPropagation();
    },

    highlight: () => {
        clubManageManager.elements.fileUploadArea?.classList.add('drag-over');
    },

    unhighlight: () => {
        clubManageManager.elements.fileUploadArea?.classList.remove('drag-over');
    },

    handleDrop: (e) => {
        const el = clubManageManager.elements;
        const dt = e.dataTransfer;
        const files = dt && dt.files ? dt.files : [];
        if (files.length > 0 && el.fileInput) {
            try { el.fileInput.files = files; } catch (_) {}
            const carnival = new Event('change', { bubbles: true });
            el.fileInput.dispatchEvent(carnival);
        }
    },
};

// Bootstrap in the browser
document.addEventListener('DOMContentLoaded', () => {
    clubManageManager.initialize();
});