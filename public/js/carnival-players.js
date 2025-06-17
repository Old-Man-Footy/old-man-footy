/**
 * Carnival Players List Interactive Features
 * Handles search, filtering, sorting, and export functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const searchInput = document.getElementById('searchPlayers');
    const filterClub = document.getElementById('filterClub');
    const filterAge = document.getElementById('filterAge');
    const filterAttendance = document.getElementById('filterAttendance');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const clearFiltersEmptyBtn = document.getElementById('clearFiltersEmpty');
    const exportCSVBtn = document.getElementById('exportToCSV');
    const printListBtn = document.getElementById('printList');
    const visibleCountElement = document.getElementById('visibleCount');
    const playersTable = document.getElementById('playersTable');
    const playersTableBody = document.getElementById('playersTableBody');
    const emptyState = document.getElementById('emptyState');
    const clubSummaryCards = document.querySelectorAll('.club-summary-card');

    // State management
    let currentSort = { column: null, direction: 'asc' };
    let allPlayers = [];
    let filteredPlayers = [];

    // Initialize
    init();

    function init() {
        // Store all player rows for filtering/sorting
        allPlayers = Array.from(document.querySelectorAll('.player-row'));
        filteredPlayers = [...allPlayers];
        
        // Set up event listeners
        setupEventListeners();
        
        // Initial count update
        updateVisibleCount();
        
        // Initialize tooltips if Bootstrap is available
        if (typeof bootstrap !== 'undefined') {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
    }

    function setupEventListeners() {
        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', debounce(handleSearch, 300));
        }

        // Filter functionality
        if (filterClub) {
            filterClub.addEventListener('change', handleFilters);
        }
        if (filterAge) {
            filterAge.addEventListener('change', handleFilters);
        }
        if (filterAttendance) {
            filterAttendance.addEventListener('change', handleFilters);
        }

        // Clear filters
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', clearAllFilters);
        }
        if (clearFiltersEmptyBtn) {
            clearFiltersEmptyBtn.addEventListener('click', clearAllFilters);
        }

        // Export functionality
        if (exportCSVBtn) {
            exportCSVBtn.addEventListener('click', exportToCSV);
        }

        // Print functionality
        if (printListBtn) {
            printListBtn.addEventListener('click', printPlayerList);
        }

        // Sorting functionality
        if (playersTable) {
            const sortableHeaders = playersTable.querySelectorAll('.sortable');
            sortableHeaders.forEach(header => {
                header.addEventListener('click', () => handleSort(header.dataset.sort));
            });
        }

        // Club summary card click filtering
        clubSummaryCards.forEach(card => {
            card.addEventListener('click', () => {
                const clubName = card.dataset.club;
                if (filterClub) {
                    filterClub.value = clubName;
                    handleFilters();
                }
            });
        });
    }

    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        allPlayers.forEach(row => {
            const searchData = row.dataset.search;
            const matches = searchData.includes(searchTerm);
            row.style.display = matches ? '' : 'none';
        });

        updateFilteredPlayers();
        updateVisibleCount();
        updateEmptyState();
    }

    function handleFilters() {
        const clubFilter = filterClub ? filterClub.value : '';
        const ageFilter = filterAge ? filterAge.value : '';
        const attendanceFilter = filterAttendance ? filterAttendance.value : '';
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

        allPlayers.forEach(row => {
            let visible = true;

            // Search filter
            if (searchTerm && !row.dataset.search.includes(searchTerm)) {
                visible = false;
            }

            // Club filter
            if (clubFilter && row.dataset.club !== clubFilter) {
                visible = false;
            }

            // Age filter
            if (ageFilter) {
                const isMasters = row.dataset.masters === 'true';
                if (ageFilter === 'masters' && !isMasters) {
                    visible = false;
                } else if (ageFilter === 'under35' && isMasters) {
                    visible = false;
                }
            }

            // Attendance filter
            if (attendanceFilter && row.dataset.status !== attendanceFilter) {
                visible = false;
            }

            row.style.display = visible ? '' : 'none';
        });

        updateFilteredPlayers();
        updateVisibleCount();
        updateEmptyState();
        updateClubSummaryHighlight();
    }

    function updateFilteredPlayers() {
        filteredPlayers = allPlayers.filter(row => row.style.display !== 'none');
    }

    function updateVisibleCount() {
        const visibleCount = filteredPlayers.length;
        const totalCount = allPlayers.length;
        
        if (visibleCountElement) {
            visibleCountElement.textContent = `Showing ${visibleCount} of ${totalCount} players`;
        }
    }

    function updateEmptyState() {
        const hasVisiblePlayers = filteredPlayers.length > 0;
        const hasAnyPlayers = allPlayers.length > 0;
        
        if (playersTable) {
            playersTable.closest('.card').style.display = hasVisiblePlayers ? '' : 'none';
        }
        
        if (emptyState && hasAnyPlayers) {
            emptyState.classList.toggle('d-none', hasVisiblePlayers);
        }
    }

    function updateClubSummaryHighlight() {
        const selectedClub = filterClub ? filterClub.value : '';
        
        clubSummaryCards.forEach(card => {
            if (selectedClub && card.dataset.club === selectedClub) {
                card.classList.add('border-primary', 'bg-light');
            } else {
                card.classList.remove('border-primary', 'bg-light');
            }
        });
    }

    function handleSort(column) {
        // Update sort state
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'asc';
        }

        // Update sort indicators
        updateSortIndicators();

        // Sort the visible players
        sortPlayers(column, currentSort.direction);
    }

    function updateSortIndicators() {
        const headers = playersTable.querySelectorAll('.sortable');
        headers.forEach(header => {
            const icon = header.querySelector('i');
            if (header.dataset.sort === currentSort.column) {
                icon.className = currentSort.direction === 'asc' ? 'bi bi-arrow-up' : 'bi bi-arrow-down';
                header.classList.add('text-primary');
            } else {
                icon.className = 'bi bi-arrow-down-up text-muted';
                header.classList.remove('text-primary');
            }
        });
    }

    function sortPlayers(column, direction) {
        const sortedPlayers = [...filteredPlayers].sort((a, b) => {
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

            // Handle string comparison
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        // Reorder the DOM elements
        sortedPlayers.forEach(row => {
            playersTableBody.appendChild(row);
        });
    }

    function clearAllFilters() {
        // Clear all filter inputs
        if (searchInput) searchInput.value = '';
        if (filterClub) filterClub.value = '';
        if (filterAge) filterAge.value = '';
        if (filterAttendance) filterAttendance.value = '';

        // Show all players
        allPlayers.forEach(row => {
            row.style.display = '';
        });

        // Update state
        filteredPlayers = [...allPlayers];
        updateVisibleCount();
        updateEmptyState();
        updateClubSummaryHighlight();
    }

    function exportToCSV() {
        const csvData = [];
        const headers = ['Club', 'Player Name', 'Age', 'Date of Birth', 'Shorts Colour', 'Attendance Status', 'State'];
        csvData.push(headers);

        filteredPlayers.forEach(row => {
            const cells = row.cells;
            const rowData = [
                extractTextFromCell(cells[0]), // Club
                extractTextFromCell(cells[1]), // Player Name
                extractTextFromCell(cells[2]), // Age
                extractTextFromCell(cells[3]), // DOB
                extractTextFromCell(cells[4]), // Shorts
                extractTextFromCell(cells[5]), // Status
                row.querySelector('.badge[class*="state-"]')?.textContent.trim() || '' // State
            ];
            csvData.push(rowData);
        });

        downloadCSV(csvData, `carnival-players-${new Date().toISOString().split('T')[0]}.csv`);
    }

    function extractTextFromCell(cell) {
        // Extract clean text content, removing extra whitespace and icons
        return cell.textContent.replace(/\s+/g, ' ').trim();
    }

    function downloadCSV(data, filename) {
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
    }

    function printPlayerList() {
        // Create a new window with print-friendly content
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
                    })} - ${filteredPlayers.length} players</p>
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

        filteredPlayers.forEach(row => {
            const cells = row.cells;
            printContent += `
                <tr>
                    <td>${extractTextFromCell(cells[0])}</td>
                    <td>${extractTextFromCell(cells[1])}</td>
                    <td>${extractTextFromCell(cells[2])}</td>
                    <td>${extractTextFromCell(cells[3])}</td>
                    <td>${extractTextFromCell(cells[4])}</td>
                    <td>${extractTextFromCell(cells[5])}</td>
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
        
        // Wait for content to load, then print
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    }

    // Utility function for debouncing
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Add some additional keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl+F or Cmd+F to focus search (prevent default browser search)
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        // Escape to clear search
        if (e.key === 'Escape' && searchInput === document.activeElement) {
            clearAllFilters();
            searchInput.blur();
        }
    });
});