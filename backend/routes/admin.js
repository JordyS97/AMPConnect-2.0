const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const {
    getDashboard, getSales, getSaleDetail, getStock, adjustStock,
    uploadSales, uploadStock, getUploadHistory, downloadTemplate, generateReport,
    getCustomerAnalytics, getInventoryAnalytics, getSalesAnalytics, getPriceAnalytics
} = require('../controllers/adminController');
const {
    getCustomers, addCustomer, editCustomer, resetCustomerPassword, toggleCustomerStatus, deleteCustomer, uploadCustomers,
    getAdmins, createAdmin, editAdmin, getActivityLogs
} = require('../controllers/usersController');

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|csv)$/i)) {
        cb(null, true);
    } else {
        cb(new Error('Hanya file .xlsx dan .csv yang diizinkan.'), false);
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(verifyToken, isAdmin);

// Dashboard
router.get('/dashboard', getDashboard);

// Sales
router.get('/sales', getSales);
router.get('/sales/:id', getSaleDetail);

// Stock
router.get('/stock', getStock);
router.put('/stock/:id', adjustStock);

// Upload
router.post('/upload/sales', uploadLimiter, upload.single('file'), uploadSales);
router.post('/upload/stock', uploadLimiter, upload.single('file'), uploadStock);
router.get('/upload/history', getUploadHistory);
router.get('/upload/template/:type', downloadTemplate);

// Users - Customers
router.get('/users/customers', getCustomers);
router.post('/users/customers', addCustomer);
router.post('/users/customers/upload', uploadLimiter, upload.single('file'), uploadCustomers);
router.put('/users/customers/:id', editCustomer);
router.put('/users/customers/:id/reset-password', resetCustomerPassword);
router.put('/users/customers/:id/status', toggleCustomerStatus);
router.delete('/users/customers/:id', deleteCustomer);

// Users - Admins
router.get('/users/admins', getAdmins);
router.post('/users/admins', createAdmin);
router.put('/users/admins/:id', editAdmin);

// Activity Logs
router.get('/users/logs', getActivityLogs);

// Reports
router.post('/reports/generate', generateReport);

// Customer Analytics
router.get('/customer-analytics', getCustomerAnalytics);

// Inventory Analytics
router.get('/inventory-analytics', getInventoryAnalytics);

// Sales Analytics
router.get('/sales-analytics', getSalesAnalytics);

// Price & Discount Analytics
router.get('/price-analytics', getPriceAnalytics);

// Price & Discount Analytics
router.get('/price-analytics', getPriceAnalytics);

// Settings
const storageQR = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => cb(null, `temp-qris-${Date.now()}.jpg`), // Temp name, controller will rename
});
const uploadQR = multer({
    storage: storageQR,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Hanya file gambar yang diizinkan.'), false);
    },
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});


router.post('/settings/qr', uploadLimiter, uploadQR.single('file'), require('../controllers/adminController').uploadSettingsQR);

// Recalculate Financials
// Recalculate Financials
router.post('/recalculate', require('../controllers/adminController').recalculateFinancials);

// Fix Database Schema
router.post('/fix-database', require('../controllers/adminController').fixDatabase);

module.exports = router;
