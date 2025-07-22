import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resetPassword,
  toggleUserStatus,
  deleteUser,
  shouldCheckPrimaryOnClubChange,
  shouldRevertPrimaryDelegateChange,
} from '../../public/js/admin-user-management.js';

// Mock global functions and objects
global.fetch = vi.fn();
global.confirm = vi.fn();
global.alert = vi.fn();
global.console = { log: vi.fn(), error: vi.fn() };
global.window = {
  location: {
    reload: vi.fn(),
    href: '',
    pathname: '/admin/users',
  },
};

describe('resetPassword', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should not proceed if confirmation is cancelled', async () => {
    confirm.mockReturnValueOnce(false);
    await resetPassword('1', 'Test User');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should alert success on successful password reset', async () => {
    confirm.mockReturnValueOnce(true);
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    });
    await resetPassword('1', 'Test User');
    expect(alert).toHaveBeenCalledWith(
      'Password reset email sent successfully to Test User'
    );
  });

  it('should alert error on failed password reset', async () => {
    confirm.mockReturnValueOnce(true);
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, message: 'Failed' }),
    });
    await resetPassword('1', 'Test User');
    expect(alert).toHaveBeenCalledWith('Error: Failed');
  });

  it('should alert on fetch error', async () => {
    confirm.mockReturnValueOnce(true);
    fetch.mockRejectedValueOnce(new Error('Network error'));
    await resetPassword('1', 'Test User');
    expect(alert).toHaveBeenCalledWith(
      'An error occurred while sending the password reset email'
    );
  });
});

describe('toggleUserStatus', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function makeButton({ userId = '1', newStatus = 'true', userName = 'Test' } = {}) {
    return {
      getAttribute: vi.fn((attr) => {
        if (attr === 'data-user-id') return userId;
        if (attr === 'data-new-status') return newStatus;
        if (attr === 'data-user-name') return userName;
      }),
    };
  }

  it('should not proceed if confirmation is cancelled', async () => {
    confirm.mockReturnValueOnce(false);
    await toggleUserStatus(makeButton());
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should reload page on success', async () => {
    confirm.mockReturnValueOnce(true);
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, message: 'Activated' }),
    });
    await toggleUserStatus(makeButton({ newStatus: 'true' }));
    expect(alert).toHaveBeenCalledWith('Activated');
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should alert error on failed response', async () => {
    confirm.mockReturnValueOnce(true);
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: false, message: 'Failed' }),
    });
    await toggleUserStatus(makeButton());
    expect(alert).toHaveBeenCalledWith('Error: Failed');
  });

  it('should alert on HTTP error', async () => {
    confirm.mockReturnValueOnce(true);
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Server Error',
    });
    await toggleUserStatus(makeButton());
    expect(alert).toHaveBeenCalledWith(
      'An error occurred while updating the user status: HTTP 500: Server Error'
    );
  });

  it('should alert on fetch error', async () => {
    confirm.mockReturnValueOnce(true);
    fetch.mockRejectedValueOnce(new Error('Network error'));
    await toggleUserStatus(makeButton());
    expect(alert).toHaveBeenCalledWith(
      'An error occurred while updating the user status: Network error'
    );
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should not proceed if first confirmation is cancelled', async () => {
    confirm.mockReturnValueOnce(false);
    await deleteUser('1', 'Test User');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should not proceed if second confirmation is cancelled', async () => {
    confirm.mockReturnValueOnce(true).mockReturnValueOnce(false);
    await deleteUser('1', 'Test User');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should reload page on success from list page', async () => {
    confirm.mockReturnValueOnce(true).mockReturnValueOnce(true);
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, message: 'Deleted' }),
    });
    await deleteUser('1', 'Test User', false);
    expect(alert).toHaveBeenCalledWith('Deleted');
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should redirect on success from edit page', async () => {
    confirm.mockReturnValueOnce(true).mockReturnValueOnce(true);
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, message: 'Deleted' }),
    });
    await deleteUser('1', 'Test User', true);
    expect(window.location.href).toBe('/admin/users');
  });

  it('should alert error on failed delete', async () => {
    confirm.mockReturnValueOnce(true).mockReturnValueOnce(true);
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, message: 'Failed' }),
    });
    await deleteUser('1', 'Test User');
    expect(alert).toHaveBeenCalledWith('Error: Failed');
  });

  it('should alert on fetch error', async () => {
    confirm.mockReturnValueOnce(true).mockReturnValueOnce(true);
    fetch.mockRejectedValueOnce(new Error('Network error'));
    await deleteUser('1', 'Test User');
    expect(alert).toHaveBeenCalledWith(
      'An error occurred while deleting the user'
    );
  });
});

describe('initializeEditUserForm handlers', () => {
  let clubSelect, primaryDelegateCheckbox;

  beforeEach(() => {
    vi.resetAllMocks();
    // Arrange: Set up DOM elements by parsing HTML, which is more reliable in jsdom
    document.body.innerHTML = `
      <select id="clubId">
        <option value=""></option>
        <option value="1">Club One</option>
      </select>
      <input type="checkbox" id="isPrimaryDelegate" />
    `;
    clubSelect = document.getElementById('clubId');
    primaryDelegateCheckbox = document.getElementById('isPrimaryDelegate');
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('shouldCheckPrimaryOnClubChange', () => {
    it('should return true if user confirms', () => {
      // Arrange
      const mockConfirm = vi.fn().mockReturnValue(true);
      clubSelect.value = '1';
      primaryDelegateCheckbox.checked = false;

      // Pre-Assert: Confirm test setup is correct before acting
      expect(clubSelect.value).toBe('1');
      expect(primaryDelegateCheckbox.checked).toBe(false);
      
      // Act & Assert
      expect(shouldCheckPrimaryOnClubChange(clubSelect, primaryDelegateCheckbox, mockConfirm)).toBe(true);
      expect(mockConfirm).toHaveBeenCalled();
    });

    it('should return undefined if user does not confirm', () => {
      // Arrange
      const mockConfirm = vi.fn().mockReturnValue(false);
      clubSelect.value = '1';
      primaryDelegateCheckbox.checked = false;

      // Pre-Assert
      expect(clubSelect.value).toBe('1');
      expect(primaryDelegateCheckbox.checked).toBe(false);
      
      // Act & Assert
      expect(shouldCheckPrimaryOnClubChange(clubSelect, primaryDelegateCheckbox, mockConfirm)).toBeUndefined();
      expect(mockConfirm).toHaveBeenCalled();
    });
  });

  describe('shouldRevertPrimaryDelegateChange', () => {
    it('should return true if user cancels removal', () => {
      // Arrange
      const mockConfirm = vi.fn().mockReturnValue(false); // User clicks "Cancel"
      clubSelect.value = '1';
      primaryDelegateCheckbox.checked = false; // Simulate it being unchecked

      // Pre-Assert
      expect(clubSelect.value).toBe('1');
      expect(primaryDelegateCheckbox.checked).toBe(false);
      
      // Act & Assert
      expect(shouldRevertPrimaryDelegateChange(clubSelect, primaryDelegateCheckbox, mockConfirm)).toBe(true);
      expect(mockConfirm).toHaveBeenCalled();
    });

    it('should return undefined if user confirms removal', () => {
      // Arrange
      const mockConfirm = vi.fn().mockReturnValue(true); // User clicks "OK"
      clubSelect.value = '1';
      primaryDelegateCheckbox.checked = false; // Simulate it being unchecked

      // Pre-Assert
      expect(clubSelect.value).toBe('1');
      expect(primaryDelegateCheckbox.checked).toBe(false);

      // Act & Assert
      expect(shouldRevertPrimaryDelegateChange(clubSelect, primaryDelegateCheckbox, mockConfirm)).toBeUndefined();
      expect(mockConfirm).toHaveBeenCalled();
    });
  });
});