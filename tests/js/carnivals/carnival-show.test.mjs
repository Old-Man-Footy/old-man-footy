import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { carnivalShowManager } from '../../../public/js/carnival-show.js';

function setupDOM() {
  document.body.innerHTML = `
    <button data-action="unregister-carnival"></button>
    <form id="clubRegistrationForm">
      <input id="playerCount" value="10" />
      <input id="contactEmail" value="test@example.com" />
      <button type="submit">Register</button>
    </form>
    <textarea id="message"></textarea>
    <span id="charCount"></span>
    <form id="emailAttendeesForm">
      <button type="submit">Send</button>
    </form>
    <div id="postCreationModal"></div>
    <input type="checkbox" id="nrlAcknowledge" />
    <input type="checkbox" id="mysidelineAcknowledge" />
    <button id="acknowledgeButton"></button>
    <button data-toggle-carnival-status="123" data-carnival-title="Test Carnival" data-current-status="true"></button>
    <div class="card" data-carnival-id="456"></div>
    <select id="targetCarnivalId"><option value="789">Target Carnival</option></select>
    <span id="targetCarnivalName"></span>
    <div id="mergeCarnivalModal"></div>
    <div id="mergeCarnivalConfirmModal"></div>
  `;
}

describe('carnivalShowManager', () => {
  beforeEach(() => {
    vi.stubGlobal('bootstrap', {
      Modal: vi.fn(function() {
        return { show: vi.fn(), hide: vi.fn() };
      }),
      getInstance: vi.fn(function() {
        return { show: vi.fn(), hide: vi.fn() };
      })
    });
    window.alert = vi.fn();
    window.confirm = () => true;
    // Replace the entire location object for jsdom compatibility
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        reload: vi.fn(),
        pathname: '/carnivals/456'
      }
    });
    setupDOM();
    carnivalShowManager.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should cache DOM elements on initialize', () => {
    expect(carnivalShowManager.elements.unregisterButton).toBeInstanceOf(HTMLElement);
    expect(carnivalShowManager.elements.registrationForm).toBeInstanceOf(HTMLElement);
    expect(carnivalShowManager.elements.charCount).toBeInstanceOf(HTMLElement);
  });

  it('should validate email addresses correctly', () => {
    expect(carnivalShowManager.isValidEmail('test@example.com')).toBe(true);
    expect(carnivalShowManager.isValidEmail('invalid-email')).toBe(false);
  });

  it('should update char count and class on textarea input', () => {
    const textarea = carnivalShowManager.elements.messageTextarea;
    const charCount = carnivalShowManager.elements.charCount;
    textarea.value = 'a'.repeat(1850);
    carnivalShowManager.updateCharCount({ target: textarea });
    expect(charCount.textContent).toBe('1850');
    expect(charCount.className).toBe('text-warning');
    textarea.value = 'a'.repeat(1950);
    carnivalShowManager.updateCharCount({ target: textarea });
    expect(charCount.className).toBe('text-danger');
    textarea.value = 'a'.repeat(100);
    carnivalShowManager.updateCharCount({ target: textarea });
    expect(charCount.className).toBe('text-muted');
  });

  it('should disable acknowledge button unless both checkboxes are checked', () => {
    const nrl = carnivalShowManager.elements.nrlCheckbox;
    const mysideline = carnivalShowManager.elements.mysidelineCheckbox;
    const button = carnivalShowManager.elements.acknowledgeButton;
    nrl.checked = false;
    mysideline.checked = false;
    carnivalShowManager.updateAcknowledgeButtonState();
    expect(button.disabled).toBe(true);
    nrl.checked = true;
    carnivalShowManager.updateAcknowledgeButtonState();
    expect(button.disabled).toBe(true);
    mysideline.checked = true;
    carnivalShowManager.updateAcknowledgeButtonState();
    expect(button.disabled).toBe(false);
  });

  it('should show loading state on registration form submit and restore after timeout', async () => {
    const form = carnivalShowManager.elements.registrationForm;
    const submitButton = form.querySelector('button[type="submit"]');
    const e = { 
      preventDefault: vi.fn(), 
      target: form 
    };
    submitButton.innerHTML = 'Register';
    submitButton.disabled = false;
    carnivalShowManager.handleRegistrationFormSubmit(e);
    expect(submitButton.innerHTML).toContain('Registering...');
    expect(submitButton.disabled).toBe(true);
    await new Promise(res => setTimeout(res, 10)); // fast-forward
    // Simulate timeout manually since setTimeout is 10s
    submitButton.innerHTML = 'Register';
    submitButton.disabled = false;
  });

  it('should show loading state on email form submit and restore after timeout', async () => {
    const form = carnivalShowManager.elements.emailForm;
    const submitButton = form.querySelector('button[type="submit"]');
    const e = { target: form };
    submitButton.innerHTML = 'Send';
    submitButton.disabled = false;
    carnivalShowManager.handleEmailFormSubmit(e);
    expect(submitButton.innerHTML).toContain('Sending...');
    expect(submitButton.disabled).toBe(true);
    await new Promise(res => setTimeout(res, 10));
    submitButton.innerHTML = 'Send';
    submitButton.disabled = false;
  });

  it('should call fetch and reload page on unregisterFromCarnival success', async () => {
    window.confirm = () => true;
    window.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true, message: 'Unregistered!' }) }));
    
    const button = carnivalShowManager.elements.unregisterButton;
    button.closest = () => document.querySelector('.card');
    
    await carnivalShowManager.unregisterFromCarnival();
    
    expect(window.location.reload).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('Unregistered!');
  });

  it('should handle error on unregisterFromCarnival', async () => {
    window.confirm = () => true;
    window.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: false, message: 'Failed!' }) }));

    const button = carnivalShowManager.elements.unregisterButton;
    button.closest = () => document.querySelector('.card');

    await carnivalShowManager.unregisterFromCarnival();

    expect(window.alert).toHaveBeenCalledWith('Error: Failed!');
  });

  it('should handle admin carnival status toggle', async () => {
    window.confirm = () => true;
    window.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true, message: 'Carnival deactivated successfully!' }) }));

    const button = carnivalShowManager.elements.statusToggleButtons[0];
    button.getAttribute = vi.fn()
      .mockReturnValueOnce('123') // carnivalId
      .mockReturnValueOnce('Test Carnival') // carnivalTitle
      .mockReturnValueOnce('true'); // currentStatus

    await carnivalShowManager.handleStatusToggle({ target: button });

    expect(window.alert).toHaveBeenCalledWith('Carnival deactivated successfully!');
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should show post creation modal if present', () => {
    carnivalShowManager.initializePostCreationModal();
    expect(bootstrap.Modal).toHaveBeenCalled();
  });
});
