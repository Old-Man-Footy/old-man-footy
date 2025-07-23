import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
// Import the manager object directly.
import { clubPlayersManager } from '/public/js/carnival-club-players.js';

/**
 * @file carnival-club-players.test.js
 * @description Unit tests for clubPlayersManager in carnival-club-players.js
 */

// Helper function to set up the DOM for each test
function setupDOM() {
    document.body.innerHTML = `
        <div id="updateStatusModal" class="modal">
            <div class="modal-title"></div>
        </div>
        <form id="updateStatusForm">
            <!-- THE FIX IS HERE: Added name="attendanceStatus" -->
            <select id="attendanceStatus" name="attendanceStatus">
                <option value="Present"></option>
                <option value="Pending"></option>
            </select>
            <input name="notes" value="Test Note" />
        </form>
        <button 
            class="update-status-btn" 
            data-assignment-id="a1" 
            data-current-status="Present" 
            data-player-name="Alice">
            Update
        </button>
        <button 
            class="remove-player-btn" 
            data-assignment-id="a2" 
            data-player-name="Bob">
            Remove
        </button>
    `;
}

describe('clubPlayersManager', () => {

    beforeEach(() => {
        // Set up the DOM and mock global functions
        setupDOM();
        vi.stubGlobal('fetch', vi.fn());
        vi.stubGlobal('alert', vi.fn());
        vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
        
        // Mock bootstrap modal
        vi.stubGlobal('bootstrap', {
            Modal: vi.fn().mockImplementation(() => ({
                show: vi.fn()
            }))
        });

        // Mock window.location.reload
        const originalLocation = window.location;
        delete window.location;
        window.location = { ...originalLocation, reload: vi.fn() };
    });

    afterEach(() => {
        // Restore all mocks
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    describe('initialize', () => {
        it('should set IDs and call initialization methods', () => {
            const statusSpy = vi.spyOn(clubPlayersManager, 'initializeStatusUpdateListeners');
            const removeSpy = vi.spyOn(clubPlayersManager, 'initializeRemovePlayerListeners');
            clubPlayersManager.initialize('c1', 'r1');
            expect(clubPlayersManager.carnivalId).toBe('c1');
            expect(clubPlayersManager.registrationId).toBe('r1');
            expect(statusSpy).toHaveBeenCalled();
            expect(removeSpy).toHaveBeenCalled();
        });
    });

    describe('openUpdateStatusModal', () => {
        it('should set assignmentId, update modal fields, and show modal', () => {
            clubPlayersManager.openUpdateStatusModal('assign1', 'Pending', 'Player One');
            expect(clubPlayersManager.currentAssignmentId).toBe('assign1');
            expect(document.getElementById('attendanceStatus').value).toBe('Pending');
            expect(document.querySelector('#updateStatusModal .modal-title').textContent).toContain('Player One');
            expect(bootstrap.Modal).toHaveBeenCalled();
        });
    });

    describe('handleStatusUpdateSubmit', () => {
        it('should call sendRequest and reload on success', async () => {
            const sendRequestSpy = vi.spyOn(clubPlayersManager, 'sendRequest').mockResolvedValue({ success: true });
            clubPlayersManager.initialize('c1', 'r1');
            clubPlayersManager.currentAssignmentId = 'a1';
            
            const form = document.getElementById('updateStatusForm');
            await clubPlayersManager.handleStatusUpdateSubmit(new FormData(form));
            
            expect(sendRequestSpy).toHaveBeenCalledWith(
                '/carnivals/c1/attendees/r1/players/a1/status',
                'POST',
                { attendanceStatus: 'Present', notes: 'Test Note' }
            );
            expect(window.location.reload).toHaveBeenCalled();
        });

        it('should alert on API failure', async () => {
            vi.spyOn(clubPlayersManager, 'sendRequest').mockResolvedValue({ success: false, message: 'API Error' });
            await clubPlayersManager.handleStatusUpdateSubmit(new FormData());
            expect(window.alert).toHaveBeenCalledWith('Error: API Error');
        });

        it('should alert on fetch exception', async () => {
            vi.spyOn(clubPlayersManager, 'sendRequest').mockRejectedValue(new Error('Network Error'));
            await clubPlayersManager.handleStatusUpdateSubmit(new FormData());
            expect(window.alert).toHaveBeenCalledWith('An error occurred while updating the status.');
        });
    });

    describe('removePlayer', () => {
        it('should call sendRequest and reload on success', async () => {
            const sendRequestSpy = vi.spyOn(clubPlayersManager, 'sendRequest').mockResolvedValue({ success: true });
            clubPlayersManager.initialize('c1', 'r1');
            await clubPlayersManager.removePlayer('a2');
            expect(sendRequestSpy).toHaveBeenCalledWith('/carnivals/c1/attendees/r1/players/a2', 'DELETE');
            expect(window.location.reload).toHaveBeenCalled();
        });

        it('should alert on API failure', async () => {
            vi.spyOn(clubPlayersManager, 'sendRequest').mockResolvedValue({ success: false, message: 'API Error' });
            await clubPlayersManager.removePlayer('a2');
            expect(window.alert).toHaveBeenCalledWith('Error: API Error');
        });

        it('should alert on fetch exception', async () => {
            vi.spyOn(clubPlayersManager, 'sendRequest').mockRejectedValue(new Error('Network Error'));
            await clubPlayersManager.removePlayer('a2');
            expect(window.alert).toHaveBeenCalledWith('An error occurred while removing the player.');
        });
    });

    describe('sendRequest', () => {
        it('should call fetch with correct parameters for POST', async () => {
            fetch.mockResolvedValue({ json: () => Promise.resolve({ status: 'ok' }) });
            const body = { key: 'value' };
            const result = await clubPlayersManager.sendRequest('/test-url', 'POST', body);
            expect(fetch).toHaveBeenCalledWith('/test-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            expect(result).toEqual({ status: 'ok' });
        });

        it('should call fetch without a body for DELETE', async () => {
            fetch.mockResolvedValue({ json: () => Promise.resolve({ status: 'ok' }) });
            await clubPlayersManager.sendRequest('/test-url', 'DELETE');
            expect(fetch).toHaveBeenCalledWith('/test-url', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
        });
    });
});
