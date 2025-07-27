/**
 * @file carnival-players.js
 * @description Handles search, filtering, sorting, export, and print functionality for carnival players list.
 * @module carnivalPlayersManager
 */

export const carnivalPlayersManager = {
    elements: {},
    state: {
        currentSort: { column: null, direction: 'asc' },
        allPlayers: [],
        filteredPlayers: []
    },

    /**
     * Initialize the manager: cache DOM elements, bind events, and set up initial state.
     */
    initialize() {
        this.cacheElements();
        this.initState();
        this.bindEvents();
        this.updateVisibleCount();
        this.initTooltips();
        this.setShortsColourBadges();
    },

    /**
     * Cache all necessary DOM elements for efficient access.
     */
    cacheElements() {
        this.elements.searchInput = document.getElementById('searchPlayers');
        this.elements.filterClub = document.getElementById('filterClub');
        this.elements.filterAge = document.getElementById('filterAge');
        this.elements.filterAttendance = document.getElementById('filterAttendance');
        this.elements.clearFiltersBtn = document.getElementById('clearFilters');
        this.elements.clearFiltersEmptyBtn = document.getElementById('clearFiltersEmpty');
        this.elements.exportCSVBtn = document.getElementById('exportToCSV');
        this.elements.printListBtn = document.getElementById('printList');
        this.elements.visibleCountElement = document.getElementById('visibleCount');
        this.elements.playersTable = document.getElementById('playersTable');
        this.elements.playersTableBody = document.getElementById('playersTableBody');
        this.elements.emptyState = document.getElementById('emptyState');
        this.elements.clubSummaryCards = document.querySelectorAll('.club-summary-card');
    },

    /**
     * Initialize state arrays for all and filtered players.
     */
    initState() {
        this.state.allPlayers = Array.from(document.querySelectorAll('.player-row'));
        this.state.filteredPlayers = [...this.state.allPlayers];
    },

    /**
     * Bind all event listeners for the page.
     */
    bindEvents() {
        // Search functionality
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
        }

        // Filter functionality
        if (this.elements.filterClub) {
            this.elements.filterClub.addEventListener('change', this.handleFilters.bind(this));
        }
        if (this.elements.filterAge) {
            this.elements.filterAge.addEventListener('change', this.handleFilters.bind(this));
        }
        if (this.elements.filterAttendance) {
            this.elements.filterAttendance.addEventListener('change', this.handleFilters.bind(this));
        }

        // Clear filters
        if (this.elements.clearFiltersBtn) {
            this.elements.clearFiltersBtn.addEventListener('click', this.clearAllFilters.bind(this));
        }
        if (this.elements.clearFiltersEmptyBtn) {
            this.elements.clearFiltersEmptyBtn.addEventListener('click', this.clearAllFilters.bind(this));
        }

        // Export functionality
        if (this.elements.exportCSVBtn) {
            this.elements.exportCSVBtn.addEventListener('click', this.exportToCSV.bind(this));
        }

        // Print functionality
        if (this.elements.printListBtn) {
            this.elements.printListBtn.addEventListener('click', this.printPlayerList.bind(this));
        }

        // Sorting functionality
        if (this.elements.playersTable) {
            const sortableHeaders = this.elements.playersTable.querySelectorAll('.sortable');
            sortableHeaders.forEach(header => {
                header.addEventListener('click', () => this.handleSort(header.dataset.sort));
            });
        }

        // Club summary card click filtering
        this.elements.clubSummaryCards.forEach(card => {
            card.addEventListener('click', () => {
                const clubName = card.dataset.club;
                if (this.elements.filterClub) {
                    this.elements.filterClub.value = clubName;
                    this.handleFilters();
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+F or Cmd+F to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                if (this.elements.searchInput) {
                    this.elements.searchInput.focus();
                    this.elements.searchInput.select();
                }
            }
            // Escape to clear search
            if (e.key === 'Escape' && this.elements.searchInput === document.activeElement) {
                this.clearAllFilters();
                this.elements.searchInput.blur();
            }
        });
    },

    /**
     * Initialize Bootstrap tooltips if available.
     */
    initTooltips() {
        if (typeof bootstrap !== 'undefined') {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
    },

    /**
     * Handle search input for filtering player rows.
     */
    handleSearch() {
        const searchTerm = this.elements.searchInput.value.toLowerCase().trim();
        this.state.allPlayers.forEach(row => {
            const searchData = row.dataset.search;
            const matches = searchData.includes(searchTerm);
            row.style.display = matches ? '' : 'none';
        });
        this.updateFilteredPlayers();
        this.updateVisibleCount();
        this.updateEmptyState();
    },

    /**
     * Handle filter changes for club, age, and attendance.
     */
    handleFilters() {
        const clubFilter = this.elements.filterClub ? this.elements.filterClub.value : '';
        const ageFilter = this.elements.filterAge ? this.elements.filterAge.value : '';
        const attendanceFilter = this.elements.filterAttendance ? this.elements.filterAttendance.value : '';
        const searchTerm = this.elements.searchInput ? this.elements.searchInput.value.toLowerCase().trim() : '';

        this.state.allPlayers.forEach(row => {
            let visible = true;
            // Search filter
            if (searchTerm && !row.dataset.search.includes(searchTerm)) visible = false;
            // Club filter
            if (clubFilter && row.dataset.club !== clubFilter) visible = false;
            // Age filter
            if (ageFilter) {
                const isMasters = row.dataset.masters === 'true';
                if (ageFilter === 'masters' && !isMasters) visible = false;
                else if (ageFilter === 'under35' && isMasters) visible = false;
            }
            // Attendance filter
            if (attendanceFilter && row.dataset.status !== attendanceFilter) visible = false;
            row.style.display = visible ? '' : 'none';
        });

        this.updateFilteredPlayers();
        this.updateVisibleCount();
        this.updateEmptyState();
        this.updateClubSummaryHighlight();
    },

    /**
     * Update the filteredPlayers array based on visible rows.
     */
    updateFilteredPlayers() {
        this.state.filteredPlayers = this.state.allPlayers.filter(row => row.style.display !== 'none');
    },

    /**
     * Update the visible player count display.
     */
    updateVisibleCount() {
        const visibleCount = this.state.filteredPlayers.length;
        const totalCount = this.state.allPlayers.length;
        if (this.elements.visibleCountElement) {
            this.elements.visibleCountElement.textContent = `Showing ${visibleCount} of ${totalCount} players`;
        }
    },

    /**
     * Show/hide empty state and table based on filtered results.
     */
    updateEmptyState() {
        const hasVisiblePlayers = this.state.filteredPlayers.length > 0;
        const hasAnyPlayers = this.state.allPlayers.length > 0;
        if (this.elements.playersTable) {
            const card = this.elements.playersTable.closest('.card');
            if (card && card instanceof HTMLElement) {
                card.style.display = hasVisiblePlayers ? '' : 'none';
            }
        }
        if (this.elements.emptyState && hasAnyPlayers) {
            this.elements.emptyState.classList.toggle('d-none', hasVisiblePlayers);
        }
    },

    /**
     * Highlight selected club summary card.
     */
    updateClubSummaryHighlight() {
        const selectedClub = this.elements.filterClub ? this.elements.filterClub.value : '';
        this.elements.clubSummaryCards.forEach(card => {
            if (selectedClub && card.dataset.club === selectedClub) {
                card.classList.add('border-primary', 'bg-light');
            } else {
                card.classList.remove('border-primary', 'bg-light');
            }
        });
    },

    /**
     * Handle sorting of player rows by column.
     * @param {string} column - The column to sort by.
     */
    handleSort(column) {
        // Update sort state
        if (this.state.currentSort.column === column) {
            this.state.currentSort.direction = this.state.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.currentSort.column = column;
            this.state.currentSort.direction = 'asc';
        }
        this.updateSortIndicators();
        this.sortPlayers(column, this.state.currentSort.direction);
    },

    /**
     * Update sort indicators in table headers.
     */
    updateSortIndicators() {
        const headers = this.elements.playersTable.querySelectorAll('.sortable');
        headers.forEach(header => {
            const icon = header.querySelector('i');
            if (header.dataset.sort === this.state.currentSort.column) {
                icon.className = this.state.currentSort.direction === 'asc' ? 'bi bi-arrow-up' : 'bi bi-arrow-down';
                header.classList.add('text-primary');
            } else {
                icon.className = 'bi bi-arrow-down-up text-muted';
                header.classList.remove('text-primary');
            }
        });
    },

    /**
     * Sort visible player rows by column and direction.
     * @param {string} column
     * @param {string} direction
     */
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
        sortedPlayers.forEach(row => {
            this.elements.playersTableBody.appendChild(row);
        });
    },

    /**
     * Clear all filter inputs and show all players.
     */
    clearAllFilters() {
        if (this.elements.searchInput) this.elements.searchInput.value = '';
        if (this.elements.filterClub) this.elements.filterClub.value = '';
        if (this.elements.filterAge) this.elements.filterAge.value = '';
        if (this.elements.filterAttendance) this.elements.filterAttendance.value = '';
        this.state.allPlayers.forEach(row => {
            row.style.display = '';
        });
        this.state.filteredPlayers = [...this.state.allPlayers];
        this.updateVisibleCount();
        this.updateEmptyState();
        this.updateClubSummaryHighlight();
    },

    /**
     * Export visible players to CSV.
     */
    exportToCSV() {
        const csvData = [];
        const headers = ['Club', 'Player Name', 'Age', 'Date of Birth', 'Shorts Colour', 'Attendance Status', 'State'];
        csvData.push(headers);

        this.state.filteredPlayers.forEach(row => {
            const cells = row.cells;
            const rowData = [
                this.extractTextFromCell(cells[0]),
                this.extractTextFromCell(cells[1]),
                this.extractTextFromCell(cells[2]),
                this.extractTextFromCell(cells[3]),
                this.extractTextFromCell(cells[4]),
                this.extractTextFromCell(cells[5]),
                row.querySelector('.badge[class*="state-"]')?.textContent.trim() || ''
            ];
            csvData.push(rowData);
        });

        this.downloadCSV(csvData, `carnival-players-${new Date().toISOString().split('T')[0]}.csv`);
    },

    /**
     * Extract clean text content from a table cell.
     * @param {HTMLTableCellElement} cell
     * @returns {string}
     */
    extractTextFromCell(cell) {
        return cell.textContent.replace(/\s+/g, ' ').trim();
    },

    /**
     * Download CSV file from array data.
     * @param {Array[]} data
     * @param {string} filename
     */
    downloadCSV(data, filename) {
        const csvContent = data.map(row =>
            row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
        ).join('\n');
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

    /**
     * Print the visible player list in a print-friendly format.
     */
    printPlayerList() {
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
                    @media print {
                        .no-print { display: none; }
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Player List</h1>
                    <h2>${carnivalTitle}</h2>
                    <p>Generated on ${new Date().toLocaleDateString('en-AU', { 
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                    })} - ${this.state.filteredPlayers.length} players</p>
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
                    <tbody>
        `;
        this.state.filteredPlayers.forEach(row => {
            const cells = row.cells;
            printContent += `
                <tr>
                    <td>${this.extractTextFromCell(cells[0])}</td>
                    <td>${this.extractTextFromCell(cells[1])}</td>
                    <td>${this.extractTextFromCell(cells[2])}</td>
                    <td>${this.extractTextFromCell(cells[3])}</td>
                    <td>${this.extractTextFromCell(cells[4])}</td>
                    <td>${this.extractTextFromCell(cells[5])}</td>
                </tr>
            `;
        });
        printContent += `
                    </tbody>
                </table>
            </body>
            </html>
        `;
        printWindow.document.write(printContent);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    },

    /**
     * Utility function for debouncing.
     * @param {Function} func
     * @param {number} wait
     * @returns {Function}
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        }
    },

    /**
     * Set background color for shorts colour badges using their data-colour attribute.
     * Ensures no inline styles in EJS; all styling is handled here.
     */
    setShortsColourBadges() {
        const badges = document.querySelectorAll('.shorts-colour-badge[data-colour]');
        badges.forEach(badge => {
            const colour = badge.getAttribute('data-colour');
            if (colour && colour !== 'not specified' && colour !== 'Unrestricted') {
                badge.style.backgroundColor = colour;
                badge.style.color = '#fff';
            } else {
                badge.style.backgroundColor = '';
                badge.style.color = '';
            }
        });
    }
};

// At the bottom of the file: DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    carnivalPlayersManager.initialize();
});