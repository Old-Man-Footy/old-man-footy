/**
 * User Guide Controller Tests
 * 
 * Tests for the user guide functionality, ensuring that the controller
 * correctly reads and renders different guides based on authentication status.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUserGuide } from '../../controllers/userGuide.controller.mjs';
import fs from 'fs/promises';

// Mock the fs/promises module to avoid actual file system access
vi.mock('fs/promises');

// Mock the asyncHandler to test the raw controller function
vi.mock('/middleware/asyncHandler.mjs', () => ({
  asyncHandler: (fn) => fn,
}));

describe('User Guide Controller', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Mock Express request, response, and next objects
    req = {
      user: { id: 1, name: 'Test User' },
    };
    res = {
      render: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it('should render the delegate user guide for authenticated users', async () => {
    // Arrange
    const mockMarkdownContent = '# Delegate User Guide\n\nThis is the delegate guide.';
    fs.readFile.mockResolvedValue(mockMarkdownContent);

    // Act
    await getUserGuide(req, res, next);

    // Assert
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('USER_GUIDE_DELEGATES.md'), 'utf8');
    expect(res.render).toHaveBeenCalledWith('user-guide', {
      title: 'Club Delegate User Guide',
      guideContent: mockMarkdownContent,
      user: req.user,
      isAuthenticated: true,
      additionalCSS: ['/styles/user-guide.styles.css'],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should render the standard user guide for non-authenticated users', async () => {
    // Arrange
    req.user = null;
    const mockMarkdownContent = '# Standard User Guide\n\nThis is the standard guide.';
    fs.readFile.mockResolvedValue(mockMarkdownContent);

    // Act
    await getUserGuide(req, res, next);

    // Assert
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('USER_GUIDE_STANDARD.md'), 'utf8');
    expect(res.render).toHaveBeenCalledWith('user-guide', {
      title: 'Old Man Footy User Guide',
      guideContent: mockMarkdownContent,
      user: null,
      isAuthenticated: false,
      additionalCSS: ['/styles/user-guide.styles.css'],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should render the standard user guide for users without an ID', async () => {
    // Arrange
    req.user = { name: 'User without ID' }; // User object exists but no ID
    const mockMarkdownContent = '# Standard User Guide\n\nThis is the standard guide.';
    fs.readFile.mockResolvedValue(mockMarkdownContent);

    // Act
    await getUserGuide(req, res, next);

    // Assert
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('USER_GUIDE_STANDARD.md'), 'utf8');
    expect(res.render).toHaveBeenCalledWith('user-guide', {
      title: 'Old Man Footy User Guide',
      guideContent: mockMarkdownContent,
      user: req.user,
      isAuthenticated: false,
      additionalCSS: ['/styles/user-guide.styles.css'],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should forward file read errors to the error handler', async () => {
    // Arrange
    const fileReadError = new Error('Failed to read guide file');
    fs.readFile.mockRejectedValue(fileReadError);

    // Act & Assert
    // The asyncHandler is mocked to be a pass-through, so we test if the async function rejects.
    // The actual asyncHandler would catch this rejection and call next(fileReadError).
    await expect(getUserGuide(req, res, next)).rejects.toThrow('Failed to read guide file');

    // Ensure no response was sent
    expect(res.render).not.toHaveBeenCalled();
    // next() is not called directly by the controller, but by the (real) asyncHandler
    expect(next).not.toHaveBeenCalled();
  });
});
