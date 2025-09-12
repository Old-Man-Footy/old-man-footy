import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { carnivalAddPlayersManager } from '../../../public/js/carnival-add-players.js';

/**
 * @fileoverview Unit tests for carnivalAddPlayersManager in carnival-add-players.js
 * Uses Vitest and jsdom.
 */

function setupDOM() {
    document.body.innerHTML = `
      <form id="addPlayersForm">
        <input type="checkbox" class="player-checkbox" value="1">
        <input type="checkbox" class="player-checkbox" value="2">
        <input type="checkbox" class="player-checkbox" value="3">
        <button id="submitBtn" type="submit">Add Selected Players</button>
      </form>
    `;
}

describe('carnivalAddPlayersManager', () => {
    beforeEach(() => {
        setupDOM();
        carnivalAddPlayersManager.initialize();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('should disable submit button and set default text when no checkboxes are checked', () => {
        const submitBtn = document.getElementById('submitBtn');
        expect(submitBtn.disabled).toBe(true);
        expect(submitBtn.innerHTML).toContain('Add Selected Players');
    });

    it('should enable submit button and update text when checkboxes are checked', () => {
        const submitBtn = document.getElementById('submitBtn');
        const checkboxes = document.querySelectorAll('.player-checkbox');
        checkboxes[0].checked = true;
        checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
        expect(submitBtn.disabled).toBe(false);
        expect(submitBtn.innerHTML).toContain('Add 1 Selected Player');
        checkboxes[1].checked = true;
        checkboxes[1].dispatchEvent(new Event('change', { bubbles: true }));
        expect(submitBtn.innerHTML).toContain('Add 2 Selected Players');
    });

    it('should provide selectAll and selectNone functions on window', () => {
        const checkboxes = document.querySelectorAll('.player-checkbox');
        const submitBtn = document.getElementById('submitBtn');
        expect(typeof window.selectAll).toBe('function');
        expect(typeof window.selectNone).toBe('function');
        // selectAll
        window.selectAll();
        checkboxes.forEach(cb => expect(cb.checked).toBe(true));
        expect(submitBtn.disabled).toBe(false);
        // selectNone
        window.selectNone();
        checkboxes.forEach(cb => expect(cb.checked).toBe(false));
        expect(submitBtn.disabled).toBe(true);
    });

    it('should prevent form submission and alert if no players selected', () => {
        const form = document.getElementById('addPlayersForm');
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
        // No checkboxes checked
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        expect(alertMock).toHaveBeenCalledWith('Please select at least one player to add.');
        alertMock.mockRestore();
    });

    it('should allow form submission if at least one player is selected', () => {
        const form = document.getElementById('addPlayersForm');
        const preventDefault = vi.fn();
        const checkboxes = document.querySelectorAll('.player-checkbox');
        checkboxes[0].checked = true;
        // Simulate submit carnival
        const carnival = new Event('submit', { bubbles: true, cancelable: true });
        carnival.preventDefault = preventDefault;
        form.dispatchEvent(carnival);
        expect(preventDefault).not.toHaveBeenCalled();
    });

    it('should update submit button text correctly for singular/plural', () => {
        const submitBtn = document.getElementById('submitBtn');
        const checkboxes = document.querySelectorAll('.player-checkbox');
        checkboxes[0].checked = true;
        checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
        expect(submitBtn.innerHTML).toContain('Add 1 Selected Player');
        checkboxes[1].checked = true;
        checkboxes[1].dispatchEvent(new Event('change', { bubbles: true }));
        expect(submitBtn.innerHTML).toContain('Add 2 Selected Players');
    });
});