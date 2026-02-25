const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runRLS() {
    try {
        console.log('🔒 Applying Row Level Security & Triggers...');
        const rlsScript = fs.readFileSync(path.join(__dirname, 'rls_and_triggers.sql'), 'utf8');
        await pool.query(rlsScript);
        console.log('✅ RLS and Triggers applied successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to apply RLS and Triggers:', error.message);
        process.exit(1);
    }
}

runRLS();
