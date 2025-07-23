import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';

// We will dynamically import the module in our tests after setting up the DOM
let adminClubs;
let searchInput;

afterEach(() => {
  // Clean up spies and the DOM
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('Admin Clubs JS', () => {
  let showToastMock;
  let buttonMock;
  let fetchMock;
  let confirmMock;

  // This runs before each test inside this describe block
  beforeEach(async () => {
    // Reset modules to ensure the top-level script in admin-clubs.js runs fresh
    vi.resetModules();

    // Set up the DOM. Using innerHTML is a quick way to create the element.
    document.body.innerHTML = `
      <input id="search" value="test" />
      <table>
        <tbody>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td><span class="badge"></span></td>
            <td><span class="badge"></span></td>
          </tr>
        </tbody>
      </table>
    `;
    searchInput = document.getElementById('search');

    // Spy on the methods of the *actual* DOM element
    vi.spyOn(searchInput, 'focus');
    vi.spyOn(searchInput, 'setSelectionRange');

    // Now that the DOM is ready, import the module.
    // This will execute the script, including the auto-focus logic.
    adminClubs = await import('/public/js/admin-clubs.js');

    // The module is already imported and toast function is available.
    // We can set our mock for it.
    showToastMock = vi.fn();
    adminClubs.setShowToast(showToastMock);

    // Button mock
    buttonMock = {
      dataset: {
        clubId: '1',
        clubName: 'Test Club',
        currentStatus: 'true',
        currentVisibility: 'false'
      },
      className: '',
      title: '',
      innerHTML: '',
      disabled: false,
      closest: vi.fn(() => document.querySelector('tr'))
    };

    // Mock global fetch
    fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Success' })
      })
    );
    global.fetch = fetchMock;

    // Mock confirm
    confirmMock = vi.fn(() => true);
    global.confirm = confirmMock;
  });

  it('should focus search input if present on module load', () => {
    // The top-level beforeEach has already run, so the focus should have happened.
    expect(searchInput.focus).toHaveBeenCalled();
    expect(searchInput.setSelectionRange).toHaveBeenCalledWith(searchInput.value.length, searchInput.value.length);
  });

  it('should handle club status toggle and update UI', async () => {
    await adminClubs.handleClubStatusToggle(buttonMock);

    expect(fetchMock).toHaveBeenCalledWith('/admin/clubs/1/toggle-status', expect.objectContaining({
      method: 'POST'
    }));
    expect(buttonMock.dataset.currentStatus).toBe('false');
    expect(buttonMock.className).toContain('btn-outline-success');
    expect(buttonMock.title).toBe('Reactivate Club');
    expect(showToastMock).toHaveBeenCalledWith('success', 'Success');
  });

  it('should handle club visibility toggle and update UI', async () => {
    await adminClubs.handleClubVisibilityToggle(buttonMock);

    expect(fetchMock).toHaveBeenCalledWith('/admin/clubs/1/toggle-visibility', expect.objectContaining({
      method: 'POST'
    }));
    expect(buttonMock.dataset.currentVisibility).toBe('true');
    expect(buttonMock.className).toContain('btn-outline-secondary');
    expect(buttonMock.title).toBe('Hide from Public Listing');
    expect(showToastMock).toHaveBeenCalledWith('success', 'Success');
  });

  it('should not proceed if confirmation is cancelled', async () => {
    confirmMock.mockReturnValueOnce(false);

    await adminClubs.handleClubStatusToggle(buttonMock);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should show error toast on failed request', async () => {
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: false, message: 'Failed' })
      })
    );

    await adminClubs.handleClubStatusToggle(buttonMock);

    expect(showToastMock).toHaveBeenCalledWith('error', expect.stringContaining('Failed'));
  });
});