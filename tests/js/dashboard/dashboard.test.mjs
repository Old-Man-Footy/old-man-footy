import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dashboardManager } from '../../../public/js/dashboard.js';

function setupDOM() {
  const now = Date.now();
  document.body.innerHTML = `
    <div id="quickStartChecklist"></div>
    <div class="card border-info"></div>
    <div>
      <button data-filter="all" data-target="hosted" id="btnAllHosted"></button>
      <button data-filter="upcoming" data-target="hosted" id="btnUpcomingHosted"></button>
      <button data-filter="past" data-target="hosted" id="btnPastHosted"></button>
      <button data-filter="all" data-target="attending" id="btnAllAttending"></button>
    </div>
    <div class="hosted-carnival carnival-item" data-date="${now + 10000}"></div>
    <div class="hosted-carnival carnival-item" data-date="${now - 10000}"></div>
    <div class="attending-carnival carnival-item" data-date="${now + 10000}"></div>
    <div class="attending-carnival carnival-item" data-date="${now - 10000}"></div>
    <form data-action="transfer-role">
      <select id="newPrimaryUserId">
        <option value="">--</option>
        <option value="1">Alice (alice@example.com)</option>
      </select>
    </form>
  `;
}

describe('dashboard.js', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    setupDOM();
    dashboardManager.initialize();
  });

  it('filters hosted carnivals by upcoming and past', () => {
    const btn = document.getElementById('btnUpcomingHosted');
    btn.click();
    const items = document.querySelectorAll('.hosted-carnival');
    const displays = Array.from(items).map((el) => el.style.display);
    expect(displays).toContain('block');
    expect(displays).toContain('none');
  });

  it('dismisses checklist and stores preference', () => {
    dashboardManager.dismissChecklist();
    expect(localStorage.getItem('checklistDismissed')).toBe('true');
  });

  it('confirmTransfer validates selection and confirms', () => {
    const select = document.getElementById('newPrimaryUserId');
    // First call without selection should alert and return false
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    expect(dashboardManager.confirmTransfer()).toBe(false);
    expect(alertSpy).toHaveBeenCalled();

    // With selection, should call confirm
    select.value = '1';
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    expect(dashboardManager.confirmTransfer()).toBe(true);
    expect(confirmSpy).toHaveBeenCalled();
  });

  it('showSuccessMessage adds and removes alert', () => {
    dashboardManager.showSuccessMessage('Saved');
    const alert = document.querySelector('.alert.alert-success');
    expect(alert).toBeTruthy();
    vi.advanceTimersByTime(5000);
    expect(document.querySelector('.alert.alert-success')).toBeFalsy();
  });
});
