import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
// Ensure this path is correct for your project structure
import { setupCarnivalAllPlayers } from '../../public/js/carnival-all-players.js';

/**
 * @file carnival-all-players.test.js
 * @description Unit tests for the Carnival All Players interactive script.
 */

function setupDOM() {
    // This HTML provides all the elements the script interacts with.
    document.body.innerHTML = `
        <h2>Carnival 2024</h2>
        <div class="card bg-primary"><div class="card-body"><span class="display-6">3</span></div></div>
        <input id="searchInput" value="" />
        <select id="clubFilter">
            <option value="">All Clubs</option>
            <option value="Lions">Lions</option>
            <option value="Tigers">Tigers</option>
        </select>
        <input type="radio" name="ageFilter" value="all" checked />
        <input type="radio" name="ageFilter" value="open" />
        <input type="radio" name="ageFilter" value="masters" />
        <span id="playerCount"></span>
        <table id="playersTable">
            <thead><tr>
                <th class="sortable" data-sort="club">Club <i></i></th>
                <th class="sortable" data-sort="name">Name <i></i></th>
                <th class="sortable" data-sort="age">Age <i></i></th>
            </tr></thead>
            <tbody>
                <tr class="player-row" data-name="Alice Smith" data-club="Lions" data-age="36" data-masters="true"><td><strong>Lions</strong></td><td><strong>Alice Smith</strong></td><td>36</td></tr>
                <tr class="player-row" data-name="Bob Jones" data-club="Tigers" data-age="28" data-masters="false"><td><strong>Tigers</strong></td><td><strong>Bob Jones</strong></td><td>28</td></tr>
                <tr class="player-row" data-name="Charlie Day" data-club="Lions" data-age="30" data-masters="false"><td><strong>Lions</strong></td><td><strong>Charlie Day</strong></td><td>30</td></tr>
            </tbody>
        </table>
    `;
}

describe('Carnival All Players Script', () => {
    let carnivalApp;

    beforeEach(() => {
        setupDOM();

        // Mock browser functions
        window.alert = vi.fn();
        window.open = vi.fn(() => ({ document: { write: vi.fn(), close: vi.fn() }, onload: vi.fn(), print: vi.fn() }));
        window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
        window.URL.revokeObjectURL = vi.fn();

        const originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation((tag) => {
            const element = originalCreateElement(tag);
            if (tag === 'a') element.click = vi.fn();
            return element;
        });

        // Initialize the script and capture the returned functions
        carnivalApp = setupCarnivalAllPlayers(document);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('should initialize with the correct player count', () => {
        expect(document.getElementById('playerCount').textContent).toBe('3');
    });

    it('should filter by search input', () => {
        const searchInput = document.getElementById('searchInput');
        searchInput.value = 'bob';
        searchInput.dispatchEvent(new Event('input'));
        expect(document.getElementById('playerCount').textContent).toBe('1');
    });
    
    it('should sort by name', () => {
        const nameHeader = document.querySelector('[data-sort="name"]');
        nameHeader.dispatchEvent(new Event('click')); // asc
        let rows = document.querySelectorAll('.player-row');
        expect(rows[0].dataset.name).toBe('Alice Smith');
        nameHeader.dispatchEvent(new Event('click')); // desc
        rows = document.querySelectorAll('.player-row');
        expect(rows[0].dataset.name).toBe('Charlie Day');
    });

    it('should alert if no players are visible for export', () => {
        const searchInput = document.getElementById('searchInput');
        searchInput.value = 'nonexistent';
        searchInput.dispatchEvent(new Event('input'));
        carnivalApp.exportToCSV();
        expect(window.alert).toHaveBeenCalledWith('No players to export. Please adjust your filters.');
    });

    it('should alert if no players are visible for printing', () => {
        // **THE FIX IS HERE:**
        // This test now uses a valid combination of filters to produce zero results.
        
        // 1. Filter by a club that has no masters players
        const clubFilter = document.getElementById('clubFilter');
        clubFilter.value = 'Tigers'; // Only Bob Jones (non-master) remains
        clubFilter.dispatchEvent(new Event('change'));
        
        // 2. Now filter by masters, which will hide Bob Jones
        const mastersRadio = document.querySelector('input[name="ageFilter"][value="masters"]');
        mastersRadio.checked = true;
        mastersRadio.dispatchEvent(new Event('change'));

        // At this point, no players should be visible
        carnivalApp.printPlayerList();
        
        // The alert should now be called correctly
        expect(window.alert).toHaveBeenCalledWith('No players to print. Please adjust your filters.');
    });
});
