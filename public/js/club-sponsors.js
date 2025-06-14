/**
 * Club Sponsors JavaScript
 * Handles sponsor management functionality including reordering
 */

/**
 * Initialize sponsor reordering functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Club sponsors functionality loaded...');
    
    const sponsorList = document.getElementById('sponsor-order-list');
    const saveButton = document.getElementById('save-sponsor-order');
    
    if (sponsorList && sponsorList.children.length > 1) {
        // Initialize Sortable
        Sortable.create(sponsorList, {
            handle: '.fa-grip-vertical',
            animation: 150,
            onEnd: function() {
                if (saveButton) {
                    saveButton.style.display = 'block';
                }
            }
        });

        // Save new order
        if (saveButton) {
            saveButton.addEventListener('click', function() {
                const sponsorIds = Array.from(sponsorList.children).map(item => 
                    item.getAttribute('data-sponsor-id')
                );

                fetch('/clubs/manage/sponsors/reorder', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ sponsorOrder: sponsorIds })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        location.reload();
                    } else {
                        alert('Error updating sponsor order: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error updating sponsor order');
                });
            });
        }
    }
    
    console.log('Club sponsors functionality initialized successfully');
});