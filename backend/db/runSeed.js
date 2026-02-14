const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function runSeed() {
    try {
        console.log('🔧 Running database schema...');
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await pool.query(schema);
        console.log('✅ Schema created successfully');

        console.log('🌱 Running seed data...');

        // Generate proper bcrypt hashes
        const adminHash = await bcrypt.hash('admin123', 10);
        const customerHash = await bcrypt.hash('password123', 10);

        // Insert admins with proper hashes
        await pool.query(`
            INSERT INTO admins (username, email, password_hash, role, status) VALUES
            ('admin', 'admin@ampconnect.com', $1, 'super_admin', 'active'),
            ('manager', 'manager@ampconnect.com', $1, 'admin', 'active')
            ON CONFLICT DO NOTHING
        `, [adminHash]);

        // Insert customers with proper hashes
        await pool.query(`
            INSERT INTO customers (no_customer, name, email, phone, address, password_hash, total_points, tier, is_verified, status) VALUES
            ('CUST001', 'Budi Santoso', 'budi@email.com', '081234567890', 'Jl. Merdeka No. 10, Bima', $1, 150, 'Silver', true, 'active'),
            ('CUST002', 'Siti Rahayu', 'siti@email.com', '081234567891', 'Jl. Soekarno No. 25, Bima', $1, 320, 'Silver', true, 'active'),
            ('CUST003', 'Ahmad Wijaya', 'ahmad@email.com', '081234567892', 'Jl. Diponegoro No. 5, Bima', $1, 750, 'Gold', true, 'active'),
            ('CUST004', 'Dewi Lestari', 'dewi@email.com', '081234567893', 'Jl. Sudirman No. 15, Bima', $1, 1100, 'Gold', true, 'active'),
            ('CUST005', 'Rudi Hermawan', 'rudi@email.com', '081234567894', 'Jl. Kartini No. 30, Bima', $1, 2500, 'Diamond', true, 'active')
            ON CONFLICT DO NOTHING
        `, [customerHash]);

        // Run the rest of seed.sql (parts, transactions, transaction_items)
        const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
        // Extract only parts and transactions (skip admin and customer inserts)
        const partsAndTransactions = seed
            .split('\n')
            .filter(line => !line.includes('INSERT INTO admins') && !line.includes('INSERT INTO customers'))
            .join('\n');

        // Run parts insert separately
        const partsMatch = seed.match(/-- Insert 50 parts[\s\S]*?;(?=\s*\n\s*--|\s*$)/);
        if (partsMatch) {
            const partsSQL = partsMatch[0].replace(/^--.*$/gm, '').trim();
            await pool.query(partsSQL);
        }

        // Run transactions
        const transMatch = seed.match(/-- Insert 20 transactions[\s\S]*?;(?=\s*\n\s*--|\s*$)/);
        if (transMatch) {
            const transSQL = transMatch[0].replace(/^--.*$/gm, '').trim();
            await pool.query(transSQL);
        }

        // Run transaction items
        const itemsMatch = seed.match(/-- Insert transaction items[\s\S]*$/);
        if (itemsMatch) {
            const itemsSQL = itemsMatch[0].replace(/^--.*$/gm, '').trim();
            await pool.query(itemsSQL);
        }

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
