/**
 * Cleanup Script - Remove all dummy/seed data
 * Run this on Render Shell AFTER uploading your real data:
 *   node db/cleanDummy.js
 * 
 * This will DELETE:
 *   - All seed transactions (INV-2026-xxx)
 *   - All seed transaction items
 *   - All seed parts (HND-xxx, YMH-xxx, SZK-xxx, KWS-xxx, UNV-xxx)
 *   - All seed customers (CUST001-CUST005)
 *   - Activity logs from seed data
 *   - Upload history
 * 
 * This will KEEP:
 *   - Admin accounts (admin, manager)
 *   - Any REAL data you uploaded via the admin portal
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const DUMMY_CUSTOMER_NOS = ['CUST001', 'CUST002', 'CUST003', 'CUST004', 'CUST005'];
const DUMMY_PART_PREFIXES = ['HND-', 'YMH-', 'SZK-', 'KWS-', 'UNV-'];
const DUMMY_INVOICE_PREFIX = 'INV-2026-';

async function cleanDummy() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Count what will be deleted
        const dummyTx = await client.query(
            `SELECT COUNT(*) FROM transactions WHERE no_faktur LIKE $1`, [`${DUMMY_INVOICE_PREFIX}%`]
        );
        const dummyParts = await client.query(
            `SELECT COUNT(*) FROM parts WHERE ${DUMMY_PART_PREFIXES.map((_, i) => `no_part LIKE $${i + 1}`).join(' OR ')}`,
            DUMMY_PART_PREFIXES.map(p => `${p}%`)
        );
        const dummyCustomers = await client.query(
            `SELECT COUNT(*) FROM customers WHERE no_customer = ANY($1)`, [DUMMY_CUSTOMER_NOS]
        );

        console.log('\n🗑️  Dummy data to remove:');
        console.log(`   Transactions: ${dummyTx.rows[0].count}`);
        console.log(`   Parts: ${dummyParts.rows[0].count}`);
        console.log(`   Customers: ${dummyCustomers.rows[0].count}`);

        // 2. Delete dummy transaction items (via transaction IDs)
        const txIds = await client.query(
            `SELECT id FROM transactions WHERE no_faktur LIKE $1`, [`${DUMMY_INVOICE_PREFIX}%`]
        );
        if (txIds.rows.length > 0) {
            const ids = txIds.rows.map(r => r.id);
            await client.query(`DELETE FROM transaction_items WHERE transaction_id = ANY($1)`, [ids]);
            console.log(`   ✅ Deleted ${txIds.rows.length} dummy transaction item groups`);
        }

        // 3. Delete dummy transactions
        const delTx = await client.query(
            `DELETE FROM transactions WHERE no_faktur LIKE $1`, [`${DUMMY_INVOICE_PREFIX}%`]
        );
        console.log(`   ✅ Deleted ${delTx.rowCount} dummy transactions`);

        // 4. Delete dummy parts
        const delParts = await client.query(
            `DELETE FROM parts WHERE ${DUMMY_PART_PREFIXES.map((_, i) => `no_part LIKE $${i + 1}`).join(' OR ')}`,
            DUMMY_PART_PREFIXES.map(p => `${p}%`)
        );
        console.log(`   ✅ Deleted ${delParts.rowCount} dummy parts`);

        // 5. Delete dummy customers
        const delCust = await client.query(
            `DELETE FROM customers WHERE no_customer = ANY($1)`, [DUMMY_CUSTOMER_NOS]
        );
        console.log(`   ✅ Deleted ${delCust.rowCount} dummy customers`);

        // 6. Clean up OTP codes for dummy emails
        await client.query(
            `DELETE FROM otp_codes WHERE email IN ('budi@email.com', 'siti@email.com', 'ahmad@email.com', 'dewi@email.com', 'rudi@email.com')`
        );
        console.log(`   ✅ Cleaned up dummy OTP codes`);

        // 7. Clean up upload history
        const delUploads = await client.query('DELETE FROM upload_history');
        console.log(`   ✅ Deleted ${delUploads.rowCount} upload history records`);

        // 8. Clean up activity logs (keep admin logs if desired, or delete all non-admin)
        // Deleting logs for dummy customers or general cleanup
        const delLogs = await client.query("DELETE FROM activity_logs WHERE user_type = 'customer' OR description LIKE '%seed%'");
        console.log(`   ✅ Deleted ${delLogs.rowCount} customer activity logs`);

        await client.query('COMMIT');

        // Show what remains
        const realTx = await client.query('SELECT COUNT(*) FROM transactions');
        const realParts = await client.query('SELECT COUNT(*) FROM parts');
        const realCust = await client.query('SELECT COUNT(*) FROM customers');
        const admins = await client.query('SELECT COUNT(*) FROM admins');

        console.log('\n📊 Remaining data (your real data):');
        console.log(`   Admins: ${admins.rows[0].count}`);
        console.log(`   Customers: ${realCust.rows[0].count}`);
        console.log(`   Parts: ${realParts.rows[0].count}`);
        console.log(`   Transactions: ${realTx.rows[0].count}`);
        console.log('\n✅ Dummy data cleanup complete!\n');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Cleanup failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanDummy();
