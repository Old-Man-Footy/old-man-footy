/**
 * Carnival All Players JavaScript
 * Handles interactive features for the comprehensive player list view.
 * This version is refactored for testability and includes bug fixes.
 */

/**
 * Sets up all event listeners and interactive functionality for the player list.
 * @param {Document} document - The document object to operate on.
 * @returns {Object} An object containing the export and print functions for testing.
 */
export function setupCarnivalAllPlayers(document) {
    const searchInput = document.getElementById('searchInput');
    const clubFilter = document.getElementById('clubFilter');
    const ageFilters = document.querySelectorAll('input[name="ageFilter"]');
    const playersTable = document.getElementById('playersTable');
    const playerCountBadge = document.getElementById('playerCount');
    const playerRows = Array.from(document.querySelectorAll('.player-row'));

    let currentSort = { column: null, direction: 'asc' };

    function filterPlayers() {
        if (!searchInput || !clubFilter || !playerCountBadge) return;

        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedClub = clubFilter.value.toLowerCase();
        const selectedAgeRadio = document.querySelector('input[name="ageFilter"]:checked');
        const selectedAge = selectedAgeRadio ? selectedAgeRadio.value : 'all';

        let visibleCount = 0;

        playerRows.forEach(row => {
            const playerName = (row.dataset.name || '').toLowerCase();
            const clubName = (row.dataset.club || '').toLowerCase();
            const isMasters = row.dataset.masters === 'true';

            // **THE BUG FIX IS HERE:** This logic is now explicit and correct.
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

        playerCountBadge.textContent = visibleCount;
    }

    function sortTable(column) {
        if (!playersTable) return;
        const tbody = playersTable.querySelector('tbody');
        if (!tbody) return;

        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'asc';
        }

        playerRows.sort((a, b) => {
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
            return currentSort.direction === 'desc' ? comparison * -1 : comparison;
        });

        tbody.innerHTML = '';
        playerRows.forEach(row => tbody.appendChild(row));
        updateSortIndicators(column);
        filterPlayers();
    }

    function updateSortIndicators(activeColumn) {
        document.querySelectorAll('.sortable i').forEach(icon => {
            icon.className = 'bi bi-chevron-expand';
        });
        const activeHeader = document.querySelector(`[data-sort="${activeColumn}"] i`);
        if (activeHeader) {
            activeHeader.className = currentSort.direction === 'asc' ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
        }
    }

    const exportToCSV = function() {
        const visibleRows = Array.from(document.querySelectorAll('.player-row')).filter(row => row.style.display !== 'none');
        if (visibleRows.length === 0) {
            alert('No players to export. Please adjust your filters.');
            return;
        }
        const headers = ['Club', 'State', 'Player Name', 'Age', 'Date of Birth', 'Shorts Colour', 'Status', 'Masters Eligible'];
        const csvContent = [headers.join(',')];
        visibleRows.forEach(row => {
            const cells = row.cells;
            csvContent.push([`"${cells[0] ? cells[0].querySelector('strong').textContent : ''}"`, `"${row.dataset.state || 'N/A'}"`, `"${cells[1] ? cells[1].querySelector('strong').textContent : ''}"`, cells[2] ? cells[2].textContent.trim() : 'N/A', `"${cells[3] ? cells[3].textContent.trim() : ''}"`, `"${cells[4] ? cells[4].textContent.trim() : ''}"`, `"${cells[5] ? cells[5].textContent.trim() : ''}"`, `"${cells[6] ? cells[6].textContent.trim() : ''}"`].join(','));
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
    };

    const printPlayerList = function() {
        const visibleRows = Array.from(document.querySelectorAll('.player-row')).filter(row => row.style.display !== 'none');
        if (visibleRows.length === 0) {
            alert('No players to print. Please adjust your filters.');
            return;
        }
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow pop-ups to print the player list.');
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
    };

    // Attach to window for browser execution
    window.exportToCSV = exportToCSV;
    window.printPlayerList = printPlayerList;

    if (searchInput) searchInput.addEventListener('input', filterPlayers);
    if (clubFilter) clubFilter.addEventListener('change', filterPlayers);
    ageFilters.forEach(filter => filter.addEventListener('change', filterPlayers));
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', function() { sortTable(this.dataset.sort); });
        header.style.cursor = 'pointer';
    });

    filterPlayers();

    return { exportToCSV, printPlayerList };
}

// This part is for the actual browser environment.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setupCarnivalAllPlayers(document));
    } else {
        setupCarnivalAllPlayers(document);
    }
}
