const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
// const { verifyToken, isAdmin } = require('../middleware/auth'); // Uncomment if auth needed

// Basic analytics routes
// TODO: Add auth middleware back once tested or if required
router.get('/lifecycle', dashboardController.getCustomerLifecycle);
router.get('/seasonality', dashboardController.getSeasonality);
router.get('/recommendations', dashboardController.getRecommendations);
router.get('/discounts', dashboardController.getDiscountAnalysis);

module.exports = router;
