require('dotenv').config({ path: '../.env' });
const pool = require('../config/db');

async function run() {
    try {
        console.log('Fixing Schema...');

        await pool.query(`ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS diskon DECIMAL(20,2) DEFAULT 0`);
        console.log('Added diskon column');

        await pool.query(`ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(20,2) DEFAULT 0`);
        console.log('Added cost_price column');

        console.log('Schema fixed.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
