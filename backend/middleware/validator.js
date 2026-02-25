const { z } = require('zod');

/**
 * Middleware to validate request body, query, or params using Zod schemas.
 * @param {z.ZodSchema} schema - The Zod schema to validate against.
 * @param {'body' | 'query' | 'params'} property - Which part of the request to validate. Default is 'body'.
 */
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        try {
            // Parse and validate the selected request property
            const validatedData = schema.parse(req[property]);

            // Overwrite req property with the validated/sanitized data
            req[property] = validatedData;

            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                // Return a 400 Bad Request with formatted validation errors
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: error.errors.map(err => ({
                        path: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            next(error);
        }
    };
};

module.exports = { validate };
