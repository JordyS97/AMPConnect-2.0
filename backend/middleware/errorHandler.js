const errorHandler = (err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Error:`, err.message);
    if (err.stack) console.error(err.stack);

    const statusCode = err.statusCode || 500;

    // Default generic message for unhandled errors
    let message = 'Terjadi kesalahan pada server';

    // Only return the detailed error message if it's not a 500 error (e.g. 400 validation error)
    if (statusCode !== 500) {
        message = err.message || message;
    }

    const response = {
        success: false,
        message: message,
    };

    // TEMP DEBUG: always include error
    response.error = err.message;
    response.stack = err.stack;

    res.status(statusCode).json(response);
};

module.exports = errorHandler;
