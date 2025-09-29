import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initTheme } from '../../../public/js/theme-init.js';

function resetDOM() {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.className = '';
  document.body.className = '';
  window.__INITIAL_THEME__ = undefined;
}

describe('theme-init.js', () => {
  beforeEach(() => {
    resetDOM();
    // Clear any stored theme
    localStorage.clear();
    // Set module mode to prevent auto-initialization
    window.__THEME_INIT_MODULE_MODE__ = true;
  });

  it('applies dark theme when saved preference is dark', () => {
    localStorage.setItem('oldmanfooty-theme', 'dark');
    initTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.__INITIAL_THEME__).toBe('dark');
  });

  it('applies system dark theme if no saved preference and matchMedia is dark', () => {
    // Mock matchMedia
    const orig = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addListener: vi.fn(), removeListener: vi.fn() });
    initTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.__INITIAL_THEME__).toBe('dark');
    window.matchMedia = orig;
  });

  it('defaults to light when no saved preference and system is not dark', () => {
    const orig = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn() });
    initTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(window.__INITIAL_THEME__).toBe('light');
    window.matchMedia = orig;
  });

  it('adds and later removes theme-loading class and applies theme-applied to body', async () => {
    // Use fake timers before invoking to capture scheduled timeouts
    vi.useFakeTimers();
    initTheme();
    // theme-loading should be set immediately
    expect(document.documentElement.className.includes('theme-loading')).toBe(true);
    // Fast-forward timers for setTimeout(50)
    vi.runAllTimers();
    expect(document.documentElement.className.includes('theme-loading')).toBe(false);
    expect(document.body.classList.contains('theme-applied')).toBe(true);
    // Clean up fake timers
    vi.useRealTimers();
  });
});
