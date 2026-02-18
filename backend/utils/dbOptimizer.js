const pool = require('../config/db');

const applyIndices = async () => {
    // Only run if we have a connection
    if (!process.env.DATABASE_URL) {
        console.warn('⚠️ No DATABASE_URL found, skipping index optimization.');
        return;
    }

    console.log('🔌 Verifying Database Indices...');
    try {
        const client = await pool.connect();

        // 1. Index for Transaction Items -> Parts join
        await client.query('CREATE INDEX IF NOT EXISTS idx_transaction_items_part ON transaction_items(no_part);');

        // 2. Index for Parts grouping
        await client.query('CREATE INDEX IF NOT EXISTS idx_parts_group_tobpm ON parts(group_tobpm);');

        // 3. Composite Index for Customer Buying Cycles (Sort/Filter)
        await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_cust_date ON transactions(customer_id, tanggal);');

        // 4. Index for Transactions Date (if not exists from schema)
        await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_date_opt ON transactions(tanggal);');

        console.log('✅ Database Indices Verified/Applied.');
        client.release();
    } catch (err) {
        console.error('❌ Error checking indices (non-fatal):', err.message);
        // Do not crash, just log. The app should try to run even if this fails (e.g. read-only user)
    }
};

module.exports = applyIndices;
