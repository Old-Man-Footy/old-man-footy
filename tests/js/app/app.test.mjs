import { describe, it, beforeEach, vi, expect } from 'vitest';
import { themeManager, oldmanfooty, initializeImageCarousel } from '../../../public/js/app.js';

// Mocks for DOM APIs
function setupDOM() {
  document.body.innerHTML = `
    <button id="themeToggle"><span id="themeIcon"></span></button>
    <div id="toast-container"></div>
    <form class="needs-validation"></form>
    <div class="file-upload-area">
      <input type="file" />
      <div class="upload-preview"></div>
      <div class="upload-text"></div>
    </div>
    <textarea></textarea>
    <input type="search" name="search" />
    <select name="state"><option value="1">One</option></select>
    <input type="checkbox" name="upcoming" />
    <div class="alert-dismissible alert-success"><button class="btn-close"></button></div>
    <div id="imageCarousel">
      <div class="carousel-track">
        <div class="slide current-slide"></div>
        <div class="slide"></div>
      </div>
      <button class="carousel-button--right"></button>
      <button class="carousel-button--left"></button>
      <div class="carousel-nav">
        <button class="dot current-slide"></button>
        <button class="dot"></button>
      </div>
    </div>
  `;
  // Mock Bootstrap
  window.bootstrap = {
    Toast: vi.fn().mockImplementation(() => ({ show: vi.fn() })),
    Tooltip: vi.fn()
  };
  // Mock matchMedia
  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: query === '(prefers-color-scheme: dark)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }));
  // Mock __INITIAL_THEME__
  window.__INITIAL_THEME__ = undefined;
  // Mock localStorage
  localStorage.clear();
}

describe('Theme Manager', () => {
  beforeEach(() => {
    setupDOM();
    themeManager.init();
  });

  it('should initialize with system theme if no saved theme', () => {
    expect(['light', 'dark']).toContain(themeManager.getCurrentTheme());
  });

  it('should toggle theme and update icon/title', () => {
    const icon = document.getElementById('themeIcon');
    themeManager.applyTheme('light');
    themeManager.toggleTheme();
    expect(themeManager.getCurrentTheme()).toBe('dark');
    expect(icon.className).toBe('bi bi-moon-fill');
    expect(icon.parentElement.title).toBe('Switch to light mode');
  });

  it('should save theme to localStorage', () => {
    themeManager.applyTheme('dark');
    expect(localStorage.getItem('oldmanfooty-theme')).toBe('dark');
  });

  it('should dispatch themeChanged event', () => {
    const handler = vi.fn();
    window.addEventListener('themeChanged', handler);
    themeManager.applyTheme('dark');
    expect(handler).toHaveBeenCalled();
  });
});

describe('OldManFooty App', () => {
  beforeEach(() => {
    setupDOM();
    oldmanfooty.initFormValidation();
    oldmanfooty.initFileUploads();
    oldmanfooty.initTextareas();
    oldmanfooty.initSearchFilters();
    oldmanfooty.initFlashMessageAutoDismiss(100);
    oldmanfooty.initTooltips();
  });

  it('should confirm delete with default message', () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    expect(oldmanfooty.confirmDelete()).toBe(true);
  });

  it('should add was-validated class on invalid form submit', () => {
    const form = document.querySelector('.needs-validation');
    form.checkValidity = vi.fn(() => false);
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(form.classList.contains('was-validated')).toBe(true);
  });

  it('should preview image file upload', async () => {
    const input = document.querySelector('input[type="file"]');
    const preview = document.querySelector('.upload-preview');
    const file = new File(['dummy'], 'test.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [file] });
    const event = new Event('change');
    input.dispatchEvent(event);
    await new Promise(r => setTimeout(r, 10));
    expect(preview.innerHTML).toContain('img');
  });

  it('should auto-expand textarea on input', () => {
    const textarea = document.querySelector('textarea');
    textarea.value = 'Hello\nWorld';
    const event = new Event('input');
    textarea.dispatchEvent(event);
    expect(textarea.style.height).not.toBe('');
  });

  it('should auto-submit search form after debounce', async () => {
    const input = document.querySelector('input[type="search"]');
    // Create a real form and append input
    const form = document.createElement('form');
    form.appendChild(input);
    document.body.appendChild(form);
    const submitSpy = vi.spyOn(form, 'submit');
    input.value = 'test';
    const event = new Event('input');
    input.dispatchEvent(event);
    await new Promise(r => setTimeout(r, 900));
    expect(submitSpy).toHaveBeenCalled();
  });

  it('should auto-dismiss flash messages', async () => {
    const alert = document.querySelector('.alert-dismissible');
    const closeButton = alert.querySelector('.btn-close');
    closeButton.addEventListener('click', () => {
      alert.remove();
    });
    // Wait longer to ensure auto-dismiss
    await new Promise(r => setTimeout(r, 350));
    expect(alert.style.opacity === '0' || !alert.parentNode).toBe(true);
  });

  it('should initialize tooltips', () => {
    // Add an element with data-bs-toggle="tooltip" to the DOM
    document.body.innerHTML += '<button data-bs-toggle="tooltip" title="tip"></button>';
    oldmanfooty.initTooltips();
    expect(window.bootstrap.Tooltip).toHaveBeenCalled();
  });

  it('should show toast notification', () => {
    oldmanfooty.showToast('Test', 'success');
    const toast = document.querySelector('.toast');
    expect(toast).not.toBeNull();
    expect(toast.className).toContain('bg-success');
  });
});

describe('Image Carousel', () => {
  beforeEach(() => {
    setupDOM();
    vi.useFakeTimers();
    initializeImageCarousel();
  });

  it('should move to next slide on next button click', () => {
    const nextButton = document.querySelector('.carousel-button--right');
    const slides = document.querySelectorAll('.carousel-track .slide');
    nextButton.click();
    expect(slides[1].classList.contains('current-slide')).toBe(true);
  });

  it('should move to previous slide on prev button click', () => {
    const prevButton = document.querySelector('.carousel-button--left');
    const slides = document.querySelectorAll('.carousel-track .slide');
    prevButton.click();
    expect(slides[1].classList.contains('current-slide')).toBe(true);
  });

  it('should auto-play slides', () => {
    const slides = document.querySelectorAll('.carousel-track .slide');
    vi.advanceTimersByTime(4000);
    expect(slides[1].classList.contains('current-slide')).toBe(true);
  });
});