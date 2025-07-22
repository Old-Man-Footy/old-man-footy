import { describe, it, beforeEach, vi, expect } from 'vitest';
import { initializeClubAutoPopulation } from '/public/js/add-club-auto-populate.js';

// Set up DOM and attach listeners after each test setup
describe('add-club-auto-populate.js', () => {
  let clubSelect, teamNameInput, contactPersonInput, contactEmailInput, contactPhoneInput;

  beforeEach(() => {
    // Set up DOM elements
    document.body.innerHTML = `
      <select id="clubId">
        <option value="">Select a club</option>
        <option value="1"
          data-club-name="Old Man FC"
          data-contact-person="John Doe"
          data-contact-email="john@oldmanfc.com"
          data-contact-phone="1234567890"
        >Old Man FC</option>
      </select>
      <input id="teamName" />
      <input id="contactPerson" />
      <input id="contactEmail" />
      <input id="contactPhone" />
    `;

    // Attach listeners after DOM setup
    initializeClubAutoPopulation();
    // Re-query the select/input elements after possible replacement
    clubSelect = document.getElementById('clubId');
    teamNameInput = document.getElementById('teamName');
    contactPersonInput = document.getElementById('contactPerson');
    contactEmailInput = document.getElementById('contactEmail');
    contactPhoneInput = document.getElementById('contactPhone');
  });

  it('should clear fields when no club is selected', () => {
    teamNameInput.value = 'Some Team';
    contactPersonInput.value = 'Someone';
    contactEmailInput.value = 'someone@email.com';
    contactPhoneInput.value = '555';

    clubSelect.value = '';
    clubSelect.dispatchEvent(new Event('change'));

    expect(teamNameInput.value).toBe('');
    expect(contactPersonInput.value).toBe('');
    expect(contactEmailInput.value).toBe('');
    expect(contactPhoneInput.value).toBe('');
  });

  it('should auto-populate fields when a club is selected', () => {
    clubSelect.value = '1';
    clubSelect.dispatchEvent(new Event('change'));

    expect(teamNameInput.value).toBe('Old Man FC');
    expect(contactPersonInput.value).toBe('John Doe');
    expect(contactEmailInput.value).toBe('john@oldmanfc.com');
    expect(contactPhoneInput.value).toBe('1234567890');
  });

  it('should add and remove auto-populated class for visual feedback', () => {
    vi.useFakeTimers();

    clubSelect.value = '1';
    clubSelect.dispatchEvent(new Event('change'));

    expect(teamNameInput.classList.contains('auto-populated')).toBe(true);
    expect(contactPersonInput.classList.contains('auto-populated')).toBe(true);
    expect(contactEmailInput.classList.contains('auto-populated')).toBe(true);
    expect(contactPhoneInput.classList.contains('auto-populated')).toBe(true);

    vi.advanceTimersByTime(2000);

    expect(teamNameInput.classList.contains('auto-populated')).toBe(false);
    expect(contactPersonInput.classList.contains('auto-populated')).toBe(false);
    expect(contactEmailInput.classList.contains('auto-populated')).toBe(false);
    expect(contactPhoneInput.classList.contains('auto-populated')).toBe(false);

    vi.useRealTimers();
  });

  it('should not fail if some input fields are missing', () => {
    document.getElementById('contactPhone').remove();

    clubSelect.value = '1';
    expect(() => {
      clubSelect.dispatchEvent(new Event('change'));
    }).not.toThrow();

    expect(teamNameInput.value).toBe('Old Man FC');
    expect(contactPersonInput.value).toBe('John Doe');
    expect(contactEmailInput.value).toBe('john@oldmanfc.com');
  });
});