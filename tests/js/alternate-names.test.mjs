import { describe, it, beforeEach, vi, expect } from 'vitest';
import {  setupAddAlternateNameForm } from '/public/js/alternate-names.js';

describe('setupAddAlternateNameForm', () => {
let addForm;
let fetchMock;
let locationReloadMock;
let alertMock;

beforeEach(() => {
  // Set up DOM
  document.body.innerHTML = `
    <form id="addAlternateNameForm">
      <input name="alternateName" value="Test Club" />
      <button type="submit">Add</button>
    </form>
  `;

  addForm = document.getElementById('addAlternateNameForm');

  // Mock global fetch
  fetchMock = vi.fn();
  global.fetch = fetchMock;

  // Mock global.location with a custom object
  locationReloadMock = vi.fn();
  global.location = {
    assign: vi.fn(),
    reload: locationReloadMock,
    // add any other properties your code might use
  };

  // Mock alert
  alertMock = vi.fn();
  global.alert = alertMock;
});

it('should send POST request and reload on success', async () => {
  fetchMock.mockResolvedValueOnce({
    json: async () => ({ success: true }),
  });

  setupAddAlternateNameForm();

  // Simulate form submit
  const event = new Event('submit');
  addForm.dispatchEvent(event);

  // Wait for async code
  await Promise.resolve();
  // Wait for all microtasks and event handlers to complete
  await new Promise(setImmediate);

  expect(fetchMock).toHaveBeenCalledWith('/clubs/manage/alternate-names', expect.objectContaining({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alternateName: 'Test Club' }),
  }));
  expect(locationReloadMock).toHaveBeenCalled();
  expect(alertMock).not.toHaveBeenCalled();
});

it('should alert on error response', async () => {
  fetchMock.mockResolvedValueOnce({
    json: async () => ({ success: false, message: 'Duplicate name' }),
  });

  setupAddAlternateNameForm();

  const event = new Event('submit');
  addForm.dispatchEvent(event);

  await Promise.resolve();
  // Wait for all microtasks and event handlers to complete
  await new Promise(setImmediate);

  expect(alertMock).toHaveBeenCalledWith('Duplicate name');
  expect(locationReloadMock).not.toHaveBeenCalled();
});

it('should alert on fetch failure', async () => {
  fetchMock.mockRejectedValueOnce(new Error('Network error'));

  setupAddAlternateNameForm();

  const event = new Event('submit');
  addForm.dispatchEvent(event);

  await Promise.resolve();
  // Wait for all microtasks and event handlers to complete
  await new Promise(setImmediate);

  expect(alertMock).toHaveBeenCalledWith('Error adding alternate name');
  expect(locationReloadMock).not.toHaveBeenCalled();
});

it('should do nothing if form not found', () => {
  document.body.innerHTML = '';
  expect(() => setupAddAlternateNameForm()).not.toThrow();
});
});