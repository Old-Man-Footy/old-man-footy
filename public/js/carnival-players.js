/**
 * Carnival Players List Interactive Features
 * Refactored to Manager Object Pattern: search, filtering, sorting, export, print, and shortcuts
 */

export const carnivalPlayersManager = {
    elements: {},
    state: {
        currentSort: { column: null, direction: 'asc' },
        allPlayers: [],
        filteredPlayers: []
    },

    initialize() {
        this.cacheElements();
        this.captureInitialRows();
        this.bindEvents();
        this.updateVisibleCount();
        this.initTooltipsIfAvailable();
    },

    cacheElements() {
        const d = document;
        this.elements.searchInput = d.getElementById('searchPlayers');
        this.elements.filterClub = d.getElementById('filterClub');
        this.elements.filterAge = d.getElementById('filterAge');
        this.elements.filterAttendance = d.getElementById('filterAttendance');
        this.elements.clearFiltersBtn = d.getElementById('clearFilters');
        this.elements.clearFiltersEmptyBtn = d.getElementById('clearFiltersEmpty');
        this.elements.exportCSVBtn = d.getElementById('exportToCSV');
        this.elements.printListBtn = d.getElementById('printList');
        this.elements.visibleCountElement = d.getElementById('visibleCount');
        this.elements.playersTable = d.getElementById('playersTable');
        this.elements.playersTableBody = d.getElementById('playersTableBody');
        this.elements.emptyState = d.getElementById('emptyState');
        this.elements.clubSummaryCards = Array.from(d.querySelectorAll('.club-summary-card'));
    },

    captureInitialRows() {
        this.state.allPlayers = Array.from(document.querySelectorAll('.player-row'));
        this.state.filteredPlayers = [...this.state.allPlayers];
    },

    bindEvents() {
        const els = this.elements;

        if (els.searchInput) {
            const debouncedSearch = carnivalPlayersManager.debounce(carnivalPlayersManager.handleSearch, 300);
            els.searchInput.addEventListener('input', debouncedSearch);
        }

        if (els.filterClub) els.filterClub.addEventListener('change', carnivalPlayersManager.handleFilters);
        if (els.filterAge) els.filterAge.addEventListener('change', carnivalPlayersManager.handleFilters);
        if (els.filterAttendance) els.filterAttendance.addEventListener('change', carnivalPlayersManager.handleFilters);

        if (els.clearFiltersBtn) els.clearFiltersBtn.addEventListener('click', carnivalPlayersManager.clearAllFilters);
        if (els.clearFiltersEmptyBtn) els.clearFiltersEmptyBtn.addEventListener('click', carnivalPlayersManager.clearAllFilters);

        if (els.exportCSVBtn) els.exportCSVBtn.addEventListener('click', carnivalPlayersManager.exportToCSV);
        if (els.printListBtn) els.printListBtn.addEventListener('click', carnivalPlayersManager.printPlayerList);

        if (els.playersTable) {
            const sortableHeaders = els.playersTable.querySelectorAll('.sortable');
            sortableHeaders.forEach((header) =>
                header.addEventListener('click', () => carnivalPlayersManager.handleSort(header.dataset.sort))
            );
        }

        if (els.clubSummaryCards?.length) {
            els.clubSummaryCards.forEach((card) => {
                card.addEventListener('click', () => {
                    const clubName = card.dataset.club;
                    if (carnivalPlayersManager.elements.filterClub) {
                        carnivalPlayersManager.elements.filterClub.value = clubName;
                        carnivalPlayersManager.handleFilters();
                    }
                });
            });
        }

        document.addEventListener('keydown', carnivalPlayersManager.handleShortcuts);
    },

    initTooltipsIfAvailable() {
        // eslint-disable-next-line no-undef
        if (typeof bootstrap !== 'undefined') {
            // eslint-disable-next-line no-undef
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            // eslint-disable-next-line no-undef
            tooltipTriggerList.map((el) => new bootstrap.Tooltip(el));
        }
    },

    handleSearch: () => {
        const input = carnivalPlayersManager.elements.searchInput;
        if (!input) return;
        const searchTerm = input.value.toLowerCase().trim();

        carnivalPlayersManager.state.allPlayers.forEach((row) => {
            const searchData = row.dataset.search || '';
            const matches = searchData.includes(searchTerm);
            row.style.display = matches ? '' : 'none';
        });
    carnivalPlayersManager.updateFilteredPlayers();
    carnivalPlayersManager.updateVisibleCount();
    carnivalPlayersManager.updateEmptyState();
    },

    handleFilters: () => {
        const els = carnivalPlayersManager.elements;
        const clubFilter = els.filterClub ? els.filterClub.value : '';
        const ageFilter = els.filterAge ? els.filterAge.value : '';
        const attendanceFilter = els.filterAttendance ? els.filterAttendance.value : '';
        const searchTerm = els.searchInput ? els.searchInput.value.toLowerCase().trim() : '';

        carnivalPlayersManager.state.allPlayers.forEach((row) => {
            let visible = true;

            if (searchTerm && !(row.dataset.search || '').includes(searchTerm)) visible = false;
            if (clubFilter && row.dataset.club !== clubFilter) visible = false;

            if (ageFilter) {
                const isMasters = row.dataset.masters === 'true';
                if (ageFilter === 'masters' && !isMasters) visible = false;
                else if (ageFilter === 'under35' && isMasters) visible = false;
            }

            if (attendanceFilter && row.dataset.status !== attendanceFilter) visible = false;

            row.style.display = visible ? '' : 'none';
        });

        carnivalPlayersManager.updateFilteredPlayers();
        carnivalPlayersManager.updateVisibleCount();
        carnivalPlayersManager.updateEmptyState();
        carnivalPlayersManager.updateClubSummaryHighlight();
    },

    updateFilteredPlayers() {
        this.state.filteredPlayers = this.state.allPlayers.filter((row) => row.style.display !== 'none');
    },

    updateVisibleCount() {
        const visibleCount = this.state.filteredPlayers.length;
        const totalCount = this.state.allPlayers.length;
        if (this.elements.visibleCountElement) {
            this.elements.visibleCountElement.textContent = `Showing ${visibleCount} of ${totalCount} players`;
        }
    },

    updateEmptyState() {
        const hasVisiblePlayers = this.state.filteredPlayers.length > 0;
        const hasAnyPlayers = this.state.allPlayers.length > 0;
        const table = this.elements.playersTable;
        if (table) {
            const card = table.closest('.card');
            if (card) card.style.display = hasVisiblePlayers ? '' : 'none';
        }
        if (this.elements.emptyState && hasAnyPlayers) {
            this.elements.emptyState.classList.toggle('d-none', hasVisiblePlayers);
        }
    },

    updateClubSummaryHighlight() {
        const selectedClub = this.elements.filterClub ? this.elements.filterClub.value : '';
        this.elements.clubSummaryCards.forEach((card) => {
            if (selectedClub && card.dataset.club === selectedClub) {
                card.classList.add('border-primary', 'bg-light');
            } else {
                card.classList.remove('border-primary', 'bg-light');
            }
        });
    },

    handleSort: (column) => {
        const sort = carnivalPlayersManager.state.currentSort;
        if (sort.column === column) {
            sort.direction = sort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            sort.column = column;
            sort.direction = 'asc';
        }
        carnivalPlayersManager.updateSortIndicators();
        carnivalPlayersManager.sortPlayers(column, sort.direction);
    },

    updateSortIndicators() {
        const table = this.elements.playersTable;
        if (!table) return;
        const headers = table.querySelectorAll('.sortable');
        headers.forEach((header) => {
            const icon = header.querySelector('i');
            if (header.dataset.sort === this.state.currentSort.column) {
                if (icon) icon.className = this.state.currentSort.direction === 'asc' ? 'bi bi-arrow-up' : 'bi bi-arrow-down';
                header.classList.add('text-primary');
            } else {
                if (icon) icon.className = 'bi bi-arrow-down-up text-muted';
                header.classList.remove('text-primary');
            }
        });
    },

    sortPlayers(column, direction) {
        const sortedPlayers = [...this.state.filteredPlayers].sort((a, b) => {
            let aValue, bValue;
            switch (column) {
                case 'club':
                    aValue = a.dataset.club;
                    bValue = b.dataset.club;
                    break;
                case 'name':
                    aValue = a.cells[1].textContent.trim();
                    bValue = b.cells[1].textContent.trim();
                    break;
                case 'age':
                    aValue = parseInt(a.dataset.age) || 0;
                    bValue = parseInt(b.dataset.age) || 0;
                    break;
                case 'dob':
                    aValue = new Date(a.cells[3].textContent.trim() || '1900-01-01');
                    bValue = new Date(b.cells[3].textContent.trim() || '1900-01-01');
                    break;
                case 'shorts':
                    aValue = a.cells[4].textContent.trim();
                    bValue = b.cells[4].textContent.trim();
                    break;
                case 'status':
                    aValue = a.dataset.status;
                    bValue = b.dataset.status;
                    break;
                default:
                    return 0;
            }
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        const body = this.elements.playersTableBody;
        if (!body) return;
        sortedPlayers.forEach((row) => body.appendChild(row));
    },

    clearAllFilters: () => {
        const els = carnivalPlayersManager.elements;
        if (els.searchInput) els.searchInput.value = '';
        if (els.filterClub) els.filterClub.value = '';
        if (els.filterAge) els.filterAge.value = '';
        if (els.filterAttendance) els.filterAttendance.value = '';

        carnivalPlayersManager.state.allPlayers.forEach((row) => {
            row.style.display = '';
        });
        carnivalPlayersManager.state.filteredPlayers = [...carnivalPlayersManager.state.allPlayers];
        carnivalPlayersManager.updateVisibleCount();
        carnivalPlayersManager.updateEmptyState();
        carnivalPlayersManager.updateClubSummaryHighlight();
    },

    exportToCSV: () => {
        const csvData = [];
        const headers = ['Club', 'Player Name', 'Age', 'Date of Birth', 'Shorts Colour', 'Attendance Status', 'State'];
        csvData.push(headers);

        carnivalPlayersManager.state.filteredPlayers.forEach((row) => {
            const cells = row.cells;
            const rowData = [
                carnivalPlayersManager.extractTextFromCell(cells[0]),
                carnivalPlayersManager.extractTextFromCell(cells[1]),
                carnivalPlayersManager.extractTextFromCell(cells[2]),
                carnivalPlayersManager.extractTextFromCell(cells[3]),
                carnivalPlayersManager.extractTextFromCell(cells[4]),
                carnivalPlayersManager.extractTextFromCell(cells[5]),
                row.querySelector('.badge[class*="state-"]')?.textContent.trim() || ''
            ];
            csvData.push(rowData);
        });

        carnivalPlayersManager.downloadCSV(
            csvData,
            `carnival-players-${new Date().toISOString().split('T')[0]}.csv`
        );
    },

    extractTextFromCell(cell) {
        return cell.textContent.replace(/\s+/g, ' ').trim();
    },

    downloadCSV(data, filename) {
        const csvContent = data
            .map((row) => row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    },

    printPlayerList: () => {
        const printWindow = window.open('', '_blank');
        const carnivalTitle = document.querySelector('h4.text-muted')?.textContent || 'Carnival Players';
        let printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Player List - ${carnivalTitle}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    .club-logo { width: 20px; height: 20px; object-fit: contain; }
                    .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 11px; }
                    .badge.bg-success { background-color: #198754; color: white; }
                    .badge.bg-warning { background-color: #ffc107; color: black; }
                    .badge.bg-danger { background-color: #dc3545; color: white; }
                    .badge.bg-secondary { background-color: #6c757d; color: white; }
                    @media print { .no-print { display: none; } body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Player List</h1>
                    <h2>${carnivalTitle}</h2>
                    <p>Generated on ${new Date().toLocaleDateString('en-AU', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })} - ${carnivalPlayersManager.state.filteredPlayers.length} players</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Club</th>
                            <th>Player Name</th>
                            <th>Age</th>
                            <th>Date of Birth</th>
                            <th>Shorts Colour</th>
                            <th>Attendance</th>
                        </tr>
                    </thead>
                    <tbody>`;

        carnivalPlayersManager.state.filteredPlayers.forEach((row) => {
            const cells = row.cells;
            printContent += `
                <tr>
                    <td>${carnivalPlayersManager.extractTextFromCell(cells[0])}</td>
                    <td>${carnivalPlayersManager.extractTextFromCell(cells[1])}</td>
                    <td>${carnivalPlayersManager.extractTextFromCell(cells[2])}</td>
                    <td>${carnivalPlayersManager.extractTextFromCell(cells[3])}</td>
                    <td>${carnivalPlayersManager.extractTextFromCell(cells[4])}</td>
                    <td>${carnivalPlayersManager.extractTextFromCell(cells[5])}</td>
                </tr>`;
        });
        printContent += `
                    </tbody>
                </table>
            </body>
            </html>`;

        printWindow.document.write(printContent);
        printWindow.document.close();
            // Call print synchronously for reliability in tests; delay only the close.
            try {
                if (typeof printWindow.print === 'function') {
                    printWindow.print();
                }
            } catch (e) {
                // no-op if blocked
            }
            setTimeout(() => {
                try {
                    if (typeof printWindow.close === 'function') printWindow.close();
                } catch (e) {}
            }, 250);
    },

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    handleShortcuts: (e) => {
        const input = carnivalPlayersManager.elements.searchInput;
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            if (input) {
                input.focus();
                input.select();
            }
        }
        if (e.key === 'Escape' && input === document.activeElement) {
            carnivalPlayersManager.clearAllFilters();
            input.blur();
        }
    }
};

// Bootstrap in the browser
document.addEventListener('DOMContentLoaded', () => {
    carnivalPlayersManager.initialize();
});