const express = require('express');
const router = express.Router();
const { verifyToken, isCustomer } = require('../middleware/auth');
const {
    getDashboard, getProfile, updateProfile, changePassword,
    getPointsHistory, getTransactions, getTrends,
    getFavoriteParts, getComparison, getYearEndReport,
    redeemPoints, getRedemptionHistory, getCategories
} = require('../controllers/customerController');
const { validate } = require('../middleware/validator');
const { updateProfileSchema, changePasswordSchema } = require('../utils/schemas');

router.use(verifyToken, isCustomer);

router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', validate(updateProfileSchema, 'body'), updateProfile);
router.put('/password', validate(changePasswordSchema, 'body'), changePassword);
router.get('/points/history', getPointsHistory);
router.get('/transactions', getTransactions);
router.get('/trends', getTrends);
router.get('/categories', getCategories);
router.get('/favorites', getFavoriteParts);
router.get('/comparison', getComparison);
router.get('/year-end-report', getYearEndReport);
router.post('/redeem', redeemPoints);
router.get('/redemptions', getRedemptionHistory);

module.exports = router;
