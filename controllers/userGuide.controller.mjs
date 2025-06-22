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
 * Display user guide page with modular CSS
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function for error handling
 */
export const getUserGuide = asyncHandler(async (req, res, next) => {
    const guidePath = path.join(__dirname, '..', 'docs', 'USER_GUIDE_DELEGATES.md');
    const guideContent = await fs.readFile(guidePath, 'utf8');
    
    res.render('user-guide', {
        title: 'Club Delegate User Guide',
        guideContent: guideContent,
        user: req.user,
        additionalCSS: ['/styles/user-guide.styles.css']
    });
});