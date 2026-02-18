const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

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
