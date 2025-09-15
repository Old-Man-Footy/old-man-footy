import { describe, it, expect, beforeEach, vi } from 'vitest';
import { indexPageManager } from '../../../public/js/index.js';

function setupDOM(withImages = true) {
  document.body.innerHTML = `
  <section data-carousel-images='${JSON.stringify(withImages ? [{src:"a.jpg"}] : [])}'></section>
    <form id="subscribeForm">
      <input id="main_form_timestamp" />
      <input type="email" name="email" value="test@example.com" />
      <label><input type="checkbox" class="state-checkbox" value="NSW" checked /> NSW</label>
      <button type="submit">Subscribe</button>
    </form>
  `;
}

describe('index.js', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    setupDOM(true);
    indexPageManager.initialize();
  });

  it('initializes subscription form', () => {
    const form = document.getElementById('subscribeForm');
    const timestampField = document.getElementById('main_form_timestamp');
    expect(form).toBeTruthy();
    expect(timestampField.value).toBeTruthy();
  });

  it('shows message when subscribing without states', async () => {
    // Uncheck the checkbox to trigger validation
    document.querySelector('.state-checkbox').checked = false;
    const form = document.getElementById('subscribeForm');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    const msg = document.querySelector('.subscription-message');
    expect(msg).toBeTruthy();
  });

  it('submits subscription and handles success response', async () => {
    const msgSpy = vi.spyOn(indexPageManager, 'showMessage');
    // Call the handler directly to simulate a successful API response
    indexPageManager.handleSubscriptionResponse({ success: true });
    expect(msgSpy).toHaveBeenCalled();
    const [text, type] = msgSpy.mock.calls.at(-1) || [];
    expect(type).toBe('success');
  });
});
