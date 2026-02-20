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

        const { salesToNextTier, TIER_THRESHOLDS } = require('../utils/pointsCalculator');
        const lifetimeSales = parseFloat(stats.rows[0].total_spent);
        const tierProgress = salesToNextTier(lifetimeSales);

        // Calculate percentage for Dashboard based on net sales
        let percentage = 0;
        if (lifetimeSales >= TIER_THRESHOLDS.MOON_STONE) percentage = 100;
        else if (lifetimeSales >= TIER_THRESHOLDS.DIAMOND) percentage = ((lifetimeSales - TIER_THRESHOLDS.DIAMOND) / (TIER_THRESHOLDS.MOON_STONE - TIER_THRESHOLDS.DIAMOND)) * 100;
        else if (lifetimeSales >= TIER_THRESHOLDS.GOLD) percentage = ((lifetimeSales - TIER_THRESHOLDS.GOLD) / (TIER_THRESHOLDS.DIAMOND - TIER_THRESHOLDS.GOLD)) * 100;
        else percentage = (lifetimeSales / TIER_THRESHOLDS.GOLD) * 100;

        tierProgress.percentage = Math.round(percentage);
        tierProgress.currentPoints = c.total_points;
        // Also send current spending level so UI can show it if needed
        tierProgress.currentSales = lifetimeSales;

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
                    total_spent: lifetimeSales,
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

// Get profile logic
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
        const currentPoints = customer.rows[0].total_points;

        const stats = await pool.query(
            `SELECT COALESCE(SUM(net_sales), 0) as total_spent FROM transactions WHERE customer_id = $1`,
            [req.user.id]
        );
        const lifetimeSales = parseFloat(stats.rows[0].total_spent);

        // Calculate progress
        const { salesToNextTier, TIER_THRESHOLDS } = require('../utils/pointsCalculator');
        const tierProgress = salesToNextTier(lifetimeSales);

        // Calculate percentage for Points History based on net sales
        let percentage = 0;
        if (lifetimeSales >= TIER_THRESHOLDS.MOON_STONE) percentage = 100;
        else if (lifetimeSales >= TIER_THRESHOLDS.DIAMOND) percentage = ((lifetimeSales - TIER_THRESHOLDS.DIAMOND) / (TIER_THRESHOLDS.MOON_STONE - TIER_THRESHOLDS.DIAMOND)) * 100;
        else if (lifetimeSales >= TIER_THRESHOLDS.GOLD) percentage = ((lifetimeSales - TIER_THRESHOLDS.GOLD) / (TIER_THRESHOLDS.DIAMOND - TIER_THRESHOLDS.GOLD)) * 100;
        else percentage = (lifetimeSales / TIER_THRESHOLDS.GOLD) * 100;
        tierProgress.percentage = Math.round(percentage);

        res.json({
            success: true,
            data: {
                history: result.rows,
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                totalPages: Math.ceil(countResult.rows[0].count / limit),
                currentPoints,
                currentTier: customer.rows[0].tier,
                tierProgress
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get transaction history with details and filters
const getTransactions = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, startDate, endDate, search, category } = req.query;
        const offset = (page - 1) * limit;

        // Base query for Transactions
        let query = `SELECT DISTINCT t.id, t.no_faktur, t.tanggal, t.net_sales, t.points_earned, t.diskon
                     FROM transactions t`;

        let params = [req.user.id];
        let paramIndex = 2;
        let whereClauses = [`t.customer_id = $1`];

        // Joins if filtering by category
        if (category && category !== 'Semua') {
            query += ` JOIN transaction_items ti ON t.id = ti.transaction_id 
                       JOIN parts p ON ti.no_part = p.no_part`;
            whereClauses.push(`p.group_tobpm = $${paramIndex}`);
            params.push(category);
            paramIndex++;
        }

        if (startDate) {
            whereClauses.push(`t.tanggal >= $${paramIndex}`);
            params.push(startDate);
            paramIndex++;
        }
        if (endDate) {
            whereClauses.push(`t.tanggal <= $${paramIndex}`);
            params.push(endDate);
            paramIndex++;
        }
        if (search) {
            whereClauses.push(`t.no_faktur ILIKE $${paramIndex}`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ` WHERE ${whereClauses.join(' AND ')}`;

        // Count query
        const countQuery = `SELECT COUNT(DISTINCT t.id) FROM transactions t 
                            ${category && category !== 'Semua' ? 'JOIN transaction_items ti ON t.id = ti.transaction_id JOIN parts p ON ti.no_part = p.no_part' : ''}
                            WHERE ${whereClauses.join(' AND ')}`;

        const countResult = await pool.query(countQuery, params);

        // Finalize main query
        query += ` ORDER BY t.tanggal DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);
        const transactions = result.rows;

        // Fetch items for these transactions
        if (transactions.length > 0) {
            const txIds = transactions.map(t => t.id);
            const itemsQuery = `
                SELECT ti.transaction_id, ti.no_part, ti.nama_part, ti.qty, ti.price, ti.subtotal
                FROM transaction_items ti
                WHERE ti.transaction_id = ANY($1::int[])
            `;
            const itemsResult = await pool.query(itemsQuery, [txIds]);

            // Map items to transactions
            const itemsMap = {};
            itemsResult.rows.forEach(item => {
                if (!itemsMap[item.transaction_id]) itemsMap[item.transaction_id] = [];
                itemsMap[item.transaction_id].push(item);
            });

            transactions.forEach(t => {
                t.items = itemsMap[t.id] || [];
                t.item_count = t.items.length;
            });
        }

        res.json({
            success: true,
            data: {
                transactions,
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                totalPages: Math.ceil(countResult.rows[0].count / limit),
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get buying trends with filters and enhancements
const getTrends = async (req, res, next) => {
    try {
        const customerId = req.user.id;
        const { startDate, endDate, category } = req.query;

        // Base Filter Logic
        let dateFilter = '';
        const params = [customerId];
        let pIdx = 2;

        if (startDate) {
            dateFilter += ` AND t.tanggal >= $${pIdx}`;
            params.push(startDate);
            pIdx++;
        }
        if (endDate) {
            dateFilter += ` AND t.tanggal <= $${pIdx}`;
            params.push(endDate);
            pIdx++;
        }

        let catFilterItem = '';
        let catJoin = '';
        // Capture pIdx for category BEFORE it might be incremented for other things
        const catParamIdx = pIdx;

        if (category && category !== 'Semua') {
            catJoin = 'JOIN transaction_items ti2 ON t.id = ti2.transaction_id JOIN parts p2 ON ti2.no_part = p2.no_part';
            catFilterItem = ` AND p2.group_tobpm = $${catParamIdx}`;
            params.push(category);
            pIdx++;
        }

        // 1. Total Spent (Filtered)
        const totalSpentQuery = `
            SELECT COALESCE(SUM(t.net_sales), 0) as total 
            FROM transactions t 
            ${catJoin}
            WHERE t.customer_id = $1 ${dateFilter} ${catFilterItem}
        `;
        const totalSpent = await pool.query(totalSpentQuery, params);

        // 2. Spending Health Score (Mock Calculation)
        // Logic: (Consistency 40% + Diversity 30% + Trend 30%)
        // Consistency: % of months with purchases in last 12 months
        // Diversity: Unique categories purchased / Total categories available (max 10)
        // Trend: Stable or Growing vs Declining
        const healthCheck = await pool.query(`
            SELECT 
                COUNT(DISTINCT TO_CHAR(tanggal, 'YYYY-MM')) as active_months,
                COUNT(DISTINCT p.group_tobpm) as unique_cats
            FROM transactions t
            JOIN transaction_items ti ON t.id = ti.transaction_id
            JOIN parts p ON ti.no_part = p.no_part
            WHERE t.customer_id = $1 AND t.tanggal >= NOW() - INTERVAL '12 months'
        `, [customerId]);

        const activeMonths = parseInt(healthCheck.rows[0].active_months) || 0;
        const uniqueCats = parseInt(healthCheck.rows[0].unique_cats) || 0;

        let healthScore = Math.min(100, (activeMonths / 12 * 40) + (Math.min(uniqueCats, 10) / 10 * 30) + 30); // Base 30 for being a customer

        // 3. Forecast (Simple Linear Projection based on last 3 months avg)
        const recentAvg = await pool.query(`
            SELECT AVG(monthly_total) as avg_spend
            FROM (
                SELECT SUM(net_sales) as monthly_total
                FROM transactions
                WHERE customer_id = $1 AND tanggal >= NOW() - INTERVAL '3 months'
                GROUP BY TO_CHAR(tanggal, 'YYYY-MM')
            ) sub
        `, [customerId]);
        const forecastNextMonth = parseFloat(recentAvg.rows[0]?.avg_spend || 0);

        // 4. Monthly Spending & Trend (Last 12 Months or Filtered)
        // If filtered, respect dates. If not, default to 12 months.
        let trendDateFilter = dateFilter || " AND t.tanggal >= NOW() - INTERVAL '12 months'";
        const monthlySpending = await pool.query(
            `SELECT TO_CHAR(t.tanggal, 'YYYY-MM') as month, SUM(t.net_sales) as total 
       FROM transactions t
       ${catJoin}
       WHERE t.customer_id = $1 ${trendDateFilter} ${catFilterItem}
       GROUP BY TO_CHAR(t.tanggal, 'YYYY-MM') ORDER BY month`,
            params
        );

        // 5. Comparison (MoM)
        // Calc previous period total for comparison
        // Simplified: Compare current filtered total vs same duration before
        // For dashboard default (All Time/12M), comparing Last Month vs Month Before
        const currentMonth = new Date().toISOString().slice(0, 7);
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonth = lastMonthDate.toISOString().slice(0, 7);

        const momStats = await pool.query(`
            SELECT 
                SUM(CASE WHEN TO_CHAR(tanggal, 'YYYY-MM') = $2 THEN net_sales ELSE 0 END) as this_month,
                SUM(CASE WHEN TO_CHAR(tanggal, 'YYYY-MM') = $3 THEN net_sales ELSE 0 END) as last_month
            FROM transactions WHERE customer_id = $1
        `, [customerId, currentMonth, lastMonth]);

        const thisMonthTotal = parseFloat(momStats.rows[0].this_month);
        const lastMonthTotal = parseFloat(momStats.rows[0].last_month);
        const momGrowth = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

        // 6. Top Parts (Expanded with Unit Price)
        const topPartsQuery = `SELECT ti.nama_part, ti.no_part, SUM(ti.qty) as total_qty, SUM(ti.subtotal) as total_value
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       ${category && category !== 'Semua' ? 'JOIN parts p ON ti.no_part = p.no_part' : ''}
       WHERE t.customer_id = $1 ${dateFilter} ${category && category !== 'Semua' ? 'AND p.group_tobpm = $' + catParamIdx : ''}
       GROUP BY ti.nama_part, ti.no_part ORDER BY total_value DESC LIMIT 10`;

        const topParts = await pool.query(topPartsQuery, params);

        // 7. Spending by Category
        const spendingByGroup = await pool.query(
            `SELECT COALESCE(p.group_tobpm, 'Lainnya') as group_name, SUM(ti.subtotal) as total
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       LEFT JOIN parts p ON ti.no_part = p.no_part
       WHERE t.customer_id = $1 ${dateFilter}
       GROUP BY p.group_tobpm ORDER BY total DESC`,
            params
        );

        // RESTORED: Monthly Points Trend
        const monthlyPoints = await pool.query(
            `SELECT TO_CHAR(tanggal, 'YYYY-MM') as month, SUM(points_earned) as total
       FROM transactions WHERE customer_id = $1 AND tanggal >= NOW() - INTERVAL '12 months'
       GROUP BY TO_CHAR(tanggal, 'YYYY-MM') ORDER BY month`,
            [customerId]
        );

        // RESTORED: Purchase Frequency
        const purchaseFrequency = await pool.query(
            `SELECT TO_CHAR(tanggal, 'YYYY-MM') as month, COUNT(*) as count
       FROM transactions WHERE customer_id = $1 AND tanggal >= NOW() - INTERVAL '12 months'
       GROUP BY TO_CHAR(tanggal, 'YYYY-MM') ORDER BY month`,
            [customerId]
        );

        // 8. Generate Smart Insights
        const insights = [];
        if (momGrowth > 10) insights.push(`Spending is up ${momGrowth.toFixed(1)}% compared to last month.`);
        else if (momGrowth < -10) insights.push(`Spending is down ${Math.abs(momGrowth).toFixed(1)}% compared to last month.`);

        if (spendingByGroup.rows.length > 0) {
            const topCat = spendingByGroup.rows[0];
            const total = parseFloat(totalSpent.rows[0].total);
            const catShare = (parseFloat(topCat.total) / total) * 100;
            insights.push(`${topCat.group_name} contributes ${catShare.toFixed(1)}% of your total spending.`);
        }

        res.json({
            success: true,
            data: {
                summary: {
                    total_spent: parseFloat(totalSpent.rows[0].total),
                    health_score: Math.round(healthScore),
                    forecast_next_month: forecastNextMonth,
                    mom_growth: momGrowth,
                },
                insights,
                monthlySpending: monthlySpending.rows,
                spendingByGroup: spendingByGroup.rows,
                topParts: topParts.rows.map(p => ({
                    ...p,
                    total_value: parseFloat(p.total_value),
                    unit_price: p.total_qty > 0 ? parseFloat(p.total_value) / parseInt(p.total_qty) : 0
                })),
                monthlyPoints: monthlyPoints.rows,
                purchaseFrequency: purchaseFrequency.rows
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get Favorite Parts with Prediction
const getFavoriteParts = async (req, res, next) => {
    try {
        const customerId = req.user.id;

        const favoritesQuery = `
            SELECT 
                p.no_part, p.nama_part, p.qty as current_stock,
                COUNT(DISTINCT t.id) as purchase_count,
                SUM(ti.qty) as total_qty_purchased,
                MAX(t.tanggal) as last_purchase_date,
                (MAX(t.tanggal) - MIN(t.tanggal)) / NULLIF(COUNT(DISTINCT t.id) - 1, 0) as avg_days_between
            FROM transaction_items ti
            JOIN transactions t ON ti.transaction_id = t.id
            JOIN parts p ON ti.no_part = p.no_part
            WHERE t.customer_id = $1
            GROUP BY p.no_part, p.nama_part, p.qty
            HAVING COUNT(DISTINCT t.id) > 1
            ORDER BY purchase_count DESC
            LIMIT 20
        `;

        const result = await pool.query(favoritesQuery, [customerId]);

        const favorites = result.rows.map(row => {
            const lastDate = new Date(row.last_purchase_date);
            const avgDays = row.avg_days_between || 30; // Default to 30 if only 2 purchases close together or null
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + Math.round(avgDays));

            const daysUntil = Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24));

            return {
                ...row,
                avg_days_between: Math.round(avgDays),
                next_purchase_prediction: nextDate,
                days_until_next: daysUntil
            };
        });

        res.json({ success: true, data: favorites });
    } catch (error) {
        next(error);
    }
};

// Get Period Comparison
const getComparison = async (req, res, next) => {
    try {
        const { p1_start, p1_end, p2_start, p2_end } = req.query;
        const customerId = req.user.id;

        const getStats = async (start, end) => {
            const stats = await pool.query(`
                SELECT 
                    COUNT(*) as trx_count,
                    COALESCE(SUM(net_sales), 0) as total_spent,
                    COALESCE(SUM(points_earned), 0) as points,
                    COALESCE(SUM(diskon), 0) as discount
                FROM transactions 
                WHERE customer_id = $1 AND tanggal >= $2 AND tanggal <= $3
            `, [customerId, start, end]);
            return stats.rows[0];
        };

        const period1 = await getStats(p1_start, p1_end);
        const period2 = await getStats(p2_start, p2_end);

        res.json({
            success: true,
            data: {
                period1: { ...period1, total_spent: parseFloat(period1.total_spent), discount: parseFloat(period1.discount) },
                period2: { ...period2, total_spent: parseFloat(period2.total_spent), discount: parseFloat(period2.discount) }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get Year End Report
const getYearEndReport = async (req, res, next) => {
    try {
        const { year } = req.query;
        const customerId = req.user.id;
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_trx,
                COALESCE(SUM(net_sales), 0) as total_spent,
                COALESCE(SUM(points_earned), 0) as total_points,
                COALESCE(SUM(diskon), 0) as total_discount
            FROM transactions 
            WHERE customer_id = $1 AND tanggal >= $2 AND tanggal <= $3
        `, [customerId, startDate, endDate]);

        const topCategory = await pool.query(`
            SELECT p.group_tobpm as category, SUM(ti.subtotal) as total
            FROM transaction_items ti
            JOIN transactions t ON ti.transaction_id = t.id
            JOIN parts p ON ti.no_part = p.no_part
            WHERE t.customer_id = $1 AND t.tanggal >= $2 AND t.tanggal <= $3
            GROUP BY p.group_tobpm ORDER BY total DESC LIMIT 1
        `, [customerId, startDate, endDate]);

        res.json({
            success: true,
            data: {
                summary: stats.rows[0],
                top_category: topCategory.rows[0] || { category: '-', total: 0 }
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboard, getProfile, updateProfile, changePassword,
    getPointsHistory, getTransactions, getTrends,
    getFavoriteParts, getComparison, getYearEndReport
};
