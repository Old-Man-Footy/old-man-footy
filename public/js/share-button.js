import { showAlert } from './utils/ui-helpers.js';

/**
 * Share Button Manager (Manager Object Pattern)
 * Handles sharing functionality for any page using the share button partial
 */
export const shareButtonManager = {
    /** Cached DOM elements */
    elements: {},

    /** Initialize module */
    initialize() {
        this.cacheElements();
        this.bindEvents();
    },

    /** Cache all required DOM elements */
    cacheElements() {
        this.elements.shareButtons = document.querySelectorAll('[data-share-platform]');
        this.elements.shareContainers = document.querySelectorAll('.share-button-container');
    },

    /** Bind DOM events */
    bindEvents() {
        // Bind click events to all share platform links
        this.elements.shareButtons.forEach(button => {
            button.addEventListener('click', this.handleShareClick);
        });
    },

    /**
     * Handle share button click
     * @param {Event} e - Click event
     */
    handleShareClick: (e) => {
        e.preventDefault();
        
        const button = e.currentTarget;
        const platform = button.getAttribute('data-share-platform');
        const container = button.closest('.share-button-container');
        
        if (!container) {
            console.error('Share button container not found');
            return;
        }
        
        // Get data from container
        const title = container.getAttribute('data-share-title') || 'Check this out';
        const description = container.getAttribute('data-share-description') || '';
        const customUrl = container.getAttribute('data-share-url');
        
        // Use custom URL if provided, otherwise use current page URL
        const url = customUrl || window.location.href;
        console.log('Sharing URL:', url); 
        
        // Construct share text
        const shareText = description ? `${title} - ${description}` : title;
        
        // Share to the selected platform
        shareButtonManager.shareToPlatform(platform, url, shareText, title);
    },

    /**
     * Share to a specific platform
     * @param {string} platform - The platform to share to
     * @param {string} url - The URL to share
     * @param {string} shareText - The text to share
     * @param {string} title - The title for email subject
     */
    shareToPlatform(platform, url, shareText, title) {
        switch(platform) {
            case 'facebook':
                window.open(
                    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
                    '_blank',
                    'width=600,height=400'
                );
                break;
                
            case 'twitter':
                window.open(
                    `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`,
                    '_blank',
                    'width=600,height=400,noopener,noreferrer'
                );
                break;
                
            case 'whatsapp':
                window.open(
                    `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`,
                    '_blank',
                    'width=600,height=400'
                );
                break;
                
            case 'email':
                const emailSubject = encodeURIComponent(title);
                const emailBody = encodeURIComponent(`${shareText}\n\n${url}`);
                window.location.href = `mailto:?subject=${emailSubject}&body=${emailBody}`;
                break;
                
            case 'copy':
                this.copyToClipboard(url);
                break;
                
            default:
                console.error('Unknown sharing platform:', platform);
                showAlert('Unknown sharing platform', 'danger');
        }
    },

    /**
     * Copy URL to clipboard with fallback support
     * @param {string} url - The URL to copy
     */
    copyToClipboard(url) {
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url)
                .then(() => {
                    showAlert('Link copied to clipboard!', 'success');
                })
                .catch(() => {
                    // Fallback to legacy method
                    this.copyToClipboardFallback(url);
                });
        } else {
            // Use fallback method for older browsers
            this.copyToClipboardFallback(url);
        }
    },

    /**
     * Fallback method to copy text to clipboard for older browsers
     * @param {string} text - The text to copy
     */
    copyToClipboardFallback(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showAlert('Link copied to clipboard!', 'success');
            } else {
                showAlert('Failed to copy link. Please copy manually: ' + text, 'warning');
            }
        } catch (err) {
            showAlert('Failed to copy link. Please copy manually: ' + text, 'warning');
        }
        
        document.body.removeChild(textArea);
    }
};

// Bootstrap the manager
document.addEventListener('DOMContentLoaded', () => {
    shareButtonManager.initialize();
});
