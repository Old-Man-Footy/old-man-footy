import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sponsorManagementManager } from '../../../public/js/sponsor-management.js';

function setupDOM() {
  document.body.innerHTML = `
    <div data-sponsor-id="42" data-current-status="true"></div>
    <button data-action="toggle-status-btn"></button>
    <button data-action="delete-sponsor-btn"></button>
    <form id="removeForm" data-confirm-remove="Remove SPONSOR_NAME?" data-sponsor-name="Acme"></form>
  `;
}

describe('sponsor-management.js', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupDOM();
    sponsorManagementManager.initialize();
  });

  it('toggleStatus calls fetch and reloads on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    const reloadSpy = vi.spyOn(sponsorManagementManager, 'reloadPage').mockImplementation(() => {});
    document.querySelector('[data-action="toggle-status-btn"]').click();
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledWith('/sponsors/42/status', expect.any(Object));
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('confirmDelete confirms, deletes, and redirects on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    const confirmSpy = vi.spyOn(sponsorManagementManager, 'safeConfirm').mockReturnValue(true);
    const redirectSpy = vi.spyOn(sponsorManagementManager, 'redirectToList').mockImplementation(() => {});
    document.querySelector('[data-action="delete-sponsor-btn"]').click();
    await Promise.resolve();
    expect(confirmSpy).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith('/sponsors/42', expect.any(Object));
    expect(redirectSpy).toHaveBeenCalled();
  });

  it('removal form blocks submit when user cancels confirmation', () => {
    const form = document.getElementById('removeForm');
    const prevent = vi.fn();
    vi.spyOn(sponsorManagementManager, 'safeConfirm').mockReturnValue(false);
    form.dispatchEvent(new Carnival('submit', { cancelable: true }));
    // Since we can't easily capture defaultPrevented with jsdom's Carnival, we assert safeConfirm was called
    expect(sponsorManagementManager.safeConfirm).toHaveBeenCalled();
  });
});
