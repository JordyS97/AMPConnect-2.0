const rateLimit = require('express-rate-limit');

// Login rate limiter: 5 attempts per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// OTP resend limiter: 3 attempts per 10 minutes
const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 3,
    message: { success: false, message: 'Terlalu banyak permintaan OTP. Coba lagi dalam 10 menit.' },
});

// Upload limiter: 10 uploads per hour
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Terlalu banyak upload. Coba lagi dalam 1 jam.' },
});

// General API limiter: 100 requests per 15 minutes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Terlalu banyak permintaan. Coba lagi nanti.' },
});

module.exports = { loginLimiter, otpLimiter, uploadLimiter, apiLimiter };
