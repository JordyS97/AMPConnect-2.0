require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const helmet = require('helmet');

// Ensure uploads directory exists (skip on Vercel - read-only filesystem)
if (!process.env.VERCEL) {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) { fs.mkdirSync(uploadsDir, { recursive: true }); }
}

const app = express();

// Trust proxy (required for Render, Heroku, etc. behind reverse proxy)
app.set('trust proxy', 1);

// Security Headers & Hide Tech Stack
app.use(helmet());
app.disable('x-powered-by');

// CORS - Strict Production Configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://ampconnect.vercel.app',
    credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
// app.use('/api/users', require('./routes/users')); // Removed: Module does not exist
app.use('/api/customer', require('./routes/customer'));
app.use('/api/parts', require('./routes/parts'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/dashboard', require('./routes/dashboard')); // New Dashboard Route

// Public: QRIS image (served from DB, no auth required)
app.get('/api/settings/qr', require('./controllers/adminController').getSettingsQR);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'AMPConnect API is running', timestamp: new Date().toISOString() });
});

// Temporary debug endpoint - shows real DB errors
app.get('/api/debug', async (req, res) => {
    try {
        const pool = require('./config/db');
        const result = await pool.query('SELECT NOW() as time, current_database() as db, version() as pg_version');
        res.json({ success: true, db: result.rows[0], env: { hasDbUrl: !!process.env.DATABASE_URL, nodeEnv: process.env.NODE_ENV, hasJwtSecret: !!process.env.JWT_SECRET } });
    } catch (err) {
        res.json({ success: false, error: err.message, code: err.code, dbUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@') : 'NOT SET' });
    }
});


// Error handler
app.use(errorHandler);

const applyIndices = require('./utils/dbOptimizer');

const PORT = process.env.PORT || 5000;

// In Vercel serverless, we just export the app.
// Locally (or on Render), we start the HTTP server.
if (!process.env.VERCEL) {
    const startServer = async () => {
        await applyIndices();
        app.listen(PORT, () => {
            console.log(`\n🚀 AMPConnect API Server running on port ${PORT}`);
            console.log(`📍 http://localhost:${PORT}/api/health\n`);
        });
    };
    startServer();
}

module.exports = app;
