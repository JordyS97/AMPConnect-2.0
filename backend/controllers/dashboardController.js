const pool = require('../config/db');

// Helper to calculate days between dates
const daysBetween = (d1, d2) => {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((d1 - d2) / oneDay));
};

// 1. OVERVIEW METRICS (Hero Section)
// Simple In-Memory Cache (Global for Admin Dashboard)
const dashboardCache = {
    overview: { data: null, time: 0 },
    buyingCycle: { data: null, time: 0 },
    seasonality: { data: null, time: 0 },
    dueTracking: { data: null, time: 0 },
    productCycles: { data: null, time: 0 },
    predictive: { data: null, time: 0 },
    discount: { data: null, time: 0 },
    cohorts: { data: null, time: 0 },
    rfm: { data: null, time: 0 }
};
const CACHE_TTL = 5 * 60 * 1000; // 5 Minutes

// 1. OVERVIEW METRICS (Hero Section)
const getOverviewMetrics = async (req, res, next) => {
    try {
        if (Date.now() - dashboardCache.overview.time < CACHE_TTL && dashboardCache.overview.data) {
            return res.json(dashboardCache.overview.data);
        }

        // A. Avg Buying Cycle & Active Patterns (Last 12 Months - Speed Opt)
        const cycleQuery = `
            WITH intervals AS (
                SELECT t.customer_id, t.tanggal - LAG(t.tanggal) OVER (PARTITION BY t.customer_id ORDER BY t.tanggal) as days_diff
                FROM transactions t
                WHERE t.tanggal >= NOW() - INTERVAL '12 months' 
            )
            SELECT AVG(days_diff) as avg_cycle, COUNT(DISTINCT customer_id) as active_patterns
            FROM intervals
            WHERE days_diff IS NOT NULL AND days_diff > 0
        `;
        const cycleRes = await pool.query(cycleQuery);

        // B. Repeat Purchase Rate (Last 12 Months)
        const repeatQuery = `
            SELECT 
                COUNT(DISTINCT CASE WHEN tx_count > 1 THEN customer_id END)::FLOAT / NULLIF(COUNT(DISTINCT customer_id), 0) * 100 as repeat_rate
            FROM (
                SELECT customer_id, COUNT(id) as tx_count 
                FROM transactions 
                WHERE tanggal >= NOW() - INTERVAL '12 months'
                GROUP BY customer_id
            ) sub
        `;
        const repeatRes = await pool.query(repeatQuery);

        // C. Revenue at Risk (Last 12 Months activity)
        const riskQuery = `
            WITH last_tx AS (
                -- DISTINCT ON gives the value of the LAST invoice. MAX(net_sales)
                -- returned the customer's largest invoice ever, which systematically
                -- overstated the amount at risk.
                SELECT DISTINCT ON (customer_id)
                    customer_id, tanggal as last_date, net_sales as last_value
                FROM transactions
                WHERE tanggal >= NOW() - INTERVAL '12 months'
                ORDER BY customer_id, tanggal DESC, id DESC
            )
            SELECT 
                SUM(CASE WHEN last_date < NOW() - INTERVAL '90 days' THEN last_value ELSE 0 END) as revenue_at_risk,
                COUNT(CASE WHEN last_date < NOW() - INTERVAL '90 days' THEN 1 END) as overdue_count
            FROM last_tx
        `;
        const riskRes = await pool.query(riskQuery);

        const responseData = {
            success: true,
            data: {
                avg_cycle: Math.round(cycleRes.rows[0].avg_cycle || 0),
                active_patterns: parseInt(cycleRes.rows[0].active_patterns || 0),
                repeat_rate: parseFloat(repeatRes.rows[0].repeat_rate || 0).toFixed(1),
                revenue_at_risk: parseInt(riskRes.rows[0].revenue_at_risk || 0),
                overdue_count: parseInt(riskRes.rows[0].overdue_count || 0)
            }
        };

        dashboardCache.overview = { data: responseData, time: Date.now() };
        res.json(responseData);
    } catch (error) {
        next(error);
    }
};

// 2. BUYING CYCLE ANALYSIS
const getBuyingCycleAnalysis = async (req, res, next) => {
    try {
        if (Date.now() - dashboardCache.buyingCycle.time < CACHE_TTL && dashboardCache.buyingCycle.data) {
            return res.json(dashboardCache.buyingCycle.data);
        }

        // Optimization: Use "Most Recent" customers (Index Scan) instead of "Most Frequent" (Full Table Scan)
        const query = `
            WITH last_seen AS (
                SELECT DISTINCT ON (customer_id) customer_id, tanggal
                FROM transactions
                WHERE tanggal >= NOW() - INTERVAL '12 months'
                ORDER BY customer_id, tanggal DESC
            ),
            target_customers AS (
                -- The 500 most recently active customers. Putting LIMIT on the
                -- DISTINCT ON above picked the 500 lowest customer ids instead.
                SELECT customer_id FROM last_seen ORDER BY tanggal DESC LIMIT 500
            ),
            user_cycles AS (
                 SELECT t.customer_id, c.name, MAX(t.tanggal) as last_purchase,
                 AVG(t.tanggal - prev_date) as avg_cycle
                 FROM (
                    SELECT customer_id, tanggal, LAG(tanggal) OVER (PARTITION BY customer_id ORDER BY tanggal) as prev_date
                    FROM transactions
                    WHERE tanggal >= NOW() - INTERVAL '18 months'
                    AND customer_id IN (SELECT customer_id FROM target_customers) -- Optimization: Join limited set
                 ) t
                 JOIN customers c ON t.customer_id = c.id
                 WHERE prev_date IS NOT NULL
                 GROUP BY t.customer_id, c.name
            )
            SELECT * FROM user_cycles LIMIT 500
        `;
        const { rows } = await pool.query(query);

        const distribution = {
            '0-7 days': 0, '8-14 days': 0, '15-30 days': 0, '31-45 days': 0,
            '46-60 days': 0, '60-90 days': 0, '90+ days': 0
        };

        const patterns = rows.map(r => {
            const cycle = Math.round(r.avg_cycle);
            if (cycle <= 7) distribution['0-7 days']++;
            else if (cycle <= 14) distribution['8-14 days']++;
            else if (cycle <= 30) distribution['15-30 days']++;
            else if (cycle <= 45) distribution['31-45 days']++;
            else if (cycle <= 60) distribution['46-60 days']++;
            else if (cycle <= 90) distribution['60-90 days']++;
            else distribution['90+ days']++;

            const nextDate = new Date(r.last_purchase);
            nextDate.setDate(nextDate.getDate() + cycle);

            return {
                customer: r.name,
                avg_cycle: cycle,
                last_purchase: r.last_purchase,
                next_due: nextDate,
                confidence: cycle < 30 ? 'High' : (cycle < 60 ? 'Medium' : 'Low')
            };
        }).sort((a, b) => a.next_due - b.next_due).slice(0, 50);

        const responseData = {
            success: true,
            data: { patterns, distribution }
        };

        dashboardCache.buyingCycle = { data: responseData, time: Date.now() };
        res.json(responseData);
    } catch (error) {
        next(error);
    }
};

// 3. SEASONALITY ANALYSIS
const getSeasonalityAnalysis = async (req, res, next) => {
    try {
        if (Date.now() - dashboardCache.seasonality.time < CACHE_TTL && dashboardCache.seasonality.data) {
            return res.json(dashboardCache.seasonality.data);
        }

        const query = `
            WITH limited_tx AS (
                SELECT id, tanggal 
                FROM transactions 
                WHERE tanggal >= NOW() - INTERVAL '12 months'
            )
            SELECT
                EXTRACT(MONTH FROM t.tanggal) as month,
                -- Categorise from the line itself. ti.group_material is populated on
                -- every row; parts.group_tobpm only covers items present in the parts
                -- master (~48%), which silently dumped the rest into 'Other'.
                COALESCE(NULLIF(ti.group_material, ''), 'Other') as category,
                SUM(ti.qty) as total_qty
            FROM transaction_items ti
            JOIN limited_tx t ON ti.transaction_id = t.id -- Join with reduced dataset
            GROUP BY 1, 2
            ORDER BY 1 ASC
        `;
        const { rows } = await pool.query(query);

        const heatmap = {};
        const categoryTotals = {};

        rows.forEach(r => {
            const cat = r.category;
            const m = r.month;
            if (!heatmap[cat]) heatmap[cat] = {};
            heatmap[cat][m] = parseInt(r.total_qty);

            categoryTotals[cat] = (categoryTotals[cat] || 0) + parseInt(r.total_qty);
        });

        const seasonalIndex = [];
        for (const cat in heatmap) {
            const avgMonthly = categoryTotals[cat] / 12;
            let peakMonth = -1;
            let maxVal = 0;
            let varianceSum = 0;

            for (let m = 1; m <= 12; m++) {
                const val = heatmap[cat][m] || 0;
                if (val > maxVal) { maxVal = val; peakMonth = m; }
                varianceSum += Math.abs(val - avgMonthly);
            }

            seasonalIndex.push({
                category: cat,
                index: (varianceSum / (categoryTotals[cat] || 1)).toFixed(2),
                peak_month: peakMonth,
                avg_monthly: Math.round(avgMonthly)
            });
        }

        seasonalIndex.sort((a, b) => b.index - a.index);

        const responseData = {
            success: true,
            data: { heatmap, seasonalIndex }
        };

        dashboardCache.seasonality = { data: responseData, time: Date.now() };
        res.json(responseData);
    } catch (error) {
        next(error);
    }
};

// 4. CUSTOMER DUE TRACKING
const getCustomerDueTracking = async (req, res, next) => {
    try {
        if (Date.now() - dashboardCache.dueTracking.time < CACHE_TTL && dashboardCache.dueTracking.data) {
            return res.json(dashboardCache.dueTracking.data);
        }

        const query = `
            WITH last_seen AS (
                SELECT DISTINCT ON (customer_id) customer_id, tanggal
                FROM transactions
                WHERE tanggal >= NOW() - INTERVAL '1 year'
                ORDER BY customer_id, tanggal DESC
            ),
            target_customers AS (
                -- Genuinely the 500 most recent customers. The LIMIT used to sit on
                -- the DISTINCT ON, whose ORDER BY starts with customer_id, so it
                -- returned the 500 lowest ids instead.
                SELECT customer_id FROM last_seen ORDER BY tanggal DESC LIMIT 500
            )
            SELECT t.customer_id, COALESCE(c.name, t.no_customer) as name,
                   MAX(t.tanggal) as last_purchase,
                   -- Value of the most recent invoice, not the largest one.
                   (ARRAY_AGG(t.net_sales ORDER BY t.tanggal DESC))[1] as last_value,
                   AVG(t.tanggal - prev_date) as avg_cycle
            FROM (
                SELECT customer_id, no_customer, net_sales, tanggal, LAG(tanggal) OVER (PARTITION BY customer_id ORDER BY tanggal) as prev_date
                FROM transactions
                WHERE tanggal >= NOW() - INTERVAL '18 months'
                AND customer_id IN (SELECT customer_id FROM target_customers)
            ) t
            LEFT JOIN customers c ON t.customer_id = c.id
            WHERE prev_date IS NOT NULL
            GROUP BY t.customer_id, c.name, t.no_customer
        `;
        const { rows } = await pool.query(query);

        const today = new Date();
        const dueThisWeek = [];
        const overdue = [];

        rows.forEach(r => {
            const cycle = r.avg_cycle;
            const last = new Date(r.last_purchase);
            const expectedDays = cycle;

            const expectedDate = new Date(last);
            expectedDate.setDate(last.getDate() + expectedDays);

            const daysUntilDue = Math.ceil((expectedDate - today) / (1000 * 60 * 60 * 24));

            const item = {
                name: r.name,
                due_date: expectedDate.toISOString().split('T')[0],
                last_value: parseInt(r.last_value),
                action: 'Follow Up',
                cycle: Math.round(cycle)
            };

            if (daysUntilDue >= 0 && daysUntilDue <= 7) {
                dueThisWeek.push(item);
            } else if (daysUntilDue < 0) {
                // Was `< -7`, which silently dropped customers 1–7 days late from
                // both buckets — exactly the window where a follow-up still works.
                item.overdue_days = Math.abs(daysUntilDue);
                item.risk_amount = item.last_value;
                overdue.push(item);
            }
        });

        const responseData = {
            success: true,
            data: {
                due_this_week: dueThisWeek.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)),
                overdue: overdue.sort((a, b) => b.risk_amount - a.risk_amount).slice(0, 50)
            }
        };

        dashboardCache.dueTracking = { data: responseData, time: Date.now() };
        res.json(responseData);
    } catch (error) {
        next(error);
    }
};

// 5. PRODUCT CYCLES
const getProductCycles = async (req, res, next) => {
    try {
        const query = `
            WITH cat_dates AS (
                SELECT
                    t.customer_id,
                    ti.group_material as category,
                    t.tanggal
                FROM transaction_items ti
                JOIN transactions t ON ti.transaction_id = t.id
                -- Was an inner JOIN on parts, which dropped every item missing from the
                -- parts master (~52% of lines) out of the cycle table entirely.
                WHERE NULLIF(ti.group_material, '') IS NOT NULL
                AND t.tanggal >= NOW() - INTERVAL '2 years' -- Optimization
            ),
            intervals AS (
                SELECT 
                    category,
                    tanggal - LAG(tanggal) OVER (PARTITION BY customer_id, category ORDER BY tanggal) as diff
                FROM cat_dates
            )
            SELECT category, AVG(diff) as avg_cycle, COUNT(*) as sample_size
            FROM intervals
            WHERE diff IS NOT NULL AND diff > 15
            GROUP BY category
            HAVING COUNT(*) > 5
            ORDER BY avg_cycle ASC
        `;
        const { rows } = await pool.query(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// 6. PREDICTIVE ANALYTICS
const getPredictiveAnalytics = async (req, res, next) => {
    try {
        // A. Sales Forecast (Simple Projection based on last 30 days)
        // Group by week relative to now
        const forecastQuery = `
            WITH weekly_sales AS (
                SELECT 
                    DATE_TRUNC('week', tanggal) as week_start,
                    SUM(net_sales) as revenue,
                    COUNT(DISTINCT customer_id) as customers
                FROM transactions
                WHERE tanggal >= NOW() - INTERVAL '30 days'
                GROUP BY 1
                ORDER BY 1 DESC
                LIMIT 4
            )
            SELECT 
                'Week ' || ROW_NUMBER() OVER (ORDER BY week_start ASC) as week,
                revenue,
                customers,
                'N/A' as top_product -- Simplified for speed
            FROM weekly_sales
        `;
        const forecastRes = await pool.query(forecastQuery);

        // B. Stock Recommendations (Low Stock < 10 units)
        // Column is parts.qty — 'stok_awal' does not exist in the schema and made
        // this endpoint throw 42703 on every call.
        const stockQuery = `
            SELECT
                no_part as part,
                qty as current,
                10 as needed, -- Threshold
                CASE WHEN qty < 5 THEN 'Urgent' ELSE 'Order' END as status
            FROM parts
            WHERE qty < 10
            ORDER BY qty ASC
            LIMIT 5
        `;
        const stockRes = await pool.query(stockQuery);

        res.json({
            success: true,
            data: {
                forecast: forecastRes.rows.length > 0 ? forecastRes.rows : [],
                inventory: stockRes.rows
            }
        });
    } catch (error) {
        next(error);
    }
};

// 7. DISCOUNT ANALYSIS (Preserved)
const getDiscountAnalysis = async (req, res, next) => {
    try {
        const query = `
            SELECT 
                c.id, 
                AVG(CASE WHEN t.total_faktur > 0 THEN (ABS(t.diskon) / t.total_faktur) * 100 ELSE 0 END) as avg_discount_percent,
                COUNT(t.id) as transaction_count,
                AVG(t.gp_percent) as avg_gp_percent
            FROM transactions t
            JOIN customers c ON t.customer_id = c.id
            WHERE t.tanggal >= NOW() - INTERVAL '1 year' -- Optimization
            GROUP BY c.id
            HAVING COUNT(t.id) > 0
            LIMIT 500
        `;
        const { rows } = await pool.query(query);

        const scatterData = rows.map(row => ({
            x: parseFloat(row.avg_discount_percent).toFixed(2),
            y: parseInt(row.transaction_count),
            r: Math.max(2, Math.min(parseFloat(row.avg_gp_percent) / 2, 10))
        }));

        res.json({ success: true, data: scatterData });

    } catch (error) {
        next(error);
    }
};

// 8. COHORT ANALYSIS
const getCohortAnalysis = async (req, res, next) => {
    try {
        // Limited to cohorts in last 12 months to speed up
        const query = `
            WITH first_purchase AS (
                SELECT customer_id, MIN(DATE_TRUNC('month', tanggal)) as cohort_month
                FROM transactions
                WHERE tanggal >= NOW() - INTERVAL '12 months' -- Strict Optimization
                GROUP BY customer_id
            ),
            activities AS (
                SELECT 
                    t.customer_id, 
                    DATE_TRUNC('month', t.tanggal) as activity_month,
                    EXTRACT(EPOCH FROM (DATE_TRUNC('month', t.tanggal) - fp.cohort_month))/2592000 as month_diff
                FROM transactions t
                JOIN first_purchase fp ON t.customer_id = fp.customer_id
                WHERE t.tanggal >= NOW() - INTERVAL '12 months'
            )
            SELECT 
                TO_CHAR(cohort_month, 'YYYY-MM') as cohort,
                month_diff,
                COUNT(DISTINCT customer_id) as users
            FROM first_purchase
            JOIN activities USING (customer_id)
            WHERE month_diff BETWEEN 0 AND 12
            GROUP BY 1, 2
            ORDER BY 1 DESC, 2 ASC
        `;
        const { rows } = await pool.query(query);

        const cohorts = {};

        rows.forEach(r => {
            if (!cohorts[r.cohort]) cohorts[r.cohort] = { cohort: r.cohort, data: {} };
            cohorts[r.cohort].data[Math.round(r.month_diff)] = parseInt(r.users);
        });

        const result = Object.values(cohorts).map(c => {
            const total = c.data[0] || 0;
            return {
                cohort: c.cohort,
                total: total,
                retention: {
                    m1: ((c.data[1] || 0) / (total || 1) * 100).toFixed(1),
                    m2: ((c.data[2] || 0) / (total || 1) * 100).toFixed(1),
                    m3: ((c.data[3] || 0) / (total || 1) * 100).toFixed(1),
                    m6: ((c.data[6] || 0) / (total || 1) * 100).toFixed(1),
                    m12: ((c.data[12] || 0) / (total || 1) * 100).toFixed(1)
                }
            };
        });

        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

// 9. RFM SEGMENTATION
const getRFMSegmentation = async (req, res, next) => {
    try {
        const query = `
            SELECT 
                customer_id,
                MAX(tanggal) as last_purchase,
                COUNT(id) as freq,
                SUM(net_sales) as monetary
            FROM transactions
            WHERE tanggal >= NOW() - INTERVAL '2 years' -- Optimization
            GROUP BY customer_id
        `;
        const { rows } = await pool.query(query);

        const now = new Date();
        const segments = {
            'Champions': 0, 'Loyal': 0, 'At Risk': 0, 'Lost': 0, 'New': 0
        };

        rows.forEach(r => {
            const recencyDays = (now - new Date(r.last_purchase)) / (1000 * 60 * 60 * 24);
            const freq = parseInt(r.freq);

            if (recencyDays < 30 && freq > 5) segments['Champions']++;
            else if (recencyDays < 60 && freq > 2) segments['Loyal']++;
            else if (recencyDays < 90 && freq > 1) segments['At Risk']++;
            else if (recencyDays > 120) segments['Lost']++;
            else segments['New']++;
        });

        res.json({ success: true, data: segments });
    } catch (error) {
        next(error);
    }
};

// 10. ACTION PLAN
const getActionPlan = async (req, res, next) => {
    // Consolidated actions from other logic
    // Returning static structure for UI to map, as dynamic logic is in individual endpoints
    res.json({
        success: true,
        data: [] // UI will aggregate from Due/Stock/Overdue
    });
};

module.exports = {
    getOverviewMetrics,
    getBuyingCycleAnalysis,
    getSeasonalityAnalysis,
    getCustomerDueTracking,
    getProductCycles,
    getPredictiveAnalytics,
    getDiscountAnalysis,
    getCohortAnalysis,
    getRFMSegmentation,
    getActionPlan
};
