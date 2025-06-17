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
});