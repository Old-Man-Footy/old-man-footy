import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { carnivalMyClubPlayersManager } from '../../../public/js/carnival-my-club-players.js';

/**
 * @file carnival-my-club-players.test.js
 * @description Unit tests for carnivalMyClubPlayersManager (Manager Object Pattern).
 */

// Helper function to set up the DOM for each test
function setupDOM({ modalCheckboxCount = 3, checkedCount = 0 } = {}) {
  document.body.innerHTML = `
    <div data-registration-id="reg123"></div>
    <form id="addPlayersForm"></form>
    <button id="modalSubmitBtn"></button>
    <div>
      ${Array.from({ length: modalCheckboxCount })
        .map((_, i) =>
          `<input type="checkbox" class="modal-player-checkbox" ${i < checkedCount ? 'checked' : ''}>`
        ).join('')}
    </div>
    <button class="remove-player-btn" data-assignment-id="a1" data-player-name="John"></button>
    <button class="remove-player-btn" data-assignment-id="a2" data-player-name="Jane"></button>
  `;
}

describe('carnivalMyClubPlayersManager', () => {
  beforeEach(() => {
    setupDOM();
    carnivalMyClubPlayersManager.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('updateModalSubmitButton', () => {
    it('should disable submit button and set default label if no checkboxes are checked', () => {
      carnivalMyClubPlayersManager.elements.modalCheckboxes.forEach(cb => cb.checked = false);
      carnivalMyClubPlayersManager.updateModalSubmitButton();
      const btn = carnivalMyClubPlayersManager.elements.modalSubmitBtn;
      expect(btn.disabled).toBe(true);
      expect(btn.innerHTML).toContain('Add Selected Players');
    });

    it('should enable submit button and show correct label for one selected player', () => {
      carnivalMyClubPlayersManager.elements.modalCheckboxes.forEach((cb, i) => cb.checked = i === 0);
      carnivalMyClubPlayersManager.updateModalSubmitButton();
      const btn = carnivalMyClubPlayersManager.elements.modalSubmitBtn;
      expect(btn.disabled).toBe(false);
      expect(btn.innerHTML).toContain('Add 1 Player');
    });

    it('should enable submit button and show correct label for multiple selected players', () => {
      carnivalMyClubPlayersManager.elements.modalCheckboxes.forEach(cb => cb.checked = true);
      carnivalMyClubPlayersManager.updateModalSubmitButton();
      const btn = carnivalMyClubPlayersManager.elements.modalSubmitBtn;
      expect(btn.disabled).toBe(false);
      expect(btn.innerHTML).toContain('Add 3 Players');
    });
  });

  describe('selectAllModal', () => {
    it('should check all modal player checkboxes and update submit button', () => {
      carnivalMyClubPlayersManager.elements.modalCheckboxes.forEach(cb => cb.checked = false);
      const updateSpy = vi.spyOn(carnivalMyClubPlayersManager, 'updateModalSubmitButton');
      carnivalMyClubPlayersManager.selectAllModal();
      carnivalMyClubPlayersManager.elements.modalCheckboxes.forEach(cb => {
        expect(cb.checked).toBe(true);
      });
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('selectNoneModal', () => {
    it('should uncheck all modal player checkboxes and update submit button', () => {
      carnivalMyClubPlayersManager.elements.modalCheckboxes.forEach(cb => cb.checked = true);
      const updateSpy = vi.spyOn(carnivalMyClubPlayersManager, 'updateModalSubmitButton');
      carnivalMyClubPlayersManager.selectNoneModal();
      carnivalMyClubPlayersManager.elements.modalCheckboxes.forEach(cb => {
        expect(cb.checked).toBe(false);
      });
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('handleModalFormSubmit', () => {
    it('should prevent form submission and alert if no players selected', () => {
      carnivalMyClubPlayersManager.elements.modalCheckboxes.forEach(cb => cb.checked = false);
      const preventDefault = vi.fn();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      carnivalMyClubPlayersManager.handleModalFormSubmit({ preventDefault });
      expect(preventDefault).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Please select at least one player to add.');
    });

    it('should allow form submission if at least one player is selected', () => {
      carnivalMyClubPlayersManager.elements.modalCheckboxes[0].checked = true;
      const preventDefault = vi.fn();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      carnivalMyClubPlayersManager.handleModalFormSubmit({ preventDefault });
      expect(preventDefault).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  describe('handleRemovePlayerClick', () => {
    it('should call removePlayer if confirmed', () => {
      const btn = carnivalMyClubPlayersManager.elements.removePlayerBtns[0];
      const removeSpy = vi.spyOn(carnivalMyClubPlayersManager, 'removePlayer').mockImplementation(() => {});
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      btn.dispatchEvent(new Event('click', { bubbles: true }));
      expect(removeSpy).toHaveBeenCalledWith(btn.dataset.assignmentId);
    });

    it('should not call removePlayer if not confirmed', () => {
      const btn = carnivalMyClubPlayersManager.elements.removePlayerBtns[0];
      const removeSpy = vi.spyOn(carnivalMyClubPlayersManager, 'removePlayer').mockImplementation(() => {});
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      btn.dispatchEvent(new Event('click', { bubbles: true }));
      expect(removeSpy).not.toHaveBeenCalled();
    });
  });

  describe('removePlayer', () => {
    it('should alert if registrationId is missing', async () => {
      carnivalMyClubPlayersManager.registrationId = null;
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      await carnivalMyClubPlayersManager.removePlayer('a1');
      expect(alertSpy).toHaveBeenCalledWith('Registration ID not found.');
    });

    it('should reload page on success', async () => {
      carnivalMyClubPlayersManager.registrationId = 'reg123';
      carnivalMyClubPlayersManager.carnivalId = 'carnival1';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true })
      }));
      const reloadSpy = vi.spyOn(carnivalMyClubPlayersManager, 'locationReload').mockImplementation(() => {});
      await carnivalMyClubPlayersManager.removePlayer('a1');
      expect(reloadSpy).toHaveBeenCalled();
    });

    it('should alert error message on failure', async () => {
      carnivalMyClubPlayersManager.registrationId = 'reg123';
      carnivalMyClubPlayersManager.carnivalId = 'carnival1';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: false, message: 'Failed' })
      }));
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      await carnivalMyClubPlayersManager.removePlayer('a1');
      expect(alertSpy).toHaveBeenCalledWith('Error: Failed');
    });

    it('should alert on fetch error', async () => {
      carnivalMyClubPlayersManager.registrationId = 'reg123';
      carnivalMyClubPlayersManager.carnivalId = 'carnival1';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      await carnivalMyClubPlayersManager.removePlayer('a1');
      expect(alertSpy).toHaveBeenCalledWith('An error occurred while removing the player.');
    });
  });

  describe('extractIds', () => {
    it('should extract carnivalId from URL and registrationId from DOM', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/carnivals/carnival42/attendees/reg123' },
        writable: true
      });
      carnivalMyClubPlayersManager.cacheElements();
      carnivalMyClubPlayersManager.extractIds();
      expect(carnivalMyClubPlayersManager.carnivalId).toBe('carnival42');
      expect(carnivalMyClubPlayersManager.registrationId).toBe('reg123');
    });
  });
});