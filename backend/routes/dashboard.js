const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// These endpoints expose customer names, revenue, buying cycles and per-customer
// discount rates — admin only, same guard as routes/admin.js
router.use(verifyToken, isAdmin);

// Advanced Analytics Routes
router.get('/overview', dashboardController.getOverviewMetrics);
router.get('/buying-cycle', dashboardController.getBuyingCycleAnalysis);
router.get('/seasonality', dashboardController.getSeasonalityAnalysis);
router.get('/due-tracking', dashboardController.getCustomerDueTracking);
router.get('/product-cycles', dashboardController.getProductCycles);
router.get('/predictive', dashboardController.getPredictiveAnalytics);
router.get('/discounts', dashboardController.getDiscountAnalysis);
router.get('/cohorts', dashboardController.getCohortAnalysis);
router.get('/rfm', dashboardController.getRFMSegmentation);
router.get('/actions', dashboardController.getActionPlan);

module.exports = router;
