import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clubPlayersFormManager } from '../../../public/js/club-players-form.js';

function setupDom({ mode = 'add' } = {}) {
  document.body.innerHTML = `
    <form method="POST" action="/clubs/players${mode === 'edit' ? '/123' : ''}" ${mode === 'edit' ? '' : ''} novalidate>
      ${mode === 'edit' ? '<input type="hidden" name="_method" value="PUT">' : ''}
      <input id="firstName" name="firstName" required maxlength="50" />
      <input id="lastName" name="lastName" required maxlength="50" />
      <input id="dateOfBirth" name="dateOfBirth" type="date" required />
      <input id="email" name="email" type="email" required maxlength="254" />
      <select id="shorts" name="shorts">
        <option value="Unrestricted">Unrestricted</option>
        <option value="Red">Red</option>
      </select>
      <textarea id="notes" name="notes" maxlength="1000"></textarea>
      <div class="form-text"><span id="notesCounter">0</span>/1000 characters</div>
      <button type="submit">Submit</button>
    </form>
  `;
  // jsdom lacks scrollIntoView
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || vi.fn();
}

describe('club-players-form.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('initializes character counter and updates classes near limits', () => {
    setupDom();
    clubPlayersFormManager.initialize();
    const notes = document.getElementById('notes');
    const counter = document.getElementById('notesCounter');

    expect(counter.textContent).toBe('0');

    notes.value = 'a'.repeat(805);
    notes.dispatchEvent(new Event('input'));
    expect(counter.classList.contains('text-warning')).toBe(true);

    notes.value = 'a'.repeat(960);
    notes.dispatchEvent(new Event('input'));
    expect(counter.classList.contains('text-danger')).toBe(true);

    notes.value = 'a'.repeat(1000);
    notes.dispatchEvent(new Event('input'));
    expect(counter.classList.contains('fw-bold')).toBe(true);
  });

  it('sets min on date input and validates age plus updates age display', () => {
    setupDom();
    clubPlayersFormManager.initialize();
    const dob = document.getElementById('dateOfBirth');

    expect(dob.min).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Too young
    const today = new Date();
    const young = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());
    dob.value = young.toISOString().split('T')[0];
    dob.dispatchEvent(new Event('change'));
    const invalid = clubPlayersFormManager.validateAge(dob);
    expect(invalid.isValid).toBe(false);

    // Valid adult and age display present
    const adult = new Date(today.getFullYear() - 40, today.getMonth(), today.getDate());
    dob.value = adult.toISOString().split('T')[0];
    dob.dispatchEvent(new Event('change'));
    const valid = clubPlayersFormManager.validateAge(dob);
    expect(valid.isValid).toBe(true);
    const ageDisplay = dob.parentNode.querySelector('.age-display');
    expect(ageDisplay).not.toBeNull();
    expect(ageDisplay.textContent).toMatch(/Age: 40/);
  });

  it('capitalizes name inputs and normalizes email on blur', () => {
    setupDom();
    clubPlayersFormManager.initialize();
    const first = document.getElementById('firstName');
    const last = document.getElementById('lastName');
    const email = document.getElementById('email');

    first.value = 'joHN';
    first.dispatchEvent(new Event('input'));
    expect(first.value).toBe('John');

    last.value = 'doE';
    last.dispatchEvent(new Event('input'));
    expect(last.value).toBe('Doe');

    email.value = '  USER@EXAMPLE.COM  ';
    email.dispatchEvent(new Event('blur'));
    expect(email.value).toBe('user@example.com');
  });

  it('prevents submit when invalid and shows loading when valid', () => {
    setupDom();
    clubPlayersFormManager.initialize();
    const form = document.querySelector('form');
    const submitSpy = vi.spyOn(form, 'submit').mockImplementation(() => {});

    // Invalid (empty required fields)
    const evt = new Event('submit', { bubbles: true, cancelable: true });
    const prevented = !form.dispatchEvent(evt);
    expect(prevented).toBe(true);

    // Fill valid values
    document.getElementById('firstName').value = 'John';
    document.getElementById('lastName').value = 'Doe';
    const adult = new Date(new Date().getFullYear() - 40, 0, 1);
    document.getElementById('dateOfBirth').value = adult.toISOString().split('T')[0];
    document.getElementById('email').value = 'john@example.com';

    const evt2 = new Event('submit', { bubbles: true, cancelable: true });
    const prevented2 = !form.dispatchEvent(evt2);
    expect(prevented2).toBe(false);

    const btn = document.querySelector('button[type="submit"]');
    expect(btn.disabled).toBe(true);
    expect(btn.innerHTML).toMatch(/Saving/);

    submitSpy.mockRestore();
  });
});
