/**
 * User Guide Controller - MVC Architecture Implementation
 * 
 * Handles user guide display and documentation-related operations.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Display user guide page with modular CSS
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserGuide = (req, res) => {
    try {
        const guidePath = path.join(__dirname, '..', 'docs', 'USER_GUIDE_DELEGATES.md');
        const guideContent = fs.readFileSync(guidePath, 'utf8');
        
        res.render('user-guide', {
            title: 'Club Delegate User Guide',
            guideContent: guideContent,
            user: req.user,
            additionalCSS: ['/styles/user-guide.styles.css']
        });
    } catch (error) {
        console.error('Error loading user guide:', error);
        req.flash('error_msg', 'User guide is temporarily unavailable.');
        res.redirect('/dashboard');
    }
};