// Old Man Footy Application JavaScript

/**
 * Theme Management System
 * Handles dark/light mode toggle with localStorage persistence
 */
const themeManager = {
    // Theme constants
    THEMES: {
        LIGHT: 'light',
        DARK: 'dark'
    },
    
    STORAGE_KEY: 'oldmanfooty-theme',
    
    // Current theme state
    currentTheme: 'light',
    
    /**
     * Initialize theme system
     */
    init: function() {
        // Use the theme that was already applied by the inline script
        if (window.__INITIAL_THEME__) {
            this.currentTheme = window.__INITIAL_THEME__;
            console.log(`🎨 Using initial theme: ${this.currentTheme}`);
        } else {
            // Fallback to the old method if inline script didn't run
            this.loadSavedTheme();
        }
        
        this.setupToggleButton();
        this.updateThemeIcon();
        this.setupSystemThemeListener();
        console.log('✅ Theme manager initialized');
    },
    
    /**
     * Load theme from localStorage or detect system preference
     * (Fallback method - normally handled by inline script)
     */
    loadSavedTheme: function() {
        // Check localStorage first
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);
        
        if (savedTheme && Object.values(this.THEMES).includes(savedTheme)) {
            this.currentTheme = savedTheme;
        } else {
            // Fallback to system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.currentTheme = this.THEMES.DARK;
            } else {
                this.currentTheme = this.THEMES.LIGHT;
            }
        }
        
        this.applyTheme(this.currentTheme);
        console.log(`🎨 Loaded theme: ${this.currentTheme}`);
    },
    
    /**
     * Apply theme to document
     */
    applyTheme: function(theme) {
        const html = document.documentElement;
        
        if (theme === this.THEMES.DARK) {
            html.setAttribute('data-theme', 'dark');
            html.setAttribute('data-bs-theme', 'dark');
        } else {
            html.removeAttribute('data-theme');
            html.removeAttribute('data-bs-theme');
        }
        
        this.currentTheme = theme;
        this.updateThemeIcon();
        
        // Save to localStorage
        localStorage.setItem(this.STORAGE_KEY, theme);
        
        // Dispatch custom carnival for other components
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme: theme } 
        }));
    },
    
    /**
     * Toggle between light and dark themes
     */
    toggleTheme: function() {
        const newTheme = this.currentTheme === this.THEMES.LIGHT 
            ? this.THEMES.DARK 
            : this.THEMES.LIGHT;
            
        this.applyTheme(newTheme);
        
        // Add visual feedback
        this.showToggleFeedback();
        
        console.log(`🔄 Theme toggled to: ${newTheme}`);
    },
    
    /**
     * Update the theme toggle button icon
     */
    updateThemeIcon: function() {
        const themeIcon = document.getElementById('themeIcon');
        if (!themeIcon) return;
        
        // Remove existing classes
        themeIcon.className = '';
        
        if (this.currentTheme === this.THEMES.DARK) {
            // Show moon icon for dark mode (current active state)
            themeIcon.className = 'bi bi-moon-fill';
            themeIcon.parentElement.title = 'Switch to light mode';
        } else {
            // Show sun icon for light mode (current active state)
            themeIcon.className = 'bi bi-sun-fill';
            themeIcon.parentElement.title = 'Switch to dark mode';
        }
    },
    
    /**
     * Setup theme toggle button carnival listener
     */
    setupToggleButton: function() {
        const toggleButton = document.getElementById('themeToggle');
        if (!toggleButton) {
            console.warn('⚠️ Theme toggle button not found');
            return;
        }
        
        toggleButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleTheme();
        });
        
        // Add keyboard support
        toggleButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
        
        console.log('🎯 Theme toggle button setup complete');
    },
    
    /**
     * Show visual feedback when theme is toggled
     */
    showToggleFeedback: function() {
        const toggleButton = document.getElementById('themeToggle');
        if (!toggleButton) return;
        
        // Add animation class
        toggleButton.style.transform = 'scale(1.2)';
        
        setTimeout(() => {
            toggleButton.style.transform = '';
        }, 150);
        
        // Optional: Show toast notification
        if (window.oldmanfooty && window.oldmanfooty.showToast) {
            const themeName = this.currentTheme === this.THEMES.DARK ? 'Dark' : 'Light';
            window.oldmanfooty.showToast(`${themeName} mode activated`, 'success');
        }
    },
    
    /**
     * Listen for system theme changes
     */
    setupSystemThemeListener: function() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            mediaQuery.addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                const hasManualPreference = localStorage.getItem(this.STORAGE_KEY);
                
                if (!hasManualPreference) {
                    const systemTheme = e.matches ? this.THEMES.DARK : this.THEMES.LIGHT;
                    this.applyTheme(systemTheme);
                    console.log(`🔄 System theme changed to: ${systemTheme}`);
                }
            });
        }
    },
    
    /**
     * Get current theme
     */
    getCurrentTheme: function() {
        return this.currentTheme;
    },
    
    /**
     * Check if dark mode is active
     */
    isDarkMode: function() {
        return this.currentTheme === this.THEMES.DARK;
    }
};

window.themeManager = themeManager;

const oldmanfooty = {
    // Confirmation dialogs
    confirmDelete: function(message) {
        return confirm(message || 'Are you sure you want to delete this item?');
    },

    // Form validation enhancement
    initFormValidation: function() {
        // Bootstrap validation
        const forms = document.querySelectorAll('.needs-validation');
        Array.prototype.slice.call(forms).forEach(function(form) {
            form.addEventListener('submit', function(carnival) {
                if (!form.checkValidity()) {
                    carnival.preventDefault();
                    carnival.stopPropagation();
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
                    const carnival = new Carnival('change', { bubbles: true });
                    input.dispatchEvent(carnival);
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

        // State filter auto-submit (only for search/filter forms, not data entry forms)
        const stateSelects = document.querySelectorAll('select[name="state"]');
        stateSelects.forEach(select => {
            select.addEventListener('change', function() {
                if (this.form) {
                    // Only auto-submit if this is a search/filter form, not a data entry form
                    const isSearchForm = this.form.method.toLowerCase() === 'get' || 
                                        this.form.classList.contains('search-form') ||
                                        this.form.classList.contains('filter-form') ||
                                        this.form.querySelector('input[name="search"]') ||
                                        this.form.querySelector('input[type="search"]');
                    
                    // Don't auto-submit if this is clearly a data entry form
                    const isDataEntryForm = this.form.method.toLowerCase() === 'post' &&
                                          (this.form.action.includes('/new') || 
                                           this.form.action.includes('/edit') ||
                                           this.form.action.includes('/manage') ||
                                           this.form.classList.contains('needs-validation') ||
                                           this.form.querySelector('input[type="file"]') ||
                                           this.form.querySelector('textarea'));
                    
                    if (isSearchForm && !isDataEntryForm) {
                        this.form.submit();
                    }
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
        toast.className = `toast align-items-center bg-${type} border-0`;
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

    /**
     * Auto-dismiss flash messages after a specified timeout
     * @param {number} timeout - Timeout in milliseconds (default: 5000ms = 5 seconds)
     */
    initFlashMessageAutoDismiss: function(timeout = 5000) {
        // Find all alert elements that should auto-dismiss
        const alerts = document.querySelectorAll('.alert-dismissible');
        
        alerts.forEach(alert => {
            // Only auto-dismiss if it's a flash message (has success/error content)
            const isFlashMessage = alert.classList.contains('alert-success') || 
                                   alert.classList.contains('alert-danger') ||
                                   alert.classList.contains('alert-warning') ||
                                   alert.classList.contains('alert-info');
            
            if (isFlashMessage) {
                // Set up auto-dismiss timer
                const timer = setTimeout(() => {
                    // Use Bootstrap's dismissal method
                    const closeButton = alert.querySelector('.btn-close');
                    if (closeButton) {
                        closeButton.click();
                    } else {
                        // Fallback: fade out manually
                        alert.style.transition = 'opacity 0.3s ease';
                        alert.style.opacity = '0';
                        setTimeout(() => {
                            if (alert.parentNode) {
                                alert.remove();
                            }
                        }, 300);
                    }
                }, timeout);
                
                // Store timer reference on the element
                alert._autoDismissTimer = timer;
                
                // Clear timer if user manually dismisses
                const closeButton = alert.querySelector('.btn-close');
                if (closeButton) {
                    closeButton.addEventListener('click', () => {
                        clearTimeout(timer);
                    });
                }
                
                // Pause timer on hover (user might be reading)
                alert.addEventListener('mouseenter', () => {
                    clearTimeout(alert._autoDismissTimer);
                });
                
                // Resume timer when mouse leaves (with remaining time)
                alert.addEventListener('mouseleave', () => {
                    alert._autoDismissTimer = setTimeout(() => {
                        const closeButton = alert.querySelector('.btn-close');
                        if (closeButton) {
                            closeButton.click();
                        }
                    }, 2000); // Give 2 more seconds after mouse leaves
                });
            }
        });
        
        console.log(`✅ Auto-dismiss initialized for ${alerts.length} flash messages`);
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
        const run = () => {
            this.initFormValidation();
            this.initFileUploads();
            this.initTextareas();
            this.initSearchFilters();
            this.initTooltips(); // Add tooltip initialization
            this.initFlashMessageAutoDismiss(); // Add auto-dismiss for flash messages

            // Initialize theme manager
            if (window.themeManager) {
                window.themeManager.init();
                window.themeManager.setupSystemThemeListener();
            }

            if (this.utils) {
                console.log('Old Man Footy app initialized');
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run, { once: true });
        } else {
            run();
        }
    }
};

window.oldmanfooty = oldmanfooty;

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

export {
    themeManager,
    oldmanfooty,
    dismissChecklist,
    showCompletionMessage,
    handleCarouselResize,
    initializeImageCarousel
};

// Initialize all app features when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  oldmanfooty.init();
});