// Quick diagnostic for scatter chart data
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../config/db');

async function check() {
    try {
        // 1. Count rows in transaction_items
        const countRes = await pool.query('SELECT COUNT(*) FROM transaction_items');
        console.log('=== transaction_items row count:', countRes.rows[0].count);

        // 2. Check columns exist
        const colRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'transaction_items' 
            ORDER BY ordinal_position
        `);
        console.log('\n=== transaction_items columns:');
        colRes.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

        // 3. Sample 3 rows
        const sampleRes = await pool.query('SELECT * FROM transaction_items LIMIT 3');
        console.log('\n=== Sample rows:');
        sampleRes.rows.forEach((r, i) => {
            console.log(`  Row ${i + 1}:`, JSON.stringify(r, null, 2));
        });

        // 4. Check diskon values
        const diskonRes = await pool.query(`
            SELECT COUNT(*) as total, 
                   COUNT(CASE WHEN ABS(diskon) > 0 THEN 1 END) as with_diskon,
                   MIN(diskon) as min_diskon, MAX(diskon) as max_diskon,
                   MIN(subtotal) as min_subtotal, MAX(subtotal) as max_subtotal,
                   MIN(cost_price) as min_cost, MAX(cost_price) as max_cost,
                   MIN(gross_profit) as min_gp, MAX(gross_profit) as max_gp
            FROM transaction_items
        `);
        console.log('\n=== Diskon/Financial stats:', diskonRes.rows[0]);

        // 5. Try the actual scatter query
        const scatterRes = await pool.query(`
            SELECT ti.no_part, ti.nama_part, 
                   COALESCE(MAX(ti.group_material), 'Unknown') as group_material,
                   SUM(ABS(ti.diskon)) as total_discount, 
                   SUM(ti.subtotal) as total_revenue,
                   CASE WHEN SUM(ti.subtotal + ABS(ti.diskon)) > 0 THEN 
                        (SUM(ABS(ti.diskon)) / SUM(ti.subtotal + ABS(ti.diskon))) * 100 
                   ELSE 0 END as discount_percent,
                   CASE WHEN SUM(ti.subtotal) > 0 THEN
                        (SUM(COALESCE(ti.gross_profit, ti.subtotal - ti.cost_price * ti.qty)) / SUM(ti.subtotal)) * 100
                   ELSE 0 END as gp_percent
            FROM transaction_items ti
            GROUP BY ti.no_part, ti.nama_part
            HAVING SUM(ti.subtotal) > 0
            ORDER BY total_discount DESC, total_revenue DESC LIMIT 10
        `);
        console.log('\n=== Scatter query results (' + scatterRes.rows.length + ' rows):');
        scatterRes.rows.forEach((r, i) => {
            console.log(`  ${i + 1}. ${r.no_part} | ${r.nama_part} | disc=${r.discount_percent}% | gp=${r.gp_percent}%`);
        });

        // 6. Count transactions 
        const txRes = await pool.query('SELECT COUNT(*) FROM transactions');
        console.log('\n=== transactions row count:', txRes.rows[0].count);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

check();
