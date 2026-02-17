require('dotenv').config({ path: '../.env' });
const pool = require('../config/db');

async function run() {
    try {
        const resItems = await pool.query('SELECT count(*) FROM transaction_items WHERE diskon != 0');
        console.log('Items with non-zero discount:', resItems.rows[0].count);

        const resTx = await pool.query('SELECT count(*) FROM transactions WHERE diskon != 0');
        console.log('Transactions with non-zero discount:', resTx.rows[0].count);

        const sample = await pool.query('SELECT * FROM transaction_items WHERE diskon != 0 LIMIT 5');
        console.log('Sample Item Discounts:', sample.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
