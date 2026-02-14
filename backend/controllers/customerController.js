const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { determineTier, pointsToNextTier } = require('../utils/pointsCalculator');

// Get customer dashboard data
const getDashboard = async (req, res, next) => {
    try {
        const customerId = req.user.id;

        // Get customer info
        const customer = await pool.query('SELECT * FROM customers WHERE id = $1', [customerId]);
        if (customer.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer tidak ditemukan.' });
        }

        const c = customer.rows[0];

        // Get transaction count & total spent
        const stats = await pool.query(
            `SELECT COUNT(*) as total_transactions, COALESCE(SUM(net_sales), 0) as total_spent 
       FROM transactions WHERE customer_id = $1`,
            [customerId]
        );

        // Get favorite part
        const favPart = await pool.query(
            `SELECT nama_part, SUM(ti.qty) as total_qty 
       FROM transaction_items ti 
       JOIN transactions t ON ti.transaction_id = t.id 
       WHERE t.customer_id = $1 
       GROUP BY nama_part 
       ORDER BY total_qty DESC LIMIT 1`,
            [customerId]
        );

        // Get recent transactions (last 5)
        const recentTx = await pool.query(
            `SELECT no_faktur, tanggal, net_sales, points_earned 
       FROM transactions WHERE customer_id = $1 
       ORDER BY tanggal DESC LIMIT 5`,
            [customerId]
        );

        const tierProgress = pointsToNextTier(c.total_points);

        res.json({
            success: true,
            data: {
                customer: {
                    name: c.name,
                    no_customer: c.no_customer,
                    tier: c.tier,
                    total_points: c.total_points,
                    member_since: c.created_at,
                },
                tierProgress,
                statistics: {
                    total_transactions: parseInt(stats.rows[0].total_transactions),
                    total_spent: parseFloat(stats.rows[0].total_spent),
                    favorite_part: favPart.rows.length > 0 ? favPart.rows[0].nama_part : '-',
                    member_since: c.created_at,
                },
                recentTransactions: recentTx.rows,
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get customer profile
const getProfile = async (req, res, next) => {
    try {
        const customer = await pool.query(
            'SELECT id, no_customer, name, email, phone, address, total_points, tier, created_at FROM customers WHERE id = $1',
            [req.user.id]
        );

        if (customer.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer tidak ditemukan.' });
        }

        res.json({ success: true, data: customer.rows[0] });
    } catch (error) {
        next(error);
    }
};

// Update customer profile
const updateProfile = async (req, res, next) => {
    try {
        const { name, phone, address } = req.body;

        await pool.query(
            'UPDATE customers SET name = $1, phone = $2, address = $3, updated_at = NOW() WHERE id = $4',
            [name, phone, address, req.user.id]
        );

        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['customer', req.user.id, name, 'Update Profile', 'Customer memperbarui profil', req.ip]
        );

        res.json({ success: true, message: 'Profil berhasil diperbarui.' });
    } catch (error) {
        next(error);
    }
};

// Change password
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const customer = await pool.query('SELECT password_hash FROM customers WHERE id = $1', [req.user.id]);
        const validPassword = await bcrypt.compare(currentPassword, customer.rows[0].password_hash);
        if (!validPassword) {
            return res.status(400).json({ success: false, message: 'Password saat ini salah.' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);

        await pool.query('UPDATE customers SET password_hash = $1, updated_at = NOW() WHERE id = $2', [password_hash, req.user.id]);

        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['customer', req.user.id, req.user.email, 'Change Password', 'Customer mengubah password', req.ip]
        );

        res.json({ success: true, message: 'Password berhasil diubah.' });
    } catch (error) {
        next(error);
    }
};

// Get points history
const getPointsHistory = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;

        let query = `SELECT no_faktur, tanggal as date, 'Pembelian' as description, no_faktur as invoice, 
                 points_earned, 0 as points_used
                 FROM transactions WHERE customer_id = $1`;
        const params = [req.user.id];
        let paramIndex = 2;

        if (startDate) {
            query += ` AND tanggal >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }
        if (endDate) {
            query += ` AND tanggal <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        query += ` ORDER BY tanggal DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM transactions WHERE customer_id = $1';
        const countParams = [req.user.id];
        if (startDate) { countQuery += ` AND tanggal >= $2`; countParams.push(startDate); }
        if (endDate) { countQuery += ` AND tanggal <= $${countParams.length + 1}`; countParams.push(endDate); }

        const countResult = await pool.query(countQuery, countParams);

        // Get customer total points
        const customer = await pool.query('SELECT total_points, tier FROM customers WHERE id = $1', [req.user.id]);

        res.json({
            success: true,
            data: {
                history: result.rows,
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                totalPages: Math.ceil(countResult.rows[0].count / limit),
                currentPoints: customer.rows[0].total_points,
                currentTier: customer.rows[0].tier,
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get transaction history
const getTransactions = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, startDate, endDate, search } = req.query;
        const offset = (page - 1) * limit;

        let query = `SELECT * FROM transactions WHERE customer_id = $1`;
        const params = [req.user.id];
        let paramIndex = 2;

        if (startDate) {
            query += ` AND tanggal >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }
        if (endDate) {
            query += ` AND tanggal <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }
        if (search) {
            query += ` AND no_faktur ILIKE $${paramIndex}`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
        const countResult = await pool.query(countQuery, params);

        query += ` ORDER BY tanggal DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: {
                transactions: result.rows,
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                totalPages: Math.ceil(countResult.rows[0].count / limit),
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get buying trends
const getTrends = async (req, res, next) => {
    try {
        const customerId = req.user.id;

        // Total spent all time
        const totalSpent = await pool.query(
            'SELECT COALESCE(SUM(net_sales), 0) as total FROM transactions WHERE customer_id = $1',
            [customerId]
        );

        // Average transaction value
        const avgTransaction = await pool.query(
            'SELECT COALESCE(AVG(net_sales), 0) as avg FROM transactions WHERE customer_id = $1',
            [customerId]
        );

        // Monthly spending (last 12 months)
        const monthlySpending = await pool.query(
            `SELECT TO_CHAR(tanggal, 'YYYY-MM') as month, SUM(net_sales) as total 
       FROM transactions WHERE customer_id = $1 AND tanggal >= NOW() - INTERVAL '12 months'
       GROUP BY TO_CHAR(tanggal, 'YYYY-MM') ORDER BY month`,
            [customerId]
        );

        // Most active month
        const mostActiveMonth = await pool.query(
            `SELECT TO_CHAR(tanggal, 'YYYY-MM') as month, COUNT(*) as count 
       FROM transactions WHERE customer_id = $1 
       GROUP BY TO_CHAR(tanggal, 'YYYY-MM') ORDER BY count DESC LIMIT 1`,
            [customerId]
        );

        // Spending by group material
        const spendingByGroup = await pool.query(
            `SELECT COALESCE(p.group_material, 'Lainnya') as group_name, SUM(ti.subtotal) as total
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       LEFT JOIN parts p ON ti.no_part = p.no_part
       WHERE t.customer_id = $1
       GROUP BY p.group_material ORDER BY total DESC`,
            [customerId]
        );

        // Top 10 most purchased parts
        const topParts = await pool.query(
            `SELECT ti.nama_part, SUM(ti.qty) as total_qty
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       WHERE t.customer_id = $1
       GROUP BY ti.nama_part ORDER BY total_qty DESC LIMIT 10`,
            [customerId]
        );

        // Number of different parts purchased
        const uniqueParts = await pool.query(
            `SELECT COUNT(DISTINCT ti.no_part) as count
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       WHERE t.customer_id = $1`,
            [customerId]
        );

        // Purchase frequency by month
        const purchaseFrequency = await pool.query(
            `SELECT TO_CHAR(tanggal, 'YYYY-MM') as month, COUNT(*) as count
       FROM transactions WHERE customer_id = $1 AND tanggal >= NOW() - INTERVAL '12 months'
       GROUP BY TO_CHAR(tanggal, 'YYYY-MM') ORDER BY month`,
            [customerId]
        );

        res.json({
            success: true,
            data: {
                summary: {
                    total_spent: parseFloat(totalSpent.rows[0].total),
                    avg_transaction: parseFloat(avgTransaction.rows[0].avg),
                    most_active_month: mostActiveMonth.rows.length > 0 ? mostActiveMonth.rows[0].month : '-',
                    unique_parts: parseInt(uniqueParts.rows[0].count),
                },
                monthlySpending: monthlySpending.rows,
                spendingByGroup: spendingByGroup.rows,
                topParts: topParts.rows,
                purchaseFrequency: purchaseFrequency.rows,
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboard, getProfile, updateProfile, changePassword,
    getPointsHistory, getTransactions, getTrends
};
