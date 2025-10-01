/**
 * Image Uploader JavaScript Module
 * 
 * Handles drag-and-drop, file selection, image previews, and validation
 * for the image uploader partial (_imageUploader.ejs).
 * 
 * Features:
 * - Drag and drop support
 * - Single image preview with thumbnail
 * - File validation (type, size)
 * - Remove selected image
 * - Support for single image uploads (logos, promotional images)
 */

export const imageUploaderManager = {
    // Configuration
    uploaders: new Map(),
    
    /**
     * Initialize all image uploaders on the page
     */
    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.initializeUploaders();
    },
    
    /**
     * Cache DOM elements that will be used frequently
     */
    cacheElements() {
        this.elements = {
            uploaders: document.querySelectorAll('.image-uploader')
        };
    },
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Initialize each uploader found on the page
        this.elements.uploaders.forEach(uploader => {
            this.initializeUploader(uploader);
        });
    },
    
    /**
     * Initialize uploaders found on page load
     */
    initializeUploaders() {
        // This is called from bindEvents, but kept for consistency with manager pattern
    },
    
    /**
     * Initialize a single image uploader
     * @param {HTMLElement} uploaderContainer - The uploader container element
     */
    initializeUploader(uploaderContainer) {
        const fileInput = uploaderContainer.querySelector('input[type="file"]');
        if (!fileInput) return;
        
        const uploaderId = fileInput.id;
        const uploadArea = uploaderContainer.querySelector(`#${uploaderId}-upload-area`);
        const selectedImagesContainer = uploaderContainer.querySelector(`#${uploaderId}-selected-images`);
        const imagePreviewContainer = uploaderContainer.querySelector(`#${uploaderId}-image-preview`);
        
        // Store uploader configuration for single file
        const uploaderConfig = {
            container: uploaderContainer,
            input: fileInput,
            uploadArea: uploadArea,
            selectedContainer: selectedImagesContainer,
            previewContainer: imagePreviewContainer,
            previewWidth: fileInput.dataset.previewWidth || '120px',
            previewHeight: fileInput.dataset.previewHeight || '120px',
            selectedFile: null
        };
        
        this.uploaders.set(uploaderId, uploaderConfig);
        
        // Bind events for this uploader
        this.bindUploaderEvents(uploaderConfig);
    },
    
    /**
     * Bind events for a specific uploader
     * @param {Object} config - Uploader configuration object
     */
    bindUploaderEvents(config) {
        const { input, uploadArea } = config;
        
        // Click to select files
        uploadArea.addEventListener('click', () => {
            input.click();
        });
        
        // File selection change
        input.addEventListener('change', (e) => {
            this.handleFileSelection(config, e.target.files[0]);
        });
        
        // Drag and drop events
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile) {
                this.handleFileSelection(config, droppedFile);
            }
        });
    },
    
    /**
     * Handle file selection (from input or drag/drop)
     * @param {Object} config - Uploader configuration
     * @param {File} file - Selected file
     */
    handleFileSelection(config, file) {
        if (!file) return;
        
        // Validate the file
        const validation = this.validateFile(file, config);
        if (!validation.isValid) {
            this.showErrors([`${file.name}: ${validation.error}`]);
            return;
        }
        
        // Set the selected file
        config.selectedFile = file;
        this.updateFileDisplay(config);
        this.updateFileInput(config);
    },
    
    /**
     * Validate a single file
     * @param {File} file - File to validate
     * @param {Object} config - Uploader configuration
     * @returns {Object} Validation result
     */
    validateFile(file, config) {
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            return { isValid: false, error: 'Invalid file type. Only JPG, PNG, GIF, WEBP, and SVG files are allowed.' };
        }
        
        // Check file size (10MB default limit)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            return { isValid: false, error: 'File size too large. Maximum 10MB allowed.' };
        }
        
        return { isValid: true };
    },
    
    /**
     * Update the visual display of selected file
     * @param {Object} config - Uploader configuration
     */
    updateFileDisplay(config) {
        const { selectedContainer, previewContainer, selectedFile } = config;
        
        // Show/hide selected image container
        if (selectedFile) {
            selectedContainer.classList.remove('d-none');
            
            // Clear existing preview and create new one
            previewContainer.innerHTML = '';
            const previewItem = this.createImagePreview(selectedFile, config);
            previewContainer.appendChild(previewItem);
        } else {
            selectedContainer.classList.add('d-none');
        }
    },
    
    /**
     * Create image preview element
     * @param {File} file - Image file
     * @param {Object} config - Uploader configuration
     * @returns {HTMLElement} Preview element
     */
    createImagePreview(file, config) {
        const previewItem = document.createElement('div');
        previewItem.className = 'selected-image-item position-relative';
        
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-thumbnail border rounded';
        imageContainer.style.cssText = `width: ${config.previewWidth}; height: ${config.previewHeight}; overflow: hidden;`;
        
        const img = document.createElement('img');
        img.className = 'img-fluid w-100 h-100 object-fit-cover';
        img.alt = file.name;
        
        // Create image preview using FileReader
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-image btn-close btn-close-white';
        removeBtn.setAttribute('aria-label', 'Remove image');
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', () => {
            this.removeFile(config);
        });
        
        const fileName = document.createElement('small');
        fileName.className = 'text-muted d-block text-center mt-1 text-truncate';
        fileName.style.maxWidth = config.previewWidth;
        fileName.textContent = file.name;
        
        imageContainer.appendChild(img);
        previewItem.appendChild(imageContainer);
        previewItem.appendChild(removeBtn);
        previewItem.appendChild(fileName);
        
        return previewItem;
    },
    
    /**
     * Remove the selected file
     * @param {Object} config - Uploader configuration
     */
    removeFile(config) {
        config.selectedFile = null;
        this.updateFileDisplay(config);
        this.updateFileInput(config);
    },
    
    /**
     * Update the actual file input with selected file
     * @param {Object} config - Uploader configuration
     */
    updateFileInput(config) {
        // Create a new DataTransfer object to update the file input
        const dataTransfer = new DataTransfer();
        
        if (config.selectedFile) {
            dataTransfer.items.add(config.selectedFile);
        }
        
        config.input.files = dataTransfer.files;
    },
    
    /**
     * Show validation errors to the user
     * @param {Array} errors - Array of error messages
     */
    showErrors(errors) {
        // Create or update error alert
        let errorAlert = document.querySelector('#image-uploader-errors');
        
        if (!errorAlert) {
            errorAlert = document.createElement('div');
            errorAlert.id = 'image-uploader-errors';
            errorAlert.className = 'alert alert-danger alert-dismissible fade show mt-3';
            
            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'btn-close';
            closeBtn.setAttribute('data-bs-dismiss', 'alert');
            closeBtn.setAttribute('aria-label', 'Close');
            
            errorAlert.appendChild(closeBtn);
            
            // Insert after the first uploader or at the top of the form
            const firstUploader = document.querySelector('.image-uploader');
            if (firstUploader) {
                firstUploader.parentNode.insertBefore(errorAlert, firstUploader);
            }
        }
        
        errorAlert.innerHTML = `
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            <strong>Upload Error${errors.length > 1 ? 's' : ''}:</strong>
            <ul class="mb-0 mt-2">
                ${errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
        `;
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (errorAlert && errorAlert.parentNode) {
                errorAlert.remove();
            }
        }, 10000);
    },
    
    /**
     * Get selected file for a specific uploader
     * @param {string} uploaderId - ID of the uploader
     * @returns {File|null} Selected file or null
     */
    getSelectedFile(uploaderId) {
        const config = this.uploaders.get(uploaderId);
        return config ? config.selectedFile : null;
    },
    
    /**
     * Clear selected file for a specific uploader
     * @param {string} uploaderId - ID of the uploader
     */
    clearSelectedFile(uploaderId) {
        const config = this.uploaders.get(uploaderId);
        if (config) {
            config.selectedFile = null;
            this.updateFileDisplay(config);
            this.updateFileInput(config);
        }
    },
    
    /**
     * Add a new uploader dynamically (for AJAX-loaded content)
     * @param {HTMLElement} uploaderContainer - The uploader container element
     */
    addUploader(uploaderContainer) {
        this.initializeUploader(uploaderContainer);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    imageUploaderManager.initialize();
});
