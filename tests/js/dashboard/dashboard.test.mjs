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
    
    <!-- Subscription Modal -->
    <div class="modal fade" id="subscriptionModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Email Subscription Preferences</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="subscriptionForm">
              <div class="form-group mb-3">
                <label for="subscriptionEmail" class="form-label">Email Address</label>
                <input type="email" class="form-control" id="subscriptionEmail" readonly>
              </div>
              
              <div class="form-group mb-3">
                <div class="form-check">
                  <input type="checkbox" class="form-check-input" id="subscriptionActive">
                  <label class="form-check-label" for="subscriptionActive">
                    Subscribe to carnival notifications
                  </label>
                </div>
              </div>
              
              <div id="stateSelectionSection">
                <label class="form-label">Select states to receive notifications for:</label>
                <div class="row">
                  <div class="col-6">
                    <div class="form-check">
                      <input type="checkbox" class="form-check-input state-checkbox" id="state-NSW" value="NSW">
                      <label class="form-check-label" for="state-NSW">NSW</label>
                    </div>
                    <div class="form-check">
                      <input type="checkbox" class="form-check-input state-checkbox" id="state-QLD" value="QLD">
                      <label class="form-check-label" for="state-QLD">QLD</label>
                    </div>
                    <div class="form-check">
                      <input type="checkbox" class="form-check-input state-checkbox" id="state-VIC" value="VIC">
                      <label class="form-check-label" for="state-VIC">VIC</label>
                    </div>
                    <div class="form-check">
                      <input type="checkbox" class="form-check-input state-checkbox" id="state-WA" value="WA">
                      <label class="form-check-label" for="state-WA">WA</label>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="form-check">
                      <input type="checkbox" class="form-check-input state-checkbox" id="state-SA" value="SA">
                      <label class="form-check-label" for="state-SA">SA</label>
                    </div>
                    <div class="form-check">
                      <input type="checkbox" class="form-check-input state-checkbox" id="state-TAS" value="TAS">
                      <label class="form-check-label" for="state-TAS">TAS</label>
                    </div>
                    <div class="form-check">
                      <input type="checkbox" class="form-check-input state-checkbox" id="state-NT" value="NT">
                      <label class="form-check-label" for="state-NT">NT</label>
                    </div>
                    <div class="form-check">
                      <input type="checkbox" class="form-check-input state-checkbox" id="state-ACT" value="ACT">
                      <label class="form-check-label" for="state-ACT">ACT</label>
                    </div>
                  </div>
                </div>
                
                <div class="mt-2">
                  <button type="button" class="btn btn-link btn-sm" id="selectAllStates">Select All</button>
                  <button type="button" class="btn btn-link btn-sm" id="clearAllStates">Clear All</button>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" id="unsubscribeBtn">Unsubscribe</button>
            <button type="button" class="btn btn-primary" id="saveSubscriptionBtn">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Quick action buttons -->
    <button class="btn btn-outline-primary" data-bs-toggle="modal" data-bs-target="#subscriptionModal" id="subscriptionModalTrigger">
      <i class="bi bi-envelope"></i> Email Preferences
    </button>
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
