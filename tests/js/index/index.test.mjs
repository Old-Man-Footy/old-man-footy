import { describe, it, expect, beforeEach, vi } from 'vitest';
import { indexPageManager } from '../../../public/js/index.js';

function setupDOM(withImages = true) {
  document.body.innerHTML = `
  <section data-carousel-images='${JSON.stringify(withImages ? [{src:"a.jpg"}] : [])}'></section>
    <div class="image-carousel" id="imageCarousel">
      <div class="carousel-track">
        <div class="slide"></div>
        <div class="slide"></div>
      </div>
      <button id="carouselPrev"></button>
      <button id="carouselNext"></button>
      <div class="carousel-nav">
        <button class="carousel-indicator" data-slide="0"></button>
        <button class="carousel-indicator" data-slide="1"></button>
      </div>
    </div>
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
    // jsdom: mock sizes
    const slides = document.querySelectorAll('.slide');
    slides.forEach((s) => Object.defineProperty(s, 'getBoundingClientRect', { value: () => ({ width: 500 }), configurable: true }));
    indexPageManager.initialize();
  });

  it('initializes carousel and moves between slides', () => {
    // Start at 0
    expect(document.querySelectorAll('.current-slide').length).toBeGreaterThan(0);
    // Click next
    document.getElementById('carouselNext').click();
    // Should have updated currentSlide
    // We can infer by CSS transform being set
    const track = document.querySelector('.carousel-track');
    expect(track.style.transform).toContain('translateX(');
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
