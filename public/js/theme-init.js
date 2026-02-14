/**
 * Critical theme initialization script
 * This runs immediately (not as a module) to prevent theme flashing
 */

/**
 * Initialize theme based on saved preference or system preference
 * @returns {string} The applied theme ('light' or 'dark')
 */
function initTheme() {
    'use strict';
    const root = document.documentElement;
    
    // Check if theme was already initialized inline
    let theme = window.__INITIAL_THEME__;
    
    if (!theme) {
        // Fallback: Apply theme-loading class immediately to prevent flash
        root.classList.add('theme-loading');
        
        // Check localStorage for saved theme preference
        const savedTheme = localStorage.getItem('oldmanfooty-theme');
        
        // Determine theme: saved preference > system preference > default light
        theme = 'light';
        
        if (savedTheme === 'dark' || savedTheme === 'light') {
            theme = savedTheme;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            theme = 'dark';
        }
        
        // Apply theme immediately to prevent flash
        if (theme === 'dark') {
            root.setAttribute('data-theme', 'dark');
            root.setAttribute('data-bs-theme', 'dark');
            root.style.colorScheme = 'dark';
            root.style.backgroundColor = '#1a1a1a';
        } else {
            root.removeAttribute('data-bs-theme');
            root.removeAttribute('data-theme');
            root.style.colorScheme = 'light';
            root.style.backgroundColor = '#f5f5f5';
        }
        
        // Store theme for main app to use later
        window.__INITIAL_THEME__ = theme;
    }
    
    // Remove loading class after DOM content is loaded
    function showContent() {
        try {
            root.classList.remove('theme-loading');
            root.style.removeProperty('background-color');
            if (document.body) {
                document.body.classList.add('theme-applied');
            }
        } catch (_) {
            // Ignore errors if environment has been torn down
        }
    }
    
    // Show content when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showContent);
    } else {
        // Use setTimeout to avoid synchronous execution during tests
        setTimeout(showContent, 50);
    }
    
    return theme;
}

if (typeof window !== 'undefined') {
    window.initTheme = initTheme;
}

// Auto-initialize when this file is loaded directly (not as a module)
// This maintains backward compatibility for non-module usage
if (typeof window !== 'undefined' && !window.__THEME_INIT_MODULE_MODE__) {
    try {
        if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
            initTheme();
        }
    } catch (_) {
        // Ignore initialization errors in constrained/test environments
    }
}
