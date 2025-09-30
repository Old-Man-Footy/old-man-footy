import { showAlert } from './utils/ui-helpers.js';

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
        // Check if this container has already been initialized
        if (!this.initializedContainers) {
            this.initializedContainers = new Set();
        }
        
        if (this.initializedContainers.has(containerId)) {
            console.log(`Logo uploader already initialized for container '${containerId}', skipping...`);
            return;
        }
        
        this.cacheElements(containerId);
        
        // Merge options with defaults
        this.maxFileSize = options.maxFileSize || this.maxFileSize;
        this.acceptedTypes = options.acceptedTypes || this.acceptedTypes;

        if (this.elements.uploadArea) {
            this.bindEvents();
            // Mark this container as initialized
            this.initializedContainers.add(containerId);
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
            previewContainer: container.querySelector('.logo-preview'),
            noLogoCard: container.querySelector('.no-logo-card'),
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
        // Check if this input has already been initialized
        if (!this.initializedInputs) {
            this.initializedInputs = new Set();
        }
        
        if (this.initializedInputs.has(inputId)) {
            console.log(`Logo uploader already initialized for input '${inputId}', skipping...`);
            return;
        }
        
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
        
        // Mark this input as initialized
        this.initializedInputs.add(inputId);
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

        // Listen for upload completion events from parent form managers
        document.addEventListener('logoUploadComplete', (e) => this.handleUploadComplete(e.detail));
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
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.showImagePreview(e.target.result, file.name);
            };
            reader.readAsDataURL(file);
        }

        // Add visual feedback
        this.elements.uploadArea?.classList.add('file-selected');
    },

    /**
     * Show image preview in the appropriate container
     * @param {string} imageSrc - Image source URL or data URL
     * @param {string} fileName - Original file name
     */
    showImagePreview(imageSrc, fileName) {
        // Hide the no-logo card if it exists
        if (this.elements.noLogoCard) {
            this.elements.noLogoCard.style.display = 'none';
        }

        // Show preview container and update image
        if (this.elements.previewContainer) {
            this.elements.previewContainer.style.display = 'block';
            
            // Find the preview image within the container
            const previewImg = this.elements.previewContainer.querySelector('img');
            if (previewImg) {
                previewImg.src = imageSrc;
                previewImg.alt = fileName || 'Logo preview';
            }
        }

        // Legacy support: update direct preview image element
        if (this.elements.previewImg) {
            this.elements.previewImg.src = imageSrc;
            this.elements.previewImg.style.display = 'block';
        }

        // Show remove button if it exists
        if (this.elements.removeBtn) {
            this.elements.removeBtn.style.display = 'block';
        }
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
        showAlert(message);
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
    },



    /**
     * Handle successful upload completion
     * @param {Object} response - Upload response data
     */
    handleUploadComplete(response) {
        if (!this.elements || !this.elements.previewImg) return;
        
        try {
            // Update preview with uploaded image
            if (response.imageUrl) {
                this.elements.previewImg.src = response.imageUrl;
                this.elements.previewImg.style.display = 'block';
                this.elements.uploadText.style.display = 'none';
            }
            
            // Show success feedback
            if (this.elements.uploadArea) {
                this.elements.uploadArea.classList.add('upload-success');
                setTimeout(() => {
                    this.elements.uploadArea.classList.remove('upload-success');
                }, 2000);
            }
            
            console.log('Logo uploader: Upload completion handled successfully');
        } catch (error) {
            console.error('Logo uploader: Error handling upload completion:', error);
        }
    },

    /**
     * Reset uploader state after successful submission
     */
    resetUploader() {
        if (!this.elements) return;
        
        try {
            // Reset file input
            if (this.elements.fileInput) {
                this.elements.fileInput.value = '';
            }
            
            // Reset visual state
            if (this.elements.uploadArea) {
                this.elements.uploadArea.classList.remove('dragover', 'upload-success');
            }
            
            // Show/hide appropriate preview containers
            if (this.elements.previewContainer) {
                this.elements.previewContainer.style.display = 'none';
            }
            if (this.elements.noLogoCard) {
                this.elements.noLogoCard.style.display = 'block';
            }
            
            // Reset help text
            if (this.elements.helpText) {
                this.elements.helpText.textContent = 'Select an image or drag and drop here';
            }
            
            console.log('Logo uploader: State reset completed');
        } catch (error) {
            console.error('Logo uploader: Error resetting uploader state:', error);
        }
    }
};

// Auto-initialize based on script tag data attributes
if (typeof window !== 'undefined' && !window.logoUploaderInitialized) {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Logo Uploader: DOMContentLoaded event fired');
        
        // Find the script tag with data attributes
        const scriptTag = document.querySelector('script[src*="logo-uploader.js"][data-input-id]');
        console.log('Logo Uploader: Script tag found:', scriptTag);
        
        if (scriptTag) {
            const inputId = scriptTag.dataset.inputId;
            const uploadText = scriptTag.dataset.uploadText;
            console.log('Logo Uploader: Auto-initialization detected - inputId:', inputId, 'uploadText:', uploadText);
            
            // Initialize the logo uploader for the specified input ID
            const container = document.getElementById(inputId + '-upload-area')?.closest('.row') || 
                             document.querySelector(`#${inputId}`).closest('.row');
            console.log('Logo Uploader: Container found:', container);
            
            if (container) {
                console.log('Logo Uploader: Calling initializeFromPartial with inputId:', inputId);
                // Adapt to EJS partial structure
                logoUploaderManager.initializeFromPartial(inputId, uploadText);
                console.log('Logo Uploader: initializeFromPartial completed successfully');
            } else {
                console.warn('Logo Uploader: No container found for inputId:', inputId);
            }
        } else {
            console.log('Logo Uploader: No script tag with data-input-id found, using fallback');
            // Fallback: Look for logo uploader containers
            const uploaders = document.querySelectorAll('[id*="logoUploader"], .logo-uploader-container');
            console.log('Logo Uploader: Fallback containers found:', uploaders.length);
            uploaders.forEach(uploader => {
                if (uploader.id) {
                    console.log('Logo Uploader: Initializing fallback container:', uploader.id);
                    logoUploaderManager.initialize(uploader.id);
                }
            });
        }
    });
    
    window.logoUploaderInitialized = true;
    console.log('Logo Uploader: Auto-initialization setup complete');
}
