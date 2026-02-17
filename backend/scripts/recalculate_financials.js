const { Pool } = require('pg');
const pool = require('../config/db'); // Adjust path if needed
require('dotenv').config({ path: '../.env' }); // Load env from parent (backend/.)

const recalculate = async () => {
    console.log('Starting Financial Recalculation...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('1. Updating Net Sales (Total / 1.11)...');
        await client.query(`UPDATE transactions SET net_sales = total_faktur / 1.11`);

        console.log('2. Updating Transaction Items (Subtotal & Price)...');
        await client.query(`
            UPDATE transaction_items
            SET subtotal = subtotal / 1.11,
                price = (subtotal / 1.11) / NULLIF(qty, 0)
        `);

        console.log('3. Updating Gross Profit...');
        await client.query(`
            UPDATE transactions t
            SET gross_profit = (
                SELECT COALESCE(SUM(ti.subtotal - (ti.qty * COALESCE(p.amount / NULLIF(p.qty, 0), 0))), 0)
                FROM transaction_items ti
                LEFT JOIN parts p ON ti.no_part = p.no_part
                WHERE ti.transaction_id = t.id
            )
        `);

        console.log('4. Updating GP %...');
        await client.query(`
            UPDATE transactions
            SET gp_percent = CASE WHEN net_sales > 0 THEN (gross_profit / net_sales) * 100 ELSE 0 END
        `);

        console.log('5. Recalculating Points...');
        await client.query(`UPDATE transactions SET points_earned = FLOOR(net_sales / 10000)`);

        await client.query('COMMIT');
        console.log('SUCCESS: Financials recalculated successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('ERROR: Recalculation failed.', err);
    } finally {
        client.release();
        pool.end(); // Close connection
    }
};

recalculate();
