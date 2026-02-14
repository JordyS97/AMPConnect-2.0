const express = require('express');
const router = express.Router();
const { register, login, adminLogin, verifyOTP, resendOTP } = require('../controllers/authController');
const { loginLimiter, otpLimiter } = require('../middleware/rateLimiter');

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/admin/login', loginLimiter, adminLogin);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', otpLimiter, resendOTP);

module.exports = router;
