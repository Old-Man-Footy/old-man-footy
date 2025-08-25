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

  it('calls showAlert with success and reloads on success', () => {
    const result = { success: true, message: 'Approved!' };
    const onSuccess = vi.fn();
    vi.useFakeTimers();

    // Call the method on the manager object
    attendeesManager.handleActionResult(result, 'Error', onSuccess);

    // Check that the spy was called
    expect(showAlertSpy).toHaveBeenCalledWith('success', 'Approved!');
    expect(onSuccess).toHaveBeenCalled();
    
    vi.runAllTimers();
    expect(window.location.reload).toHaveBeenCalled();
    vi.useRealTimers();
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
