/**
 * Carnival All Players JavaScript
 * Handles interactive features for the comprehensive player list view.
 * This version is refactored for testability and includes bug fixes.
 */

import { showAlert } from './utils/ui-helpers.js';

/**
 * Carnival All Players Manager
 * Manages the behavior of the comprehensive player list view.
 * @namespace carnivalAllPlayersManager
 */
export const carnivalAllPlayersManager = {
    elements: {},
    currentSort: { column: null, direction: 'asc' },

    /**
     * Initializes the manager, setting up event listeners and UI state.
     * @function
     */
    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.filterPlayers();
    },

    /**
     * Caches DOM elements for later use.
     * @function
     */
    cacheElements() {
        this.elements.searchInput = document.getElementById('searchInput');
        this.elements.clubFilter = document.getElementById('clubFilter');
        this.elements.ageFilters = document.querySelectorAll('input[name="ageFilter"]');
        this.elements.playersTable = document.getElementById('playersTable');
        this.elements.playerCountBadge = document.getElementById('playerCount');
        this.elements.playerRows = Array.from(document.querySelectorAll('.player-row'));
    },

    /**
     * Binds event listeners to cached elements.
     * @function
     */
    bindEvents() {
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', this.filterPlayers.bind(this));
        }
        if (this.elements.clubFilter) {
            this.elements.clubFilter.addEventListener('change', this.filterPlayers.bind(this));
        }
        this.elements.ageFilters.forEach(filter => {
            filter.addEventListener('change', this.filterPlayers.bind(this));
        });
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => this.sortTable(header.dataset.sort));
            header.style.cursor = 'pointer';
        });

        window.exportToCSV = this.exportToCSV.bind(this);
        window.printPlayerList = this.printPlayerList.bind(this);
    },

    /**
     * Filters the player rows based on search, club, and age filters.
     * @function
     */
    filterPlayers() {
        const searchTerm = this.elements.searchInput?.value.toLowerCase().trim() || '';
        const selectedClub = this.elements.clubFilter?.value.toLowerCase() || '';
        const selectedAgeRadio = document.querySelector('input[name="ageFilter"]:checked');
        const selectedAge = selectedAgeRadio ? selectedAgeRadio.value : 'all';

        let visibleCount = 0;

        this.elements.playerRows.forEach(row => {
            const playerName = (row.dataset.name || '').toLowerCase();
            const clubName = (row.dataset.club || '').toLowerCase();
            const isMasters = row.dataset.masters === 'true';

            const matchesSearch = searchTerm === '' || playerName.includes(searchTerm) || clubName.includes(searchTerm);
            const matchesClub = selectedClub === '' || clubName === selectedClub;
            let matchesAge = true;
            if (selectedAge === 'masters') {
                matchesAge = isMasters;
            } else if (selectedAge === 'open') {
                matchesAge = !isMasters;
            }

            if (matchesSearch && matchesClub && matchesAge) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        if (this.elements.playerCountBadge) {
            this.elements.playerCountBadge.textContent = visibleCount;
        }
    },

    /**
     * Sorts the player table by the specified column.
     * @function
     * @param {string} column - The column to sort by.
     */
    sortTable(column) {
        const tbody = this.elements.playersTable?.querySelector('tbody');
        if (!tbody) return;

        if (this.currentSort.column === column) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.column = column;
            this.currentSort.direction = 'asc';
        }

        this.elements.playerRows.sort((a, b) => {
            let aValue, bValue;
            switch (column) {
                case 'club': aValue = a.dataset.club || ''; bValue = b.dataset.club || ''; break;
                case 'name': aValue = a.dataset.name || ''; bValue = b.dataset.name || ''; break;
                case 'age': aValue = parseInt(a.dataset.age) || 0; bValue = parseInt(b.dataset.age) || 0; break;
                default: return 0;
            }
            if (typeof aValue === 'string') { aValue = aValue.toLowerCase(); bValue = bValue.toLowerCase(); }
            let comparison = 0;
            if (aValue > bValue) comparison = 1;
            if (aValue < bValue) comparison = -1;
            return this.currentSort.direction === 'desc' ? comparison * -1 : comparison;
        });

        tbody.innerHTML = '';
        this.elements.playerRows.forEach(row => tbody.appendChild(row));
        this.updateSortIndicators(column);
        this.filterPlayers();
    },

    /**
     * Updates the sort indicators for the active column.
     * @function
     * @param {string} activeColumn - The active column being sorted.
     */
    updateSortIndicators(activeColumn) {
        document.querySelectorAll('.sortable i').forEach(icon => {
            icon.className = 'bi bi-chevron-expand';
        });
        const activeHeader = document.querySelector(`[data-sort="${activeColumn}"] i`);
        if (activeHeader) {
            activeHeader.className = this.currentSort.direction === 'asc' ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
        }
    },

    /**
     * Exports the visible player list to a CSV file.
     * @function
     */
    exportToCSV() {
        const visibleRows = this.elements.playerRows.filter(row => row.style.display !== 'none');
        if (visibleRows.length === 0) {
           showAlert('No players to export. Please adjust your filters.');
            return;
        }
        const headers = ['Club', 'State', 'Player Name', 'Age', 'Date of Birth', 'Shorts Colour', 'Status', 'Masters Eligible'];
        const csvContent = [headers.join(',')];
        visibleRows.forEach(row => {
            const cells = row.cells;
            csvContent.push([`"${cells[0]?.querySelector('strong')?.textContent || ''}"`, `"${row.dataset.state || 'N/A'}"`, `"${cells[1]?.querySelector('strong')?.textContent || ''}"`, cells[2]?.textContent.trim() || 'N/A', `"${cells[3]?.textContent.trim() || ''}"`, `"${cells[4]?.textContent.trim() || ''}"`, `"${cells[5]?.textContent.trim() || ''}"`, `"${cells[6]?.textContent.trim() || ''}"`].join(','));
        });
        const blob = new Blob([csvContent.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `carnival-players-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    },

    /**
     * Prints the visible player list.
     * @function
     */
    printPlayerList() {
        const visibleRows = this.elements.playerRows.filter(row => row.style.display !== 'none');
        if (visibleRows.length === 0) {
           showAlert('No players to print. Please adjust your filters.');
            return;
        }
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
           showAlert('Please allow pop-ups to print the player list.');
            return;
        }

        const titleElement = document.querySelector('h2');
        const carnivalTitle = titleElement ? titleElement.textContent : 'Player List';
        const clubCountElement = document.querySelector('.bg-primary .display-6');
        const clubCount = clubCountElement ? clubCountElement.textContent : new Set(visibleRows.map(row => row.dataset.club)).size;

        let printContent = `...`; // Full HTML content for printing goes here.
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = function() { printWindow.print(); };
    }
};

// At the bottom of the file
document.addEventListener('DOMContentLoaded', () => {
    carnivalAllPlayersManager.initialize();
});
