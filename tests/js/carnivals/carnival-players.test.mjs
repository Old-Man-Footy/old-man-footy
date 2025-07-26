import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { carnivalPlayersManager } from '../../../public/js/carnival-players.js';

/**
 * @file carnival-players.test.js
 * @description Unit tests for carnivalPlayersManager.
 */

// Helper to set up DOM structure for tests
function setupDOM() {
  document.body.innerHTML = `
    <input id="searchPlayers" />
    <select id="filterClub">
      <option value="">All</option>
      <option value="Lions">Lions</option>
    </select>
    <select id="filterAge">
      <option value="">All</option>
      <option value="masters">Masters</option>
    </select>
    <select id="filterAttendance">
      <option value="">All</option>
      <option value="present">Present</option>
    </select>
    <button id="clearFilters"></button>
    <button id="clearFiltersEmpty"></button>
    <button id="exportToCSV"></button>
    <button id="printList"></button>
    <span id="visibleCount"></span>
    <div id="emptyState"></div>
    <table id="playersTable">
      <thead>
        <tr>
          <th class="sortable" data-sort="club"><i></i></th>
          <th class="sortable" data-sort="name"><i></i></th>
        </tr>
      </thead>
      <tbody id="playersTableBody">
        <tr class="player-row" data-search="john lions" data-club="Lions" data-age="36" data-masters="true" data-status="present">
          <td>Lions</td><td>John Smith</td><td>36</td><td>1988-01-01</td><td>Red</td><td>Present</td>
        </tr>
        <tr class="player-row" data-search="mike tigers" data-club="Tigers" data-age="28" data-masters="false" data-status="absent">
          <td>Tigers</td><td>Mike Brown</td><td>28</td><td>1996-05-12</td><td>Blue</td><td>Absent</td>
        </tr>
      </tbody>
    </table>
    <div class="card"></div>
    <div class="club-summary-card" data-club="Lions"></div>
    <div class="club-summary-card" data-club="Tigers"></div>
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
    expect(carnivalPlayersManager.elements.clubSummaryCards.length).toBe(2);
  });

  it('should initialize state arrays with player rows', () => {
    expect(carnivalPlayersManager.state.allPlayers.length).toBe(2);
    expect(carnivalPlayersManager.state.filteredPlayers.length).toBe(2);
  });

  it('should filter players by search input', () => {
    carnivalPlayersManager.elements.searchInput.value = 'john';
    carnivalPlayersManager.handleSearch();
    expect(carnivalPlayersManager.state.filteredPlayers.length).toBe(1);
    expect(carnivalPlayersManager.state.filteredPlayers[0].dataset.search).toContain('john');
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

  it('should clear all filters and show all players', () => {
    carnivalPlayersManager.elements.filterClub.value = 'Lions';
    carnivalPlayersManager.handleFilters();
    carnivalPlayersManager.clearAllFilters();
    expect(carnivalPlayersManager.state.filteredPlayers.length).toBe(2);
    expect(carnivalPlayersManager.elements.filterClub.value).toBe('');
  });

  it('should update visible count correctly', () => {
    carnivalPlayersManager.elements.filterClub.value = 'Lions';
    carnivalPlayersManager.handleFilters();
    expect(carnivalPlayersManager.elements.visibleCountElement.textContent).toContain('Showing 1 of 2 players');
  });

  it('should sort players by name ascending and descending', () => {
    carnivalPlayersManager.handleSort('name');
    expect(carnivalPlayersManager.state.currentSort.column).toBe('name');
    expect(carnivalPlayersManager.state.currentSort.direction).toBe('asc');
    carnivalPlayersManager.handleSort('name');
    expect(carnivalPlayersManager.state.currentSort.direction).toBe('desc');
  });

  it('should export visible players to CSV', () => {
    const downloadSpy = vi.spyOn(carnivalPlayersManager, 'downloadCSV').mockImplementation(() => {});
    carnivalPlayersManager.exportToCSV();
    expect(downloadSpy).toHaveBeenCalled();
  });

  it('should print player list', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => ({
      document: {
        write: vi.fn(),
        close: vi.fn()
      },
      print: vi.fn(),
      close: vi.fn()
    }));
    carnivalPlayersManager.printPlayerList();
    expect(openSpy).toHaveBeenCalled();
  });

  it('should debounce function calls', async () => {
    const fn = vi.fn();
    const debounced = carnivalPlayersManager.debounce(fn, 50);
    debounced();
    debounced();
    await new Promise(r => setTimeout(r, 60));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});