import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { carnivalPlayersManager } from '../../../public/js/carnival-players.js';

/**
 * @file carnival-players.test.js
 * @description Unit tests for carnivalPlayersManager (client-side manager object).
 */

// Helper to set up DOM structure for player table and controls
function setupDOM() {
  document.body.innerHTML = `
    <input id="searchPlayers" type="text" />
    <select id="filterClub">
      <option value="">All</option>
      <option value="Lions">Lions</option>
      <option value="Tigers">Tigers</option>
    </select>
    <select id="filterAge">
      <option value="">All</option>
      <option value="masters">Masters</option>
      <option value="under35">Under 35</option>
    </select>
    <select id="filterAttendance">
      <option value="">All</option>
      <option value="present">Present</option>
      <option value="absent">Absent</option>
    </select>
    <button id="clearFilters"></button>
    <button id="clearFiltersEmpty"></button>
    <button id="exportToCSV"></button>
    <button id="printList"></button>
    <span id="visibleCount"></span>
    <table id="playersTable">
      <thead>
        <tr>
          <th class="sortable" data-sort="club"><i></i></th>
          <th class="sortable" data-sort="name"><i></i></th>
          <th class="sortable" data-sort="age"><i></i></th>
          <th class="sortable" data-sort="dob"><i></i></th>
          <th class="sortable" data-sort="shorts"><i></i></th>
          <th class="sortable" data-sort="status"><i></i></th>
        </tr>
      </thead>
      <tbody id="playersTableBody">
        <tr class="player-row" data-search="john lions" data-club="Lions" data-age="40" data-masters="true" data-status="present">
          <td>Lions</td>
          <td>John Smith</td>
          <td>40</td>
          <td>1984-01-01</td>
          <td>Red</td>
          <td>Present</td>
          <td><span class="badge state-active">Active</span></td>
        </tr>
        <tr class="player-row" data-search="jane tigers" data-club="Tigers" data-age="28" data-masters="false" data-status="absent">
          <td>Tigers</td>
          <td>Jane Doe</td>
          <td>28</td>
          <td>1996-05-12</td>
          <td>Blue</td>
          <td>Absent</td>
          <td><span class="badge state-inactive">Inactive</span></td>
        </tr>
      </tbody>
    </table>
    <div id="emptyState" class="d-none"></div>
    <div class="club-summary-card" data-club="Lions"></div>
    <div class="club-summary-card" data-club="Tigers"></div>
    <h4 class="text-muted">Carnival 2024</h4>
  `;
}

describe('carnivalPlayersManager', () => {
  beforeEach(() => {
    setupDOM();
    carnivalPlayersManager.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should cache DOM elements on initialize', () => {
    expect(carnivalPlayersManager.elements.searchInput).toBeInstanceOf(HTMLInputElement);
    expect(carnivalPlayersManager.elements.playersTable).toBeInstanceOf(HTMLTableElement);
    expect(Array.isArray(carnivalPlayersManager.elements.clubSummaryCards)).toBe(true);
  });

  it('should capture initial player rows', () => {
    expect(carnivalPlayersManager.state.allPlayers.length).toBe(2);
    expect(carnivalPlayersManager.state.filteredPlayers.length).toBe(2);
  });

  it('should filter players by club', () => {
    carnivalPlayersManager.elements.filterClub.value = 'Lions';
    carnivalPlayersManager.handleFilters();
    expect(carnivalPlayersManager.state.filteredPlayers.length).toBe(1);
    expect(carnivalPlayersManager.state.filteredPlayers[0].dataset.club).toBe('Lions');
  });

  it('should filter players by age group (masters)', () => {
    carnivalPlayersManager.elements.filterAge.value = 'masters';
    carnivalPlayersManager.handleFilters();
    expect(carnivalPlayersManager.state.filteredPlayers.length).toBe(1);
    expect(carnivalPlayersManager.state.filteredPlayers[0].dataset.masters).toBe('true');
  });

  it('should filter players by attendance status', () => {
    carnivalPlayersManager.elements.filterAttendance.value = 'absent';
    carnivalPlayersManager.handleFilters();
    expect(carnivalPlayersManager.state.filteredPlayers.length).toBe(1);
    expect(carnivalPlayersManager.state.filteredPlayers[0].dataset.status).toBe('absent');
  });

  it('should filter players by search input', () => {
    carnivalPlayersManager.elements.searchInput.value = 'jane';
    carnivalPlayersManager.handleSearch();
    expect(carnivalPlayersManager.state.filteredPlayers.length).toBe(1);
    expect(carnivalPlayersManager.state.filteredPlayers[0].dataset.search).toContain('jane');
  });

  it('should clear all filters', () => {
    carnivalPlayersManager.elements.filterClub.value = 'Lions';
    carnivalPlayersManager.elements.filterAge.value = 'masters';
    carnivalPlayersManager.elements.filterAttendance.value = 'present';
    carnivalPlayersManager.elements.searchInput.value = 'john';
    carnivalPlayersManager.clearAllFilters();
    expect(carnivalPlayersManager.elements.filterClub.value).toBe('');
    expect(carnivalPlayersManager.elements.filterAge.value).toBe('');
    expect(carnivalPlayersManager.elements.filterAttendance.value).toBe('');
    expect(carnivalPlayersManager.elements.searchInput.value).toBe('');
    expect(carnivalPlayersManager.state.filteredPlayers.length).toBe(2);
  });

  it('should update visible count', () => {
    carnivalPlayersManager.elements.filterClub.value = 'Lions';
    carnivalPlayersManager.handleFilters();
    expect(carnivalPlayersManager.elements.visibleCountElement.textContent).toContain('Showing 1 of 2 players');
  });

  it('should update empty state when no players are visible', () => {
    carnivalPlayersManager.elements.searchInput.value = 'notfound';
    carnivalPlayersManager.handleSearch();
    expect(carnivalPlayersManager.elements.emptyState.classList.contains('d-none')).toBe(false);
  });

  it('should highlight club summary card when club is selected', () => {
    carnivalPlayersManager.elements.filterClub.value = 'Lions';
    carnivalPlayersManager.updateClubSummaryHighlight();
    const lionsCard = carnivalPlayersManager.elements.clubSummaryCards.find(card => card.dataset.club === 'Lions');
    expect(lionsCard.classList.contains('border-primary')).toBe(true);
    expect(lionsCard.classList.contains('bg-tertiary')).toBe(true);
  });

  it('should sort players by name ascending and descending', () => {
    carnivalPlayersManager.handleSort('name');
    const firstRow = carnivalPlayersManager.elements.playersTableBody.children[0];
    expect(firstRow.cells[1].textContent).toBe('Jane Doe');
    carnivalPlayersManager.handleSort('name');
    const firstRowDesc = carnivalPlayersManager.elements.playersTableBody.children[0];
    expect(firstRowDesc.cells[1].textContent).toBe('John Smith');
  });

  it('should extract text from cell', () => {
    const cell = carnivalPlayersManager.state.allPlayers[0].cells[1];
    expect(carnivalPlayersManager.extractTextFromCell(cell)).toBe('John Smith');
  });

  it('should call downloadCSV when exporting to CSV', () => {
    const spy = vi.spyOn(carnivalPlayersManager, 'downloadCSV').mockImplementation(() => {});
    carnivalPlayersManager.exportToCSV();
    expect(spy).toHaveBeenCalled();
  });

  it('should call print when printing player list', () => {
    const printSpy = vi.fn();
    vi.stubGlobal('window', {
      open: () => ({ document: { write: vi.fn(), close: vi.fn() }, print: printSpy, close: vi.fn() })
    });
    carnivalPlayersManager.printPlayerList();
    expect(printSpy).toHaveBeenCalled();
  });

  it('should debounce function calls', async () => {
    const fn = vi.fn();
    const debounced = carnivalPlayersManager.debounce(fn, 50);
    debounced();
    debounced();
    await new Promise(r => setTimeout(r, 60));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should focus search input on Ctrl+F shortcut', () => {
    const input = carnivalPlayersManager.elements.searchInput;
    const focusSpy = vi.spyOn(input, 'focus');
    const selectSpy = vi.spyOn(input, 'select');
    carnivalPlayersManager.handleShortcuts({ ctrlKey: true, key: 'f', preventDefault: vi.fn() });
    expect(focusSpy).toHaveBeenCalled();
    expect(selectSpy).toHaveBeenCalled();
  });

  it('should clear filters and blur input on Escape', () => {
    const input = carnivalPlayersManager.elements.searchInput;
    input.focus();
    const blurSpy = vi.spyOn(input, 'blur');
    carnivalPlayersManager.handleShortcuts({ key: 'Escape', preventDefault: vi.fn() });
    expect(blurSpy).toHaveBeenCalled();
  });
});