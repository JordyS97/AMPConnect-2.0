const pool = require('./config/db');

async function checkData() {
    try {
        const customers = await pool.query('SELECT id, name, total_points, redeemed_points, tier FROM customers LIMIT 10');
        console.log('Customers Sample:');
        console.log(JSON.stringify(customers.rows, null, 2));

        const redemptions = await pool.query('SELECT * FROM redemptions LIMIT 5');
        console.log('Redemptions Sample:');
        console.log(JSON.stringify(redemptions.rows, null, 2));

        const transactions = await pool.query('SELECT id, customer_id, points_earned FROM transactions LIMIT 5');
        console.log('Transactions Sample:');
        console.log(JSON.stringify(transactions.rows, null, 2));
    } catch (err) {
        console.error('Error checking data:', err.message);
    } finally {
        await pool.end();
    }
}

checkData();
