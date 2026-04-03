const pool = require('./config/db');
const { TIER_THRESHOLDS } = require('./utils/pointsCalculator');

async function syncPointsAndTiers() {
    try {
        console.log('Starting sync of points and tiers...');
        
        // 1. Recalculate points for all transactions based on net_sales / 500,000
        console.log('Recalculating points for all transactions...');
        await pool.query('UPDATE transactions SET points_earned = FLOOR(net_sales / 500000)');

        // 2. Synchronize customers.total_points with sum of transactions.points_earned
        console.log('Synchronizing customers.total_points...');
        await pool.query(`
            UPDATE customers c
            SET total_points = COALESCE(sub.total_pts, 0)
            FROM (
                SELECT customer_id, SUM(points_earned) as total_pts
                FROM transactions
                GROUP BY customer_id
            ) sub
            WHERE c.id = sub.customer_id
        `);

        // 3. Synchronize tiers based on lifetime net sales
        console.log('Synchronizing customer tiers...');
        await pool.query(`
            UPDATE customers c
            SET tier = CASE
                WHEN sub.total_sales >= $1 THEN 'Moon Stone'
                WHEN sub.total_sales >= $2 THEN 'Diamond'
                WHEN sub.total_sales >= $3 THEN 'Gold'
                ELSE 'Silver'
            END
            FROM (
                SELECT customer_id, SUM(net_sales) as total_sales
                FROM transactions
                GROUP BY customer_id
            ) sub
            WHERE c.id = sub.customer_id
        `, [TIER_THRESHOLDS.MOON_STONE, TIER_THRESHOLDS.DIAMOND, TIER_THRESHOLDS.GOLD]);

        console.log('Sync complete!');
    } catch (err) {
        console.error('Error during sync:', err.message);
    } finally {
        await pool.end();
    }
}

syncPointsAndTiers();
