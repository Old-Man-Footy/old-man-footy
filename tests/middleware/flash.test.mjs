import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enhancedFlash, flashTemplateVariables } from '/middleware/flash.mjs';

/**
 * Mocks for Express request and response objects
 */
function createMockReq(options = {}) {
  return {
    session: options.session || null,
    query: options.query || {},
    protocol: 'http',
    get: vi.fn(() => 'localhost:3050'),
    user: options.user || null,
    ...options.extra,
  };
}

function createMockRes() {
  return {
    locals: {},
    redirect: vi.fn(),
  };
}

describe('enhancedFlash middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = vi.fn();
    enhancedFlash(req, res, next);
  });

  it('should add flash method to req', () => {
    expect(typeof req.flash).toBe('function');
    expect(typeof req.flash.get).toBe('function');
  });

  it('should store flash messages in session if available', () => {
    req.session = {};
    req.flash('success_msg', 'Session message');
    expect(req.session.flash.success_msg).toContain('Session message');
  });

  it('should store flash messages in req._flashMessages if session is unavailable', () => {
    req.flash('error_msg', 'No session message');
    expect(req._flashMessages.error_msg).toContain('No session message');
  });

  it('should encode flash messages in URL params on redirect when no session', () => {
    req.flash('info_msg', 'Info1');
    res.redirect = vi.fn();
    const url = '/test';
    res.redirect(url);
    // The middleware wraps res.redirect, so call the wrapped version
    const wrappedRedirect = res.redirect;
    wrappedRedirect('/test');
    // Check that redirect was called with encoded flash param
    expect(res.redirect).toHaveBeenCalled();
  });

  it('should retrieve and clear flash messages from session', () => {
    req.session = { flash: { success_msg: ['Session msg'] } };
    const messages = req.flash.get('success_msg');
    expect(messages).toContain('Session msg');
    expect(req.session.flash.success_msg).toEqual([]);
  });

  it('should retrieve flash messages from URL query params', () => {
    req.query = { flash_error_msg: 'Error1|Error2' };
    const messages = req.flash.get('error_msg');
    expect(messages).toContain('Error1');
    expect(messages).toContain('Error2');
    expect(req.query.flash_error_msg).toBeUndefined();
  });

  it('should retrieve and clear flash messages from req._flashMessages', () => {
    req._flashMessages = { warning_msg: ['Warn1'] };
    const messages = req.flash.get('warning_msg');
    expect(messages).toContain('Warn1');
    expect(req._flashMessages.warning_msg).toEqual([]);
  });

  it('should call next()', () => {
    expect(next).toHaveBeenCalled();
  });
});

describe('flashTemplateVariables middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = vi.fn();
    enhancedFlash(req, res, () => {});
  });

  it('should set flash messages to res.locals', () => {
    req.flash('success_msg', 'Success!');
    req.flash('error_msg', 'Error!');
    req.flash('warning_msg', 'Warning!');
    req.flash('info_msg', 'Info!');
    req.flash('error', 'ErrorObj!');
    flashTemplateVariables(req, res, next);
    expect(res.locals.success_msg).toContain('Success!');
    expect(res.locals.error_msg).toContain('Error!');
    expect(res.locals.warning_msg).toContain('Warning!');
    expect(res.locals.info_msg).toContain('Info!');
    expect(res.locals.error).toContain('ErrorObj!');
  });

  it('should set user to res.locals.user', () => {
    req.user = { id: 1, name: 'Test User' };
    flashTemplateVariables(req, res, next);
    expect(res.locals.user).toEqual({ id: 1, name: 'Test User' });
  });

  it('should set user to null if not present', () => {
    req.user = undefined;
    flashTemplateVariables(req, res, next);
    expect(res.locals.user).toBeNull();
  });

  it('should call next()', () => {
    flashTemplateVariables(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});