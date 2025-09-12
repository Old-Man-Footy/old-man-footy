/**
 * Admin Edit Club JavaScript
 * Handles form validation, file uploads, and interactions for the admin edit club page.
 * Refactored into a testable object pattern.
 */

export const adminEditClubManager = {
    // An object to hold references to DOM elements
    elements: {},

    /**
     * Initializes the manager by caching DOM elements and setting up carnival listeners.
     */
    initialize() {
        this.cacheElements();
        this.bindEvents();
    },

    /**
     * Finds and stores all necessary DOM elements for easy access.
     */
    cacheElements() {
        this.elements = {
            form: document.querySelector('form[action*="/edit"]'),
            descriptionTextarea: document.getElementById('description'),
            fileUploadArea: document.querySelector('.file-upload-area'),
            fileInput: document.getElementById('logo'),
            uploadText: document.querySelector('.file-upload-area .upload-text'),
        };
    },

    /**
     * Attaches all necessary carnival listeners to the DOM elements.
     */
    bindEvents() {
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
        if (this.elements.descriptionTextarea) {
            this.elements.descriptionTextarea.addEventListener('input', (e) => this.autoResizeTextarea(e.target));
        }
        if (this.elements.fileUploadArea && this.elements.fileInput) {
            this.elements.fileUploadArea.addEventListener('click', () => this.elements.fileInput.click());
            this.elements.fileInput.addEventListener('change', () => this.handleFileSelect());
            
            // Drag and drop listeners
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                this.elements.fileUploadArea.addEventListener(eventName, this.preventDefaults, false);
            });
            ['dragenter', 'dragover'].forEach(eventName => {
                this.elements.fileUploadArea.addEventListener(eventName, () => this.highlight(), false);
            });
            ['dragleave', 'drop'].forEach(eventName => {
                this.elements.fileUploadArea.addEventListener(eventName, () => this.unhighlight(), false);
            });
            this.elements.fileUploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);
        }
    },

    /**
     * Validates the form on submission.
     * @param {Carnival} e - The submit carnival.
     */
    handleFormSubmit(e) {
        const requiredFields = this.elements.form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
            }
        });
        
        if (!isValid) {
            e.preventDefault();
            alert('Please fill in all required fields.');
        }
    },

    /**
     * Auto-resizes a textarea based on its content.
     * @param {HTMLTextAreaElement} textarea - The textarea element.
     */
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    },

    /**
     * Handles the file selection carnival for the file input.
     */
    handleFileSelect() {
        const file = this.elements.fileInput.files[0];
        if (file) {
            this.elements.uploadText.textContent = `Selected: ${file.name}`;
            this.elements.fileUploadArea.classList.add('file-selected');
        } else {
            this.elements.uploadText.textContent = 'Click or drag to upload new club logo';
            this.elements.fileUploadArea.classList.remove('file-selected');
        }
    },

    /**
     * Prevents default browser behavior for drag events.
     * @param {DragEvent} e - The drag event.
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    /**
     * Adds a highlight class during a drag-over event.
     */
    highlight() {
        this.elements.fileUploadArea.classList.add('drag-over');
    },

    /**
     * Removes the highlight class after a drag event.
     */
    unhighlight() {
        this.elements.fileUploadArea.classList.remove('drag-over');
    },

    /**
     * Handles the file drop carnival.
     * @param {DragEvent} e - The drop carnival.
     */
    handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.elements.fileInput.files = files;
            // Dispatch a change event so the handleFileSelect logic runs
            this.elements.fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
};

// This part runs in the browser to initialize the application.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        adminEditClubManager.initialize();
    });
}
