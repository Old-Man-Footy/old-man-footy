/**
 * @file carnival-attendees.test.js
 * @description Unit tests for carnival-attendees.js business logic functions.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
// Import the manager object directly.
import { attendeesManager } from '../../../public/js/carnival-attendees.js';

describe('shouldShowCard', () => {
  it('returns true if both filters are "all"', () => {
    expect(attendeesManager.shouldShowCard('all', 'all', 'approved', 'paid')).toBe(true);
  });

  // **THE FIX IS HERE:** Restoring the missing tests.
  it('returns true if approval matches and payment is "all"', () => {
    expect(attendeesManager.shouldShowCard('approved', 'all', 'approved', 'pending')).toBe(true);
  });

  it('returns false if approval does not match', () => {
    expect(attendeesManager.shouldShowCard('pending', 'all', 'approved', 'paid')).toBe(false);
  });

  it('returns false if payment does not match', () => {
    expect(attendeesManager.shouldShowCard('all', 'paid', 'approved', 'pending')).toBe(false);
  });

  it('returns true if both filters match', () => {
    expect(attendeesManager.shouldShowCard('approved', 'paid', 'approved', 'paid')).toBe(true);
  });

  it('returns false if either filter does not match', () => {
    expect(attendeesManager.shouldShowCard('approved', 'paid', 'pending', 'paid')).toBe(false);
    expect(attendeesManager.shouldShowCard('approved', 'paid', 'approved', 'pending')).toBe(false);
  });
});

describe('createNoResultsMessage', () => {
  it('creates a div with correct id and classes', () => {
    const el = attendeesManager.createNoResultsMessage();
    expect(el.tagName).toBe('DIV');
    expect(el.id).toBe('noFilterResults');
  });
});

describe('handleActionResult', () => {
  let showAlertSpy;
  const originalLocation = window.location;

  beforeEach(() => {
    // We now spy on the showAlert method of the imported object.
    showAlertSpy = vi.spyOn(attendeesManager, 'showAlert').mockImplementation(() => {});

    // Manually mock window.location.reload
    delete window.location;
    window.location = { ...originalLocation, reload: vi.fn() };
  });

  afterEach(() => {
    // Restore all mocks
    vi.restoreAllMocks();
    window.location = originalLocation;
  });

  it('calls showAlert with success without reloading on success', () => {
    const result = { success: true, message: 'Approved!' };
    const onSuccess = vi.fn();

    // Call the method on the manager object
    attendeesManager.handleActionResult(result, 'Error', onSuccess);

    // Check that the spy was called
    expect(showAlertSpy).toHaveBeenCalledWith('success', 'Approved!');
    expect(onSuccess).toHaveBeenCalled();
    
    // Verify that reload is NOT called since we removed the automatic reload
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('calls showAlert with danger on failure', () => {
    const result = { success: false, message: 'Failed!' };
    attendeesManager.handleActionResult(result, 'Error');
    expect(showAlertSpy).toHaveBeenCalledWith('danger', 'Failed!');
  });

  it('uses errorMessage if result.message is missing', () => {
    const result = { success: false };
    attendeesManager.handleActionResult(result, 'Fallback error');
    expect(showAlertSpy).toHaveBeenCalledWith('danger', 'Fallback error');
  });
});

describe('updateRegistrationUI', () => {
  beforeEach(() => {
    // Create a mock registration card for testing
    document.body.innerHTML = `
      <div data-registration-id="123" data-approval-status="pending">
        <div class="position-absolute top-0 end-0">
          <span class="badge bg-tertiary text-dark">
            <i class="bi bi-clock"></i> Pending
          </span>
        </div>
        <div class="flex-grow-1">
          <h6>Test Club</h6>
        </div>
        <div class="mt-3 pt-2 border-top">
          <button class="approve-registration">Approve</button>
          <button class="reject-registration">Reject</button>
        </div>
      </div>
      <div class="bg-primary">
        <div class="display-6">2</div>
      </div>
      <div class="bg-tertiary">
        <div class="display-6">1</div>
      </div>
    `;
    
    // Mock the applyFilters method
    attendeesManager.applyFilters = vi.fn();
  });

  it('updates UI for approved registration', () => {
    attendeesManager.updateRegistrationUI('123', 'approved');

    const card = document.querySelector('[data-registration-id="123"]');
    expect(card.dataset.approvalStatus).toBe('approved');

    const badge = card.querySelector('.badge');
    expect(badge.className).toBe('badge bg-primary');
    expect(badge.innerHTML).toContain('Approved');

    // Check that approval buttons were removed
    const approvalButtons = card.querySelector('.mt-3.pt-2.border-top');
    expect(approvalButtons).toBeNull();

    // Check that approval info was added
    const approvalInfo = card.querySelector('.text-success');
    expect(approvalInfo).toBeTruthy();
    expect(approvalInfo.innerHTML).toContain('Approved:');
  });

  it('updates UI for rejected registration', () => {
    attendeesManager.updateRegistrationUI('123', 'rejected', 'Test rejection reason');

    const card = document.querySelector('[data-registration-id="123"]');
    expect(card.dataset.approvalStatus).toBe('rejected');

    const badge = card.querySelector('.badge');
    expect(badge.className).toBe('badge bg-danger');
    expect(badge.innerHTML).toContain('Rejected');

    // Check that rejection info was added
    const rejectionInfo = card.querySelector('.text-danger');
    expect(rejectionInfo).toBeTruthy();
    expect(rejectionInfo.innerHTML).toContain('Test rejection reason');
  });

  it('updates attendance statistics correctly', () => {
    attendeesManager.updateAttendanceStatistics('approved');

    const approvedStat = document.querySelector('.bg-primary .display-6');
    const pendingStat = document.querySelector('.bg-tertiary .display-6');
    
    expect(approvedStat.textContent).toBe('3'); // 2 + 1
    expect(pendingStat.textContent).toBe('0'); // 1 - 1
  });
});
