require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log("Adding redeemed_points to customers...");
        await pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS redeemed_points INTEGER DEFAULT 0');
        
        console.log("Creating redemptions table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS redemptions (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER REFERENCES customers(id),
                reward_name VARCHAR(255) NOT NULL,
                points_cost INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("Migration complete.");
    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        await pool.end();
    }
}

migrate();
