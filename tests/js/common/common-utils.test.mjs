import { describe, it, expect, beforeEach, vi } from 'vitest';
import { commonUtilsManager } from '../../../public/js/common-utils.js';

describe('common-utils.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button data-action="print">Print</button>
      <button data-action="reload">Reload</button>
      <input id="pwd" type="password" />
      <button data-toggle-password="pwd"><i class="bi bi-eye"></i></button>
      <div class="alert-warning">Warn</div>
      <button data-action="proceed-anyway">Proceed</button>
      <button data-action="clear-form">Clear</button>
      <form id="f1" data-confirm-delete="Sure?"></form>
      <button id="confirmBtn" data-confirm="Are you sure?"></button>
      <form id="f2" data-confirm-submit="Submit?"></form>
    `;
    // jsdom shims
    window.print = vi.fn();
  });

  it('binds events and exposes legacy confirmDelete', () => {
    commonUtilsManager.initialize();
    expect(typeof window.oldmanfooty.confirmDelete).toBe('function');
  });

  it('togglePassword switches input type and icon', () => {
    commonUtilsManager.initialize();
    document.querySelector('[data-toggle-password]')?.click();
    const pwd = document.getElementById('pwd');
    expect(pwd.type).toBe('text');
  });

  it('proceedAnyway hides warning and enables disabled fields', () => {
    document.body.innerHTML += '<input id="disabled" disabled />';
    commonUtilsManager.initialize();
    document.querySelector('[data-action="proceed-anyway"]').click();
    expect(document.querySelector('.alert-warning').style.display).toBe('none');
    expect(document.getElementById('disabled').disabled).toBe(false);
  });

  it('print and reload actions are bound', () => {
    commonUtilsManager.initialize();
  const reloadSpy = vi.spyOn(commonUtilsManager, 'reloadPage').mockImplementation(() => {});
    document.querySelector('[data-action="print"]').click();
    expect(window.print).toHaveBeenCalled();
    document.querySelector('[data-action="reload"]').click();
  expect(reloadSpy).toHaveBeenCalled();
  });

  it('data-confirm-delete prevents submit when cancelled', () => {
    commonUtilsManager.initialize();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    const form = document.getElementById('f1');
    const evt = new Carnival('submit', { cancelable: true });
    const prevented = !form.dispatchEvent(evt);
    expect(prevented).toBe(true);
  });
});
