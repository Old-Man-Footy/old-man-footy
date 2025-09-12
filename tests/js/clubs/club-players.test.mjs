import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clubPlayersPageManager } from '../../../public/js/club-players.js';

function setupDom() {
  document.body.innerHTML = `
    <button id="templateLink" href="/clubs/players/csv-template"></button>
    <div id="removePlayerModal"></div>
    <span id="playerNameToRemove"></span>
    <form id="removePlayerForm"></form>
    <div id="csvImportModal">
      <form>
        <input id="csvFile" type="file" />
        <button type="submit">Import Players</button>
      </form>
    </div>
    <form id="searchForm">
      <input id="search" />
      <button type="submit">Search</button>
      <select id="sortBy"></select>
      <select id="sortOrder"></select>
    </form>
  `;
}

describe('club-players.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  it('handles CSV file validations and form submit gating', () => {
    setupDom();
    // Mock bootstrap events by dispatching custom events with expected names
    clubPlayersPageManager.initialize();

    const fileInput = document.getElementById('csvFile');
    const form = fileInput.closest('form');

    // Invalid: no file on submit
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const submitEvt = new Carnival('submit', { cancelable: true, bubbles: true });
    const prevented = !form.dispatchEvent(submitEvt);
    expect(prevented).toBe(true);
    expect(alertSpy).toHaveBeenCalled();

    // Invalid: wrong extension
    const badFile = new File(['x'], 'players.txt', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', { value: { 0: badFile, length: 1, item: () => badFile }, configurable: true });
    fileInput.dispatchEvent(new Carnival('change'));
    expect(fileInput.value).toBe('');

    // Valid: CSV under size
    const goodFile = new File(['id,name\n1,John'], 'players.csv', { type: 'text/csv' });
    Object.defineProperty(fileInput, 'files', { value: { 0: goodFile, length: 1, item: () => goodFile }, configurable: true });
    const submitEvt2 = new Carnival('submit', { cancelable: true, bubbles: true });
    const prevented2 = !form.dispatchEvent(submitEvt2);
    expect(prevented2).toBe(false);
    const btn = form.querySelector('button[type="submit"]');
    expect(btn.disabled).toBe(true);
    expect(btn.innerHTML).toMatch(/Importing/);

    alertSpy.mockRestore();
  });

  it('auto-submits sort form with debounce', () => {
    setupDom();
    clubPlayersPageManager.initialize();

    const sortBy = document.getElementById('sortBy');
    const sortOrder = document.getElementById('sortOrder');
    const form = sortBy.closest('form');
    const submitSpy = vi.spyOn(form, 'submit').mockImplementation(() => {});

    sortBy.dispatchEvent(new Carnival('change', { bubbles: true }));
    sortOrder.dispatchEvent(new Carnival('change', { bubbles: true }));

    vi.advanceTimersByTime(600);
    expect(submitSpy).toHaveBeenCalled();

    submitSpy.mockRestore();
  });
});
