const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function run() {
    try {
        console.log('Adding diskon column to transaction_items...');
        await pool.query('ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS diskon DECIMAL(15,2) DEFAULT 0');
        console.log('Column added successfully.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
