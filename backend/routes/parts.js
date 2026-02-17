const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getParts, getGroups, getInventoryStats } = require('../controllers/partsController');

router.use(verifyToken);

router.get('/', getParts);
router.get('/groups', getGroups);
router.get('/stats', getInventoryStats);

module.exports = router;
