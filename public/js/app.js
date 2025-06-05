// Rugby League Masters Application JavaScript

window.RugbyLeagueMasters = {
    // Confirmation dialogs
    confirmDelete: function(message) {
        return confirm(message || 'Are you sure you want to delete this item?');
    },

    // Form validation enhancement
    initFormValidation: function() {
        // Bootstrap validation
        const forms = document.querySelectorAll('.needs-validation');
        Array.prototype.slice.call(forms).forEach(function(form) {
            form.addEventListener('submit', function(event) {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            }, false);
        });
    },

    // File upload enhancements
    initFileUploads: function() {
        // File upload preview
        document.querySelectorAll('input[type="file"]').forEach(input => {
            input.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    const preview = this.closest('.file-upload-area, .mb-3').querySelector('.upload-preview');
                    
                    reader.onload = function(e) {
                        if (file.type.startsWith('image/')) {
                            if (preview) {
                                preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100px; max-height: 100px; object-fit: cover;" class="mt-2">`;
                            }
                        }
                    };
                    
                    if (file.type.startsWith('image/')) {
                        reader.readAsDataURL(file);
                    }
                    
                    // Update upload text
                    const uploadText = this.closest('.file-upload-area, .mb-3').querySelector('.upload-text');
                    if (uploadText) {
                        uploadText.textContent = `Selected: ${file.name}`;
                    }
                }
            });
        });

        // Drag and drop for file upload areas
        document.querySelectorAll('.file-upload-area').forEach(area => {
            const input = area.querySelector('input[type="file"]');
            
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            ['dragenter', 'dragover'].forEach(eventName => {
                area.addEventListener(eventName, () => area.classList.add('drag-over'), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, () => area.classList.remove('drag-over'), false);
            });

            area.addEventListener('drop', function(e) {
                const dt = e.dataTransfer;
                const files = dt.files;
                
                if (input && files.length > 0) {
                    input.files = files;
                    const event = new Event('change', { bubbles: true });
                    input.dispatchEvent(event);
                }
            });
        });
    },

    // Auto-expand textareas
    initTextareas: function() {
        document.querySelectorAll('textarea').forEach(textarea => {
            textarea.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = this.scrollHeight + 'px';
            });
        });
    },

    // Search and filter enhancements
    initSearchFilters: function() {
        // Auto-submit search forms with debouncing
        const searchInputs = document.querySelectorAll('input[type="search"], input[name="search"]');
        searchInputs.forEach(input => {
            let timeout;
            input.addEventListener('input', function() {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    if (this.form) {
                        this.form.submit();
                    }
                }, 800);
            });
        });

        // State filter auto-submit
        const stateSelects = document.querySelectorAll('select[name="state"]');
        stateSelects.forEach(select => {
            select.addEventListener('change', function() {
                if (this.form) {
                    this.form.submit();
                }
            });
        });

        // Checkbox auto-submit
        const filterCheckboxes = document.querySelectorAll('input[type="checkbox"][name="upcoming"]');
        filterCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                if (this.form) {
                    this.form.submit();
                }
            });
        });
    },

    // Toast notifications (for future use)
    showToast: function(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        // Add to page
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }

        toastContainer.appendChild(toast);

        // Show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        // Remove after hiding
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    },

    // Initialize all functionality
    init: function() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initFormValidation();
            this.initFileUploads();
            this.initTextareas();
            this.initSearchFilters();
            
            if (this.utils) {
                console.log('Rugby League Masters app initialized');
            }
        });
    }
};

// Auto-initialize
RugbyLeagueMasters.init();