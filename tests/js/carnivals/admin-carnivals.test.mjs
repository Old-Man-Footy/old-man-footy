import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
// Import the manager object directly.
import { adminCarnivalsManager } from '../../../public/js/admin-carnivals.js';

/**
 * @file admin-carnivals.test.mjs
 * @description Unit tests for adminCarnivalsManager.
 */

// Helper function to set up the DOM for each test
function setupDOM() {
    document.body.innerHTML = `
        <div id="statusToggleModal"></div>
        <button id="confirmStatusToggle"></button>
        <div id="toggleCarnivalTitle"></div>
        <div id="statusToggleMessage"></div>
        <div id="statusWarningText"></div>
        <div id="toggleActionText"></div>
        <div id="toast-container"></div>
        <button 
            data-toggle-carnival-status="123" 
            data-carnival-title="Test Carnival" 
            data-current-status="true">
        </button>
    `;
}

describe('adminCarnivalsManager', () => {

    beforeEach(() => {
        // Set up the DOM
        setupDOM();

        // **THE FIX IS HERE:**
        // The mock for bootstrap.Modal now includes the static `getInstance` method.
        const mockModalInstance = { show: vi.fn(), hide: vi.fn() };
        vi.stubGlobal('bootstrap', {
            Modal: Object.assign(vi.fn(() => mockModalInstance), {
                getInstance: vi.fn(() => mockModalInstance)
            }),
            Toast: vi.fn(() => ({ show: vi.fn() })),
        });

        vi.stubGlobal('fetch', vi.fn());

        // Manually mock the non-configurable window.location object
        const originalLocation = window.location;
        delete window.location;
        window.location = { ...originalLocation, reload: vi.fn() };
        
        // Use fake timers to control setTimeout
        vi.useFakeTimers();
    });

    afterEach(() => {
        // Clean up all mocks and the DOM
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
        vi.useRealTimers();
    });

    it('should update modal content for deactivating a carnival', () => {
        adminCarnivalsManager.initialize();
        adminCarnivalsManager.showStatusToggleModal('123', 'Test Carnival', true);

        expect(document.getElementById('toggleCarnivalTitle').textContent).toBe('Test Carnival');
        expect(document.getElementById('statusToggleMessage').textContent).toContain('deactivate');
        expect(document.getElementById('confirmStatusToggle').className).toContain('btn-danger');
        expect(bootstrap.Modal).toHaveBeenCalled();
    });

    it('should update modal content for reactivating a carnival', () => {
        adminCarnivalsManager.initialize();
        adminCarnivalsManager.showStatusToggleModal('456', 'Inactive Carnival', false);

        expect(document.getElementById('toggleCarnivalTitle').textContent).toBe('Inactive Carnival');
        expect(document.getElementById('statusToggleMessage').textContent).toContain('reactivate');
        expect(document.getElementById('confirmStatusToggle').className).toContain('btn-tertiary');
        expect(bootstrap.Modal).toHaveBeenCalled();
    });

    it('should create and show a toast message', () => {
        adminCarnivalsManager.initialize();
        adminCarnivalsManager.showToast('success', 'It worked!');

        const toastContainer = document.getElementById('toast-container');
        expect(toastContainer.innerHTML).toContain('It worked!');
        expect(bootstrap.Toast).toHaveBeenCalled();
    });

    it('should send request and reload on successful status toggle', async () => {
        // Mock a successful fetch response
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: true, message: 'Success!' }),
        });
        
        // Spy on the method we want to test for side effects
        const showToastSpy = vi.spyOn(adminCarnivalsManager, 'showToast');
        
        adminCarnivalsManager.initialize();
        adminCarnivalsManager.currentCarnivalId = '123';
        adminCarnivalsManager.currentStatus = true;

        // We must await the method call to allow the promise to resolve.
        await adminCarnivalsManager.confirmStatusToggle();

        expect(fetch).toHaveBeenCalledWith('/admin/carnivals/123/toggle-status', expect.any(Object));
        expect(showToastSpy).toHaveBeenCalledWith('success', 'Success!');
        
        // Advance timers to trigger the reload
        await vi.runAllTimersAsync();
        expect(window.location.reload).toHaveBeenCalled();
    });

    it('should show an error toast on failed status toggle', async () => {
        // Mock a failed fetch response
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: false, message: 'API Error' }),
        });

        const showToastSpy = vi.spyOn(adminCarnivalsManager, 'showToast');

        adminCarnivalsManager.initialize();
        adminCarnivalsManager.currentCarnivalId = '123';

        // Await the method call
        await adminCarnivalsManager.confirmStatusToggle();

        expect(showToastSpy).toHaveBeenCalledWith('error', 'API Error');
    });
});
