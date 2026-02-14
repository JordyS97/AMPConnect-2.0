const bcrypt = require('bcryptjs');
const fs = require('fs');
const pool = require('../config/db');
const { parseExcelFile } = require('../utils/excelParser');

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
// Reset customer password
const resetCustomerPassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        let { newPassword } = req.body;

        if (!newPassword) {
            // Generate random 8-char password
            newPassword = Math.random().toString(36).slice(-8);
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await pool.query('UPDATE customers SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, id]);

        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin', req.user.id, req.user.username, 'Reset Password', `Reset password customer ID ${id}`, req.ip]
        );

        res.json({ success: true, message: 'Password customer berhasil direset.', data: { newPassword } });
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

// Delete customer
const deleteCustomer = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check for transaction history
        const tx = await pool.query('SELECT id FROM transactions WHERE customer_id = $1 LIMIT 1', [id]);
        if (tx.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Tidak dapat menghapus customer yang memiliki riwayat transaksi. Nonaktifkan status customer sebagai gantinya.' });
        }

        await pool.query('DELETE FROM customers WHERE id = $1', [id]);

        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin', req.user.id, req.user.username, 'Delete Customer', `Menghapus customer ID ${id}`, req.ip]
        );

        res.json({ success: true, message: 'Customer berhasil dihapus.' });
    } catch (error) {
        next(error);
    }
};

// Upload customers (Bulk Import)
const uploadCustomers = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File tidak ditemukan.' });
        }

        const filePath = req.file.path;
        let data;
        try {
            data = parseExcelFile(filePath);
        } catch (e) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ success: false, message: 'File tidak dapat dibaca. Pastikan format .xlsx atau .csv.' });
        }

        if (data.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ success: false, message: 'File kosong.' });
        }

        let successCount = 0;
        let failedCount = 0;
        const errors = [];
        const customerUpserts = new Map();

        for (let i = 0; i < data.length; i++) {
            const raw = data[i];
            // Normalize keys: No Customer, Customer Name, Nama, etc.
            const row = {};
            for (const [key, val] of Object.entries(raw)) {
                row[key.trim().toLowerCase().replace(/\s+/g, '_')] = val;
            }

            const noCustomer = String(row.no_customer || row.no_cust || '').trim();
            const name = String(row.customer_name || row.nama_customer || row.nama || row.customer || '').trim();
            const email = String(row.email || '').trim() || null;
            const phone = String(row.phone || row.telepon || row.no_telp || '').trim() || null;
            const address = String(row.address || row.alamat || '').trim() || null;

            if (noCustomer) {
                if (!customerUpserts.has(noCustomer)) {
                    customerUpserts.set(noCustomer, { name: name || `Customer ${noCustomer}`, email, phone, address });
                }
            } else {
                failedCount++;
                errors.push({ row: i + 2, error: 'No Customer kosong' });
            }
        }

        // Bulk Upsert
        if (customerUpserts.size > 0) {
            const values = [];
            const placeholders = [];
            let i = 1;

            for (const [noCust, info] of customerUpserts) {
                placeholders.push(`($${i}, $${i + 1}, $${i + 2}, $${i + 3}, $${i + 4})`);
                values.push(noCust, info.name, info.email, info.phone, info.address);
                i += 5;
            }

            // Chunking
            const CHUNK_SIZE = 100; // 5 params per row * 100 = 500 params < 65535 Psql limit
            for (let j = 0; j < placeholders.length; j += CHUNK_SIZE) {
                const chunkPlaceholders = placeholders.slice(j, j + CHUNK_SIZE);
                const chunkValues = values.slice(j * 5, (j + CHUNK_SIZE) * 5);

                await pool.query(
                    `INSERT INTO customers (no_customer, name, email, phone, address) VALUES ${chunkPlaceholders.join(', ')}
                     ON CONFLICT (no_customer) DO UPDATE SET 
                     name = EXCLUDED.name, 
                     email = COALESCE(EXCLUDED.email, customers.email),
                     phone = COALESCE(EXCLUDED.phone, customers.phone),
                     address = COALESCE(EXCLUDED.address, customers.address),
                     updated_at = NOW()`,
                    chunkValues
                );
            }
            successCount = customerUpserts.size;
        }

        // Clean up file
        fs.unlinkSync(filePath);

        // Log
        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin', req.user.id, req.user.username, 'Import Customers', `Import customer: ${successCount} berhasil`, req.ip]
        );

        res.json({
            success: true,
            message: `Import berhasil. ${successCount} customer diproses.`,
            data: { success_count: successCount, failed_count: failedCount, errors: errors.slice(0, 20) }
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        next(error);
    }
};

module.exports = {
    getCustomers, addCustomer, editCustomer, resetCustomerPassword, toggleCustomerStatus, deleteCustomer, uploadCustomers,
    getAdmins, createAdmin, editAdmin, getActivityLogs
};
