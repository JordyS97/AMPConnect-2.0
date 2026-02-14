const jwt = require('jsonwebtoken');

// Verify JWT token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Token akses tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kedaluwarsa' });
    }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'viewer') {
        return res.status(403).json({ success: false, message: 'Akses ditolak. Hanya admin yang diizinkan.' });
    }
    next();
};

// Check if user is super admin
const isSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Akses ditolak. Hanya Super Admin yang diizinkan.' });
    }
    next();
};

// Check if user is customer
const isCustomer = (req, res, next) => {
    if (req.user.type !== 'customer') {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }
    next();
};

module.exports = { verifyToken, isAdmin, isSuperAdmin, isCustomer };
