/**
 * Async Handler Middleware
 * 
 * Wraps async route handlers to automatically catch and forward errors
 * to the central error handler, eliminating the need for manual try-catch blocks.
 * 
 * This follows the coding guidelines requirement to avoid try-catch in controllers
 * and use next(error) to delegate errors to the central error handler.
 */

/**
 * Wraps an async function to automatically catch errors and pass them to next()
 * @param {Function} fn - The async function to wrap
 * @returns {Function} - Express middleware function
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(err => {
            console.error('--- Error caught by asyncHandler ---');
            console.error('Original Error:', err);
            console.error('Route being processed:', req.originalUrl);
            console.error('Method:', req.method);
            next(err);
        });
    };
};

/**
 * Alternative syntax for async handler (more explicit)
 * @param {Function} fn - The async function to wrap
 * @returns {Function} - Express middleware function
 */
export const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * Utility function to wrap multiple controller functions at once
 * This helps maintain clean controller files by eliminating repetitive wrapping
 * 
 * @param {Object} controllers - Object containing controller functions
 * @returns {Object} - Object with wrapped controller functions
 * 
 * @example
 * const rawControllers = {
 *   getUser: async (req, res) => { ... },
 *   createUser: async (req, res) => { ... },
 *   updateUser: async (req, res) => { ... }
 * };
 * 
 * export const { getUser, createUser, updateUser } = wrapControllers(rawControllers);
 */
export const wrapControllers = (controllers) => {
    const wrapped = {};
    
    for (const [name, handler] of Object.entries(controllers)) {
        if (typeof handler === 'function') {
            wrapped[name] = asyncHandler(handler);
        } else {
            wrapped[name] = handler; // Pass through non-functions unchanged
        }
    }
    
    return wrapped;
};

export default asyncHandler;