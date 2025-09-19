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

  describe('Email Subscription Management', () => {
    beforeEach(() => {
      // Mock fetch for API calls
      global.fetch = vi.fn();
      
      // Mock console methods to avoid test output pollution
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    describe('loadSubscriptionData', () => {
      it('should load subscription data and populate form', async () => {
        const mockResponse = {
          success: true,
          subscription: {
            email: 'user@example.com',
            isActive: true,
            states: ['NSW', 'VIC'],
            availableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT']
          }
        };

        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

        await dashboardManager.loadSubscriptionData();

        expect(global.fetch).toHaveBeenCalledWith('/api/subscriptions/me', {
          headers: {
            'Accept': 'application/json'
          }
        });

        expect(document.getElementById('subscriptionEmail').value).toBe('user@example.com');
        expect(document.getElementById('subscriptionActive').checked).toBe(true);
        expect(document.getElementById('state-NSW').checked).toBe(true);
        expect(document.getElementById('state-VIC').checked).toBe(true);
        expect(document.getElementById('state-QLD').checked).toBe(false);
      });

      it('should handle inactive subscription correctly', async () => {
        const mockResponse = {
          success: true,
          subscription: {
            email: 'user@example.com',
            isActive: false,
            states: [],
            availableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT']
          }
        };

        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

        await dashboardManager.loadSubscriptionData();

        expect(document.getElementById('subscriptionActive').checked).toBe(false);
        expect(document.getElementById('stateSelectionSection').style.display).toBe('none');
        
        // All states should be unchecked
        const stateCheckboxes = document.querySelectorAll('.state-checkbox');
        stateCheckboxes.forEach(checkbox => {
          expect(checkbox.checked).toBe(false);
        });
      });

      it('should handle API errors gracefully', async () => {
        global.fetch.mockResolvedValue({
          ok: false,
          status: 500
        });

        await dashboardManager.loadSubscriptionData();

        expect(console.error).toHaveBeenCalledWith('Failed to load subscription data:', 500);
      });

      it('should handle network errors', async () => {
        const networkError = new Error('Network error');
        global.fetch.mockRejectedValue(networkError);

        await dashboardManager.loadSubscriptionData();

        expect(console.error).toHaveBeenCalledWith('Error loading subscription data:', networkError);
      });
    });

    describe('saveSubscription', () => {
      beforeEach(() => {
        // Set up form with default values
        document.getElementById('subscriptionEmail').value = 'user@example.com';
        document.getElementById('subscriptionActive').checked = true;
        document.getElementById('state-NSW').checked = true;
        document.getElementById('state-VIC').checked = true;
      });

      it('should save subscription with selected states', async () => {
        const mockResponse = {
          success: true,
          message: 'Subscription updated successfully',
          subscription: {
            email: 'user@example.com',
            isActive: true,
            states: ['NSW', 'VIC']
          }
        };

        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

        await dashboardManager.saveSubscription();

        expect(global.fetch).toHaveBeenCalledWith('/api/subscriptions/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            isActive: true,
            states: ['NSW', 'VIC']
          })
        });

        const successAlert = document.querySelector('.alert.alert-success');
        expect(successAlert).toBeTruthy();
        expect(successAlert.textContent).toContain('Subscription updated successfully');
      });

      it('should save inactive subscription correctly', async () => {
        document.getElementById('subscriptionActive').checked = false;

        const mockResponse = {
          success: true,
          message: 'Subscription updated successfully'
        };

        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

        await dashboardManager.saveSubscription();

        expect(global.fetch).toHaveBeenCalledWith('/api/subscriptions/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            isActive: false,
            states: []
          })
        });
      });

      it('should handle validation errors', async () => {
        const mockResponse = {
          success: false,
          error: 'Validation failed',
          details: [
            { msg: 'States must be an array', param: 'states' }
          ]
        };

        global.fetch.mockResolvedValue({
          ok: false,
          status: 400,
          json: () => Promise.resolve(mockResponse)
        });

        await dashboardManager.saveSubscription();

        const errorAlert = document.querySelector('.alert.alert-danger');
        expect(errorAlert).toBeTruthy();
        expect(errorAlert.textContent).toContain('Validation failed: States must be an array');
      });

      it('should handle server errors', async () => {
        global.fetch.mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.resolve({
            success: false,
            error: 'Internal server error'
          })
        });

        await dashboardManager.saveSubscription();

        const errorAlert = document.querySelector('.alert.alert-danger');
        expect(errorAlert).toBeTruthy();
        expect(errorAlert.textContent).toContain('Internal server error');
      });

      it('should handle network errors', async () => {
        const networkError = new Error('Network error');
        global.fetch.mockRejectedValue(networkError);

        await dashboardManager.saveSubscription();

        const errorAlert = document.querySelector('.alert.alert-danger');
        expect(errorAlert).toBeTruthy();
        expect(errorAlert.textContent).toContain('Failed to save subscription preferences');
      });
    });

    describe('handleUnsubscribe', () => {
      it('should unsubscribe user when confirmed', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        
        const mockResponse = {
          success: true,
          message: 'Successfully unsubscribed'
        };

        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

        await dashboardManager.handleUnsubscribe();

        expect(confirmSpy).toHaveBeenCalledWith(
          'Are you sure you want to unsubscribe from all email notifications? You can always re-subscribe later.'
        );

        expect(global.fetch).toHaveBeenCalledWith('/api/subscriptions/me', {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json'
          }
        });

        const successAlert = document.querySelector('.alert.alert-success');
        expect(successAlert).toBeTruthy();
        expect(successAlert.textContent).toContain('Successfully unsubscribed');
      });

      it('should not unsubscribe when user cancels', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

        await dashboardManager.handleUnsubscribe();

        expect(confirmSpy).toHaveBeenCalled();
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should handle unsubscribe errors', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        
        global.fetch.mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.resolve({
            success: false,
            error: 'Failed to unsubscribe'
          })
        });

        await dashboardManager.handleUnsubscribe();

        const errorAlert = document.querySelector('.alert.alert-danger');
        expect(errorAlert).toBeTruthy();
        expect(errorAlert.textContent).toContain('Failed to unsubscribe');
      });
    });

    describe('toggleSubscriptionState', () => {
      it('should show state selection when active is checked', () => {
        const activeCheckbox = document.getElementById('subscriptionActive');
        const stateSection = document.getElementById('stateSelectionSection');

        activeCheckbox.checked = false;
        stateSection.style.display = 'none';

        // Trigger the toggle
        activeCheckbox.checked = true;
        dashboardManager.toggleSubscriptionState();

        expect(stateSection.style.display).toBe('block');
      });

      it('should hide state selection when active is unchecked', () => {
        const activeCheckbox = document.getElementById('subscriptionActive');
        const stateSection = document.getElementById('stateSelectionSection');

        activeCheckbox.checked = true;
        stateSection.style.display = 'block';

        // Trigger the toggle
        activeCheckbox.checked = false;
        dashboardManager.toggleSubscriptionState();

        expect(stateSection.style.display).toBe('none');
      });

      it('should clear all state selections when subscription is deactivated', () => {
        const activeCheckbox = document.getElementById('subscriptionActive');
        const stateCheckboxes = document.querySelectorAll('.state-checkbox');

        // Set some states as checked
        stateCheckboxes[0].checked = true;
        stateCheckboxes[1].checked = true;

        // Deactivate subscription
        activeCheckbox.checked = false;
        dashboardManager.toggleSubscriptionState();

        // All states should be unchecked
        stateCheckboxes.forEach(checkbox => {
          expect(checkbox.checked).toBe(false);
        });
      });
    });

    describe('selectAllStates', () => {
      it('should select all state checkboxes', () => {
        const stateCheckboxes = document.querySelectorAll('.state-checkbox');
        
        // Initially uncheck all
        stateCheckboxes.forEach(checkbox => {
          checkbox.checked = false;
        });

        dashboardManager.selectAllStates();

        stateCheckboxes.forEach(checkbox => {
          expect(checkbox.checked).toBe(true);
        });
      });
    });

    describe('clearAllStates', () => {
      it('should clear all state checkboxes', () => {
        const stateCheckboxes = document.querySelectorAll('.state-checkbox');
        
        // Initially check all
        stateCheckboxes.forEach(checkbox => {
          checkbox.checked = true;
        });

        dashboardManager.clearAllStates();

        stateCheckboxes.forEach(checkbox => {
          expect(checkbox.checked).toBe(false);
        });
      });
    });

    describe('populateSubscriptionForm', () => {
      it('should populate form with subscription data', () => {
        const subscriptionData = {
          email: 'test@example.com',
          isActive: true,
          states: ['NSW', 'QLD', 'WA']
        };

        dashboardManager.populateSubscriptionForm(subscriptionData);

        expect(document.getElementById('subscriptionEmail').value).toBe('test@example.com');
        expect(document.getElementById('subscriptionActive').checked).toBe(true);
        expect(document.getElementById('state-NSW').checked).toBe(true);
        expect(document.getElementById('state-QLD').checked).toBe(true);
        expect(document.getElementById('state-WA').checked).toBe(true);
        expect(document.getElementById('state-VIC').checked).toBe(false);
      });

      it('should handle inactive subscription', () => {
        const subscriptionData = {
          email: 'test@example.com',
          isActive: false,
          states: []
        };

        dashboardManager.populateSubscriptionForm(subscriptionData);

        expect(document.getElementById('subscriptionActive').checked).toBe(false);
        expect(document.getElementById('stateSelectionSection').style.display).toBe('none');
      });

      it('should handle null or undefined states', () => {
        const subscriptionData = {
          email: 'test@example.com',
          isActive: true,
          states: null
        };

        dashboardManager.populateSubscriptionForm(subscriptionData);

        const stateCheckboxes = document.querySelectorAll('.state-checkbox');
        stateCheckboxes.forEach(checkbox => {
          expect(checkbox.checked).toBe(false);
        });
      });
    });

    describe('Event Handlers', () => {
      it('should bind subscription modal events on initialization', () => {
        const saveBtn = document.getElementById('saveSubscriptionBtn');
        const unsubscribeBtn = document.getElementById('unsubscribeBtn');
        const activeCheckbox = document.getElementById('subscriptionActive');
        const selectAllBtn = document.getElementById('selectAllStates');
        const clearAllBtn = document.getElementById('clearAllStates');

        expect(saveBtn).toBeTruthy();
        expect(unsubscribeBtn).toBeTruthy();
        expect(activeCheckbox).toBeTruthy();
        expect(selectAllBtn).toBeTruthy();
        expect(clearAllBtn).toBeTruthy();

        // These should be bound during initialization
        expect(typeof saveBtn.onclick).toBe('function');
        expect(typeof unsubscribeBtn.onclick).toBe('function');
        expect(typeof activeCheckbox.onchange).toBe('function');
        expect(typeof selectAllBtn.onclick).toBe('function');
        expect(typeof clearAllBtn.onclick).toBe('function');
      });

      it('should load subscription data when modal is shown', () => {
        const modal = document.getElementById('subscriptionModal');
        const loadDataSpy = vi.spyOn(dashboardManager, 'loadSubscriptionData').mockImplementation(() => {});

        // Simulate modal show event
        const showEvent = new Event('show.bs.modal');
        modal.dispatchEvent(showEvent);

        expect(loadDataSpy).toHaveBeenCalled();
      });
    });

    describe('Integration Tests', () => {
      it('should handle complete subscription workflow', async () => {
        // Mock successful API responses
        global.fetch.mockImplementation((url, options) => {
          if (!options || options.method === 'GET') {
            // Load subscription data
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                subscription: {
                  email: 'user@example.com',
                  isActive: false,
                  states: [],
                  availableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT']
                }
              })
            });
          } else if (options.method === 'PUT') {
            // Save subscription
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                message: 'Subscription updated successfully'
              })
            });
          }
        });

        // Load initial data
        await dashboardManager.loadSubscriptionData();
        expect(document.getElementById('subscriptionActive').checked).toBe(false);

        // Activate subscription
        document.getElementById('subscriptionActive').checked = true;
        dashboardManager.toggleSubscriptionState();
        expect(document.getElementById('stateSelectionSection').style.display).toBe('block');

        // Select some states
        document.getElementById('state-NSW').checked = true;
        document.getElementById('state-VIC').checked = true;

        // Save subscription
        await dashboardManager.saveSubscription();

        expect(global.fetch).toHaveBeenLastCalledWith('/api/subscriptions/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            isActive: true,
            states: ['NSW', 'VIC']
          })
        });

        const successAlert = document.querySelector('.alert.alert-success');
        expect(successAlert).toBeTruthy();
      });
    });
  });
});
