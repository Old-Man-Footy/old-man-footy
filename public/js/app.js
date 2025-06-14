// Old Man Footy Application JavaScript

window.oldmanfooty = {
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

    // Initialize Bootstrap tooltips
    initTooltips: function() {
        /**
         * Initialize Bootstrap tooltips across all pages
         * This enables the MySideline registration warning tooltips
         */
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    },

    // Initialize all functionality
    init: function() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initFormValidation();
            this.initFileUploads();
            this.initTextareas();
            this.initSearchFilters();
            this.initTooltips(); // Add tooltip initialization
            
            if (this.utils) {
                console.log('Old Man Footy app initialized');
            }
        });
    }
};

// Auto-initialize
oldmanfooty.init();

/**
 * Initialize image carousel functionality
 */
function initializeImageCarousel() {
    const carousel = document.getElementById('imageCarousel');
    if (!carousel) return;

    const track = carousel.querySelector('.carousel-track');
    const slides = Array.from(track.children);
    const nextButton = carousel.querySelector('.carousel-button--right');
    const prevButton = carousel.querySelector('.carousel-button--left');
    const dotsNav = carousel.querySelector('.carousel-nav');
    const dots = Array.from(dotsNav.children);

    if (slides.length === 0) return;

    let currentSlide = 0;
    let isAutoPlaying = true;
    let autoPlayInterval;

    // Set initial slide positions
    const setSlidePosition = (slide, index) => {
        slide.style.left = `${index * 100}%`;
    };
    slides.forEach(setSlidePosition);

    // Move to target slide
    const moveToSlide = (targetIndex) => {
        // Update slides
        slides[currentSlide].classList.remove('current-slide');
        slides[targetIndex].classList.add('current-slide');

        // Update dots
        dots[currentSlide].classList.remove('current-slide');
        dots[targetIndex].classList.add('current-slide');

        currentSlide = targetIndex;
    };

    // Auto-play functionality
    const startAutoPlay = () => {
        if (slides.length <= 1) return;
        
        autoPlayInterval = setInterval(() => {
            if (isAutoPlaying) {
                const nextIndex = currentSlide === slides.length - 1 ? 0 : currentSlide + 1;
                moveToSlide(nextIndex);
            }
        }, 4000); // Change slide every 4 seconds
    };

    const stopAutoPlay = () => {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    };

    const pauseAutoPlay = () => {
        isAutoPlaying = false;
        setTimeout(() => {
            isAutoPlaying = true;
        }, 10000); // Resume after 10 seconds
    };

    // Navigation button handlers
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            pauseAutoPlay();
            const nextIndex = currentSlide === slides.length - 1 ? 0 : currentSlide + 1;
            moveToSlide(nextIndex);
        });
    }

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            pauseAutoPlay();
            const prevIndex = currentSlide === 0 ? slides.length - 1 : currentSlide - 1;
            moveToSlide(prevIndex);
        });
    }

    // Dot navigation
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            pauseAutoPlay();
            moveToSlide(index);
        });
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!carousel.matches(':hover')) return;
        
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextButton.click();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevButton.click();
        }
    });

    // Touch/swipe support for mobile
    let startX = 0;
    let isDragging = false;

    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        pauseAutoPlay();
    }, { passive: true });

    carousel.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
    }, { passive: false });

    carousel.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;

        const endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;
        const threshold = 50;

        if (Math.abs(diffX) > threshold) {
            if (diffX > 0) {
                // Swipe left - next slide
                nextButton.click();
            } else {
                // Swipe right - previous slide
                prevButton.click();
            }
        }
    }, { passive: true });

    // Pause auto-play on hover
    carousel.addEventListener('mouseenter', () => {
        isAutoPlaying = false;
    });

    carousel.addEventListener('mouseleave', () => {
        isAutoPlaying = true;
    });

    // Start auto-play
    startAutoPlay();

    // Cleanup on page unload
    window.addEventListener('beforeunload', stopAutoPlay);

    // Handle visibility change (pause when tab is not active)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }
    });

    console.log(`✅ Image carousel initialized with ${slides.length} slides`);
}

/**
 * Handle window resize for carousel responsiveness
 */
function handleCarouselResize() {
    const carousel = document.getElementById('imageCarousel');
    if (!carousel) return;

    // Recalculate positions on resize
    const track = carousel.querySelector('.carousel-track');
    const slides = Array.from(track.children);
    
    slides.forEach((slide, index) => {
        slide.style.left = `${index * 100}%`;
    });
}

// Initialize carousel when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeImageCarousel);

// Handle window resize
window.addEventListener('resize', handleCarouselResize);

// Quick Start Checklist functionality
function dismissChecklist() {
    const checklist = document.querySelector('.card.border-info');
    if (checklist) {
        checklist.style.transition = 'opacity 0.3s ease';
        checklist.style.opacity = '0';
        setTimeout(() => {
            checklist.remove();
        }, 300);
        
        // Store dismissal in localStorage
        localStorage.setItem('quickStartDismissed', 'true');
    }
}

// Check if user has previously dismissed the checklist
document.addEventListener('DOMContentLoaded', function() {
    const dismissed = localStorage.getItem('quickStartDismissed');
    if (dismissed === 'true') {
        const checklist = document.querySelector('.card.border-info');
        if (checklist) {
            checklist.style.display = 'none';
        }
    }
    
    // Make checklist items interactive
    const checkboxes = document.querySelectorAll('.list-group-item input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const label = this.nextElementSibling;
            if (this.checked) {
                label.style.opacity = '0.7';
                label.style.textDecoration = 'line-through';
            } else {
                label.style.opacity = '1';
                label.style.textDecoration = 'none';
            }
            
            // Check if all steps are completed
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            if (allChecked) {
                setTimeout(() => {
                    showCompletionMessage();
                }, 500);
            }
        });
    });
});

function showCompletionMessage() {
    const checklist = document.querySelector('.card.border-info .card-body');
    if (checklist) {
        const message = document.createElement('div');
        message.className = 'alert alert-success mt-3';
        message.innerHTML = `
            <i class="bi bi-check-circle"></i>
            <strong>Congratulations!</strong> You've completed all the quick start steps. 
            You're ready to make the most of Old Man Footy!
        `;
        checklist.appendChild(message);
    }
}