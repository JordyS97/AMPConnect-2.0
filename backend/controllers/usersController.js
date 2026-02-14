const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// Get customers list
const getCustomers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, tier, status, sort = 'name' } = req.query;
        const offset = (page - 1) * limit;

        let query = `SELECT c.*, COALESCE(SUM(t.net_sales), 0) as total_purchases, COUNT(t.id) as purchase_count
                 FROM customers c LEFT JOIN transactions t ON c.id = t.customer_id WHERE 1=1`;
        const params = [];
        let pi = 1;

        if (search) {
            query += ` AND (c.name ILIKE $${pi} OR c.email ILIKE $${pi} OR c.no_customer ILIKE $${pi})`;
            params.push(`%${search}%`); pi++;
        }
        if (tier && tier !== 'All') { query += ` AND c.tier = $${pi}`; params.push(tier); pi++; }
        if (status === 'verified') { query += ` AND c.is_verified = true`; }
        else if (status === 'unverified') { query += ` AND c.is_verified = false`; }

        query += ` GROUP BY c.id`;

        const sortMap = {
            'name': 'c.name ASC', 'join_date': 'c.created_at DESC',
            'total_points': 'c.total_points DESC', 'total_purchases': 'total_purchases DESC',
        };
        query += ` ORDER BY ${sortMap[sort] || 'c.name ASC'}`;

        // Wrap for count
        const countQuery = `SELECT COUNT(*) FROM (${query}) sub`;
        const countResult = await pool.query(countQuery, params);

        query += ` LIMIT $${pi} OFFSET $${pi + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: {
                customers: result.rows,
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                totalPages: Math.ceil(countResult.rows[0].count / limit),
            }
        });
    } catch (error) {
        next(error);
    }
};

// Add customer (no_customer only)
const addCustomer = async (req, res, next) => {
    try {
        const { no_customer, name, email, phone, address } = req.body;

        const existing = await pool.query('SELECT * FROM customers WHERE no_customer = $1', [no_customer]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Nomor customer sudah ada.' });
        }

        await pool.query(
            'INSERT INTO customers (no_customer, name, email, phone, address) VALUES ($1, $2, $3, $4, $5)',
            [no_customer, name, email || null, phone || null, address || null]
        );

        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin', req.user.id, req.user.username, 'Add Customer', `Menambahkan customer ${no_customer}`, req.ip]
        );

        res.status(201).json({ success: true, message: 'Customer berhasil ditambahkan.' });
    } catch (error) {
        next(error);
    }
};

// Edit customer
const editCustomer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, phone, address } = req.body;

        await pool.query(
            'UPDATE customers SET name = COALESCE($1, name), phone = COALESCE($2, phone), address = COALESCE($3, address), updated_at = NOW() WHERE id = $4',
            [name, phone, address, id]
        );

        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin', req.user.id, req.user.username, 'Edit Customer', `Mengedit customer ID ${id}`, req.ip]
        );

        res.json({ success: true, message: 'Data customer berhasil diperbarui.' });
    } catch (error) {
        next(error);
    }
};

// Reset customer password
const resetCustomerPassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await pool.query('UPDATE customers SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, id]);

        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin', req.user.id, req.user.username, 'Reset Password', `Reset password customer ID ${id}`, req.ip]
        );

        res.json({ success: true, message: 'Password customer berhasil direset.' });
    } catch (error) {
        next(error);
    }
};

// Toggle customer status
const toggleCustomerStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await pool.query('UPDATE customers SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);

        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin', req.user.id, req.user.username, 'Toggle Status', `Status customer ID ${id} diubah ke ${status}`, req.ip]
        );

        res.json({ success: true, message: `Customer berhasil di${status === 'active' ? 'aktifkan' : 'nonaktifkan'}.` });
    } catch (error) {
        next(error);
    }
};

// Get admins list
const getAdmins = async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT id, username, email, role, status, last_login, created_at FROM admins ORDER BY created_at DESC'
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
};

// Create admin
const createAdmin = async (req, res, next) => {
    try {
        const { username, email, password, role } = req.body;

        const existing = await pool.query('SELECT * FROM admins WHERE username = $1 OR email = $2', [username, email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Username atau email sudah digunakan.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        await pool.query(
            'INSERT INTO admins (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
            [username, email, hash, role || 'admin']
        );

        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin', req.user.id, req.user.username, 'Create Admin', `Membuat admin baru: ${username}`, req.ip]
        );

        res.status(201).json({ success: true, message: 'Admin berhasil ditambahkan.' });
    } catch (error) {
        next(error);
    }
};

// Edit admin
const editAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { email, role, status, password } = req.body;

        let query = 'UPDATE admins SET email = COALESCE($1, email), role = COALESCE($2, role), status = COALESCE($3, status), updated_at = NOW()';
        const params = [email, role, status];
        let pi = 4;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            query += `, password_hash = $${pi}`;
            params.push(hash);
            pi++;
        }

        query += ` WHERE id = $${pi}`;
        params.push(id);

        await pool.query(query, params);

        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin', req.user.id, req.user.username, 'Edit Admin', `Mengedit admin ID ${id}`, req.ip]
        );

        res.json({ success: true, message: 'Admin berhasil diperbarui.' });
    } catch (error) {
        next(error);
    }
};

// Get activity logs
const getActivityLogs = async (req, res, next) => {
    try {
        const { page = 1, limit = 100, user_type, action, search, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM activity_logs WHERE 1=1';
        const params = [];
        let pi = 1;

        if (user_type) { query += ` AND user_type = $${pi}`; params.push(user_type); pi++; }
        if (action) { query += ` AND action = $${pi}`; params.push(action); pi++; }
        if (search) { query += ` AND (user_name ILIKE $${pi} OR description ILIKE $${pi})`; params.push(`%${search}%`); pi++; }
        if (startDate) { query += ` AND created_at >= $${pi}`; params.push(startDate); pi++; }
        if (endDate) { query += ` AND created_at <= $${pi}`; params.push(endDate + ' 23:59:59'); pi++; }

        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
        const countResult = await pool.query(countQuery, params);

        query += ` ORDER BY created_at DESC LIMIT $${pi} OFFSET $${pi + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: {
                logs: result.rows,
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                totalPages: Math.ceil(countResult.rows[0].count / limit),
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCustomers, addCustomer, editCustomer, resetCustomerPassword, toggleCustomerStatus,
    getAdmins, createAdmin, editAdmin, getActivityLogs
};
