const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const migrate = async () => {
    try {
        console.log('🔌 Connecting to database...');

        // Fix transactions table
        await pool.query(`ALTER TABLE transactions ALTER COLUMN total_faktur TYPE DECIMAL(20,2)`);
        await pool.query(`ALTER TABLE transactions ALTER COLUMN diskon TYPE DECIMAL(20,2)`);
        await pool.query(`ALTER TABLE transactions ALTER COLUMN net_sales TYPE DECIMAL(20,2)`);
        await pool.query(`ALTER TABLE transactions ALTER COLUMN gross_profit TYPE DECIMAL(20,2)`);
        await pool.query(`ALTER TABLE transactions ALTER COLUMN gp_percent TYPE DECIMAL(10,2)`);

        // Fix transaction_items table
        await pool.query(`ALTER TABLE transaction_items ALTER COLUMN price TYPE DECIMAL(20,2)`);
        await pool.query(`ALTER TABLE transaction_items ALTER COLUMN subtotal TYPE DECIMAL(20,2)`);

        console.log('✅ Success: Updated numeric columns to prevent overflow.');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await pool.end();
        console.log('👋 Connection closed.');
    }
};

migrate();
