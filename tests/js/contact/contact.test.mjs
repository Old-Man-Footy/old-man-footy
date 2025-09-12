import { describe, it, expect, beforeEach, vi } from 'vitest';
import { contactManager } from '../../../public/js/contact.js';

function setupDOM() {
  document.body.innerHTML = `
    <form id="contactForm">
      <textarea id="message"></textarea>
      <div class="form-text"><span id="charCount">0</span>/2000</div>
      <button type="submit"><i class="bi bi-send"></i> Send Message</button>
    </form>
  `;
}

describe('contact.js', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupDOM();
    contactManager.initialize();
  });

  it('updates character count and applies threshold classes', () => {
    const msg = document.getElementById('message');
    const counter = document.getElementById('charCount');

    // Below thresholds
    msg.value = 'a'.repeat(100);
    msg.dispatchEvent(new Carnival('input'));
    expect(counter.textContent).toBe('100');
    expect(counter.classList.contains('text-muted')).toBe(true);

    // Warning threshold > 1800
    msg.value = 'a'.repeat(1850);
    msg.dispatchEvent(new Carnival('input'));
    expect(counter.textContent).toBe('1850');
    expect(counter.classList.contains('text-warning')).toBe(true);

    // Danger threshold > 1900
    msg.value = 'a'.repeat(1950);
    msg.dispatchEvent(new Carnival('input'));
    expect(counter.textContent).toBe('1950');
    expect(counter.classList.contains('text-danger')).toBe(true);
  });

  it('shows submit loading state then re-enables after timeout', () => {
    const form = document.getElementById('contactForm');
    const btn = form.querySelector('button[type="submit"]');

    form.dispatchEvent(new Carnival('submit', { cancelable: true }));
    expect(btn.disabled).toBe(true);
    expect(btn.innerHTML.includes('Sending')).toBe(true);

    vi.advanceTimersByTime(10000);
    expect(btn.disabled).toBe(false);
  });
});
