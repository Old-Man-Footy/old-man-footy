import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { carnivalManagementManager } from '/public/js/carnival-management.js';

/**
 * @file carnival-management.test.js
 * @description Unit tests for carnivalManagementManager.
 */

// Helper to set up DOM for each test
function setupDOM() {
    document.body.innerHTML = `
        <form data-action="unregister-carnival"></form>
        <form data-action="take-ownership"></form>
        <button data-action="unregister"></button>
        <button data-action="take-ownership-btn"></button>
        <form data-confirm="Are you sure?"></form>
    `;
}

describe('carnivalManagementManager', () => {
    beforeEach(() => {
        setupDOM();
        carnivalManagementManager.initialize();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('should cache DOM elements on initialize', () => {
        expect(carnivalManagementManager.elements.unregisterBtn).not.toBeNull();
        expect(carnivalManagementManager.elements.ownershipBtn).not.toBeNull();
        expect(carnivalManagementManager.elements.unregisterForm).not.toBeNull();
        expect(carnivalManagementManager.elements.ownershipForm).not.toBeNull();
        expect(carnivalManagementManager.elements.confirmForms.length).toBeGreaterThan(0);
    });

    it('should call confirm and submit unregister form on unregister button click', () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        const submitSpy = vi.spyOn(carnivalManagementManager.elements.unregisterForm, 'submit');
        carnivalManagementManager.elements.unregisterBtn.click();
        expect(confirmSpy).toHaveBeenCalled();
        expect(submitSpy).toHaveBeenCalled();
    });

    it('should call confirm and submit ownership form on take ownership button click', () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        const submitSpy = vi.spyOn(carnivalManagementManager.elements.ownershipForm, 'submit');
        carnivalManagementManager.elements.ownershipBtn.click();
        expect(confirmSpy).toHaveBeenCalled();
        expect(submitSpy).toHaveBeenCalled();
    });

    it('should prevent form submission if confirmation is cancelled', () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
        const event = new Event('submit', { bubbles: true, cancelable: true });
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
        carnivalManagementManager.elements.confirmForms[0].dispatchEvent(event);
        expect(confirmSpy).toHaveBeenCalled();
        expect(preventDefaultSpy).toHaveBeenCalled();
    });
});