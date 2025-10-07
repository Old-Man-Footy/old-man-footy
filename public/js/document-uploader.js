/**
 * Document Uploader JavaScript Module
 * 
 * Handles file selection, document previews, and validation
 * for the document uploader partial (_documentUploader.ejs).
 * 
 * Features:
 * - File selection support
 * - Multiple document preview with file list
 * - File validation (type, size, count)
 * - Remove selected documents
 * - Support for multiple document uploads
 */

export const documentUploaderManager = {
    // Configuration
    uploaders: new Map(),
    
    /**
     * Initialize all document uploaders on the page
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
            uploaders: document.querySelectorAll('.document-uploader')
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
     * Initialize a single document uploader
     * @param {HTMLElement} uploaderContainer - The uploader container element
     */
    initializeUploader(uploaderContainer) {
        const fileInput = uploaderContainer.querySelector('input[type="file"]');
        if (!fileInput) return;
        
        const uploaderId = fileInput.id;
        const uploadArea = uploaderContainer.querySelector(`#${uploaderId}-upload-area`);
        const selectedFilesContainer = uploaderContainer.querySelector(`#${uploaderId}-selected-files`);
        const fileListContainer = uploaderContainer.querySelector(`#${uploaderId}-file-list`);
        const fileCountElement = uploaderContainer.querySelector(`#${uploaderId}-file-count`);
        const uploadTextElement = uploaderContainer.querySelector(`#${uploaderId}-upload-text`);
        
        // Store uploader configuration
        const uploaderConfig = {
            container: uploaderContainer,
            input: fileInput,
            uploadArea: uploadArea,
            selectedContainer: selectedFilesContainer,
            fileListContainer: fileListContainer,
            fileCountElement: fileCountElement,
            uploadTextElement: uploadTextElement,
            maxFiles: parseInt(fileInput.dataset.maxFiles) || 10,
            selectedFiles: []
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
            this.handleFileSelection(config, Array.from(e.target.files));
        });
        
        // Drag and drop support
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('border-primary', 'bg-light');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('border-primary', 'bg-light');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('border-primary', 'bg-light');
            
            const files = Array.from(e.dataTransfer.files);
            this.handleFileSelection(config, files);
        });
    },
    
    /**
     * Handle file selection for single or multiple files
     * @param {Object} config - Uploader configuration
     * @param {Array} files - Selected files
     */
    handleFileSelection(config, files) {
        if (!files || files.length === 0) {
            return;
        }
        
        const isMultiple = config.input.hasAttribute('multiple');
        
        // For single file uploads, only take the first file and replace any existing file
        if (!isMultiple) {
            if (files.length > 1) {
                this.showErrors(['Only one file can be selected for this upload.']);
                return;
            }
            config.selectedFiles = []; // Clear existing files for single upload
        }
        
        // Validate files
        const validationErrors = this.validateFiles(files, config);
        if (validationErrors.length > 0) {
            this.showErrors(validationErrors);
            return;
        }
        
        if (isMultiple) {
            // Check if adding these files would exceed the limit
            const totalFiles = config.selectedFiles.length + files.length;
            if (totalFiles > config.maxFiles) {
                this.showErrors([`Maximum ${config.maxFiles} files allowed. You selected ${files.length} files, but only ${config.maxFiles - config.selectedFiles.length} more can be added.`]);
                return;
            }
            
            // Add files to selected files for multiple upload
            config.selectedFiles.push(...files);
        } else {
            // Replace the file for single upload
            config.selectedFiles = [...files];
        }
        
        // Update display
        this.updateFileDisplay(config);
        this.updateFileInput(config);
    },
    
    /**
     * Validate selected files
     * @param {Array} files - Files to validate
     * @param {Object} config - Uploader configuration
     * @returns {Array} Array of validation error messages
     */
    validateFiles(files, config) {
        const errors = [];
        const acceptedTypes = config.input.accept.split(',').map(type => type.trim().toLowerCase());
        const maxSize = 50 * 1024 * 1024; // 50MB default
        
        files.forEach((file, index) => {
            // Check file type
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            const mimeType = file.type.toLowerCase();
            
            if (!acceptedTypes.some(type => type === fileExtension || type === mimeType)) {
                errors.push(`File "${file.name}" is not an accepted file type.`);
            }
            
            // Check file size
            if (file.size > maxSize) {
                errors.push(`File "${file.name}" is too large. Maximum size is 50MB.`);
            }
        });
        
        return errors;
    },
    
    /**
     * Update the file display with selected files
     * @param {Object} config - Uploader configuration
     */
    updateFileDisplay(config) {
        const { selectedContainer, fileListContainer, fileCountElement, uploadTextElement } = config;
        
        if (config.selectedFiles.length === 0) {
            selectedContainer.classList.add('d-none');
            uploadTextElement.textContent = config.input.dataset.originalText || 'Select documents to upload';
            return;
        }
        
        // Show selected files container
        selectedContainer.classList.remove('d-none');
        
        // Update file count
        if (fileCountElement) {
            fileCountElement.textContent = config.selectedFiles.length;
        }
        
        // Update upload text
        if (uploadTextElement) {
            const originalText = config.input.dataset.originalText || uploadTextElement.textContent;
            config.input.dataset.originalText = originalText;
            uploadTextElement.textContent = `${config.selectedFiles.length} file(s) selected - Click to add more`;
        }
        
        // Clear and rebuild file list
        if (fileListContainer) {
            fileListContainer.innerHTML = '';
            
            config.selectedFiles.forEach((file, index) => {
                const fileItem = this.createFileListItem(file, index, config);
                fileListContainer.appendChild(fileItem);
            });
        }
    },
    
    /**
     * Create a file list item element
     * @param {File} file - The file object
     * @param {number} index - File index
     * @param {Object} config - Uploader configuration
     * @returns {HTMLElement} File list item element
     */
    createFileListItem(file, index, config) {
        const listItem = document.createElement('div');
        listItem.className = 'list-group-item d-flex justify-content-between align-items-center px-0 py-2';
        
        // Get file icon based on extension
        const fileIcon = this.getFileIcon(file.name);
        
        // Format file size
        const fileSize = this.formatFileSize(file.size);
        
        listItem.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi ${fileIcon} text-primary me-2"></i>
                <div>
                    <div class="fw-medium">${file.name}</div>
                    <small class="text-muted">${fileSize}</small>
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger" data-file-index="${index}">
                <i class="bi bi-trash"></i>
            </button>
        `;
        
        // Add remove functionality
        const removeBtn = listItem.querySelector('button');
        removeBtn.addEventListener('click', () => {
            this.removeFile(config, index);
        });
        
        return listItem;
    },
    
    /**
     * Get appropriate icon for file type
     * @param {string} filename - File name
     * @returns {string} Bootstrap icon class
     */
    getFileIcon(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        
        switch (extension) {
            case 'pdf':
                return 'bi-file-earmark-pdf';
            case 'doc':
            case 'docx':
                return 'bi-file-earmark-word';
            case 'xls':
            case 'xlsx':
                return 'bi-file-earmark-excel';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return 'bi-file-earmark-image';
            case 'txt':
                return 'bi-file-earmark-text';
            default:
                return 'bi-file-earmark';
        }
    },
    
    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    /**
     * Remove a file from the selection
     * @param {Object} config - Uploader configuration
     * @param {number} index - Index of file to remove
     */
    removeFile(config, index) {
        config.selectedFiles.splice(index, 1);
        this.updateFileDisplay(config);
        this.updateFileInput(config);
    },
    
    /**
     * Update the file input with selected files
     * @param {Object} config - Uploader configuration
     */
    updateFileInput(config) {
        const dataTransfer = new DataTransfer();
        
        config.selectedFiles.forEach(file => {
            dataTransfer.items.add(file);
        });
        
        config.input.files = dataTransfer.files;
    },
    
    /**
     * Show validation errors to the user
     * @param {Array} errors - Array of error messages
     */
    showErrors(errors) {
        // Create or update error alert
        let errorAlert = document.querySelector('#document-uploader-errors');
        
        if (!errorAlert) {
            errorAlert = document.createElement('div');
            errorAlert.id = 'document-uploader-errors';
            errorAlert.className = 'alert alert-danger alert-dismissible fade show mt-3';
            
            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'btn-close';
            closeBtn.setAttribute('data-bs-dismiss', 'alert');
            closeBtn.setAttribute('aria-label', 'Close');
            
            errorAlert.appendChild(closeBtn);
            
            // Insert after the first uploader or at the top of the form
            const firstUploader = document.querySelector('.document-uploader');
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
     * Get selected files for a specific uploader
     * @param {string} uploaderId - ID of the uploader
     * @returns {Array} Selected files array
     */
    getSelectedFiles(uploaderId) {
        const config = this.uploaders.get(uploaderId);
        return config ? config.selectedFiles : [];
    },
    
    /**
     * Clear selected files for a specific uploader
     * @param {string} uploaderId - ID of the uploader
     */
    clearSelectedFiles(uploaderId) {
        const config = this.uploaders.get(uploaderId);
        if (config) {
            config.selectedFiles = [];
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
