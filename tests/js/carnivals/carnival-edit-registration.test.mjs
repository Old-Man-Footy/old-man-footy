import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { editRegistrationManager } from '../../../public/js/carnival-edit-registration.js';

describe('editRegistrationManager', () => {
  let originalConfirm;
  let originalAlert;
  let originalLocation;
  let originalConsoleError;
  let mockButton;
  let fetchMock;

  beforeEach(() => {
    // Mock global confirm, alert, and location
    originalConfirm = global.confirm;
    originalAlert = global.alert;
    originalLocation = window.location;
    originalConsoleError = console.error;

    global.confirm = vi.fn();
    global.alert = vi.fn();
    window.location = { href: '' };
    console.error = vi.fn();

    // Mock fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Mock button element
    mockButton = {
      dataset: {
        registrationId: '123',
        clubName: 'Test Club',
      },
    };
  });

  afterEach(() => {
    global.confirm = originalConfirm;
    global.alert = originalAlert;
    window.location = originalLocation;
    console.error = originalConsoleError;
    vi.resetAllMocks();
  });

  describe('initialize', () => {
    it('should set carnivalId and add event listener if button exists', () => {
      const addEventListener = vi.fn();
      const querySelector = vi.fn().mockReturnValue({ addEventListener });
      global.document = { querySelector };

      editRegistrationManager.initialize('42');

      expect(editRegistrationManager.carnivalId).toBe('42');
      expect(querySelector).toHaveBeenCalledWith('.remove-registration');
      expect(addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should not add event listener if button does not exist', () => {
      const querySelector = vi.fn().mockReturnValue(null);
      global.document = { querySelector };

      editRegistrationManager.initialize('42');

      expect(querySelector).toHaveBeenCalledWith('.remove-registration');
    });
  });

  describe('handleRemoveClick', () => {
    it('should call removeRegistration if confirmed', async () => {
      global.confirm = vi.fn(() => true);
      const spy = vi.spyOn(editRegistrationManager, 'removeRegistration').mockResolvedValue();

      await editRegistrationManager.handleRemoveClick(mockButton);

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to remove "Test Club" from this carnival?'
      );
      expect(spy).toHaveBeenCalledWith('123');
      spy.mockRestore();
    });

    it('should not call removeRegistration if not confirmed', async () => {
      global.confirm = vi.fn(() => false);
      const spy = vi.spyOn(editRegistrationManager, 'removeRegistration').mockResolvedValue();

      await editRegistrationManager.handleRemoveClick(mockButton);

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('removeRegistration', () => {
    beforeEach(() => {
      editRegistrationManager.carnivalId = '99';
    });

    it('should redirect on successful removal', async () => {
      vi.spyOn(editRegistrationManager, 'sendRequest').mockResolvedValue({ success: true });

      await editRegistrationManager.removeRegistration('555');

      expect(window.location.href).toBe('/carnivals/99/attendees');
    });

    it('should alert with message on failure', async () => {
      vi.spyOn(editRegistrationManager, 'sendRequest').mockResolvedValue({
        success: false,
        message: 'Failed to remove',
      });

      await editRegistrationManager.removeRegistration('555');

      expect(global.alert).toHaveBeenCalledWith('Failed to remove');
    });

    it('should alert with default message if no message provided', async () => {
      vi.spyOn(editRegistrationManager, 'sendRequest').mockResolvedValue({
        success: false,
      });

      await editRegistrationManager.removeRegistration('555');

      expect(global.alert).toHaveBeenCalledWith('Error removing registration');
    });

    it('should alert on exception', async () => {
      vi.spyOn(editRegistrationManager, 'sendRequest').mockRejectedValue(new Error('Network error'));

      await editRegistrationManager.removeRegistration('555');

      expect(console.error).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith(
        'An error occurred while removing the registration.'
      );
    });
  });

  describe('sendRequest', () => {
    it('should call fetch with correct params (no body)', async () => {
      fetchMock.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });

      const result = await editRegistrationManager.sendRequest('/url', 'DELETE');
      expect(fetchMock).toHaveBeenCalledWith('/url', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual({ ok: true });
    });

    it('should call fetch with correct params (with body)', async () => {
      fetchMock.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });

      const body = { foo: 'bar' };
      await editRegistrationManager.sendRequest('/url', 'POST', body);

      expect(fetchMock).toHaveBeenCalledWith('/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    });
  });
});