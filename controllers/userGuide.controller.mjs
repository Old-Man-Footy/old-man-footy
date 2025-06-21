/**
 * User Guide Controller - MVC Architecture Implementation
 * 
 * Handles user guide display and documentation-related operations.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

const fs = require('fs');
const path = require('path');

/**
 * Display user guide page with modular CSS
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserGuide = (req, res) => {
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

module.exports = {
    getUserGuide
};