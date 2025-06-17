/**
 * Carnival All Players JavaScript
 * Handles interactive features for the comprehensive player list view
 */

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const clubFilter = document.getElementById('clubFilter');
    const ageFilters = document.querySelectorAll('input[name="ageFilter"]');
    const playersTable = document.getElementById('playersTable');
    const playerRows = document.querySelectorAll('.player-row');
    const playerCountBadge = document.getElementById('playerCount');

    let currentSort = { column: null, direction: 'asc' };

    // Initialize filtering and search
    function initializeFilters() {
        // Search functionality
        searchInput.addEventListener('input', filterPlayers);
        
        // Club filter
        clubFilter.addEventListener('change', filterPlayers);
        
        // Age filters
        ageFilters.forEach(filter => {
            filter.addEventListener('change', filterPlayers);
        });

        // Table sorting
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', function() {
                const sortBy = this.dataset.sort;
                sortTable(sortBy);
            });
            header.style.cursor = 'pointer';
        });
    }

    // Filter players based on search term, club, and age criteria
    function filterPlayers() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedClub = clubFilter.value;
        const selectedAge = document.querySelector('input[name="ageFilter"]:checked').value;

        let visibleCount = 0;

        playerRows.forEach(row => {
            const playerName = row.dataset.name;
            const clubName = row.dataset.club;
            const age = parseInt(row.dataset.age) || 0;
            const isMasters = row.dataset.masters === 'true';

            // Check search criteria
            const matchesSearch = !searchTerm || 
                playerName.includes(searchTerm) || 
                clubName.toLowerCase().includes(searchTerm);

            // Check club filter
            const matchesClub = !selectedClub || clubName === selectedClub;

            // Check age filter
            let matchesAge = true;
            if (selectedAge === 'masters') {
                matchesAge = isMasters;
            } else if (selectedAge === 'open') {
                matchesAge = !isMasters && age > 0;
            }

            // Show/hide row based on all criteria
            if (matchesSearch && matchesClub && matchesAge) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        // Update player count badge
        playerCountBadge.textContent = visibleCount;
    }

    // Sort table by column
    function sortTable(column) {
        const tbody = playersTable.querySelector('tbody');
        const rows = Array.from(playerRows);

        // Determine sort direction
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'asc';
        }

        // Sort rows
        rows.sort((a, b) => {
            let aValue, bValue;

            switch (column) {
                case 'club':
                    aValue = a.dataset.club;
                    bValue = b.dataset.club;
                    break;
                case 'name':
                    aValue = a.dataset.name;
                    bValue = b.dataset.name;
                    break;
                case 'age':
                    aValue = parseInt(a.dataset.age) || 0;
                    bValue = parseInt(b.dataset.age) || 0;
                    break;
                case 'dob':
                    // Extract date from the table cell
                    const aDateText = a.cells[3].textContent.trim();
                    const bDateText = b.cells[3].textContent.trim();
                    aValue = aDateText === 'Not provided' ? new Date(0) : new Date(aDateText);
                    bValue = bDateText === 'Not provided' ? new Date(0) : new Date(bDateText);
                    break;
                case 'shorts':
                    aValue = a.cells[4].textContent.trim();
                    bValue = b.cells[4].textContent.trim();
                    break;
                default:
                    return 0;
            }

            // Handle string vs number comparison
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            let comparison = 0;
            if (aValue > bValue) comparison = 1;
            if (aValue < bValue) comparison = -1;

            return currentSort.direction === 'desc' ? comparison * -1 : comparison;
        });

        // Clear and re-append sorted rows
        tbody.innerHTML = '';
        rows.forEach(row => tbody.appendChild(row));

        // Update sort indicators
        updateSortIndicators(column);

        // Re-apply filters after sorting
        filterPlayers();
    }

    // Update sort indicators in table headers
    function updateSortIndicators(activeColumn) {
        document.querySelectorAll('.sortable i').forEach(icon => {
            icon.className = 'bi bi-chevron-expand';
        });

        const activeHeader = document.querySelector(`[data-sort="${activeColumn}"] i`);
        if (activeHeader) {
            const iconClass = currentSort.direction === 'asc' ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
            activeHeader.className = iconClass;
        }
    }

    // Export to CSV functionality
    window.exportToCSV = function() {
        const visibleRows = Array.from(playerRows).filter(row => row.style.display !== 'none');
        
        if (visibleRows.length === 0) {
            alert('No players to export. Please adjust your filters.');
            return;
        }

        const headers = ['Club', 'State', 'Player Name', 'Age', 'Date of Birth', 'Shorts Colour', 'Status', 'Masters Eligible'];
        const csvContent = [headers.join(',')];

        visibleRows.forEach(row => {
            const cells = row.cells;
            const csvRow = [
                `"${cells[0].querySelector('strong').textContent}"`, // Club
                `"${row.dataset.state || 'N/A'}"`, // State
                `"${cells[1].querySelector('strong').textContent}"`, // Player Name
                cells[2].textContent.trim() || 'N/A', // Age
                `"${cells[3].textContent.trim()}"`, // Date of Birth
                `"${cells[4].textContent.trim()}"`, // Shorts Colour
                `"${cells[5].textContent.trim()}"`, // Status
                `"${cells[6].textContent.trim()}"` // Masters Eligible
            ];
            csvContent.push(csvRow.join(','));
        });

        // Create and download file
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

    // Print functionality
    window.printPlayerList = function() {
        const visibleRows = Array.from(playerRows).filter(row => row.style.display !== 'none');
        
        if (visibleRows.length === 0) {
            alert('No players to print. Please adjust your filters.');
            return;
        }

        // Create print window
        const printWindow = window.open('', '_blank');
        const carnivalTitle = document.querySelector('h2').textContent;
        
        let printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${carnivalTitle} - Player List</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .stats { display: flex; justify-content: space-around; margin-bottom: 30px; }
                    .stat { text-align: center; }
                    .stat-value { font-size: 24px; font-weight: bold; color: #0066cc; }
                    .stat-label { font-size: 12px; color: #666; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                    .club-name { font-weight: bold; }
                    .player-name { font-weight: bold; }
                    .masters-eligible { color: #0066cc; font-weight: bold; }
                    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
                    @media print {
                        body { margin: 10px; }
                        .header { page-break-after: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${carnivalTitle}</h1>
                    <h2>Complete Player List</h2>
                    <p>Generated on ${new Date().toLocaleDateString()}</p>
                </div>
                
                <div class="stats">
                    <div class="stat">
                        <div class="stat-value">${document.querySelector('.bg-primary .display-6').textContent}</div>
                        <div class="stat-label">Clubs</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${visibleRows.length}</div>
                        <div class="stat-label">Players (Filtered)</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${visibleRows.filter(row => row.dataset.masters === 'true').length}</div>
                        <div class="stat-label">Masters Eligible</div>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Club</th>
                            <th>Player Name</th>
                            <th>Age</th>
                            <th>Date of Birth</th>
                            <th>Shorts Colour</th>
                            <th>Masters Eligible</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        visibleRows.forEach(row => {
            const cells = row.cells;
            printContent += `
                <tr>
                    <td class="club-name">${cells[0].querySelector('strong').textContent}</td>
                    <td class="player-name">${cells[1].querySelector('strong').textContent}</td>
                    <td>${cells[2].textContent.trim()}</td>
                    <td>${cells[3].textContent.trim()}</td>
                    <td>${cells[4].textContent.trim()}</td>
                    <td class="${row.dataset.masters === 'true' ? 'masters-eligible' : ''}">${cells[6].textContent.trim()}</td>
                </tr>
            `;
        });

        printContent += `
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>This list contains ${visibleRows.length} players from ${new Set(visibleRows.map(row => row.dataset.club)).size} clubs.</p>
                    <p>Masters eligible players are those aged 35 and over.</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Print after content loads
        printWindow.onload = function() {
            printWindow.print();
        };
    };

    // Initialize all functionality
    initializeFilters();
});