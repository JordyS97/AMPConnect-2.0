const pool = require('./backend/config/db');

async function checkDb() {
    try {
        console.log('Checking database...');
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables:', tables.rows.map(r => r.table_name));

        if (tables.rows.some(r => r.table_name === 'redemptions')) {
            const columns = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'redemptions'
            `);
            console.log('Redemptions columns:', columns.rows.map(r => r.column_name));
            
            const data = await pool.query('SELECT * FROM redemptions LIMIT 5');
            console.log('Redemptions sample data:', data.rows);
        } else {
            console.log('Table "redemptions" DOES NOT EXIST!');
        }
        
        const customers = await pool.query('SELECT * FROM customers LIMIT 1');
        console.log('Customer columns:', Object.keys(customers.rows[0] || {}));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkDb();
