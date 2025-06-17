/**
 * Carnival Edit JavaScript
 * Handles file upload area interactions for carnival edit page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Make file upload areas clickable
    document.querySelectorAll('.file-upload-area').forEach(area => {
        area.addEventListener('click', function() {
            const input = this.querySelector('input[type="file"]');
            if (input) {
                input.click();
            }
        });
    });
});