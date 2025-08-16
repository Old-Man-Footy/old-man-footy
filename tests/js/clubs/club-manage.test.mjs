import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { clubManageManager } from '../../../public/js/club-manage.js';

function setupDOM() {
  document.body.innerHTML = `
    <form action="/clubs/manage/123">
      <input name="name" required />
      <textarea id="description"></textarea>
      <div class="file-upload-area">
        <span class="upload-text">Click or drag to upload club logo</span>
      </div>
      <input id="logo" type="file" />
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

  it('validates required fields and prevents submission when empty', () => {
    const form = clubManageManager.elements.form;
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const evt = new Event('submit', { cancelable: true });
    form.dispatchEvent(evt);
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('auto-resizes description textarea on input', () => {
    const ta = clubManageManager.elements.descriptionTextarea;
    // Simulate some content and a scrollHeight
    Object.defineProperty(ta, 'scrollHeight', { value: 200, configurable: true });
    ta.value = 'Some long content';
    ta.dispatchEvent(new Event('input'));
    expect(ta.style.height).toBe('200px');
  });

  it('updates upload UI on file selection', () => {
    const input = clubManageManager.elements.fileInput;
    const uploadText = document.querySelector('.upload-text');

    // Mock a FileList
    const file = new File(['content'], 'logo.png', { type: 'image/png' });
  const fakeFiles = { 0: file, length: 1, item: (i) => (i === 0 ? file : null) };
  Object.defineProperty(input, 'files', { value: fakeFiles, configurable: true });

    input.dispatchEvent(new Event('change'));
    expect(uploadText.textContent).toContain('logo.png');
  });

  it('handles drop to set input files and trigger change', () => {
    const input = clubManageManager.elements.fileInput;
    const uploadText = document.querySelector('.upload-text');
    const changeSpy = vi.spyOn(input, 'dispatchEvent');

    const file = new File(['content'], 'drag.png', { type: 'image/png' });
  const fakeFiles = { 0: file, length: 1, item: (i) => (i === 0 ? file : null) };

    const dropEvent = new Event('drop');
  Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: fakeFiles }, configurable: true });

    clubManageManager.handleDrop(dropEvent);
    expect(changeSpy).toHaveBeenCalled();
  });
});
