import DOMPurify from 'dompurify';

/**
 * Sanitizes a string or object containing strings to prevent XSS attacks.
 * @param {any} input - The string or object to sanitize.
 * @returns {any} - The sanitized string or object.
 */
export const sanitizeInput = (input) => {
    if (typeof input === 'string') {
        return DOMPurify.sanitize(input, {
            ALLOWED_TAGS: [], // Strip all HTML tags
            ALLOWED_ATTR: []  // Strip all HTML attributes
        });
    }

    if (Array.isArray(input)) {
        return input.map(item => sanitizeInput(item));
    }

    if (input !== null && typeof input === 'object') {
        const sanitizedObj = {};
        for (const [key, value] of Object.entries(input)) {
            sanitizedObj[key] = sanitizeInput(value);
        }
        return sanitizedObj;
    }

    return input; // Return primitives as-is (numbers, booleans, null, undefined)
};
