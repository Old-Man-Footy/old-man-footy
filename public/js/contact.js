/**
 * Contact Page JavaScript
 * Handles form validation and character counting functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Character counter for message textarea
    const messageTextarea = document.getElementById('message');
    const charCount = document.getElementById('charCount');
    
    if (messageTextarea && charCount) {
        messageTextarea.addEventListener('input', function() {
            const currentLength = this.value.length;
            charCount.textContent = currentLength;
            
            // Change color based on character count
            if (currentLength > 1800) {
                charCount.className = 'text-warning';
            } else if (currentLength > 1900) {
                charCount.className = 'text-danger';
            } else {
                charCount.className = 'text-muted';
            }
        });
    }
    
    // Form validation
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            // Show loading state
            submitButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Sending...';
            submitButton.disabled = true;
            
            // Re-enable button after a delay in case of errors
            setTimeout(() => {
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            }, 10000);
        });
    }
});