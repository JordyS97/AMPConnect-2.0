const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Customer Registration
const register = async (req, res, next) => {
    try {
        const { no_customer, name, email, phone, password } = req.body;

        // Check if no_customer exists in database (must be pre-created by admin)
        const customerCheck = await pool.query('SELECT * FROM customers WHERE no_customer = $1', [no_customer]);
        if (customerCheck.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Nomor customer tidak ditemukan. Hubungi admin untuk mendaftar.' });
        }

        const existingCustomer = customerCheck.rows[0];
        if (existingCustomer.email && existingCustomer.is_verified) {
            return res.status(400).json({ success: false, message: 'Customer ini sudah terdaftar.' });
        }

        // Check email uniqueness
        const emailCheck = await pool.query('SELECT * FROM customers WHERE email = $1 AND id != $2', [email, existingCustomer.id]);
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Email sudah digunakan.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Update customer record
        await pool.query(
            `UPDATE customers SET name = $1, email = $2, phone = $3, password_hash = $4, updated_at = NOW() WHERE id = $5`,
            [name, email, phone, password_hash, existingCustomer.id]
        );

        // Generate OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await pool.query(
            'INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, $3)',
            [email, otpCode, expiresAt]
        );

        // Log activity
        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['customer', existingCustomer.id, name, 'Register', 'Customer mendaftar akun baru', req.ip]
        );

        // In dev mode, log OTP to console
        console.log(`\n📧 OTP for ${email}: ${otpCode}\n`);

        res.status(201).json({ success: true, message: 'Registrasi berhasil. Silakan verifikasi OTP.', email });
    } catch (error) {
        next(error);
    }
};

// Customer Login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Email atau password salah.' });
        }

        const customer = result.rows[0];
        if (customer.status === 'inactive') {
            return res.status(403).json({ success: false, message: 'Akun Anda telah dinonaktifkan. Hubungi admin.' });
        }

        if (!customer.is_verified) {
            return res.status(403).json({ success: false, message: 'Akun belum diverifikasi. Silakan verifikasi OTP terlebih dahulu.', needsVerification: true, email });
        }

        const validPassword = await bcrypt.compare(password, customer.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Email atau password salah.' });
        }

        const token = jwt.sign(
            { id: customer.id, email: customer.email, type: 'customer', no_customer: customer.no_customer },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Log activity
        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['customer', customer.id, customer.name, 'Login', 'Customer login berhasil', req.ip]
        );

        res.json({
            success: true,
            message: 'Login berhasil',
            token,
            user: {
                id: customer.id,
                no_customer: customer.no_customer,
                name: customer.name,
                email: customer.email,
                tier: customer.tier,
                total_points: customer.total_points,
            }
        });
    } catch (error) {
        next(error);
    }
};

// Admin Login
const adminLogin = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }

        const admin = result.rows[0];
        if (admin.status === 'inactive') {
            return res.status(403).json({ success: false, message: 'Akun admin dinonaktifkan.' });
        }

        const validPassword = await bcrypt.compare(password, admin.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }

        // Update last login
        await pool.query('UPDATE admins SET last_login = NOW() WHERE id = $1', [admin.id]);

        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role, type: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Log activity
        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin', admin.id, admin.username, 'Login', 'Admin login berhasil', req.ip]
        );

        res.json({
            success: true,
            message: 'Login berhasil',
            token,
            user: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
            }
        });
    } catch (error) {
        next(error);
    }
};

// Verify OTP
const verifyOTP = async (req, res, next) => {
    try {
        const { email, code } = req.body;

        const result = await pool.query(
            `SELECT * FROM otp_codes WHERE email = $1 AND code = $2 AND used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
            [email, code]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Kode OTP tidak valid atau sudah kedaluwarsa.' });
        }

        // Mark OTP as used
        await pool.query('UPDATE otp_codes SET used = true WHERE id = $1', [result.rows[0].id]);

        // Verify customer
        await pool.query('UPDATE customers SET is_verified = true, updated_at = NOW() WHERE email = $1', [email]);

        const customer = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);

        const token = jwt.sign(
            { id: customer.rows[0].id, email, type: 'customer', no_customer: customer.rows[0].no_customer },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Log activity
        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['customer', customer.rows[0].id, customer.rows[0].name, 'Verify OTP', 'Verifikasi OTP berhasil', req.ip]
        );

        res.json({
            success: true,
            message: 'Verifikasi berhasil! Selamat datang di AMPConnect.',
            token,
            user: {
                id: customer.rows[0].id,
                no_customer: customer.rows[0].no_customer,
                name: customer.rows[0].name,
                email: customer.rows[0].email,
                tier: customer.rows[0].tier,
                total_points: customer.rows[0].total_points,
            }
        });
    } catch (error) {
        next(error);
    }
};

// Resend OTP
const resendOTP = async (req, res, next) => {
    try {
        const { email } = req.body;

        const customer = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
        if (customer.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Email tidak ditemukan.' });
        }

        if (customer.rows[0].is_verified) {
            return res.status(400).json({ success: false, message: 'Akun sudah diverifikasi.' });
        }

        // Invalidate old OTPs
        await pool.query('UPDATE otp_codes SET used = true WHERE email = $1 AND used = false', [email]);

        // Generate new OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await pool.query(
            'INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, $3)',
            [email, otpCode, expiresAt]
        );

        console.log(`\n📧 OTP for ${email}: ${otpCode}\n`);

        res.json({ success: true, message: 'Kode OTP baru telah dikirim.' });
    } catch (error) {
        next(error);
    }
};

module.exports = { register, login, adminLogin, verifyOTP, resendOTP };
