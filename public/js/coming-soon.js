/**
 * Coming Soon Page JavaScript
 * Handles client-side functionality for the coming soon page
 * Follows project guidelines by keeping logic in external JS files
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Coming Soon page loaded');
    
    // Update current time display
    updateCurrentTime();
    
    // Set up auto-refresh functionality to check if coming soon mode is disabled
    setupAutoRefresh();
    
    // Set up email subscription form enhancement
    setupEmailSubscription();
    
    // Set up launch status check button
    setupLaunchStatusCheck();
});

/**
 * Update the current time display
 */
function updateCurrentTime() {
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        const now = new Date();
        const timeString = now.toLocaleString('en-AU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: process.env.TZ || 'Australia/Sydney'
        });
        timeElement.textContent = timeString;
    }
}

/**
 * Set up auto-refresh functionality to check if coming soon mode is disabled
 */
function setupAutoRefresh() {
    // Check coming soon status every 60 seconds
    setInterval(async function() {
        try {
            const response = await fetch('/api/coming-soon/status');
            const data = await response.json();
            
            // If coming soon mode is disabled, redirect to home page
            if (!data.comingSoonMode) {
                console.log('Coming soon mode disabled, redirecting...');
                showLaunchAnimation();
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            }
        } catch (error) {
            console.log('Error checking coming soon status:', error);
        }
        
        // Update timestamp
        updateCurrentTime();
    }, 60000); // 60 seconds
}

/**
 * Set up email subscription form enhancement
 */
function setupEmailSubscription() {
    const form = document.querySelector('.subscription-form');
    const submitBtn = form?.querySelector('button[type="submit"]');
    const timestampField = document.getElementById('form_timestamp');
    
    console.log('Setting up email subscription...');
    console.log('Form found:', !!form);
    console.log('Submit button found:', !!submitBtn);
    console.log('Timestamp field found:', !!timestampField);
    
    // Set timestamp when form loads (bot protection)
    if (timestampField) {
        timestampField.value = Date.now();
        console.log('Timestamp set:', timestampField.value);
    }
    
    if (form && submitBtn) {
        console.log('Adding event listener to form');
        form.addEventListener('submit', function(e) {
            console.log('Form submitted!');
            e.preventDefault();
            
            const emailInput = form.querySelector('input[type="email"]');
            const email = emailInput.value.trim();
            
            console.log('Email value:', email);
            
            if (!email) {
                showMessage('Please enter your email address.', 'error');
                return;
            }
            
            // Disable button and show loading state
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Subscribing...';
            submitBtn.disabled = true;
            
            // Prepare form data as URLSearchParams instead of FormData for better Express compatibility
            const formData = new URLSearchParams();
            formData.append('email', email);
            formData.append('website', form.querySelector('input[name="website"]').value);
            formData.append('form_timestamp', timestampField.value);
            
            console.log('URLSearchParams entries:');
            for (let [key, value] of formData.entries()) {
                console.log(key, value);
            }
            
            // Submit the form
            console.log('Sending fetch request to /subscribe');
            fetch('/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body: formData
            })
            .then(response => {
                console.log('Response received:', response.status, response.statusText);
                console.log('Response headers:', response.headers);
                console.log('Content-Type:', response.headers.get('content-type'));
                
                // Check if the response is actually JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    console.error('Expected JSON but received:', contentType);
                    throw new Error(`Expected JSON response but received ${contentType}`);
                }
                
                return response.json();
            })
            .then(data => {
                console.log('Response data:', data);
                if (data.success) {
                    showMessage('🎉 Thanks! We\'ll notify you when we launch. No spam, guaranteed!', 'success');
                    emailInput.value = '';
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
                // Re-enable button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
        });
    } else {
        console.error('Form or submit button not found');
        if (!form) console.error('Form with class .subscription-form not found');
        if (!submitBtn) console.error('Submit button not found in form');
    }
}

/**
 * Set up launch status check button
 */
function setupLaunchStatusCheck() {
    window.checkLaunchStatus = async function() {
        const button = document.querySelector('.refresh-button');
        if (button) {
            const originalText = button.textContent;
            button.textContent = 'Checking...';
            button.disabled = true;
            
            try {
                const response = await fetch('/api/coming-soon/status');
                const data = await response.json();
                
                if (!data.comingSoonMode) {
                    showMessage('🎉 We\'re live! Redirecting...', 'success');
                    showLaunchAnimation();
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                } else {
                    showMessage('Still coming soon! We\'ll be with you shortly.', 'info');
                }
            } catch (error) {
                console.error('Error checking launch status:', error);
                showMessage('Unable to check status. Please try again later.', 'error');
            } finally {
                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 1000);
            }
        }
    };
}

/**
 * Show a temporary message to the user
 */
function showMessage(message, type = 'info') {
    // Remove any existing messages
    const existingMessage = document.querySelector('.temp-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new message element
    const messageEl = document.createElement('div');
    messageEl.className = `temp-message alert-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        font-weight: 500;
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
        animation: slideInFromTop 0.3s ease-out;
    `;
    
    document.body.appendChild(messageEl);
    
    // Remove message after 4 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.style.animation = 'slideOutToTop 0.3s ease-in';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 300);
        }
    }, 4000);
}

/**
 * Show launch animation when site goes live
 */
function showLaunchAnimation() {
    // Create launch animation overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #0d6efd 0%, #6c757d 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.5s ease-out;
    `;
    
    overlay.innerHTML = `
        <div style="text-align: center; color: white;">
            <div style="font-size: 4rem; animation: bounce 1s infinite;">🚀</div>
            <h2 style="margin: 1rem 0; font-size: 2.5rem; font-weight: bold;">We're Live!</h2>
            <p style="font-size: 1.2rem; opacity: 0.9;">Welcome to Old Man Footy</p>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add bounce animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-20px); }
            60% { transform: translateY(-10px); }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideInFromTop {
            from { transform: translate(-50%, -100%); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes slideOutToTop {
            from { transform: translate(-50%, 0); opacity: 1; }
            to { transform: translate(-50%, -100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}