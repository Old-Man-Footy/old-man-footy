/**
 * Index Page JavaScript
 * Handles carousel functionality and other interactive features on the homepage
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get carousel images from data attribute
    const carouselContainer = document.querySelector('[data-carousel-images]');
    const carouselImages = carouselContainer ? JSON.parse(carouselContainer.dataset.carouselImages) : [];
    
    // Make carousel images available globally for compatibility
    window.carouselImages = carouselImages;
    
    // Initialize carousel if images exist
    if (carouselImages.length > 0) {
        initializeCarousel();
    }
    
    // Initialize subscription form with bot protection
    initializeSubscriptionForm();
    
    function initializeCarousel() {
        const carousel = document.getElementById('imageCarousel');
        const track = document.querySelector('.carousel-track');
        const slides = Array.from(track.children);
        const nextButton = document.getElementById('carouselNext');
        const prevButton = document.getElementById('carouselPrev');
        const dotsNav = document.querySelector('.carousel-nav');
        const dots = Array.from(dotsNav.children);
        
        let currentSlide = 0;
        const slideWidth = slides[0].getBoundingClientRect().width;
        
        // Arrange slides next to each other
        const setSlidePosition = (slide, index) => {
            slide.style.left = slideWidth * index + 'px';
        };
        slides.forEach(setSlidePosition);
        
        const moveToSlide = (targetIndex) => {
            const targetSlide = slides[targetIndex];
            track.style.transform = 'translateX(-' + targetSlide.style.left + ')';
            
            // Update current slide indicators
            slides.forEach(slide => slide.classList.remove('current-slide'));
            dots.forEach(dot => dot.classList.remove('current-slide'));
            
            targetSlide.classList.add('current-slide');
            dots[targetIndex].classList.add('current-slide');
            
            currentSlide = targetIndex;
        };
        
        // Next button
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                const nextIndex = currentSlide === slides.length - 1 ? 0 : currentSlide + 1;
                moveToSlide(nextIndex);
            });
        }
        
        // Previous button
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                const prevIndex = currentSlide === 0 ? slides.length - 1 : currentSlide - 1;
                moveToSlide(prevIndex);
            });
        }
        
        // Dot navigation
        dotsNav.addEventListener('click', (e) => {
            const targetDot = e.target.closest('.carousel-indicator');
            if (!targetDot) return;
            
            const targetIndex = parseInt(targetDot.dataset.slide);
            moveToSlide(targetIndex);
        });
        
        // Auto-advance carousel
        setInterval(() => {
            const nextIndex = currentSlide === slides.length - 1 ? 0 : currentSlide + 1;
            moveToSlide(nextIndex);
        }, 5000); // Change slide every 5 seconds
    }
    
    /**
     * Initialize subscription form with bot protection
     */
    function initializeSubscriptionForm() {
        const form = document.getElementById('subscribeForm');
        const timestampField = document.getElementById('main_form_timestamp');
        
        // Set timestamp when form loads (bot protection)
        if (timestampField) {
            timestampField.value = Date.now();
        }
        
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const formData = new FormData(form);
                const email = formData.get('email');
                const states = formData.getAll('state');
                const submitButton = form.querySelector('button[type="submit"]');
                
                // Basic validation
                if (!email) {
                    showMessage('Please enter your email address.', 'error');
                    return;
                }
                
                if (!states || states.length === 0) {
                    showMessage('Please select at least one state.', 'error');
                    return;
                }
                
                // Show loading state
                const originalText = submitButton.innerHTML;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Subscribing...';
                submitButton.disabled = true;
                
                // Submit form
                fetch('/subscribe', {
                    method: 'POST',
                    body: formData
                })
                .then(response => {
                    console.log('Response received:', response.status, response.statusText);
                    console.log('Content-Type:', response.headers.get('content-type'));
                    
                    // Check if the response is actually JSON
                    const contentType = response.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        console.error('Expected JSON but received:', contentType);
                        throw new Error(`Expected JSON response but received ${contentType || 'unknown content type'}`);
                    }
                    
                    return response.json();
                })
                .then(data => {
                    console.log('Response data:', data);
                    if (data.success) {
                        showMessage('Thanks! You\'ll receive carnival notifications for the selected states.', 'success');
                        form.reset();
                        // Reset timestamp for potential retry
                        if (timestampField) {
                            timestampField.value = Date.now();
                        }
                    } else {
                        showMessage(data.message || 'Something went wrong. Please try again.', 'error');
                    }
                })
                .catch(error => {
                    console.error('Subscription error:', error);
                    showMessage('An unexpected error occurred. Please try again.', 'error');
                })
                .finally(() => {
                    // Restore button
                    submitButton.innerHTML = originalText;
                    submitButton.disabled = false;
                });
            });
        }
    }
    
    /**
     * Show a temporary message to the user
     */
    function showMessage(message, type = 'info') {
        // Remove any existing messages
        const existingMessage = document.querySelector('.subscription-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create new message element
        const messageEl = document.createElement('div');
        messageEl.className = `subscription-message alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} mt-3`;
        messageEl.textContent = message;
        messageEl.style.cssText = 'animation: slideInFromTop 0.3s ease-out;';
        
        // Insert after the form
        const form = document.getElementById('subscribeForm');
        if (form) {
            form.parentNode.insertBefore(messageEl, form.nextSibling);
        }
        
        // Remove message after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.style.animation = 'slideOutToTop 0.3s ease-in';
                setTimeout(() => {
                    if (messageEl.parentNode) {
                        messageEl.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInFromTop {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideOutToTop {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(-20px); opacity: 0; }
    }
`;
document.head.appendChild(style);