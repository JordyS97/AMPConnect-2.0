const pool = require('../config/db');

// Helper to calculate days between dates
const daysBetween = (d1, d2) => {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((d1 - d2) / oneDay));
};

// 1. Customer Buying Cycle & Follow-up Recommendations
const getCustomerLifecycle = async (req, res, next) => {
    try {
        // Fetch all transactions sorted by customer and date
        const query = `
            SELECT t.customer_id, c.name as customer_name, c.phone, t.tanggal, t.net_sales,
                   t.id as transaction_id
            FROM transactions t
            JOIN customers c ON t.customer_id = c.id
            ORDER BY t.customer_id, t.tanggal ASC
        `;
        const { rows } = await pool.query(query);

        const customers = {};
        const today = new Date();

        // Process transactions to build customer history
        rows.forEach(row => {
            if (!customers[row.customer_id]) {
                customers[row.customer_id] = {
                    id: row.customer_id,
                    name: row.customer_name,
                    phone: row.phone,
                    transactions: [],
                    intervals: [],
                    lastCategory: null
                };
            }
            customers[row.customer_id].transactions.push({
                date: new Date(row.tanggal),
                id: row.transaction_id
            });
        });

        const lifecycleData = [];
        const followUpList = [];

        // Calculate cycles for each customer
        for (const custId in customers) {
            const cust = customers[custId];
            const txs = cust.transactions;

            if (txs.length < 2) continue; // Need at least 2 transactions to calculate cycle

            // Calculate intervals
            for (let i = 1; i < txs.length; i++) {
                const diff = daysBetween(txs[i].date, txs[i - 1].date);
                cust.intervals.push(diff);
            }

            const avgCycle = cust.intervals.reduce((a, b) => a + b, 0) / cust.intervals.length;
            const lastPurchaseDate = txs[txs.length - 1].date;

            // Action Rule: Follow-up date = Avg Cycle * 0.8
            // We interpret "Next Expected Purchase" as roughly Avg Cycle days from last purchase
            // But the "Follow-up" trigger is at 80% of that cycle.

            const nextExpectedDays = avgCycle; // Full cycle
            const followUpDays = avgCycle * 0.8; // Trigger point

            const nextExpectedDate = new Date(lastPurchaseDate);
            nextExpectedDate.setDate(lastPurchaseDate.getDate() + nextExpectedDays);

            const followUpDate = new Date(lastPurchaseDate);
            followUpDate.setDate(lastPurchaseDate.getDate() + followUpDays);

            const daysUntilDue = Math.ceil((nextExpectedDate - today) / (1000 * 60 * 60 * 24));

            // Status Logic
            let status = 'Normal';
            if (daysUntilDue < 0) status = 'Overdue';
            else if (daysUntilDue <= 7) status = 'Due Soon'; // Arbitrary 7 days warning

            const data = {
                customer_id: cust.id,
                name: cust.name,
                last_purchase: lastPurchaseDate.toISOString().split('T')[0],
                avg_cycle: Math.round(avgCycle),
                next_expected: nextExpectedDate.toISOString().split('T')[0],
                days_until_due: daysUntilDue,
                status,
                phone: cust.phone
            };

            lifecycleData.push(data);

            if (status === 'Overdue' || status === 'Due Soon') {
                followUpList.push(data);
            }
        }

        // Sort follow-up list by urgency (overdue first)
        followUpList.sort((a, b) => a.days_until_due - b.days_until_due);

        res.json({
            success: true,
            data: {
                summary: {
                    avg_cycle_all: Math.round(lifecycleData.reduce((acc, c) => acc + c.avg_cycle, 0) / (lifecycleData.length || 1)),
                    customers_due_this_week: followUpList.filter(c => c.days_until_due >= 0 && c.days_until_due <= 7).length,
                    overdue_count: followUpList.filter(c => c.days_until_due < 0).length
                },
                lifecycle: lifecycleData,
                follow_up: followUpList
            }
        });

    } catch (error) {
        next(error);
    }
};

// 2. Product Seasonality Intelligence
const getSeasonality = async (req, res, next) => {
    try {
        // Aggregate quantity sold by month and category (group_tobpm)
        const query = `
            SELECT 
                TO_CHAR(t.tanggal, 'YYYY-MM') as month_year,
                EXTRACT(MONTH FROM t.tanggal) as month,
                COALESCE(p.group_tobpm, 'Other') as category,
                SUM(ti.qty) as total_qty
            FROM transaction_items ti
            JOIN transactions t ON ti.transaction_id = t.id
            JOIN parts p ON ti.no_part = p.no_part
            WHERE t.tanggal >= NOW() - INTERVAL '12 months'
            GROUP BY 1, 2, 3
            ORDER BY 1 ASC
        `;

        const { rows } = await pool.query(query);

        // Process for Heatmap: Rows=Category, Cols=Month
        const heatmapData = {};
        const categories = new Set();
        const months = new Set();

        rows.forEach(row => {
            const cat = row.category;
            const m = row.month; // 1-12
            categories.add(cat);
            months.add(m);

            if (!heatmapData[cat]) heatmapData[cat] = {};
            heatmapData[cat][m] = parseInt(row.total_qty);
        });

        // Determine "Most Seasonal Category" (highest variance or simple highest peak)
        // Simple approach: Category with highest single-month sales
        let maxQty = 0;
        let seasonalCategory = 'N/A';

        for (const cat in heatmapData) {
            for (const m in heatmapData[cat]) {
                if (heatmapData[cat][m] > maxQty) {
                    maxQty = heatmapData[cat][m];
                    seasonalCategory = cat;
                }
            }
        }

        res.json({
            success: true,
            data: {
                seasonality: rows,
                heatmap: heatmapData,
                most_seasonal: seasonalCategory
            }
        });

    } catch (error) {
        next(error);
    }
};

// 3. Cross-Sell & Recommendations
const getRecommendations = async (req, res, next) => {
    try {
        // A. Frequent Pairs (Global)
        const pairsQuery = `
            WITH recent_trans AS (SELECT id FROM transactions ORDER BY tanggal DESC LIMIT 1000)
            SELECT t1.no_part as part_a, t1.nama_part as name_a, 
                   t2.no_part as part_b, t2.nama_part as name_b, 
                   COUNT(*) as frequency
            FROM transaction_items t1
            JOIN transaction_items t2 ON t1.transaction_id = t2.transaction_id
            WHERE t1.transaction_id IN (SELECT id FROM recent_trans)
            AND t1.no_part < t2.no_part
            GROUP BY t1.no_part, t1.nama_part, t2.no_part, t2.nama_part
            ORDER BY frequency DESC
            LIMIT 20
        `;
        const pairsRes = await pool.query(pairsQuery);

        // B. Get last purchased category/part for each customer to recommend
        // Logic: For each customer in the "Follow Up" list (or all), suggest item based on pairs.
        // This endpoint might just return the pairs logic for the UI to map.

        res.json({
            success: true,
            data: {
                pairs: pairsRes.rows
            }
        });

    } catch (error) {
        next(error);
    }
};

// 4. Discount Optimization
const getDiscountAnalysis = async (req, res, next) => {
    try {
        // Compare discount % vs repeat purchase behavior (Total transactions per customer)
        const query = `
            SELECT 
                c.id, 
                AVG(CASE WHEN t.total_faktur > 0 THEN (t.diskon / t.total_faktur) * 100 ELSE 0 END) as avg_discount_percent,
                COUNT(t.id) as transaction_count,
                AVG(t.gp_percent) as avg_gp_percent
            FROM transactions t
            JOIN customers c ON t.customer_id = c.id
            GROUP BY c.id
            HAVING COUNT(t.id) > 1
            LIMIT 500
        `;
        const { rows } = await pool.query(query);

        const scatterData = rows.map(row => ({
            x: parseFloat(row.avg_discount_percent).toFixed(2), // Discount
            y: parseInt(row.transaction_count),                 // Repeat purchases
            r: parseFloat(row.avg_gp_percent)                   // Radius/Color could be GP
        }));

        res.json({
            success: true,
            data: scatterData
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCustomerLifecycle,
    getSeasonality,
    getRecommendations,
    getDiscountAnalysis
};
