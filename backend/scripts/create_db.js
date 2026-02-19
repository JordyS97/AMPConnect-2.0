const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // Connect to default DB first
    password: 'admin123',
    port: 5432,
});

const createDB = async () => {
    try {
        await client.connect();
        console.log('Connected to default postgres DB.');

        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'ampconnect'");
        if (res.rowCount === 0) {
            console.log("Database 'ampconnect' not found. Creating...");
            await client.query('CREATE DATABASE ampconnect');
            console.log("✅ Database 'ampconnect' created successfully.");
        } else {
            console.log("ℹ️ Database 'ampconnect' already exists.");
        }
    } catch (err) {
        console.error('❌ Error creating DB:', err);
    } finally {
        await client.end();
    }
};

createDB();
