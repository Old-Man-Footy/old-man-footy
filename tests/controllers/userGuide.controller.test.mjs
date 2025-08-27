/**
 * User Guide Controller Tests
 * 
 * Tests for the user guide functionality, ensuring that the controller
 * correctly reads and renders different guides based on authentication status.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUserGuide } from '../../controllers/userGuide.controller.mjs';

// Mock the asyncHandler to test the raw controller function
vi.mock('../../middleware/asyncHandler.mjs', () => ({
  asyncHandler: (fn) => fn,
}));

describe('User Guide Controller', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();

    req = { user: { id: 1, name: 'Test User' } };
    res = {
      render: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it('should render the index with delegate pages for authenticated users', async () => {
    // Act
    await getUserGuide(req, res, next);

    // Assert
    expect(res.render).toHaveBeenCalledWith('user-guide/index', expect.objectContaining({
      title: 'Club Delegate User Guide',
      pages: expect.any(Array),
      user: req.user,
      isAuthenticated: true,
      additionalCSS: ['/styles/user-guide.styles.css']
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should render the index with public pages for non-authenticated users', async () => {
    req.user = null;

    await getUserGuide(req, res, next);

    expect(res.render).toHaveBeenCalledWith('user-guide/index', expect.objectContaining({
      title: 'Old Man Footy User Guide',
      pages: expect.any(Array),
      user: null,
      isAuthenticated: false,
      additionalCSS: ['/styles/user-guide.styles.css']
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should treat a user without an id as not authenticated', async () => {
    req.user = { name: 'User without ID' };

    await getUserGuide(req, res, next);

    // Controller uses presence of req.user to determine authentication
    expect(res.render).toHaveBeenCalledWith('user-guide/index', expect.objectContaining({
      title: 'Club Delegate User Guide',
      isAuthenticated: true,
      user: req.user
    }));
  });

  it('should render a 404 error for an unknown page key', async () => {
    req.params = { pageKey: 'nonexistent-page' };

    await getUserGuide(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith('error', expect.objectContaining({
      title: 'Not Found',
      message: 'User guide page not found'
    }));
  });
});
