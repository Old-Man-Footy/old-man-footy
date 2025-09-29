import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { dashboardManager } from '../../../public/js/dashboard.js';

// Mock Bootstrap components
const createBootstrapMock = () => ({
  Modal: {
    getInstance: vi.fn(() => ({
      hide: vi.fn()
    }))
  }
});

function setupDOM() {
  const now = Date.now();
  document.body.innerHTML = `
    <!-- Checklist -->
    <div id="quickStartChecklist" class="card">
      <div class="card-body">
        <h5>Quick Start Checklist</h5>
        <ul class="list-group list-group-flush">
          <li class="list-group-item">
            <input type="checkbox" class="checklist-item" data-step="1" id="step1">
            <label for="step1">Complete profile</label>
            <button class="btn btn-sm btn-primary">Go</button>
          </li>
          <li class="list-group-item">
            <input type="checkbox" class="checklist-item" data-step="2" id="step2">
            <label for="step2">Add club details</label>
            <button class="btn btn-sm btn-primary">Go</button>
          </li>
        </ul>
        <button data-action="dismiss-checklist" class="btn btn-sm btn-secondary">Dismiss</button>
      </div>
    </div>

    <!-- Carnival Filter Buttons -->
    <div class="filter-buttons">
      <button data-filter="all" data-target="hosted" class="btn btn-primary">All Hosted</button>
      <button data-filter="upcoming" data-target="hosted" class="btn btn-outline-primary">Upcoming Hosted</button>
      <button data-filter="past" data-target="hosted" class="btn btn-outline-primary">Past Hosted</button>
      <button data-filter="all" data-target="attending" class="btn btn-primary">All Attending</button>
      <button data-filter="upcoming" data-target="attending" class="btn btn-outline-primary">Upcoming Attending</button>
      <button data-filter="past" data-target="attending" class="btn btn-outline-primary">Past Attending</button>
    </div>

    <!-- Carnival Items -->
    <div class="hosted-carnival carnival-item" data-date="${now + 86400000}">Future Hosted Carnival</div>
    <div class="hosted-carnival carnival-item" data-date="${now - 86400000}">Past Hosted Carnival</div>
    <div class="attending-carnival carnival-item" data-date="${now + 86400000}">Future Attending Carnival</div>
    <div class="attending-carnival carnival-item" data-date="${now - 86400000}">Past Attending Carnival</div>

    <!-- Tab Navigation -->
    <button data-bs-toggle="tab" data-bs-target="#hosted-carnivals" class="nav-link">Hosted</button>
    <button data-bs-toggle="tab" data-bs-target="#attending-carnivals" class="nav-link">Attending</button>

    <!-- Navigation Button -->
    <button data-action="navigate" data-target="/test-page" class="btn btn-primary">Navigate</button>

    <!-- Transfer Role Form -->
    <form data-action="transfer-role">
      <select id="newPrimaryUserId">
        <option value="">Select delegate...</option>
        <option value="1">Alice Smith (alice@example.com)</option>
        <option value="2">Bob Jones (bob@example.com)</option>
      </select>
      <button type="submit">Transfer</button>
    </form>

    <!-- Password Reset Modal -->
    <div class="modal" id="updatePasswordModal">
      <div class="modal-dialog">
        <div class="modal-content">
          <form id="passwordResetForm">
            <div class="modal-body">
              <div id="passwordResetMessages"></div>
              <input type="password" id="currentPassword" placeholder="Current Password">
              <input type="password" id="newPassword" placeholder="New Password">
              <input type="password" id="confirmPassword" placeholder="Confirm New Password">
            </div>
            <div class="modal-footer">
              <button type="button" id="submitPasswordReset" class="btn btn-primary">Update Password</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Email Subscription Modal -->
    <div class="modal" id="emailSubscriptionModal">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-body">
            <div id="subscriptionAlert" style="display: none;"></div>
            <div class="form-check">
              <input type="checkbox" class="form-check-input" id="subscriptionToggle">
              <label class="form-check-label" for="subscriptionToggle">Enable email notifications</label>
            </div>
            <div id="stateSelection" style="display: none;">
              <h6>Select States:</h6>
              <input type="checkbox" class="state-checkbox" value="NSW" id="state-NSW">
              <label for="state-NSW">NSW</label>
              <input type="checkbox" class="state-checkbox" value="VIC" id="state-VIC">
              <label for="state-VIC">VIC</label>
              <input type="checkbox" class="state-checkbox" value="QLD" id="state-QLD">
              <label for="state-QLD">QLD</label>
              <button type="button" id="selectAllStates" class="btn btn-sm btn-link">Select All</button>
              <button type="button" id="clearAllStates" class="btn btn-sm btn-link">Clear All</button>
              
              <h6>Select Notification Types:</h6>
              <input type="checkbox" class="notification-checkbox" value="Carnival_Notifications" id="notification_Carnival_Notifications">
              <label for="notification_Carnival_Notifications">Carnival Notifications</label>
              <input type="checkbox" class="notification-checkbox" value="Delegate_Alerts" id="notification_Delegate_Alerts">
              <label for="notification_Delegate_Alerts">Delegate Alerts</label>
              <input type="checkbox" class="notification-checkbox" value="Website_Updates" id="notification_Website_Updates">
              <label for="notification_Website_Updates">Website Updates</label>
              <input type="checkbox" class="notification-checkbox" value="Program_Changes" id="notification_Program_Changes">
              <label for="notification_Program_Changes">Program Changes</label>
              <input type="checkbox" class="notification-checkbox" value="Special_Offers" id="notification_Special_Offers">
              <label for="notification_Special_Offers">Special Offers</label>
              <input type="checkbox" class="notification-checkbox" value="Community_News" id="notification_Community_News">
              <label for="notification_Community_News">Community News</label>
              <button type="button" id="selectAllNotifications" class="btn btn-sm btn-link">Select All</button>
              <button type="button" id="clearAllNotifications" class="btn btn-sm btn-link">Clear All</button>
            </div>
            <div id="unsubscribeSection" style="display: none;">
              <button type="button" id="unsubscribeBtn" class="btn btn-danger">Unsubscribe</button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" id="saveSubscriptionBtn" class="btn btn-primary">Save</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Leave Club Modal -->
    <div class="modal" id="leaveClubModal">
      <div class="modal-dialog">
        <div class="modal-content">
          <form>
            <div class="modal-body">
              <div class="form-check">
                <input type="radio" name="leaveAction" value="available" id="makeAvailable" class="form-check-input">
                <label for="makeAvailable" class="form-check-label">Make club available</label>
              </div>
              <div class="form-check">
                <input type="radio" name="leaveAction" value="transfer" id="transferToDelegate" class="form-check-input">
                <label for="transferToDelegate" class="form-check-label">Transfer to delegate</label>
              </div>
              <div class="form-check">
                <input type="radio" name="leaveAction" value="deactivate" id="deactivateClub" class="form-check-input">
                <label for="deactivateClub" class="form-check-label">Deactivate club</label>
              </div>
              <div id="delegateSelection" style="display: none;">
                <select id="newPrimaryDelegateId">
                  <option value="">Select delegate...</option>
                  <option value="1">Alice Smith</option>
                  <option value="2">Bob Jones</option>
                </select>
              </div>
              <div class="form-check">
                <input type="checkbox" id="confirmLeave" class="form-check-input">
                <label for="confirmLeave" class="form-check-label">I confirm I want to leave</label>
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-danger">Leave Club</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

describe('Dashboard Manager - Comprehensive Tests', () => {
  let fetchMock;
  let bootstrapMock;

  beforeEach(() => {
    // Clear all mocks and localStorage
    vi.clearAllMocks();
    localStorage.clear();
    
    // Setup DOM
    setupDOM();
    
    // Mock fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    
    // Mock Bootstrap
    bootstrapMock = createBootstrapMock();
    global.bootstrap = bootstrapMock;
    
    // Mock window methods
    global.alert = vi.fn();
    global.confirm = vi.fn();
    
    // Mock location
    Object.defineProperty(window, 'location', {
      value: { href: '', reload: vi.fn() },
      writable: true
    });
    
    // Initialize dashboard
    dashboardManager.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should cache all required elements', () => {
      expect(dashboardManager.elements.checklistCard).toBeTruthy();
      expect(dashboardManager.elements.dismissChecklistBtn).toBeTruthy();
      expect(dashboardManager.elements.passwordResetForm).toBeTruthy();
      expect(dashboardManager.elements.emailSubscriptionModal).toBeTruthy();
    });

    it('should hide checklist if previously dismissed', () => {
      localStorage.setItem('checklistDismissed', 'true');
      setupDOM();
      dashboardManager.initialize();
      
      const checklist = document.getElementById('quickStartChecklist');
      expect(checklist.style.display).toBe('none');
    });

    it('should show all carnivals initially for both tabs', () => {
      const hostedItems = document.querySelectorAll('.hosted-carnival');
      const attendingItems = document.querySelectorAll('.attending-carnival');
      
      hostedItems.forEach(item => {
        expect(item.style.display).toBe('block');
      });
      
      attendingItems.forEach(item => {
        expect(item.style.display).toBe('block');
      });
    });
  });

  describe('Carnival Filtering', () => {
    it('should filter hosted carnivals to show only upcoming', () => {
      const upcomingBtn = document.querySelector('[data-filter="upcoming"][data-target="hosted"]');
      upcomingBtn.click();
      
      const hostedItems = document.querySelectorAll('.hosted-carnival');
      const displays = Array.from(hostedItems).map(item => item.style.display);
      
      expect(displays).toContain('block'); // Future carnival
      expect(displays).toContain('none');  // Past carnival
    });

    it('should filter hosted carnivals to show only past', () => {
      const pastBtn = document.querySelector('[data-filter="past"][data-target="hosted"]');
      pastBtn.click();
      
      const hostedItems = document.querySelectorAll('.hosted-carnival');
      const displays = Array.from(hostedItems).map(item => item.style.display);
      
      expect(displays).toContain('none');  // Future carnival
      expect(displays).toContain('block'); // Past carnival
    });

    it('should show all hosted carnivals when all filter is clicked', () => {
      // First filter to past
      const pastBtn = document.querySelector('[data-filter="past"][data-target="hosted"]');
      pastBtn.click();
      
      // Then show all
      const allBtn = document.querySelector('[data-filter="all"][data-target="hosted"]');
      allBtn.click();
      
      const hostedItems = document.querySelectorAll('.hosted-carnival');
      hostedItems.forEach(item => {
        expect(item.style.display).toBe('block');
      });
    });

    it('should update active filter button styling', () => {
      const upcomingBtn = document.querySelector('[data-filter="upcoming"][data-target="hosted"]');
      const allBtn = document.querySelector('[data-filter="all"][data-target="hosted"]');
      
      upcomingBtn.click();
      
      expect(upcomingBtn.classList.contains('active')).toBe(true);
      expect(allBtn.classList.contains('active')).toBe(false);
    });

    it('should filter attending carnivals independently from hosted', () => {
      const hostedUpcomingBtn = document.querySelector('[data-filter="upcoming"][data-target="hosted"]');
      const attendingPastBtn = document.querySelector('[data-filter="past"][data-target="attending"]');
      
      hostedUpcomingBtn.click();
      attendingPastBtn.click();
      
      const hostedItems = document.querySelectorAll('.hosted-carnival');
      const attendingItems = document.querySelectorAll('.attending-carnival');
      
      // Hosted should show upcoming (future = block, past = none)
      expect(Array.from(hostedItems).map(i => i.style.display)).toEqual(['block', 'none']);
      
      // Attending should show past (future = none, past = block)
      expect(Array.from(attendingItems).map(i => i.style.display)).toEqual(['none', 'block']);
    });
  });

  describe('Checklist Management', () => {
    it('should dismiss checklist and store preference', () => {
      const dismissBtn = document.querySelector('[data-action="dismiss-checklist"]');
      dismissBtn.click();
      
      const checklist = document.getElementById('quickStartChecklist');
      expect(checklist.style.display).toBe('none');
      expect(localStorage.getItem('checklistDismissed')).toBe('true');
    });

    it('should handle checklist item completion', () => {
      const checklistItem = document.querySelector('.checklist-item[data-step="1"]');
      const listItem = checklistItem.closest('.list-group-item');
      const label = listItem.querySelector('label');
      const button = listItem.querySelector('.btn');
      
      // Simulate checking the item
      checklistItem.checked = true;
      checklistItem.dispatchEvent(new Event('change'));
      
      expect(checklistItem.disabled).toBe(true);
      expect(localStorage.getItem('checklist-1')).toBe('completed');
      expect(listItem.classList.contains('checklist-completed')).toBe(true);
      expect(label.style.opacity).toBe('0.7');
      expect(label.style.textDecoration).toBe('line-through');
      expect(button.style.display).toBe('none');
    });

    it('should restore checklist state from localStorage', () => {
      localStorage.setItem('checklist-1', 'completed');
      
      setupDOM();
      dashboardManager.initialize();
      
      const checklistItem = document.querySelector('.checklist-item[data-step="1"]');
      const listItem = checklistItem.closest('.list-group-item');
      
      expect(checklistItem.checked).toBe(true);
      expect(checklistItem.disabled).toBe(true);
      expect(listItem.classList.contains('checklist-completed')).toBe(true);
    });

    it('should show success animation when item is completed', () => {
      const checklistItem = document.querySelector('.checklist-item[data-step="1"]');
      const listItem = checklistItem.closest('.list-group-item');
      
      // Simulate checking the item
      checklistItem.checked = true;
      checklistItem.dispatchEvent(new Event('change'));
      
      // Check for success icon
      const successIcon = listItem.querySelector('.bi-check-circle-fill');
      expect(successIcon).toBeTruthy();
      expect(successIcon.className).toContain('text-success');
    });
  });

  describe('Password Reset', () => {
    it('should validate required fields', async () => {
      const submitBtn = document.getElementById('submitPasswordReset');
      submitBtn.click();
      
      // Should show error message for missing fields
      const messagesDiv = document.getElementById('passwordResetMessages');
      expect(messagesDiv.innerHTML).toContain('All fields are required');
      expect(messagesDiv.innerHTML).toContain('alert-danger');
    });

    it('should validate password confirmation match', async () => {
      document.getElementById('currentPassword').value = 'oldpass123';
      document.getElementById('newPassword').value = 'newpass123';
      document.getElementById('confirmPassword').value = 'differentpass';
      
      const submitBtn = document.getElementById('submitPasswordReset');
      submitBtn.click();
      
      const messagesDiv = document.getElementById('passwordResetMessages');
      expect(messagesDiv.innerHTML).toContain('New password and confirmation do not match');
    });

    it('should validate minimum password length', async () => {
      document.getElementById('currentPassword').value = 'oldpass123';
      document.getElementById('newPassword').value = 'short';
      document.getElementById('confirmPassword').value = 'short';
      
      const submitBtn = document.getElementById('submitPasswordReset');
      submitBtn.click();
      
      const messagesDiv = document.getElementById('passwordResetMessages');
      expect(messagesDiv.innerHTML).toContain('New password must be at least 8 characters long');
    });

    it('should successfully reset password with valid data', async () => {
      document.getElementById('currentPassword').value = 'oldpass123';
      document.getElementById('newPassword').value = 'newpass123';
      document.getElementById('confirmPassword').value = 'newpass123';
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Password updated successfully' })
      });
      
      const submitBtn = document.getElementById('submitPasswordReset');
      submitBtn.click();
      
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith('/auth/password-reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({
            existingPassword: 'oldpass123',
            newPassword: 'newpass123'
          })
        });
      });
    });

    it('should handle password reset API errors', async () => {
      document.getElementById('currentPassword').value = 'wrongpass';
      document.getElementById('newPassword').value = 'newpass123';
      document.getElementById('confirmPassword').value = 'newpass123';
      
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Current password is incorrect' })
      });
      
      const submitBtn = document.getElementById('submitPasswordReset');
      submitBtn.click();
      
      await vi.waitFor(() => {
        const messagesDiv = document.getElementById('passwordResetMessages');
        expect(messagesDiv.innerHTML).toContain('Current password is incorrect');
        expect(messagesDiv.innerHTML).toContain('alert-danger');
      });
    });

    it('should clear form and messages when modal opens', () => {
      // Add some data and messages
      document.getElementById('currentPassword').value = 'test';
      document.getElementById('passwordResetMessages').innerHTML = '<div>Error message</div>';
      
      // Simulate modal opening
      const modal = document.getElementById('updatePasswordModal');
      modal.dispatchEvent(new Event('show.bs.modal'));
      
      expect(document.getElementById('currentPassword').value).toBe('');
      expect(document.getElementById('passwordResetMessages').innerHTML).toBe('');
    });
  });

  describe('Email Subscription Management', () => {
    it('should load subscription data when modal opens', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          subscription: {
            isActive: true,
            states: ['NSW', 'VIC']
          }
        })
      });
      
      const modal = document.getElementById('emailSubscriptionModal');
      modal.dispatchEvent(new Event('shown.bs.modal'));
      
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith('/api/subscriptions/me', {
          headers: { 'Accept': 'application/json' }
        });
      });
    });

    it('should populate form with subscription data', async () => {
      const subscriptionData = {
        isActive: true,
        states: ['NSW', 'QLD']
      };
      
      dashboardManager.populateSubscriptionForm(subscriptionData);
      
      const toggle = document.getElementById('subscriptionToggle');
      const nswCheckbox = document.getElementById('state-NSW');
      const vicCheckbox = document.getElementById('state-VIC');
      const qldCheckbox = document.getElementById('state-QLD');
      
      expect(toggle.checked).toBe(true);
      expect(nswCheckbox.checked).toBe(true);
      expect(vicCheckbox.checked).toBe(false);
      expect(qldCheckbox.checked).toBe(true);
    });

    it('should toggle state selection visibility based on subscription toggle', () => {
      const toggle = document.getElementById('subscriptionToggle');
      const stateSelection = document.getElementById('stateSelection');
      const unsubscribeSection = document.getElementById('unsubscribeSection');
      
      // Enable subscription
      toggle.checked = true;
      toggle.dispatchEvent(new Event('change'));
      
      expect(stateSelection.style.display).toBe('block');
      expect(unsubscribeSection.style.display).toBe('block');
      
      // Disable subscription
      toggle.checked = false;
      toggle.dispatchEvent(new Event('change'));
      
      expect(stateSelection.style.display).toBe('none');
      expect(unsubscribeSection.style.display).toBe('none');
    });

    it('should select all states when select all button is clicked', () => {
      const selectAllBtn = document.getElementById('selectAllStates');
      const stateCheckboxes = document.querySelectorAll('.state-checkbox');
      
      selectAllBtn.click();
      
      stateCheckboxes.forEach(checkbox => {
        expect(checkbox.checked).toBe(true);
      });
    });

    it('should clear all states when clear all button is clicked', () => {
      // First select all
      const stateCheckboxes = document.querySelectorAll('.state-checkbox');
      stateCheckboxes.forEach(checkbox => { checkbox.checked = true; });
      
      // Then clear all
      const clearAllBtn = document.getElementById('clearAllStates');
      clearAllBtn.click();
      
      stateCheckboxes.forEach(checkbox => {
        expect(checkbox.checked).toBe(false);
      });
    });

    it('should save subscription with selected states', async () => {
      // Setup form
      document.getElementById('subscriptionToggle').checked = true;
      document.getElementById('state-NSW').checked = true;
      document.getElementById('state-VIC').checked = true;
      // Need to select at least one notification type for dual validation to pass
      document.getElementById('notification_Carnival_Notifications').checked = true;
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Subscription saved' })
      });
      
      const saveBtn = document.getElementById('saveSubscriptionBtn');
      saveBtn.click();
      
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith('/api/subscriptions/me', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isActive: true,
            states: ['NSW', 'VIC'],
            notificationPreferences: ['Carnival_Notifications']
          })
        });
      });
    });

    it('should handle unsubscribe with confirmation', async () => {
      global.confirm.mockReturnValue(true);
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Unsubscribed successfully' })
      });
      
      const unsubscribeBtn = document.getElementById('unsubscribeBtn');
      unsubscribeBtn.click();
      
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to unsubscribe from all email notifications?');
      
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith('/api/subscriptions/me', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
      });
    });

    it('should show confirmation dialog when unsubscribing via toggle', async () => {
      // Mock global.confirm to return false (user cancels)
      global.confirm.mockReturnValue(false);
      
      // Disable subscription toggle
      document.getElementById('subscriptionToggle').checked = false;
      
      const saveBtn = document.getElementById('saveSubscriptionBtn');
      saveBtn.click();
      
      // Should show confirmation dialog
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to unsubscribe from all email notifications?');
      
      // Should not make any API calls since user cancelled
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should validate state selection before saving', async () => {
      // Enable subscription but select no states
      document.getElementById('subscriptionToggle').checked = true;
      
      const saveBtn = document.getElementById('saveSubscriptionBtn');
      saveBtn.click();
      
      const alert = document.getElementById('subscriptionAlert');
      expect(alert.innerHTML).toContain('Please select at least one state/territory');
    });
  });

  describe('Leave Club Modal', () => {
    it('should show delegate selection when transfer option is selected', () => {
      const transferRadio = document.getElementById('transferToDelegate');
      const delegateSelection = document.getElementById('delegateSelection');
      const delegateSelect = document.getElementById('newPrimaryDelegateId');
      
      transferRadio.checked = true;
      transferRadio.dispatchEvent(new Event('change'));
      
      expect(delegateSelection.style.display).toBe('block');
      expect(delegateSelect.required).toBe(true);
    });

    it('should hide delegate selection for other options', () => {
      const availableRadio = document.getElementById('makeAvailable');
      const delegateSelection = document.getElementById('delegateSelection');
      const delegateSelect = document.getElementById('newPrimaryDelegateId');
      
      availableRadio.checked = true;
      availableRadio.dispatchEvent(new Event('change'));
      
      expect(delegateSelection.style.display).toBe('none');
      expect(delegateSelect.required).toBe(false);
      expect(delegateSelect.value).toBe('');
    });

    it('should update submit button text based on selected action', () => {
      const modal = document.getElementById('leaveClubModal');
      const submitBtn = modal.querySelector('button[type="submit"]');
      const transferRadio = document.getElementById('transferToDelegate');
      const deactivateRadio = document.getElementById('deactivateClub');
      
      transferRadio.checked = true;
      transferRadio.dispatchEvent(new Event('change'));
      expect(submitBtn.innerHTML).toContain('Leave &amp; Transfer Role');
      expect(submitBtn.className).toContain('btn-tertiary');
      
      deactivateRadio.checked = true;
      deactivateRadio.dispatchEvent(new Event('change'));
      expect(submitBtn.innerHTML).toContain('Leave &amp; Deactivate Club');
      expect(submitBtn.className).toContain('btn-danger');
    });

    it('should validate form submission for transfer action', () => {
      const modal = document.getElementById('leaveClubModal');
      const form = modal.querySelector('form');
      const transferRadio = document.getElementById('transferToDelegate');
      const confirmCheckbox = document.getElementById('confirmLeave');
      
      transferRadio.checked = true;
      confirmCheckbox.checked = true;
      
      // Simulate form submission without selecting delegate
      const event = new Event('submit');
      event.preventDefault = vi.fn();
      form.dispatchEvent(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith('Please select a delegate to transfer the primary role to.');
    });

    it('should validate confirmation checkbox', () => {
      const modal = document.getElementById('leaveClubModal');
      const form = modal.querySelector('form');
      const availableRadio = document.getElementById('makeAvailable');
      
      availableRadio.checked = true;
      // Don't check confirmation checkbox
      
      const event = new Event('submit');
      event.preventDefault = vi.fn();
      form.dispatchEvent(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith('Please confirm that you want to leave the club.');
    });
  });

  describe('Transfer Confirmation', () => {
    it('should validate delegate selection', () => {
      global.alert.mockImplementation(() => {});
      
      const result = dashboardManager.confirmTransfer();
      
      expect(result).toBe(false);
      expect(global.alert).toHaveBeenCalledWith('Please select a delegate to transfer the role to.');
    });

    it('should confirm transfer with selected delegate', () => {
      const select = document.getElementById('newPrimaryUserId');
      select.value = '1';
      global.confirm.mockReturnValue(true);
      
      const result = dashboardManager.confirmTransfer();
      
      expect(result).toBe(true);
      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to transfer the primary delegate role to Alice Smith?')
      );
    });
  });

  describe('Navigation and Utility Methods', () => {
    it('should navigate to specified URL', () => {
      const navBtn = document.querySelector('[data-action="navigate"]');
      navBtn.click();
      
      expect(window.location.href).toBe('/test-page');
    });

    it('should show success message with auto-removal', () => {
      vi.useFakeTimers();
      
      dashboardManager.showSuccessMessage('Operation completed successfully');
      
      const alert = document.querySelector('.alert-success');
      expect(alert).toBeTruthy();
      expect(alert.innerHTML).toContain('Operation completed successfully');
      
      vi.advanceTimersByTime(5000);
      expect(document.querySelector('.alert-success')).toBeFalsy();
      
      vi.useRealTimers();
    });

    it('should handle confirm delete with custom message', () => {
      global.confirm.mockReturnValue(true);
      
      const result = dashboardManager.confirmDelete('Delete this item?');
      
      expect(result).toBe(true);
      expect(global.confirm).toHaveBeenCalledWith('Delete this item?');
    });

    it('should handle confirm delete with default message', () => {
      global.confirm.mockReturnValue(false);
      
      const result = dashboardManager.confirmDelete();
      
      expect(result).toBe(false);
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this item? This action cannot be undone.');
    });
  });

  describe('Tab Switching', () => {
    it('should reset filters when switching to hosted tab', () => {
      const hostedTab = document.querySelector('[data-bs-target="#hosted-carnivals"]');
      const showAllSpy = vi.spyOn(dashboardManager, 'showAll');
      
      const event = new Event('shown.bs.tab');
      Object.defineProperty(event, 'target', { value: hostedTab });
      hostedTab.dispatchEvent(event);
      
      expect(showAllSpy).toHaveBeenCalledWith('hosted');
    });

    it('should reset filters when switching to attending tab', () => {
      const attendingTab = document.querySelector('[data-bs-target="#attending-carnivals"]');
      const showAllSpy = vi.spyOn(dashboardManager, 'showAll');
      
      const event = new Event('shown.bs.tab');
      Object.defineProperty(event, 'target', { value: attendingTab });
      attendingTab.dispatchEvent(event);
      
      expect(showAllSpy).toHaveBeenCalledWith('attending');
    });
  });

  describe('Event Delegation', () => {
    it('should handle filter button clicks through event delegation', () => {
      const showUpcomingSpy = vi.spyOn(dashboardManager, 'showUpcoming');
      const upcomingBtn = document.querySelector('[data-filter="upcoming"][data-target="hosted"]');
      
      upcomingBtn.click();
      
      expect(showUpcomingSpy).toHaveBeenCalledWith('hosted');
    });

    it('should ignore clicks on non-filter elements', () => {
      const showAllSpy = vi.spyOn(dashboardManager, 'showAll');
      const randomDiv = document.createElement('div');
      document.body.appendChild(randomDiv);
      
      randomDiv.click();
      
      expect(showAllSpy).not.toHaveBeenCalled();
    });
  });
});
