import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { clubPlayersFormManager } from '../../../public/js/club-players-form.js';

/**
 * @file club-players-form.test.js
 * @description Unit tests for clubPlayersFormManager.
 */

// Helper to set up the DOM for each test
function setupDOM() {
  document.body.innerHTML = `
    <form action="/clubs/players/add">
      <div>
        <input id="firstName" name="firstName" required />
        <input id="lastName" name="lastName" required />
      </div>
      <div>
        <input id="email" name="email" required />
      </div>
      <div>
        <input id="dateOfBirth" name="dateOfBirth" required type="date" />
      </div>
      <div>
        <textarea id="notes" name="notes"></textarea>
        <span id="notesCounter"></span>
      </div>
      <button type="submit">Save</button>
    </form>
  `;

  // Mock scrollIntoView for all elements since it's not available in jsdom
  document.querySelectorAll('*').forEach(element => {
    element.scrollIntoView = vi.fn();
  });
}

describe('clubPlayersFormManager', () => {
  beforeEach(() => {
    setupDOM();
    clubPlayersFormManager.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    clubPlayersFormManager.elements = {};
  });

  it('should cache all required elements on initialize', () => {
    expect(clubPlayersFormManager.elements.form).toBeInstanceOf(HTMLFormElement);
    expect(clubPlayersFormManager.elements.notesField).toBeInstanceOf(HTMLElement);
    expect(clubPlayersFormManager.elements.notesCounter).toBeInstanceOf(HTMLElement);
    expect(clubPlayersFormManager.elements.dobField).toBeInstanceOf(HTMLElement);
    expect(clubPlayersFormManager.elements.nameFields.length).toBe(2);
    expect(clubPlayersFormManager.elements.emailField).toBeInstanceOf(HTMLElement);
    expect(clubPlayersFormManager.elements.submitButton).toBeInstanceOf(HTMLElement);
  });

  it('should capitalize first letter of name fields on input', () => {
    const firstName = document.getElementById('firstName');
    firstName.value = 'john';
    const event = new Event('input', { bubbles: true });
    firstName.dispatchEvent(event);
    expect(firstName.value).toBe('John');
  });

  it('should lowercase and trim email on blur', () => {
    const email = document.getElementById('email');
    email.value = '  TEST@EXAMPLE.COM ';
    email.dispatchEvent(new Event('blur'));
    expect(email.value).toBe('test@example.com');
  });

  it('should update character counter and add correct classes', () => {
    const notes = document.getElementById('notes');
    const counter = document.getElementById('notesCounter');
    notes.value = 'a'.repeat(801);
    notes.dispatchEvent(new Event('input'));
    expect(counter.textContent).toBe('801');
    expect(counter.classList.contains('text-warning')).toBe(true);

    notes.value = 'a'.repeat(951);
    notes.dispatchEvent(new Event('input'));
    expect(counter.classList.contains('text-danger')).toBe(true);

    notes.value = 'a'.repeat(1000);
    notes.dispatchEvent(new Event('input'));
    expect(counter.classList.contains('fw-bold')).toBe(true);
  });

  it('should validate name fields correctly', () => {
    const firstName = document.getElementById('firstName');
    firstName.value = '';
    let result = clubPlayersFormManager.validateField(firstName);
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/First name is required/);

    firstName.value = 'John123';
    result = clubPlayersFormManager.validateField(firstName);
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/only letters/);

    firstName.value = 'J'.repeat(51);
    result = clubPlayersFormManager.validateField(firstName);
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/50 characters or less/);

    firstName.value = 'John';
    result = clubPlayersFormManager.validateField(firstName);
    expect(result.isValid).toBe(true);
  });

  it('should validate email field correctly', () => {
    const email = document.getElementById('email');
    email.value = '';
    let result = clubPlayersFormManager.validateField(email);
    expect(result.isValid).toBe(false);

    email.value = 'invalid-email';
    result = clubPlayersFormManager.validateField(email);
    expect(result.isValid).toBe(false);

    email.value = 'user@example.com';
    result = clubPlayersFormManager.validateField(email);
    expect(result.isValid).toBe(true);
  });

  it('should validate dateOfBirth field and age', () => {
    const dob = document.getElementById('dateOfBirth');
    dob.value = '';
    let result = clubPlayersFormManager.validateField(dob);
    expect(result.isValid).toBe(false);

    // Future date
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    dob.value = future.toISOString().split('T')[0];
    result = clubPlayersFormManager.validateField(dob);
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/future/);

    // Too young
    const young = new Date();
    young.setFullYear(young.getFullYear() - 10);
    dob.value = young.toISOString().split('T')[0];
    result = clubPlayersFormManager.validateField(dob);
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/at least 16/);

    // Too old
    const old = new Date();
    old.setFullYear(old.getFullYear() - 101);
    dob.value = old.toISOString().split('T')[0];
    result = clubPlayersFormManager.validateField(dob);
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/check the date/);

    // Valid age
    const valid = new Date();
    valid.setFullYear(valid.getFullYear() - 30);
    dob.value = valid.toISOString().split('T')[0];
    result = clubPlayersFormManager.validateField(dob);
    expect(result.isValid).toBe(true);
  });

  it('should validate notes field for max length', () => {
    const notes = document.getElementById('notes');
    notes.value = 'a'.repeat(1001);
    const result = clubPlayersFormManager.validateField(notes);
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/cannot exceed 1000/);
  });

  it('should validate the entire form', () => {
    // All fields empty
    const form = clubPlayersFormManager.elements.form;
    expect(clubPlayersFormManager.validateForm(form)).toBe(false);

    // Fill all required fields with valid data
    document.getElementById('firstName').value = 'John';
    document.getElementById('lastName').value = 'Smith';
    document.getElementById('email').value = 'john@smith.com';
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 30);
    document.getElementById('dateOfBirth').value = dob.toISOString().split('T')[0];
    expect(clubPlayersFormManager.validateForm(form)).toBe(true);
  });

  it('should show form errors and focus first invalid field', () => {
    const firstName = document.getElementById('firstName');
    firstName.classList.add('is-invalid');
    const focusSpy = vi.spyOn(firstName, 'focus');
    clubPlayersFormManager.showFormErrors();
    expect(focusSpy).toHaveBeenCalled();
  });

  it('should show loading state on submission', () => {
    const submitButton = clubPlayersFormManager.elements.submitButton;
    submitButton.innerHTML = 'Save';
    clubPlayersFormManager.showSubmissionLoading();
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.innerHTML).toMatch(/Saving/);
    expect(submitButton.getAttribute('data-original-text')).toBe('Save');
  });

  it('should update age display and show Masters eligibility', () => {
    const dob = document.getElementById('dateOfBirth');
    // Age 36 (Masters eligible)
    const masters = new Date();
    masters.setFullYear(masters.getFullYear() - 36);
    dob.value = masters.toISOString().split('T')[0];
    clubPlayersFormManager.updateAgeDisplay(dob);
    const ageDisplay = dob.parentNode.querySelector('.age-display');
    expect(ageDisplay.innerHTML).toMatch(/Masters eligible/);

    // Age 25 (Not Masters eligible)
    const notMasters = new Date();
    notMasters.setFullYear(notMasters.getFullYear() - 25);
    dob.value = notMasters.toISOString().split('T')[0];
    clubPlayersFormManager.updateAgeDisplay(dob);
    expect(ageDisplay.innerHTML).toMatch(/Not Masters eligible/);
  });
});