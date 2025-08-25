import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
// Import the manager object directly
import { adminEditClubManager } from '../../../public/js/admin-edit-club.js';

/**
 * @file admin-edit-club.test.js
 * @description Unit tests for adminEditClubManager.
 */

// Helper function to set up the DOM for each test
function setupDOM() {
    document.body.innerHTML = `
        <form action="/admin/clubs/edit/1">
            <input name="name" required />
            <textarea id="description"></textarea>
            <div class="file-upload-area">
                <span class="upload-text">Click or drag to upload new club logo</span>
                <input type="file" id="logo" />
            </div>
            <button type="submit">Submit</button>
        </form>
    `;
}

describe('adminEditClubManager', () => {
    beforeEach(() => {
        // Set up the DOM
        setupDOM();
        // Mock global functions
        vi.stubGlobal('alert', vi.fn());

        // Mock browser-specific APIs that are not available in JSDOM.
        vi.stubGlobal('DataTransfer', class {
            constructor() {
                this.files = [];
                this.items = {
                    add: (file) => {
                        this.files.push(file);
                    }
                };
            }
        });

        // **THE FIX IS HERE:**
        // Mock the DragEvent class.
        vi.stubGlobal('DragEvent', class extends Event {
            constructor(type, options) {
                super(type, options);
                this.dataTransfer = options.dataTransfer || new DataTransfer();
            }
        });


        // Initialize the manager, which caches elements and sets up listeners
        adminEditClubManager.initialize();
    });

    afterEach(() => {
        // Clean up mocks and the DOM
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('should prevent form submission if a required field is empty', () => {
        const form = document.querySelector('form');
        const nameInput = form.querySelector('[name="name"]');
        const submitEvent = new Event('submit', { cancelable: true });
        const preventDefaultSpy = vi.spyOn(submitEvent, 'preventDefault');

        nameInput.value = '   '; // Empty value
        form.dispatchEvent(submitEvent);

        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(alert).toHaveBeenCalledWith('Please fill in all required fields.');
        expect(nameInput.classList.contains('is-invalid')).toBe(true);
    });

    it('should allow form submission if required fields are filled', () => {
        const form = document.querySelector('form');
        const nameInput = form.querySelector('[name="name"]');
        const submitEvent = new Event('submit', { cancelable: true });
        const preventDefaultSpy = vi.spyOn(submitEvent, 'preventDefault');

        nameInput.value = 'Valid Club Name';
        form.dispatchEvent(submitEvent);

        expect(preventDefaultSpy).not.toHaveBeenCalled();
        expect(nameInput.classList.contains('is-invalid')).toBe(false);
    });

    it('should auto-resize the description textarea on input', () => {
        const textarea = document.getElementById('description');
        // Mock scrollHeight as it's a layout-dependent property
        Object.defineProperty(textarea, 'scrollHeight', { value: 150, configurable: true });

        textarea.dispatchEvent(new Event('input'));

        expect(textarea.style.height).toBe('150px');
    });

    it('should trigger file input click when the upload area is clicked', () => {
        const fileUploadArea = document.querySelector('.file-upload-area');
        const fileInput = document.getElementById('logo');
        const clickSpy = vi.spyOn(fileInput, 'click');

        fileUploadArea.click();

        expect(clickSpy).toHaveBeenCalled();
    });

    it('should update upload text when a file is selected', () => {
        const fileInput = document.getElementById('logo');
        const uploadText = document.querySelector('.upload-text');
        const testFile = new File(['content'], 'logo.png', { type: 'image/png' });

        // Simulate file selection
        Object.defineProperty(fileInput, 'files', { value: [testFile] });
        fileInput.dispatchEvent(new Event('change'));

        expect(uploadText.textContent).toBe('Selected: logo.png');
    });
    
    it('should handle file drop and update the file input', () => {
        const fileUploadArea = document.querySelector('.file-upload-area');
        const fileInput = document.getElementById('logo');
        const uploadText = document.querySelector('.upload-text');
        const testFile = new File(['content'], 'dropped-logo.png', { type: 'image/png' });

        // In the test environment, we need to make the 'files' property writable
        // to simulate the drop behavior correctly.
        Object.defineProperty(fileInput, 'files', {
            writable: true,
        });

        // Create a mock DataTransfer object
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(testFile);

        const dropEvent = new DragEvent('drop', { dataTransfer });
        fileUploadArea.dispatchEvent(dropEvent);

        expect(fileInput.files[0].name).toBe('dropped-logo.png');
        expect(uploadText.textContent).toBe('Selected: dropped-logo.png');
    });
});
