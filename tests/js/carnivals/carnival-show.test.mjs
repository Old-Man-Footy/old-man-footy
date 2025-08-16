/**
 * @file carnival-show.test.mjs
 * @description Unit tests for carnivalShowManager (Manager Object Pattern).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { carnivalShowManager } from '../../../public/js/carnival-show.js';

// Helper to set up DOM for each test
function setupDOM() {
  document.body.innerHTML = `
    <button data-action="unregister-carnival"></button>
    <form id="clubRegistrationForm">
      <input id="playerCount" value="10" />
      <input id="contactEmail" value="test@example.com" />
      <button type="submit">Register</button>
    </form>
    <form id="emailAttendeesForm">
      <textarea id="message"></textarea>
      <button type="submit">Send</button>
    </form>
    <span id="charCount"></span>
    <div id="postCreationModal"></div>
    <input type="checkbox" id="nrlAcknowledge" />
    <input type="checkbox" id="mysidelineAcknowledge" />
    <button id="acknowledgeButton"></button>
    <button data-toggle-carnival-status="123" data-carnival-title="Test Carnival" data-current-status="true"></button>
    <select id="targetCarnivalId">
      <option value="">Select</option>
      <option value="2">Carnival 2</option>
    </select>
    <span id="targetCarnivalName"></span>
    <div id="mergeCarnivalModal"></div>
    <div id="mergeCarnivalConfirmModal"></div>
    <div class="card" data-carnival-id="123"></div>
  `;
}

describe('carnivalShowManager', () => {
  beforeEach(() => {
    setupDOM();
    // Ensure a base URL to avoid URL API errors
    if (!window.location.href) {
      window.history.replaceState({}, '', 'http://localhost/');
    }
    carnivalShowManager.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    // Clean bootstrap stub if any
    // eslint-disable-next-line no-undef
    if (globalThis.bootstrap) delete globalThis.bootstrap;
  });

  it('caches DOM elements on initialize', () => {
    expect(carnivalShowManager.elements.unregisterButton).toBeInstanceOf(HTMLElement);
    expect(carnivalShowManager.elements.registrationForm).toBeInstanceOf(HTMLElement);
    expect(carnivalShowManager.elements.charCount).toBeInstanceOf(HTMLElement);
  });

  it('validates email addresses correctly', () => {
    expect(carnivalShowManager.isValidEmail('test@example.com')).toBe(true);
    expect(carnivalShowManager.isValidEmail('invalid-email')).toBe(false);
  });

  it('handles registration submit with invalid player count', () => {
    const form = document.getElementById('clubRegistrationForm');
    const playerCountInput = document.getElementById('playerCount');
    playerCountInput.value = '0';
    const preventDefault = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    carnivalShowManager.handleRegistrationSubmit({ preventDefault, currentTarget: form });
    expect(preventDefault).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Player count must be between 1 and 100.');
  });

  it('handles registration submit with invalid email', () => {
    const form = document.getElementById('clubRegistrationForm');
    const contactEmailInput = document.getElementById('contactEmail');
    contactEmailInput.value = 'bademail';
    const preventDefault = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    carnivalShowManager.handleRegistrationSubmit({ preventDefault, currentTarget: form });
    expect(preventDefault).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Please enter a valid email address.');
  });

  it('updates charCount style and value on message input', () => {
    const textarea = document.getElementById('message');
    const charCount = document.getElementById('charCount');
    textarea.value = 'a'.repeat(1901);
    carnivalShowManager.handleMessageInput({ currentTarget: textarea });
    expect(charCount.textContent).toBe('1901');
    expect(charCount.className).toBe('text-danger');
    textarea.value = 'a'.repeat(1850);
    carnivalShowManager.handleMessageInput({ currentTarget: textarea });
    expect(charCount.className).toBe('text-warning');
    textarea.value = 'a'.repeat(100);
    carnivalShowManager.handleMessageInput({ currentTarget: textarea });
    expect(charCount.className).toBe('text-muted');
  });

  it('sets loading state on email form submit', () => {
    const form = document.getElementById('emailAttendeesForm');
    const submitButton = form.querySelector('button[type="submit"]');
    carnivalShowManager.handleEmailFormSubmit({ currentTarget: form });
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.innerHTML).toContain('Sending...');
  });

  it('exposes acknowledgeAndClose and confirmMerge on window', () => {
    expect(typeof window.acknowledgeAndClose).toBe('function');
    expect(typeof window.confirmMerge).toBe('function');
  });

  it('does not throw if postCreationModal is missing', () => {
    document.getElementById('postCreationModal').remove();
    expect(() => carnivalShowManager.initializePostCreationModal()).not.toThrow();
  });

  it('does not throw if bootstrap is missing', () => {
    const originalBootstrap = globalThis.bootstrap;
    // eslint-disable-next-line no-undef
    globalThis.bootstrap = undefined;
    expect(() => carnivalShowManager.initializePostCreationModal()).not.toThrow();
    // eslint-disable-next-line no-undef
    globalThis.bootstrap = originalBootstrap;
  });

  it('handles unregister click with confirmation and success', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, message: 'Unregistered' })
      })
    ));
    await carnivalShowManager.handleUnregisterClick();
    expect(window.alert).toHaveBeenCalledWith('Unregistered');
  });

  it('handles toggleCarnivalStatus with confirmation and success', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true })
      })
    ));
    await carnivalShowManager.toggleCarnivalStatus('123', 'Test Carnival', 'true');
    expect(window.alert).toHaveBeenCalledWith('Carnival deactivated successfully!');
  });

  it('acknowledgeAndClose hides modal and updates URL', () => {
    const hideSpy = vi.fn();
    // Stub bootstrap
    // eslint-disable-next-line no-undef
    globalThis.bootstrap = {
      Modal: {
        getInstance: () => ({ hide: hideSpy })
      }
    };
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    expect(() => carnivalShowManager.acknowledgeAndClose()).not.toThrow();
    expect(hideSpy).toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalled();
  });

  it('confirmMerge updates target name and shows confirm modal', () => {
    vi.useFakeTimers();
    const select = document.getElementById('targetCarnivalId');
    select.value = '2';
    const targetName = document.getElementById('targetCarnivalName');
    const showSpy = vi.fn();
    const hideSpy = vi.fn();
    // Stub bootstrap constructor and getInstance
    // eslint-disable-next-line no-undef
    globalThis.bootstrap = {
      Modal: function () { return { show: showSpy }; }
    };
    // eslint-disable-next-line no-undef
    globalThis.bootstrap.Modal.getInstance = () => ({ hide: hideSpy });
  expect(() => carnivalShowManager.confirmMerge()).not.toThrow();
  // Advance timers for setTimeout
  vi.runAllTimers();
    expect(targetName.textContent).toBe('Carnival 2');
    expect(hideSpy).toHaveBeenCalled();
    expect(showSpy).toHaveBeenCalled();
  vi.useRealTimers();
  });
});
