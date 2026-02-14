const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runSeed() {
    try {
        console.log('🔧 Running database schema...');
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await pool.query(schema);
        console.log('✅ Schema created successfully');

        console.log('🌱 Running seed data...');
        const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
        await pool.query(seed);
        console.log('✅ Seed data inserted successfully');

        console.log('\n📊 Database summary:');
        const admins = await pool.query('SELECT COUNT(*) FROM admins');
        const customers = await pool.query('SELECT COUNT(*) FROM customers');
        const parts = await pool.query('SELECT COUNT(*) FROM parts');
        const transactions = await pool.query('SELECT COUNT(*) FROM transactions');
        console.log(`   Admins: ${admins.rows[0].count}`);
        console.log(`   Customers: ${customers.rows[0].count}`);
        console.log(`   Parts: ${parts.rows[0].count}`);
        console.log(`   Transactions: ${transactions.rows[0].count}`);

        console.log('\n🔑 Test credentials:');
        console.log('   Admin: admin / admin123');
        console.log('   Customer: budi@email.com / password123');
        console.log('   Customer: siti@email.com / password123');
        console.log('   Customer: ahmad@email.com / password123');
        console.log('   Customer: dewi@email.com / password123');
        console.log('   Customer: rudi@email.com / password123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        process.exit(1);
    }
}

runSeed();
