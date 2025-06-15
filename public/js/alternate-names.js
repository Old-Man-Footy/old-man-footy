/**
 * Alternate Names Management
 * Handles adding, editing, and deleting alternate names for clubs
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeAlternateNamesManagement();
});

/**
 * Initialize all alternate names management functionality
 */
function initializeAlternateNamesManagement() {
    setupAddAlternateNameForm();
    setupEditAlternateNameButtons();
    setupEditAlternateNameForm();
    setupDeleteAlternateNameButtons();
}

/**
 * Setup the add new alternate name form submission
 */
function setupAddAlternateNameForm() {
    const addForm = document.getElementById('addAlternateNameForm');
    if (!addForm) return;
    
    addForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(addForm);
        
        try {
            const response = await fetch('/clubs/manage/alternate-names', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    alternateName: formData.get('alternateName')
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                location.reload(); // Refresh the page to show the new alternate name
            } else {
                alert(result.message || 'Error adding alternate name');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error adding alternate name');
        }
    });
}

/**
 * Setup edit buttons for alternate names
 */
function setupEditAlternateNameButtons() {
    document.querySelectorAll('.edit-alternate-name').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.dataset.id;
            const name = this.dataset.name;
            
            document.getElementById('editAlternateNameId').value = id;
            document.getElementById('editAlternateName').value = name;
            
            const modal = new bootstrap.Modal(document.getElementById('editAlternateNameModal'));
            modal.show();
        });
    });
}

/**
 * Setup the edit alternate name form submission
 */
function setupEditAlternateNameForm() {
    const editForm = document.getElementById('editAlternateNameForm');
    if (!editForm) return;
    
    editForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const id = document.getElementById('editAlternateNameId').value;
        const alternateName = document.getElementById('editAlternateName').value;
        
        try {
            const response = await fetch(`/clubs/manage/alternate-names/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ alternateName })
            });
            
            const result = await response.json();
            
            if (result.success) {
                location.reload(); // Refresh the page to show the updated name
            } else {
                alert(result.message || 'Error updating alternate name');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error updating alternate name');
        }
    });
}

/**
 * Setup delete buttons for alternate names
 */
function setupDeleteAlternateNameButtons() {
    document.querySelectorAll('.delete-alternate-name').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.dataset.id;
            const name = this.dataset.name;
            
            if (confirm(`Are you sure you want to delete the alternate name "${name}"?`)) {
                deleteAlternateName(id);
            }
        });
    });
}

/**
 * Delete an alternate name
 * @param {string} id - The ID of the alternate name to delete
 */
async function deleteAlternateName(id) {
    try {
        const response = await fetch(`/clubs/manage/alternate-names/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            location.reload(); // Refresh the page to remove the deleted name
        } else {
            alert(result.message || 'Error deleting alternate name');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting alternate name');
    }
}