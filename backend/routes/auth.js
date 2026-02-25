const express = require('express');
const router = express.Router();
const { register, login, adminLogin, verifyOTP, resendOTP } = require('../controllers/authController');
const { loginLimiter, otpLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validator');
const {
    registerSchema,
    loginSchema,
    adminLoginSchema,
    verifyOTPSchema,
    resendOTPSchema
} = require('../utils/schemas');

router.post('/register', validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/admin/login', loginLimiter, validate(adminLoginSchema), adminLogin);
router.post('/verify-otp', validate(verifyOTPSchema), verifyOTP);
router.post('/resend-otp', otpLimiter, validate(resendOTPSchema), resendOTP);

module.exports = router;
