/**
 * Gallery Manager
 * Handles image gallery functionality including upload, delete, and modal viewing
 */

export const galleryManager = {
    elements: {},
    currentImages: [],
    selectedFiles: [],
    currentImageIndex: 0,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    allowedTypes: ['image/jpeg', 'image/png'],

    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.initializeImageModal();
        console.log('Gallery Manager initialized');
    },

    cacheElements() {
        this.elements.uploadForm = document.getElementById('uploadForm');
        this.elements.fileInput = document.getElementById('images');
        this.elements.uploadBtn = document.getElementById('uploadBtn');
        this.elements.uploadModal = document.getElementById('uploadModal');
        this.elements.imagePreviewContainer = document.getElementById('imagePreviewContainer');
        this.elements.progressBar = document.querySelector('.progress-bar');
        this.elements.progress = document.querySelector('.progress');
        this.elements.galleryContainer = document.getElementById('galleryContainer');
        
        // Modal elements
        this.elements.imageModal = document.getElementById('imageModal');
        this.elements.modalImage = document.getElementById('modalImage');
        this.elements.prevBtn = document.getElementById('prevImageBtn');
        this.elements.nextBtn = document.getElementById('nextImageBtn');
        this.elements.imageCounter = document.getElementById('imageCounter');
        
        // Get entity ID (carnival or club)
        this.carnivalId = document.getElementById('carnivalId')?.value;
        this.clubId = document.getElementById('clubId')?.value;
    },

    bindEvents() {
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', this.handleFileSelect);
        }

        if (this.elements.uploadBtn) {
            this.elements.uploadBtn.addEventListener('click', this.handleUpload);
        }

        if (this.elements.uploadModal) {
            this.elements.uploadModal.addEventListener('hidden.bs.modal', this.resetUploadForm);
        }

        // Gallery image clicks
        document.addEventListener('click', this.handleGalleryClick);

        // Modal navigation
        if (this.elements.prevBtn) {
            this.elements.prevBtn.addEventListener('click', this.showPrevImage);
        }
        if (this.elements.nextBtn) {
            this.elements.nextBtn.addEventListener('click', this.showNextImage);
        }

        // Keyboard navigation in modal
        document.addEventListener('keydown', this.handleKeyNavigation);
    },

    handleFileSelect: (carnival) => {
        const files = Array.from(carnival.target.files);
        
        if (files.length > galleryManager.maxFiles) {
            galleryManager.showError(`Maximum ${galleryManager.maxFiles} files allowed`);
            return;
        }

        galleryManager.selectedFiles = [];
        galleryManager.elements.imagePreviewContainer.innerHTML = '';

        let validFiles = [];
        for (const file of files) {
            if (galleryManager.validateFile(file)) {
                validFiles.push(file);
            }
        }

        if (validFiles.length === 0) {
            galleryManager.elements.uploadBtn.disabled = true;
            galleryManager.elements.imagePreviewContainer.style.display = 'none';
            return;
        }

        galleryManager.selectedFiles = validFiles;
        galleryManager.generatePreviews(validFiles);
        galleryManager.elements.uploadBtn.disabled = false;
    },

    validateFile(file) {
        if (!this.allowedTypes.includes(file.type)) {
            this.showError(`Invalid file type: ${file.name}. Only JPEG, and PNG are allowed.`);
            return false;
        }

        if (file.size > this.maxFileSize) {
            this.showError(`File too large: ${file.name}. Maximum size is 10MB.`);
            return false;
        }

        return true;
    },

    generatePreviews(files) {
        this.elements.imagePreviewContainer.innerHTML = '';
        this.elements.imagePreviewContainer.style.display = 'block';

        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewHtml = `
                    <div class="col-6 col-md-4 col-lg-3">
                        <div class="image-preview" data-file-index="${index}">
                            <img src="${e.target.result}" alt="Preview">
                            <div class="image-preview-overlay">
                                <button type="button" class="remove-preview-btn" data-file-index="${index}">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div class="alt-text-input">
                                <input type="text" 
                                       class="form-control form-control-sm" 
                                       placeholder="Description (optional)"
                                       data-file-index="${index}">
                            </div>
                        </div>
                    </div>
                `;
                this.elements.imagePreviewContainer.insertAdjacentHTML('beforeend', previewHtml);
            };
            reader.readAsDataURL(file);
        });

        // Bind remove preview events
        setTimeout(() => {
            document.querySelectorAll('.remove-preview-btn').forEach(btn => {
                btn.addEventListener('click', this.removePreview);
            });
        }, 100);
    },

    removePreview: (carnival) => {
        const index = parseInt(carnival.target.closest('[data-file-index]').dataset.fileIndex);
        galleryManager.selectedFiles.splice(index, 1);
        
        if (galleryManager.selectedFiles.length === 0) {
            galleryManager.elements.uploadBtn.disabled = true;
            galleryManager.elements.imagePreviewContainer.style.display = 'none';
            galleryManager.elements.fileInput.value = '';
        } else {
            galleryManager.generatePreviews(galleryManager.selectedFiles);
        }
    },

    handleUpload: async () => {
        if (galleryManager.selectedFiles.length === 0) return;

        const formData = new FormData();
        
        // Add entity ID
        if (galleryManager.carnivalId) {
            formData.append('carnivalId', galleryManager.carnivalId);
        } else if (galleryManager.clubId) {
            formData.append('clubId', galleryManager.clubId);
        }

        // Add files and alt text
        galleryManager.selectedFiles.forEach((file, index) => {
            formData.append('images', file);
            
            const altTextInput = document.querySelector(`input[data-file-index="${index}"]`);
            if (altTextInput && altTextInput.value.trim()) {
                formData.append(`altText_${index}`, altTextInput.value.trim());
            }
        });

        try {
            galleryManager.elements.uploadBtn.disabled = true;
            galleryManager.elements.progress.style.display = 'block';
            galleryManager.updateProgress(10);

            const response = await fetch('/api/images/upload', {
                method: 'POST',
                body: formData
            });

            galleryManager.updateProgress(90);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Upload failed');
            }

            const result = await response.json();
            galleryManager.updateProgress(100);

            galleryManager.showSuccess(`Successfully uploaded ${result.uploadedImages.length} image(s)`);
            
            // Close modal and refresh gallery
            setTimeout(() => {
                const modalInstance = bootstrap.Modal.getInstance(galleryManager.elements.uploadModal);
                modalInstance.hide();
                galleryManager.refreshGallery();
            }, 1500);

        } catch (error) {
            console.error('Upload error:', error);
            galleryManager.showError(error.message || 'Upload failed. Please try again.');
            galleryManager.elements.uploadBtn.disabled = false;
        } finally {
            setTimeout(() => {
                galleryManager.elements.progress.style.display = 'none';
                galleryManager.updateProgress(0);
            }, 2000);
        }
    },

    updateProgress(percent) {
        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = `${percent}%`;
        }
    },

    resetUploadForm: () => {
        galleryManager.selectedFiles = [];
        galleryManager.elements.fileInput.value = '';
        galleryManager.elements.uploadBtn.disabled = true;
        galleryManager.elements.imagePreviewContainer.style.display = 'none';
        galleryManager.elements.imagePreviewContainer.innerHTML = '';
        galleryManager.elements.progress.style.display = 'none';
        galleryManager.updateProgress(0);
        galleryManager.clearMessages();
    },

    handleGalleryClick: async (carnival) => {
        // Handle delete button clicks
        if (carnival.target.closest('.delete-image-btn')) {
            const imageId = carnival.target.closest('.delete-image-btn').dataset.imageId;
            await galleryManager.deleteImage(imageId);
            return;
        }

        // Handle gallery image clicks for modal
        const galleryImage = carnival.target.closest('.gallery-image');
        if (galleryImage) {
            const imageSrc = galleryImage.dataset.imageSrc;
            const imageAlt = galleryImage.dataset.imageAlt;
            const imageIndex = parseInt(galleryImage.dataset.imageIndex);
            
            galleryManager.openImageModal(imageSrc, imageAlt, imageIndex);
        }
    },

    deleteImage: async (imageId) => {
        if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/images/${imageId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Delete failed');
            }

            // Remove the image from the gallery
            const imageElement = document.querySelector(`[data-image-id="${imageId}"]`);
            if (imageElement) {
                imageElement.closest('.col-12, .col-sm-6, .col-md-4, .col-lg-3').remove();
            }

            galleryManager.showSuccess('Image deleted successfully');

            // Check if gallery is now empty
            const remainingImages = document.querySelectorAll('.gallery-item');
            if (remainingImages.length === 0) {
                galleryManager.refreshGallery();
            }

        } catch (error) {
            console.error('Delete error:', error);
            galleryManager.showError(error.message || 'Failed to delete image');
        }
    },

    initializeImageModal() {
        // Collect all gallery images
        this.updateImageList();
        
        // Initialize modal instance once
        if (this.elements.imageModal && !this.modalInstance) {
            this.modalInstance = new bootstrap.Modal(this.elements.imageModal, {
                backdrop: true,
                keyboard: true,
                focus: true
            });
            
            // Add event listeners to ensure proper cleanup
            this.elements.imageModal.addEventListener('hidden.bs.modal', () => {
                // Force remove any lingering backdrops
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => backdrop.remove());
                
                // Ensure body classes are cleaned up
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            });
        }
    },

    updateImageList() {
        this.currentImages = Array.from(document.querySelectorAll('.gallery-image')).map((img, index) => ({
            src: img.dataset.imageSrc,
            alt: img.dataset.imageAlt,
            index: index
        }));
    },

    openImageModal(imageSrc, imageAlt, imageIndex) {
        if (!this.elements.modalImage || !this.modalInstance) return;

        this.currentImageIndex = imageIndex;
        this.elements.modalImage.src = imageSrc;
        this.elements.modalImage.alt = imageAlt;

        this.updateModalNavigation();

        this.modalInstance.show();
    },

    showPrevImage: () => {
        if (galleryManager.currentImages.length === 0) return;
        
        galleryManager.currentImageIndex = 
            (galleryManager.currentImageIndex - 1 + galleryManager.currentImages.length) % 
            galleryManager.currentImages.length;
        
        const image = galleryManager.currentImages[galleryManager.currentImageIndex];
        galleryManager.elements.modalImage.src = image.src;
        galleryManager.elements.modalImage.alt = image.alt;
        galleryManager.updateModalNavigation();
    },

    showNextImage: () => {
        if (galleryManager.currentImages.length === 0) return;
        
        galleryManager.currentImageIndex = 
            (galleryManager.currentImageIndex + 1) % galleryManager.currentImages.length;
        
        const image = galleryManager.currentImages[galleryManager.currentImageIndex];
        galleryManager.elements.modalImage.src = image.src;
        galleryManager.elements.modalImage.alt = image.alt;
        galleryManager.updateModalNavigation();
    },

    updateModalNavigation() {
        if (!this.elements.imageCounter) return;

        this.elements.imageCounter.textContent = 
            `${this.currentImageIndex + 1} of ${this.currentImages.length}`;

        if (this.elements.prevBtn) {
            this.elements.prevBtn.disabled = this.currentImages.length <= 1;
        }
        if (this.elements.nextBtn) {
            this.elements.nextBtn.disabled = this.currentImages.length <= 1;
        }
    },

    handleKeyNavigation: (carnival) => {
        if (!galleryManager.elements.imageModal.classList.contains('show')) return;

        switch(carnival.key) {
            case 'ArrowLeft':
                carnival.preventDefault();
                galleryManager.showPrevImage();
                break;
            case 'ArrowRight':
                carnival.preventDefault();
                galleryManager.showNextImage();
                break;
            case 'Escape':
                if (galleryManager.modalInstance) {
                    galleryManager.modalInstance.hide();
                }
                break;
        }
    },

    refreshGallery: async () => {
        try {
            // Reload the current page to show updated gallery
            window.location.reload();
        } catch (error) {
            console.error('Failed to refresh gallery:', error);
        }
    },

    showError(message) {
        this.showMessage(message, 'error');
    },

    showSuccess(message) {
        this.showMessage(message, 'success');
    },

    showMessage(message, type) {
        this.clearMessages();
        
        const alertClass = type === 'error' ? 'upload-error' : 'upload-success';
        const alertHtml = `<div class="${alertClass}">${message}</div>`;
        
        if (this.elements.uploadForm) {
            this.elements.uploadForm.insertAdjacentHTML('afterbegin', alertHtml);
        }
    },

    clearMessages() {
        const messages = document.querySelectorAll('.upload-error, .upload-success');
        messages.forEach(msg => msg.remove());
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    galleryManager.initialize();
});
