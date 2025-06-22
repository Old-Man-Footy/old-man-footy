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
        Promise.resolve(fn(req, res, next)).catch(next);
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

export default asyncHandler;