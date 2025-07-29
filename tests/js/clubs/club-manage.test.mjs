import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { clubManageManager } from '../../../public/js/club-manage.js';

/**
 * @file club-manage.test.js
 * @description Unit tests for clubManageManager (club profile management interface).
 */

// Helper to set up DOM structure for each test
function setupDOM() {
  document.body.innerHTML = `
    <form action="/clubs/manage">
      <input id="clubName" required value="Test Club" />
      <textarea id="description"></textarea>
      <div class="file-upload-area">
        <span class="upload-text">Click or drag to upload club logo</span>
      </div>
      <input type="file" id="logo" />
      <button type="submit">Save</button>
    </form>
  `;
}

describe('clubManageManager', () => {
  beforeEach(() => {
    setupDOM();
    clubManageManager.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should cache all required DOM elements', () => {
    expect(clubManageManager.elements.form).toBeInstanceOf(HTMLFormElement);
    expect(clubManageManager.elements.descriptionTextarea).toBeInstanceOf(HTMLTextAreaElement);
    expect(clubManageManager.elements.fileUploadArea).toBeInstanceOf(HTMLDivElement);
    expect(clubManageManager.elements.fileInput).toBeInstanceOf(HTMLInputElement);
    expect(clubManageManager.elements.uploadText).toBeInstanceOf(HTMLSpanElement);
  });

  it('should validate required fields on form submit', () => {
    const form = clubManageManager.elements.form;
    const clubName = document.getElementById('clubName');
    clubName.value = ''; // Make required field empty

    const preventDefault = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    clubManageManager.handleFormSubmit({ preventDefault, target: form });

    expect(preventDefault).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Please fill in all required fields.');
    expect(clubName.classList.contains('is-invalid')).toBe(true);
  });

  it('should remove is-invalid class when required field is filled', () => {
    const form = clubManageManager.elements.form;
    const clubName = document.getElementById('clubName');
    clubName.value = 'Valid Name';
    clubName.classList.add('is-invalid');

    const preventDefault = vi.fn();
    clubManageManager.handleFormSubmit({ preventDefault, target: form });

    expect(clubName.classList.contains('is-invalid')).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('should auto-resize description textarea on input', () => {
    const textarea = clubManageManager.elements.descriptionTextarea;
    textarea.value = 'Some long description\nwith\nmultiple\nlines';
    const event = new Event('input');
    textarea.dispatchEvent(event);

    expect(parseInt(textarea.style.height)).toBeGreaterThan(0);
  });

  it('should trigger file input click when upload area is clicked', () => {
    const fileInput = clubManageManager.elements.fileInput;
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {});
    clubManageManager.handleUploadAreaClick();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should update upload text and add file-selected class on file input change', () => {
    const fileInput = clubManageManager.elements.fileInput;
    const uploadText = clubManageManager.elements.uploadText;
    const fileUploadArea = clubManageManager.elements.fileUploadArea;

    // Mock file selection
    const file = new File(['dummy'], 'logo.png', { type: 'image/png' });
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: true,
    });

    clubManageManager.handleFileInputChange({ target: fileInput });

    expect(uploadText.textContent).toContain('Selected: logo.png');
    expect(fileUploadArea.classList.contains('file-selected')).toBe(true);
  });

  it('should reset upload text and remove file-selected class if no file selected', () => {
    const fileInput = clubManageManager.elements.fileInput;
    const uploadText = clubManageManager.elements.uploadText;
    const fileUploadArea = clubManageManager.elements.fileUploadArea;

    Object.defineProperty(fileInput, 'files', {
      value: [],
      writable: true,
    });

    clubManageManager.handleFileInputChange({ target: fileInput });

    expect(uploadText.textContent).toBe('Click or drag to upload club logo');
    expect(fileUploadArea.classList.contains('file-selected')).toBe(false);
  });

  it('should prevent default and stop propagation on drag/drop events', () => {
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    clubManageManager.preventDefaults({ preventDefault, stopPropagation });
    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
  });

  it('should add drag-over class on highlight', () => {
    const fileUploadArea = clubManageManager.elements.fileUploadArea;
    clubManageManager.highlight();
    expect(fileUploadArea.classList.contains('drag-over')).toBe(true);
  });

  it('should remove drag-over class on unhighlight', () => {
    const fileUploadArea = clubManageManager.elements.fileUploadArea;
    fileUploadArea.classList.add('drag-over');
    clubManageManager.unhighlight();
    expect(fileUploadArea.classList.contains('drag-over')).toBe(false);
  });

  it('should handle file drop and dispatch change event', () => {
    const fileInput = clubManageManager.elements.fileInput;
    const file = new File(['dummy'], 'logo.png', { type: 'image/png' });
    const changeSpy = vi.spyOn(fileInput, 'dispatchEvent');

    const event = {
      dataTransfer: { files: [file] }
    };
    clubManageManager.handleDrop(event);

    expect(fileInput.files[0]).toBe(file);
    expect(changeSpy).toHaveBeenCalledWith(expect.any(Event));
  });
});