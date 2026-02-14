const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const migrate = async () => {
    try {
        console.log('🔌 Connecting to database...');
        await pool.query(`
            ALTER TABLE parts 
            ADD COLUMN IF NOT EXISTS group_tobpm VARCHAR(100);
        `);
        console.log('✅ Success: Added group_tobpm column to parts table.');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await pool.end();
        console.log('👋 Connection closed.');
    }
};

migrate();
