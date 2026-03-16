/**
 * AMPConnect Database Migration Script
 * Migrates all data from Render PostgreSQL → Supabase PostgreSQL
 *
 * Usage:
 *   1. Fill in SOURCE_DB_URL (Render internal/external URL)
 *   2. Fill in TARGET_DB_URL (Supabase connection string)
 *   3. Run: node scripts/migrate_to_supabase.js
 */

require('dotenv').config();
const { Pool } = require('pg');

// ─── CONFIGURE THESE ──────────────────────────────────────────────────────────
const SOURCE_DB_URL = process.env.RENDER_DATABASE_URL || 'YOUR_RENDER_CONNECTION_STRING_HERE';
const TARGET_DB_URL = process.env.SUPABASE_DATABASE_URL || 'YOUR_SUPABASE_CONNECTION_STRING_HERE';
// ──────────────────────────────────────────────────────────────────────────────

const source = new Pool({
    connectionString: SOURCE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

const target = new Pool({
    connectionString: TARGET_DB_URL,
    ssl: { rejectUnauthorized: false }
});

// Tables in dependency order (parents before children)
const TABLES = [
    'admins',
    'customers',
    'otp_codes',
    'parts',
    'upload_history',
    'transactions',
    'transaction_items',
    'activity_logs',
];

async function migrateTable(tableName) {
    console.log(`\n📦 Migrating table: ${tableName}`);

    // Fetch all rows from source
    const { rows } = await source.query(`SELECT * FROM ${tableName} ORDER BY id`);
    if (rows.length === 0) {
        console.log(`   ⚠️  No rows found in ${tableName} — skipping.`);
        return;
    }

    console.log(`   ✅ Found ${rows.length} rows to insert.`);

    // Build INSERT statement from first row's keys
    const columns = Object.keys(rows[0]);
    const columnList = columns.map(c => `"${c}"`).join(', ');

    // Insert in batches of 500 to avoid query size limits
    const BATCH_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        // Build parameterized values
        const valuePlaceholders = batch.map((row, rowIdx) => {
            const params = columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`);
            return `(${params.join(', ')})`;
        }).join(', ');

        const values = batch.flatMap(row => columns.map(col => row[col]));

        await target.query(
            `INSERT INTO ${tableName} (${columnList}) VALUES ${valuePlaceholders} ON CONFLICT DO NOTHING`,
            values
        );

        inserted += batch.length;
        console.log(`   ↳ Inserted ${inserted}/${rows.length} rows...`);
    }

    console.log(`   ✅ Done: ${tableName}`);
}

async function resetSequences() {
    console.log('\n🔧 Resetting sequences (auto-increment IDs)...');
    for (const table of TABLES) {
        try {
            await target.query(`
                SELECT setval(
                    pg_get_serial_sequence('${table}', 'id'),
                    COALESCE((SELECT MAX(id) FROM ${table}), 1)
                )
            `);
            console.log(`   ✅ Reset sequence for ${table}`);
        } catch (err) {
            console.warn(`   ⚠️  Could not reset sequence for ${table}: ${err.message}`);
        }
    }
}

async function main() {
    console.log('🚀 AMPConnect — Database Migration: Render → Supabase');
    console.log('═══════════════════════════════════════════════════════');

    // Test connections
    try {
        await source.query('SELECT 1');
        console.log('✅ Connected to SOURCE (Render)');
    } catch (err) {
        console.error('❌ Cannot connect to SOURCE (Render):', err.message);
        process.exit(1);
    }

    try {
        await target.query('SELECT 1');
        console.log('✅ Connected to TARGET (Supabase)');
    } catch (err) {
        console.error('❌ Cannot connect to TARGET (Supabase):', err.message);
        process.exit(1);
    }

    // Temporarily disable foreign key checks via deferred constraints
    const targetClient = await target.connect();
    try {
        await targetClient.query('BEGIN');
        await targetClient.query('SET CONSTRAINTS ALL DEFERRED');
        await targetClient.query('COMMIT');
    } catch {
        // Not all Postgres setups support this — proceed anyway
    } finally {
        targetClient.release();
    }

    // Migrate each table
    for (const table of TABLES) {
        try {
            await migrateTable(table);
        } catch (err) {
            console.error(`❌ Failed to migrate ${table}:`, err.message);
        }
    }

    // Fix auto-increment sequences
    await resetSequences();

    console.log('\n\n✅ Migration complete!');
    console.log('══════════════════════════════════════════════════════');
    console.log('Next steps:');
    console.log('  1. Update RENDER env var DATABASE_URL → Supabase connection string');
    console.log('  2. Redeploy the backend on Render');
    console.log('  3. Verify the dashboard shows your data\n');

    await source.end();
    await target.end();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
