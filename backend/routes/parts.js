const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getParts, getGroups } = require('../controllers/partsController');

router.use(verifyToken);

router.get('/', getParts);
router.get('/groups', getGroups);

module.exports = router;
