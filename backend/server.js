require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) { fs.mkdirSync(uploadsDir, { recursive: true }); }

const app = express();

// Trust proxy (required for Render, Heroku, etc. behind reverse proxy)
app.set('trust proxy', 1);

// CORS - support multiple origins including Vercel preview deployments
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,https://ampconnect.vercel.app').split(',').map(o => o.trim());
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        // Check exact match or Vercel preview URL pattern
        const isAllowed = allowedOrigins.some(allowed => {
            if (origin === allowed) return true;
            // Match Vercel preview URLs: https://project-name-xxx-user.vercel.app
            const domain = allowed.replace('https://', '').replace('.vercel.app', '');
            if (origin.includes(domain) && origin.endsWith('.vercel.app')) return true;
            return false;
        });
        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
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
app.use('/api/customer', require('./routes/customer'));
app.use('/api/parts', require('./routes/parts'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'AMPConnect API is running', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 AMPConnect API Server running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
