const pool = require('../config/db');

const applyIndices = async () => {
    console.log('🔌 Connecting to database...');
    try {
        const client = await pool.connect();
        console.log('✅ Connected. Applying indices...');

        // 1. Index for Transaction Items -> Parts join
        console.log('   -> Creating index on transaction_items(no_part)...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_transaction_items_part ON transaction_items(no_part);');

        // 2. Index for Parts grouping
        console.log('   -> Creating index on parts(group_tobpm)...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_parts_group_tobpm ON parts(group_tobpm);');

        // 3. Composite Index for Customer Buying Cycles (Sort/Filter)
        // This dramatically speeds up "ORDER BY tanggal" within customer partitions
        console.log('   -> Creating composite index on transactions(customer_id, tanggal)...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_cust_date ON transactions(customer_id, tanggal);');

        console.log('🎉 Optimization Complete! Indices applied.');
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error applying indices:', err);
        process.exit(1);
    }
};

applyIndices();
