/**
 * User Guide Controller Tests
 * 
 * Tests for the user guide functionality, ensuring that the controller
 * correctly reads and renders the markdown-based user guide.
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

  it('should render the user guide page with content from the markdown file', async () => {
    // Arrange
    const mockMarkdownContent = '# User Guide\n\nThis is the guide.';
    fs.readFile.mockResolvedValue(mockMarkdownContent);

    // Act
    await getUserGuide(req, res, next);

    // Assert
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('USER_GUIDE_DELEGATES.md'), 'utf8');
    expect(res.render).toHaveBeenCalledWith('user-guide', {
      title: 'Club Delegate User Guide',
      guideContent: mockMarkdownContent,
      user: req.user,
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

  it('should render correctly even if there is no authenticated user', async () => {
    // Arrange
    req.user = null;
    const mockMarkdownContent = '## Guest Guide';
    fs.readFile.mockResolvedValue(mockMarkdownContent);

    // Act
    await getUserGuide(req, res, next);

    // Assert
    expect(res.render).toHaveBeenCalledWith('user-guide', {
      title: 'Club Delegate User Guide',
      guideContent: mockMarkdownContent,
      user: null,
      additionalCSS: ['/styles/user-guide.styles.css'],
    });
    expect(next).not.toHaveBeenCalled();
  });
});
