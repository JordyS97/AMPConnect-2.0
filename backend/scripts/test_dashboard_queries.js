require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const testQueries = async () => {
    console.log('🧪 Testing Dashboard Queries...');

    try {
        const client = await pool.connect();
        console.log('✅ DB Connected');

        // 1. Overview Query (Simulated)
        console.log('\n--- Testing Overview Query ---');
        try {
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
            const res1 = await client.query(cycleQuery);
            console.log('✅ Cycle Query:', res1.rows[0]);
        } catch (e) { console.error('❌ Cycle Query Failed:', e.message); }

        // 2. Seasonality Query (Simulated)
        console.log('\n--- Testing Seasonality Query ---');
        try {
            const seasonalQuery = `
                WITH limited_tx AS (
                    SELECT id, tanggal 
                    FROM transactions 
                    WHERE tanggal >= NOW() - INTERVAL '12 months'
                )
                SELECT 
                    EXTRACT(MONTH FROM t.tanggal) as month,
                    COALESCE(NULLIF(p.group_tobpm, ''), 'Other') as category,
                    SUM(ti.qty) as total_qty
                FROM transaction_items ti
                JOIN limited_tx t ON ti.transaction_id = t.id
                LEFT JOIN parts p ON ti.no_part = p.no_part
                GROUP BY 1, 2
                ORDER BY 1 ASC
            `;
            const res2 = await client.query(seasonalQuery);
            console.log(`✅ Seasonality Query: ${res2.rowCount} rows returned.`);
        } catch (e) { console.error('❌ Seasonality Query Failed:', e.message); }

        // 3. Buying Cycle Analysis (Simulated)
        console.log('\n--- Testing Buying Cycle Analysis Query ---');
        try {
            const buyingCycleQuery = `
                WITH recent_customers AS (
                    SELECT DISTINCT customer_id
                    FROM transactions
                    WHERE tanggal >= NOW() - INTERVAL '12 months'
                ),
                target_customers AS (
                    SELECT DISTINCT ON (customer_id) customer_id, tanggal
                    FROM transactions
                    WHERE tanggal >= NOW() - INTERVAL '12 months'
                    ORDER BY customer_id, tanggal DESC
                    LIMIT 500
                ),
                user_cycles AS (
                     SELECT t.customer_id, c.name, MAX(t.tanggal) as last_purchase,
                     AVG(t.tanggal - prev_date) as avg_cycle
                     FROM (
                        SELECT customer_id, tanggal, LAG(tanggal) OVER (PARTITION BY customer_id ORDER BY tanggal) as prev_date
                        FROM transactions
                        WHERE tanggal >= NOW() - INTERVAL '18 months'
                        AND customer_id IN (SELECT customer_id FROM target_customers)
                     ) t
                     JOIN customers c ON t.customer_id = c.id
                     WHERE prev_date IS NOT NULL
                     GROUP BY t.customer_id, c.name
                )
                SELECT * FROM user_cycles LIMIT 500
             `;
            const res3 = await client.query(buyingCycleQuery);
            console.log(`✅ Buying Cycle Query: ${res3.rowCount} rows returned.`);
        } catch (e) { console.error('❌ Buying Cycle Query Failed:', e.message); }

        client.release();
    } catch (err) {
        console.error('❌ DB Connection Failed:', err);
    } finally {
        await pool.end();
    }
};

testQueries();
