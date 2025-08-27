/**
 * User Guide Controller - MVC Architecture Implementation
 *
 * Handles user guide display and documentation-related operations.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { asyncHandler } from '../middleware/asyncHandler.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Display user guide page with authentication-based content
 * Shows different guides for logged-in delegates vs. general users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function for error handling
 */
export const getUserGuide = asyncHandler(async (req, res, next) => {
  // Determine which guide to show based on authentication status
  const isAuthenticated = !!(req.user && req.user.id);
  
  // Set appropriate guide file and page title
  const guideFileName = isAuthenticated ? 'USER_GUIDE_DELEGATES.md' : 'USER_GUIDE_STANDARD.md';
  const pageTitle = isAuthenticated ? 'Club Delegate User Guide' : 'Old Man Footy User Guide';
  
  // Read the appropriate guide content
  const guidePath = path.join(__dirname, '..', 'docs', guideFileName);
  const guideContent = await fs.readFile(guidePath, 'utf8');

  return res.render('user-guide', {
    title: pageTitle,
    guideContent: guideContent,
    user: req.user,
    isAuthenticated: isAuthenticated,
    additionalCSS: ['/styles/user-guide.styles.css'],
  });
});
