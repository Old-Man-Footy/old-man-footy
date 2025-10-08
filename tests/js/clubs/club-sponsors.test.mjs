import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clubSponsorsManager } from '../../../public/js/club-sponsors.js';

function setupDom({ items = 3 } = {}) {
  const listItems = Array.from({ length: items }).map((_, i) => `<div class="list-group-item" data-sponsor-id="id-${i}">
    <i class="bi bi-grip-vertical"></i>
  </div>`).join('');
  document.body.innerHTML = `
    <div id="sponsor-order-list" class="list-group">${listItems}</div>
    <button id="save-sponsor-order">Save</button>
  `;
}

describe('club-sponsors.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('shows save button when Sortable onEnd fires (guarded)', () => {
    setupDom();
    // Mock Sortable
    globalThis.Sortable = { create: (el, opts) => { if (opts && typeof opts.onEnd === 'function') opts.onEnd(); } };

    clubSponsorsManager.initialize();

    const btn = document.getElementById('save-sponsor-order');
    expect(btn.style.display).toBe('block');
  });

  it('POSTs reorder on save click', async () => {
    setupDom();
    globalThis.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true }) }));

    clubSponsorsManager.initialize();

    document.getElementById('save-sponsor-order').click();

    expect(fetch).toHaveBeenCalledWith('/clubs/1/sponsors/reorder', expect.any(Object));
  });
});
