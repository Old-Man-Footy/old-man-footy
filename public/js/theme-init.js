/**
 * Critical Theme Initialization Script
 * 
 * This script MUST run immediately when loaded to prevent theme flash.
 * It applies the user's preferred theme before any content renders.
 * 
 * @fileoverview Handles theme detection, application, and flash prevention
 * @author Old Man Footy Development Team
 * @since 1.0.0
 */

/**
 * Initializes the theme immediately to prevent flash of unstyled content.
 * @returns {void}
 */
export function initTheme() {
    'use strict';

    /**
     * Apply theme-loading class immediately to prevent flash of unstyled content
     */
    document.documentElement.className = 'theme-loading';

    /**
     * Check localStorage for saved theme preference
     * @type {string|null}
     */
    const savedTheme = localStorage.getItem('oldmanfooty-theme');

    /**
     * Determine the appropriate theme to apply
     * Priority: saved preference > system preference > default light
     * @type {string}
     */
    let theme = 'light';

    if (savedTheme === 'dark' || savedTheme === 'light') {
        theme = savedTheme;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        theme = 'dark';
    }

    /**
     * Apply theme immediately to prevent flash
     */
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    /**
     * Store the theme for the main app to pick up later
     * This allows other scripts to access the initial theme without re-checking
     */
    window.__INITIAL_THEME__ = theme;

    /**
     * Remove loading class and show content with proper theme applied
     */
    function showContent() {
        try {
            if (typeof document === 'undefined') return;
            if (document.documentElement) {
                document.documentElement.classList.remove('theme-loading');
            }
            if (document.body) {
                document.body.classList.add('theme-applied');
            }
        } catch (_) {
            // Ignore if environment (e.g., jsdom) has been torn down
        }
    }

    /**
     * Show content after DOM is ready but before full load
     * Uses a small delay to ensure CSS is fully applied
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // Small delay to ensure CSS is applied
            const id = setTimeout(showContent, 50);
            // Best-effort cleanup if needed
            try { window.addEventListener && window.addEventListener('beforeunload', () => clearTimeout(id)); } catch {}
        });
    } else {
        // Document is already loaded
        const id = setTimeout(showContent, 50);
        try { window.addEventListener && window.addEventListener('beforeunload', () => clearTimeout(id)); } catch {}
    }
}

// Optionally, auto-run if this script is loaded directly in the browser
if (typeof window !== 'undefined') {
    initTheme();
}