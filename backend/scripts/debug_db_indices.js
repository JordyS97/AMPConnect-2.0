require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const runDebug = async () => {
    console.log('🔍 Debug: Testing DB Connection...');
    console.log('DB URL provided:', !!process.env.DATABASE_URL);

    try {
        const client = await pool.connect();
        console.log('✅ Connection Successful.');

        console.log('🔍 Debug: Attempting to create indices...');

        const queries = [
            'CREATE INDEX IF NOT EXISTS idx_transaction_items_part ON transaction_items(no_part);',
            'CREATE INDEX IF NOT EXISTS idx_transaction_items_tx ON transaction_items(transaction_id);',
            'CREATE INDEX IF NOT EXISTS idx_parts_group_tobpm ON parts(group_tobpm);',
            'CREATE INDEX IF NOT EXISTS idx_transactions_cust_date ON transactions(customer_id, tanggal);',
            'CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);',
            'CREATE INDEX IF NOT EXISTS idx_transactions_date_opt ON transactions(tanggal);'
        ];

        for (const q of queries) {
            console.log(`\n👉 Executing: ${q}`);
            try {
                await client.query(q);
                console.log('   ✅ Success');
            } catch (e) {
                console.error('   ❌ FAILED:', e);
                console.error('      Message:', e.message);
                console.error('      Code:', e.code);
            }
        }

        client.release();
    } catch (err) {
        console.error('❌ Connection Failed:', err);
    } finally {
        await pool.end();
    }
};

runDebug();
