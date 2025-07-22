import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { setupCarnivalAddPlayers } from '/public/js/carnival-add-players.js';

/**
 * @fileoverview Unit tests for setupCarnivalAddPlayers in carnival-add-players.js
 * Uses Vitest and jsdom.
 */


describe('setupCarnivalAddPlayers', () => {
  let form, submitBtn, checkboxes;

  beforeEach(() => {
    // Set up DOM structure
    document.body.innerHTML = `
      <form id="addPlayersForm">
        <input type="checkbox" class="player-checkbox" value="1">
        <input type="checkbox" class="player-checkbox" value="2">
        <input type="checkbox" class="player-checkbox" value="3">
        <button id="submitBtn" type="submit">Add Selected Players</button>
      </form>
    `;
    form = document.getElementById('addPlayersForm');
    submitBtn = document.getElementById('submitBtn');
    checkboxes = document.querySelectorAll('.player-checkbox');
    // Remove any global functions from previous tests
    delete window.selectAll;
    delete window.selectNone;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete window.selectAll;
    delete window.selectNone;
    vi.restoreAllMocks();
  });

  it('should disable submit button and set default text when no checkboxes are checked', () => {
    setupCarnivalAddPlayers();
    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.innerHTML).toContain('Add Selected Players');
  });

  it('should enable submit button and update text when checkboxes are checked', () => {
    setupCarnivalAddPlayers();
    checkboxes[0].checked = true;
    checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
    expect(submitBtn.disabled).toBe(false);
    expect(submitBtn.innerHTML).toContain('Add 1 Selected Player');
    checkboxes[1].checked = true;
    checkboxes[1].dispatchEvent(new Event('change', { bubbles: true }));
    expect(submitBtn.innerHTML).toContain('Add 2 Selected Players');
  });

  it('should provide selectAll and selectNone functions on window', () => {
    setupCarnivalAddPlayers();
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
    setupCarnivalAddPlayers();
    const preventDefault = vi.fn();
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    // No checkboxes checked
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(alertMock).toHaveBeenCalledWith('Please select at least one player to add.');
    alertMock.mockRestore();
  });

  it('should allow form submission if at least one player is selected', () => {
    setupCarnivalAddPlayers();
    const preventDefault = vi.fn();
    checkboxes[0].checked = true;
    // Simulate submit event
    const event = new Event('submit', { bubbles: true, cancelable: true });
    event.preventDefault = preventDefault;
    form.dispatchEvent(event);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('should update submit button text correctly for singular/plural', () => {
    setupCarnivalAddPlayers();
    checkboxes[0].checked = true;
    checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
    expect(submitBtn.innerHTML).toContain('Add 1 Selected Player');
    checkboxes[1].checked = true;
    checkboxes[1].dispatchEvent(new Event('change', { bubbles: true }));
    expect(submitBtn.innerHTML).toContain('Add 2 Selected Players');
  });
});