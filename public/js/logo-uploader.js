/**
 * Logo Uploader Manager
 * Handles drag-and-drop file upload functionality for logo uploader partials
 * Works in conjunction with existing form managers (e.g., club-manage.js)
 * 
 * @file logo-uploader.js
 * @version 1.0.0
 * @author Old Man Footy Development Team
 */

export const logoUploaderManager = {
    // State
    elements: {
        uploadArea: null,
        fileInput: null,
        previewImg: null,
        removeBtn: null,
        uploadText: null,
        helpText: null
    },

    // Configuration
    maxFileSize: 10 * 1024 * 1024, // 10MB default
    acceptedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'],

    /**
     * Initialize the logo uploader
     * @param {string} containerId - ID of the logo uploader container
     * @param {Object} options - Configuration options
     */
    initialize(containerId = 'logoUploader', options = {}) {
        this.cacheElements(containerId);
        
        // Merge options with defaults
        this.maxFileSize = options.maxFileSize || this.maxFileSize;
        this.acceptedTypes = options.acceptedTypes || this.acceptedTypes;

        if (this.elements.uploadArea) {
            this.bindEvents();
        }
    },

    /**
     * Cache DOM elements for efficient access
     * @param {string} containerId - Container ID to search within
     */
    cacheElements(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Logo uploader container '${containerId}' not found`);
            return;
        }

        this.elements = {
            container: container,
            uploadArea: container.querySelector('.logo-upload-area'),
            fileInput: container.querySelector('input[type="file"]'),
            previewImg: container.querySelector('.logo-preview img'),
            removeBtn: container.querySelector('.btn-remove-logo'),
            uploadText: container.querySelector('.upload-text'),
            helpText: container.querySelector('.help-text')
        };
    },

    /**
     * Initialize for EJS partial structure
     * @param {string} inputId - ID of the file input
     * @param {string} uploadText - Default upload text
     */
    initializeFromPartial(inputId, uploadText) {
        console.log('Initializing logo uploader from EJS partial for input:', inputId);
        
        const fileInput = document.getElementById(inputId);
        const uploadArea = document.getElementById(inputId + '-upload-area');
        
        if (!fileInput || !uploadArea) {
            console.warn(`Logo uploader elements not found for input '${inputId}'`);
            return;
        }

        this.elements = {
            container: uploadArea.closest('.row'),
            uploadArea: uploadArea,
            fileInput: fileInput,
            uploadText: document.getElementById(inputId + '-upload-text'),
            previewContainer: document.getElementById(inputId + '-preview-container'),
            currentPreview: document.getElementById(inputId + '-current-preview'),
            noLogoCard: document.getElementById(inputId + '-no-logo-card')
        };

        this.defaultUploadText = uploadText || 'Click or drag to upload logo';
        this.bindEvents();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.elements.uploadArea || !this.elements.fileInput) {
            console.warn('Required logo uploader elements not found');
            return;
        }

        // File input change
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Upload area click (trigger file input)
        this.elements.uploadArea.addEventListener('click', (e) => this.handleUploadAreaClick(e));

        // Drag and drop events
        this.elements.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.elements.uploadArea.addEventListener('dragenter', (e) => this.handleDragEnter(e));
        this.elements.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.elements.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        // Remove button
        if (this.elements.removeBtn) {
            this.elements.removeBtn.addEventListener('click', (e) => this.handleRemoveImage(e));
        }
    },

    /**
     * Handle file input change
     * @param {Event} e - Change event
     */
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    },

    /**
     * Handle upload area click
     * @param {Event} e - Click event
     */
    handleUploadAreaClick(e) {
        // Don't trigger if clicking on preview image or remove button
        if (e.target.closest('.logo-preview') || e.target.closest('.btn-remove-logo')) {
            return;
        }
        
        this.elements.fileInput?.click();
    },

    /**
     * Handle drag over
     * @param {Event} e - Drag event
     */
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.elements.uploadArea?.classList.add('drag-over');
    },

    /**
     * Handle drag enter
     * @param {Event} e - Drag event
     */
    handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        this.elements.uploadArea?.classList.add('drag-over');
    },

    /**
     * Handle drag leave
     * @param {Event} e - Drag event
     */
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Only remove drag-over if we're actually leaving the upload area
        if (!this.elements.uploadArea?.contains(e.relatedTarget)) {
            this.elements.uploadArea?.classList.remove('drag-over');
        }
    },

    /**
     * Handle file drop
     * @param {Event} e - Drop event
     */
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        this.elements.uploadArea?.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    },

    /**
     * Process uploaded/selected file
     * @param {File} file - The file to process
     */
    processFile(file) {
        // Validate file type
        if (!this.acceptedTypes.includes(file.type)) {
            this.showError('Please upload a valid image file (JPG, PNG, SVG, GIF, or WebP).');
            return;
        }

        // Validate file size
        if (file.size > this.maxFileSize) {
            const maxSizeMB = Math.round(this.maxFileSize / (1024 * 1024));
            this.showError(`File size must be less than ${maxSizeMB}MB.`);
            return;
        }

        // Update UI to show selected file
        this.updateUI(file);

        // Notify parent form manager about the file selection
        this.notifyFileSelection(file);
    },

    /**
     * Update UI to show selected file
     * @param {File} file - The selected file
     */
    updateUI(file) {
        if (this.elements.uploadText) {
            this.elements.uploadText.textContent = `Selected: ${file.name}`;
        }

        // Show preview if it's an image
        if (file.type.startsWith('image/') && this.elements.previewImg) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.elements.previewImg.src = e.target.result;
                this.elements.previewImg.style.display = 'block';
                
                // Show remove button
                if (this.elements.removeBtn) {
                    this.elements.removeBtn.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        }

        // Add visual feedback
        this.elements.uploadArea?.classList.add('file-selected');
    },

    /**
     * Handle remove image
     * @param {Event} e - Click event
     */
    handleRemoveImage(e) {
        e.preventDefault();
        e.stopPropagation();

        // Clear file input
        if (this.elements.fileInput) {
            this.elements.fileInput.value = '';
        }

        // Reset UI
        this.resetUI();

        // Notify parent form manager
        this.notifyFileSelection(null);
    },

    /**
     * Reset UI to initial state
     */
    resetUI() {
        if (this.elements.uploadText) {
            this.elements.uploadText.textContent = this.elements.uploadArea?.dataset.uploadText || 'Click or drag to upload logo';
        }

        if (this.elements.previewImg) {
            this.elements.previewImg.style.display = 'none';
            this.elements.previewImg.src = '';
        }

        if (this.elements.removeBtn) {
            this.elements.removeBtn.style.display = 'none';
        }

        this.elements.uploadArea?.classList.remove('file-selected', 'drag-over');
    },

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        // Use browser alert for now - can be enhanced with better UI
        alert(message);
    },

    /**
     * Notify parent form manager about file selection
     * @param {File|null} file - Selected file or null if removed
     */
    notifyFileSelection(file) {
        // Dispatch custom event that parent managers can listen for
        const event = new CustomEvent('logoFileSelected', {
            detail: {
                file: file,
                inputName: this.elements.fileInput?.name || 'logo'
            }
        });
        
        document.dispatchEvent(event);
    }
};

// Auto-initialize based on script tag data attributes
if (typeof window !== 'undefined' && !window.logoUploaderInitialized) {
    document.addEventListener('DOMContentLoaded', () => {
        // Find the script tag with data attributes
        const scriptTag = document.querySelector('script[src*="logo-uploader.js"][data-input-id]');
        
        if (scriptTag) {
            const inputId = scriptTag.dataset.inputId;
            const uploadText = scriptTag.dataset.uploadText;
            
            // Initialize the logo uploader for the specified input ID
            const container = document.getElementById(inputId + '-upload-area')?.closest('.row') || 
                             document.querySelector(`#${inputId}`).closest('.row');
            
            if (container) {
                // Adapt to EJS partial structure
                logoUploaderManager.initializeFromPartial(inputId, uploadText);
            }
        } else {
            // Fallback: Look for logo uploader containers
            const uploaders = document.querySelectorAll('[id*="logoUploader"], .logo-uploader-container');
            uploaders.forEach(uploader => {
                if (uploader.id) {
                    logoUploaderManager.initialize(uploader.id);
                }
            });
        }
    });
    
    window.logoUploaderInitialized = true;
}
