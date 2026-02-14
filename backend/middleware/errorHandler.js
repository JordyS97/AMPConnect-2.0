const errorHandler = (err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Error:`, err.message);
    console.error(err.stack);

    const statusCode = err.statusCode || 500;
    const response = {
        success: false,
        message: err.message || 'Terjadi kesalahan pada server',
    };

    if (process.env.NODE_ENV === 'development') {
        response.error = err.stack;
    }

    res.status(statusCode).json(response);
};

module.exports = errorHandler;
