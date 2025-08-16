import { describe, it, expect, beforeEach, vi } from 'vitest';
import { errorPageManager } from '../../../public/js/error.js';

describe('error.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="goBackBtn">Back</button>';
    errorPageManager.initialize();
  });

  it('navigates back when history is available', () => {
  // Ensure history length > 1 to trigger back path
  const origLength = window.history.length;
  Object.defineProperty(window.history, 'length', { value: 2, configurable: true });
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const btn = document.getElementById('goBackBtn');
    btn.click();
    expect(backSpy).toHaveBeenCalled();
  // restore
  Object.defineProperty(window.history, 'length', { value: origLength, configurable: true });
  });

  it('falls back to home when no history', () => {
    const origLength = window.history.length;
    Object.defineProperty(window.history, 'length', { value: 0, configurable: true });
    const navSpy = vi.spyOn(errorPageManager, 'safeNavigate').mockImplementation(() => {});
    document.getElementById('goBackBtn').click();
    expect(navSpy).toHaveBeenCalledWith('/');
    Object.defineProperty(window.history, 'length', { value: origLength, configurable: true });
  });
});
