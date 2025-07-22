import { describe, it, expect, vi, beforeEach } from 'vitest';
import { asyncHandler, catchAsync, wrapControllers } from '../../middleware/asyncHandler.mjs';

/**
 * Mocks for Express req, res, next
 */
const createMockReqResNext = () => {
  const req = { originalUrl: '/test', method: 'GET' };
  const res = {};
  const next = vi.fn();
  return { req, res, next };
};

describe('asyncHandler', () => {
  it('should call the async function and not call next on success', async () => {
    const { req, res, next } = createMockReqResNext();
    const handler = asyncHandler(async (req, res, next) => {
      res.success = true;
    });
    await handler(req, res, next);
    expect(res.success).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch errors and call next with error', async () => {
    const { req, res, next } = createMockReqResNext();
    const error = new Error('Test error');
    const handler = asyncHandler(async () => {
      throw error;
    });
    await handler(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  it('should handle non-Error thrown values', async () => {
    const { req, res, next } = createMockReqResNext();
    const handler = asyncHandler(async () => {
      throw { message: 'Not an Error object', code: 123 };
    });
    await handler(req, res, next);
    expect(next).toHaveBeenCalledWith({ message: 'Not an Error object', code: 123 });
  });
});

describe('catchAsync', () => {
  it('should call the async function and not call next on success', async () => {
    const { req, res, next } = createMockReqResNext();
    const handler = catchAsync(async (req, res, next) => {
      res.success = true;
    });
    await handler(req, res, next);
    expect(res.success).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch errors and call next with error', async () => {
    const { req, res, next } = createMockReqResNext();
    const error = new Error('Test error');
    const handler = catchAsync(async () => {
      throw error;
    });
    await handler(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('wrapControllers', () => {
  it('should wrap all functions with asyncHandler', async () => {
    const { req, res, next } = createMockReqResNext();
    const error = new Error('Controller error');
    const rawControllers = {
      ok: async (req, res) => { res.ok = true; },
      fail: async () => { throw error; },
      notAFunction: 'just a string'
    };
    const wrapped = wrapControllers(rawControllers);

    await wrapped.ok(req, res, next);
    expect(res.ok).toBe(true);
    expect(next).not.toHaveBeenCalled();

    await wrapped.fail(req, res, next);
    expect(next).toHaveBeenCalledWith(error);

    expect(wrapped.notAFunction).toBe('just a string');
  });
});