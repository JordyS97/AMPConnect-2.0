const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parseExcelFile, validateSalesColumns, validateStockColumns, createSalesTemplate, createStockTemplate, normalizeSalesRow } = require('../utils/excelParser');

const { calculatePoints, determineTier } = require('../utils/pointsCalculator');
const XLSX = require('xlsx');

// Get inventory analytics
const getInventoryAnalytics = async (req, res, next) => {
    try {
        const today = new Date();
        const sixtyDaysAgo = new Date(today);
        sixtyDaysAgo.setDate(today.getDate() - 60);
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(today.getDate() - 90);

        // 1. Best Performers (Top 20)
        const bestRevenue = await pool.query(`
            SELECT ti.no_part, ti.nama_part, SUM(ti.subtotal) as total_value, SUM(ti.qty) as total_qty
            FROM transaction_items ti JOIN transactions t ON ti.transaction_id = t.id
            GROUP BY ti.no_part, ti.nama_part ORDER BY total_value DESC LIMIT 20`);

        const bestQty = await pool.query(`
            SELECT ti.no_part, ti.nama_part, SUM(ti.qty) as total_value, SUM(ti.subtotal) as revenue
            FROM transaction_items ti JOIN transactions t ON ti.transaction_id = t.id
            GROUP BY ti.no_part, ti.nama_part ORDER BY total_value DESC LIMIT 20`);

        // Using p.amount / p.qty as Unit Cost (assuming amount is Total Value)
        // Refactored to use Aggregated Totals: (Total Sales - Total Cost) / Total Sales
        // Total Cost = Sum(Sold Qty * Unit Cost)
        const bestGPPercent = await pool.query(`
            SELECT ti.no_part, ti.nama_part, 
                   (SUM(ti.subtotal) - SUM(ti.qty * (COALESCE(p.amount, 0) / NULLIF(p.qty, 0)))) as total_profit,
                   SUM(ti.subtotal) as total_revenue,
                   CASE WHEN SUM(ti.subtotal) > 0 THEN 
                        ((SUM(ti.subtotal) - SUM(ti.qty * (COALESCE(p.amount, 0) / NULLIF(p.qty, 0)))) / SUM(ti.subtotal)) * 100 
                   ELSE 0 END as avg_gp
            FROM transaction_items ti 
            JOIN transactions t ON ti.transaction_id = t.id
            JOIN parts p ON ti.no_part = p.no_part
            WHERE ti.price > 0 AND p.qty > 0
            GROUP BY ti.no_part, ti.nama_part 
            HAVING COUNT(ti.id) > 5 
            ORDER BY avg_gp DESC LIMIT 20`);

        // 2. Worst Performers
        const worstGPPercent = await pool.query(`
            SELECT ti.no_part, ti.nama_part, 
                   (SUM(ti.subtotal) - SUM(ti.qty * (COALESCE(p.amount, 0) / NULLIF(p.qty, 0)))) as total_profit,
                   SUM(ti.subtotal) as total_revenue,
                   CASE WHEN SUM(ti.subtotal) > 0 THEN 
                        ((SUM(ti.subtotal) - SUM(ti.qty * (COALESCE(p.amount, 0) / NULLIF(p.qty, 0)))) / SUM(ti.subtotal)) * 100 
                   ELSE 0 END as avg_gp
            FROM transaction_items ti 
            JOIN transactions t ON ti.transaction_id = t.id
            JOIN parts p ON ti.no_part = p.no_part
            WHERE ti.price > 0 AND p.qty > 0
            GROUP BY ti.no_part, ti.nama_part 
            HAVING COUNT(ti.id) > 5
            ORDER BY avg_gp ASC LIMIT 20`);

        const negativeGP = await pool.query(`
             SELECT ti.no_part, ti.nama_part, 
                    (SUM(ti.subtotal) - SUM(ti.qty * (COALESCE(p.amount, 0) / NULLIF(p.qty, 0)))) as total_profit,
                    SUM(ti.subtotal) as total_revenue,
                    CASE WHEN SUM(ti.subtotal) > 0 THEN 
                         ((SUM(ti.subtotal) - SUM(ti.qty * (COALESCE(p.amount, 0) / NULLIF(p.qty, 0)))) / SUM(ti.subtotal)) * 100 
                    ELSE 0 END as avg_gp
            FROM transaction_items ti 
            JOIN transactions t ON ti.transaction_id = t.id
            JOIN parts p ON ti.no_part = p.no_part
            WHERE ti.price > 0 AND p.qty > 0 
            GROUP BY ti.no_part, ti.nama_part 
            HAVING (SUM(ti.subtotal) - SUM(ti.qty * (COALESCE(p.amount, 0) / NULLIF(p.qty, 0)))) < 0
            LIMIT 50`);

        // 3. Inventory Health
        // 3. Inventory Health
        // Slow Moving: Stock > 0, No Sale in last 60 days
        const slowMoving = await pool.query(`
            SELECT p.no_part, p.nama_part, p.qty, MAX(t.tanggal) as last_sale
            FROM parts p
            LEFT JOIN transaction_items ti ON p.no_part = ti.no_part
            LEFT JOIN transactions t ON ti.transaction_id = t.id
            WHERE p.qty > 0
            GROUP BY p.no_part, p.nama_part, p.qty
            HAVING MAX(t.tanggal) < $1 OR MAX(t.tanggal) IS NULL
            ORDER BY last_sale ASC NULLS FIRST
            LIMIT 50
        `, [sixtyDaysAgo]);

        const deadStock = await pool.query(`
            SELECT p.no_part, p.nama_part, p.qty, MAX(t.tanggal) as last_sale
            FROM parts p
            LEFT JOIN transaction_items ti ON p.no_part = ti.no_part
            LEFT JOIN transactions t ON ti.transaction_id = t.id
            WHERE p.qty > 0
            GROUP BY p.no_part, p.nama_part, p.qty
            HAVING MAX(t.tanggal) < $1 OR MAX(t.tanggal) IS NULL
            ORDER BY last_sale ASC NULLS FIRST
            LIMIT 50
        `, [ninetyDaysAgo]);

        // 4. Category Analysis (Revenue)
        const byGroupPart = await pool.query(`
            SELECT COALESCE(p.group_tobpm, 'Lainnya') as category, SUM(ti.subtotal) as revenue
            FROM transaction_items ti
            JOIN parts p ON ti.no_part = p.no_part
            JOIN transactions t ON ti.transaction_id = t.id
            GROUP BY p.group_tobpm ORDER BY revenue DESC`);

        // 5. Cross Sell (Pairs)
        const crossSell = await pool.query(`
            WITH recent_trans AS (SELECT id FROM transactions ORDER BY tanggal DESC LIMIT 500)
            SELECT t1.no_part as part_a, t1.nama_part as name_a, 
                   t2.no_part as part_b, t2.nama_part as name_b, 
                   COUNT(*) as frequency
            FROM transaction_items t1
            JOIN transaction_items t2 ON t1.transaction_id = t2.transaction_id
            WHERE t1.transaction_id IN (SELECT id FROM recent_trans)
            AND t1.no_part < t2.no_part
            GROUP BY t1.no_part, t1.nama_part, t2.no_part, t2.nama_part
            ORDER BY frequency DESC
            LIMIT 10`);

        // 6. Top Discounted Items
        const topDiscounted = await pool.query(`
             SELECT ti.no_part, ti.nama_part, SUM(ABS(ti.diskon)) as total_discount
             FROM transaction_items ti
             WHERE ABS(ti.diskon) > 0
             GROUP BY ti.no_part, ti.nama_part
             ORDER BY total_discount DESC LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                best: {
                    revenue: bestRevenue.rows.map(r => ({ ...r, total_value: parseFloat(r.total_value) })),
                    qty: bestQty.rows.map(r => ({ ...r, total_value: parseInt(r.total_value) })),
                    gp_percent: bestGPPercent.rows.map(r => ({ ...r, avg_gp: parseFloat(r.avg_gp) }))
                },
                worst: {
                    gp_percent: worstGPPercent.rows.map(r => ({ ...r, avg_gp: parseFloat(r.avg_gp) })),
                    negative_gp: negativeGP.rows.map(r => ({ ...r, avg_gp: parseFloat(r.avg_gp) }))
                },
                health: {
                    slow_moving: slowMoving.rows,
                    dead_stock: deadStock.rows
                },
                category: {
                    group_part: byGroupPart.rows.map(r => ({ ...r, revenue: parseFloat(r.revenue) }))
                },
                cross_sell: crossSell.rows,
                top_discounted: topDiscounted.rows.map(r => ({ ...r, total_discount: parseFloat(r.total_discount) }))
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get admin dashboard data
const getDashboard = async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // This Month's stats
        const todaySales = await pool.query(
            `SELECT COALESCE(SUM(net_sales), 0) as total_sales, COUNT(*) as transactions,
       COALESCE(SUM(gross_profit), 0) as gross_profit, 
       CASE WHEN SUM(net_sales) > 0 THEN (SUM(gross_profit) / SUM(net_sales)) * 100 ELSE 0 END as avg_gp
       FROM transactions 
       WHERE EXTRACT(MONTH FROM tanggal) = EXTRACT(MONTH FROM NOW())
       AND EXTRACT(YEAR FROM tanggal) = EXTRACT(YEAR FROM NOW())`
        );

        // Sales trend last 30 days
        const salesTrend = await pool.query(
            `SELECT tanggal::text as date, SUM(net_sales) as total
       FROM transactions WHERE tanggal >= NOW() - INTERVAL '30 days'
       GROUP BY tanggal ORDER BY tanggal`
        );

        // Sales by group TOBPM (current month)
        // Using Net Sales (Subtotal - Discount)
        const salesByGroup = await pool.query(
            `SELECT COALESCE(p.group_tobpm, 'Lainnya') as group_name, 
                    SUM(ti.subtotal - COALESCE(ti.diskon, 0)) as total
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       LEFT JOIN parts p ON ti.no_part = p.no_part
       WHERE EXTRACT(MONTH FROM t.tanggal) = EXTRACT(MONTH FROM NOW())
       AND EXTRACT(YEAR FROM t.tanggal) = EXTRACT(YEAR FROM NOW())
       GROUP BY p.group_tobpm ORDER BY total DESC`
        );

        // Top 10 best selling parts (revenue) (current month)
        const topParts = await pool.query(
            `SELECT ti.no_part, ti.nama_part, SUM(ti.subtotal) as total_value
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       WHERE EXTRACT(MONTH FROM t.tanggal) = EXTRACT(MONTH FROM NOW())
       AND EXTRACT(YEAR FROM t.tanggal) = EXTRACT(YEAR FROM NOW())
       GROUP BY ti.no_part, ti.nama_part ORDER BY total_value DESC LIMIT 10`
        );

        // Monthly comparison (this month vs last month)
        const monthlyComparison = await pool.query(
            `SELECT 
        COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM tanggal) = EXTRACT(MONTH FROM NOW()) 
          AND EXTRACT(YEAR FROM tanggal) = EXTRACT(YEAR FROM NOW()) THEN net_sales END), 0) as this_month,
        COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM tanggal) = EXTRACT(MONTH FROM NOW() - INTERVAL '1 month') 
          AND EXTRACT(YEAR FROM tanggal) = EXTRACT(YEAR FROM NOW() - INTERVAL '1 month') THEN net_sales END), 0) as last_month
       FROM transactions`
        );

        // Alerts
        const lowStock = await pool.query('SELECT COUNT(*) FROM parts WHERE qty > 0 AND qty <= 20');
        const outOfStock = await pool.query('SELECT COUNT(*) FROM parts WHERE qty = 0');
        const newCustomers = await pool.query(`SELECT COUNT(*) FROM customers WHERE DATE(created_at) = $1`, [today]);
        const pendingUploads = await pool.query(`SELECT COUNT(*) FROM upload_history WHERE status = 'processing'`);

        res.json({
            success: true,
            data: {
                todayStats: {
                    total_sales: parseFloat(todaySales.rows[0].total_sales),
                    transactions: parseInt(todaySales.rows[0].transactions),
                    gross_profit: parseFloat(todaySales.rows[0].gross_profit),
                    avg_gp: parseFloat(todaySales.rows[0].avg_gp),
                },
                salesTrend: salesTrend.rows,
                salesByGroup: salesByGroup.rows.map(r => ({ ...r, total: parseFloat(r.total) })),
                topParts: topParts.rows.map(r => ({ ...r, total_value: parseFloat(r.total_value) })),
                monthlyComparison: monthlyComparison.rows[0],
                alerts: {
                    low_stock: parseInt(lowStock.rows[0].count),
                    out_of_stock: parseInt(outOfStock.rows[0].count),
                    new_customers: parseInt(newCustomers.rows[0].count),
                    pending_uploads: parseInt(pendingUploads.rows[0].count),
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get sales analytics
const getSales = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, startDate, endDate, customer, group_material, tipe_faktur } = req.query;
        const offset = (page - 1) * limit;

        let query = `SELECT t.*, c.name as customer_name FROM transactions t LEFT JOIN customers c ON t.customer_id = c.id WHERE 1=1`;
        const params = [];
        let paramIndex = 1;

        if (startDate) { query += ` AND t.tanggal >= $${paramIndex}`; params.push(startDate); paramIndex++; }
        if (endDate) { query += ` AND t.tanggal <= $${paramIndex}`; params.push(endDate); paramIndex++; }
        if (customer) {
            query += ` AND (c.name ILIKE $${paramIndex} OR t.no_customer ILIKE $${paramIndex})`;
            params.push(`%${customer}%`); paramIndex++;
        }
        if (tipe_faktur) { query += ` AND t.tipe_faktur = $${paramIndex}`; params.push(tipe_faktur); paramIndex++; }

        // Summary stats
        const summaryQuery = query.replace('SELECT t.*, c.name as customer_name',
            `SELECT COALESCE(SUM(t.total_faktur), 0) as total_sales, COUNT(*) as total_transactions,
       COALESCE(SUM(t.diskon), 0) as total_discount, COALESCE(SUM(t.net_sales), 0) as net_sales,
       COALESCE(SUM(t.gross_profit), 0) as gross_profit,
       COALESCE(AVG(t.gp_percent), 0) as avg_gp`);
        const summary = await pool.query(summaryQuery, params);

        // Count
        const countQuery = query.replace('SELECT t.*, c.name as customer_name', 'SELECT COUNT(*)');
        const countResult = await pool.query(countQuery, params);

        query += ` ORDER BY t.tanggal DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: {
                summary: summary.rows[0],
                transactions: result.rows,
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                totalPages: Math.ceil(countResult.rows[0].count / limit),
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get transaction detail
const getSaleDetail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const transaction = await pool.query(
            `SELECT t.*, c.name as customer_name FROM transactions t LEFT JOIN customers c ON t.customer_id = c.id WHERE t.id = $1`, [id]
        );

        if (transaction.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
        }

        const items = await pool.query('SELECT * FROM transaction_items WHERE transaction_id = $1', [id]);

        res.json({
            success: true,
            data: { ...transaction.rows[0], items: items.rows }
        });
    } catch (error) {
        next(error);
    }
};

// Get stock list
const getStock = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, search, group_part, group_material, stock_status, sort = 'no_part_asc' } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM parts WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (search) {
            query += ` AND (LOWER(nama_part) LIKE LOWER($${paramIndex}) OR LOWER(no_part) LIKE LOWER($${paramIndex}))`;
            params.push(`%${search}%`); paramIndex++;
        }
        if (group_part && group_part !== 'All') {
            query += ` AND group_part = $${paramIndex}`; params.push(group_part); paramIndex++;
        }
        if (group_material && group_material !== 'All') {
            query += ` AND group_material = $${paramIndex}`; params.push(group_material); paramIndex++;
        }
        if (stock_status === 'in_stock') { query += ' AND qty > 20'; }
        else if (stock_status === 'low_stock') { query += ' AND qty > 0 AND qty <= 20'; }
        else if (stock_status === 'out_of_stock') { query += ' AND qty = 0'; }

        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
        const countResult = await pool.query(countQuery, params);

        // Overview stats using same filters
        const overviewQuery = query.replace('SELECT *',
            `SELECT COALESCE(SUM(amount * qty), 0) as total_value, COUNT(*) as total_parts,
       SUM(CASE WHEN qty > 0 AND qty <= 20 THEN 1 ELSE 0 END) as low_stock,
       SUM(CASE WHEN qty = 0 THEN 1 ELSE 0 END) as out_of_stock`);
        const overview = await pool.query(overviewQuery, params);

        const sortMap = {
            'no_part_asc': 'no_part ASC', 'nama_part_asc': 'nama_part ASC',
            'qty_high': 'qty DESC', 'qty_low': 'qty ASC', 'amount_high': 'amount DESC',
        };
        query += ` ORDER BY ${sortMap[sort] || 'no_part ASC'}`;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: {
                overview: overview.rows[0],
                parts: result.rows,
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                totalPages: Math.ceil(countResult.rows[0].count / limit),
            }
        });
    } catch (error) {
        next(error);
    }
};

// Manual stock adjust
const adjustStock = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { qty } = req.body;

        await pool.query('UPDATE parts SET qty = $1, last_updated = NOW() WHERE id = $2', [qty, id]);

        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin', req.user.id, req.user.username, 'Stock Adjust', `Stok part ID ${id} diubah ke ${qty}`, req.ip]
        );

        res.json({ success: true, message: 'Stok berhasil diperbarui.' });
    } catch (error) {
        next(error);
    }
};

// Upload sales data (batch optimized)
const uploadSales = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File tidak ditemukan.' });
        }

        const filePath = req.file.path;
        let data;
        try {
            data = parseExcelFile(filePath);
        } catch (e) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ success: false, message: 'File tidak dapat dibaca. Pastikan format .xlsx atau .csv.' });
        }

        const validation = validateSalesColumns(data);
        if (!validation.valid) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ success: false, message: `Kolom wajib tidak ditemukan: ${validation.missing.join(', ')}` });
        }

        // Guarantee Schema (because lazy migration might not have run)
        try {
            await pool.query('ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS diskon DECIMAL(15,2) DEFAULT 0');
            await pool.query('ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(20,2) DEFAULT 0');
        } catch (e) {
            console.error('Schema migration error (safe to ignore if columns exist):', e);
        }

        // Create upload history record
        const upload = await pool.query(
            `INSERT INTO upload_history (admin_id, admin_username, file_type, file_name, rows_processed, status) 
       VALUES ($1, $2, 'sales', $3, $4, 'processing') RETURNING id`,
            [req.user.id, req.user.username, req.file.originalname, data.length]
        );
        const uploadId = upload.rows[0].id;

        // 1. Extract and Upsert Customers (Renew IDs/Names)
        const customerUpserts = new Map(); // Use Map to get unique no_customer

        for (const raw of data) {
            const row = normalizeSalesRow(raw);
            const noCustomer = String(row.no_customer || '').trim();
            const customerName = String(row.customer_name || row.nama_customer || '').trim();

            if (noCustomer) {
                if (!customerUpserts.has(noCustomer) || (customerName && !customerUpserts.get(noCustomer))) {
                    customerUpserts.set(noCustomer, customerName || `Customer ${noCustomer}`);
                }
            }
        }

        if (customerUpserts.size > 0) {
            const customerValues = [];
            const customerPlaceholders = [];
            let cState = 1;

            for (const [noCust, name] of customerUpserts) {
                customerPlaceholders.push(`($${cState}, $${cState + 1})`);
                customerValues.push(noCust, name);
                cState += 2;
            }

            const CUST_BATCH_SIZE = 500;
            for (let i = 0; i < customerPlaceholders.length; i += CUST_BATCH_SIZE) {
                const chunkPlaceholders = customerPlaceholders.slice(i, i + CUST_BATCH_SIZE);
                const chunkValues = customerValues.slice(i * 2, (i + CUST_BATCH_SIZE) * 2);

                await pool.query(
                    `INSERT INTO customers (no_customer, name) VALUES ${chunkPlaceholders.join(', ')}
                     ON CONFLICT (no_customer) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
                    chunkValues
                );
            }
        }

        // 2. Pre-cache all customers
        const allCustomers = await pool.query('SELECT id, no_customer FROM customers');
        const customerMap = {};
        allCustomers.rows.forEach(c => { customerMap[c.no_customer] = c.id; });

        // 3. Group Rows by No Faktur
        const invoiceGroups = {};
        const parseNum = (v) => {
            if (typeof v === 'number') return v;
            if (!v) return 0;

            let s = String(v).trim();

            // Handle (123) as negative
            const isNegative = s.includes('(') && s.includes(')') || s.startsWith('-');

            // Remove everything except digits and dots (assuming dot is decimal)
            // If comma is used as decimal, this logic needs adjustment. 
            // Based on previous code "1,292... -> replace comma", we assume comma = thousand, dot = decimal.
            s = s.replace(/[^0-9.]/g, '');

            let val = parseFloat(s) || 0;
            if (isNegative) val = -Math.abs(val);
            return val;
        };

        for (let i = 0; i < data.length; i++) {
            const row = normalizeSalesRow(data[i]);
            const noFaktur = row.no_faktur;
            if (!noFaktur) continue;

            if (!invoiceGroups[noFaktur]) {
                invoiceGroups[noFaktur] = [];
            }
            invoiceGroups[noFaktur].push({ ...row, _origRow: i + 2 });
        }

        let successCount = 0;
        let failedCount = 0;
        const errors = [];
        const affectedCustomerIds = new Set();

        // 4. Process Each Invoice
        const invoices = Object.keys(invoiceGroups);

        // Pre-fetch part costs (Unit Cost = amount / qty)
        const partCosts = {};
        const partsRes = await pool.query('SELECT no_part, amount, qty FROM parts');
        partsRes.rows.forEach(p => {
            const qty = parseFloat(p.qty) || 0;
            const amount = parseFloat(p.amount) || 0;
            partCosts[p.no_part] = qty > 0 ? amount / qty : 0;
        });

        // Ensure columns exist (Lazy Migration) - run ONCE before loop
        try {
            await pool.query('ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS diskon DECIMAL(15,2) DEFAULT 0');
            await pool.query('ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(20,2) DEFAULT 0');
            await pool.query('ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS group_material VARCHAR(100)');
        } catch (dbErr) {
            console.error('Auto-migration failed:', dbErr.message);
        }
        // Helper: Convert Excel serial date or text to ISO date string
        const parseDate = (v) => {
            if (!v) return null;
            // If it's already a Date object
            if (v instanceof Date) return v.toISOString().split('T')[0];
            const s = String(v).trim();
            if (!s) return null;
            // Excel serial number (pure digits, typically 5 digits for modern dates)
            if (/^\d{4,6}$/.test(s)) {
                const serial = parseInt(s);
                // Excel epoch: Jan 1, 1900 = serial 1 (with the off-by-one bug for Feb 29, 1900)
                const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
                const date = new Date(excelEpoch.getTime() + serial * 86400000);
                return date.toISOString().split('T')[0];
            }
            // Try parsing as regular date string
            const parsed = new Date(s);
            if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
            return null;
        };

        // Process invoices in PARALLEL batches of 50 for speed
        const BATCH_SIZE = 50;
        for (let bStart = 0; bStart < invoices.length; bStart += BATCH_SIZE) {
            const batch = invoices.slice(bStart, bStart + BATCH_SIZE);
            await Promise.all(batch.map(async (noFaktur) => {
                const items = invoiceGroups[noFaktur];
                const header = items[0];
                try {
                    const tanggal = parseDate(header.tanggal);
                    const noCustomer = header.no_customer || '';
                    const tipeFaktur = header.tipe_faktur || 'Regular';
                    let totalFaktur = 0, diskon = 0, netSales = 0, grossProfit = 0;
                    for (const item of items) {
                        const tf = parseNum(item.total_faktur);
                        const ppn = parseNum(item.ppn);
                        const hp = parseNum(item.harga_pokok);
                        totalFaktur += tf;
                        diskon += Math.abs(parseNum(item.diskon));
                        // Net Sales = Total Faktur - PPN (use Excel value if available)
                        const ns = parseNum(item.net_sales) || (tf - ppn);
                        netSales += ns;
                        // Gross Profit = Total Faktur - PPN - Harga Pokok (use Excel value if available)
                        const gp = parseNum(item.gross_profit) || (tf - ppn - hp);
                        grossProfit += gp;
                    }
                    const customerId = customerMap[noCustomer] || null;
                    if (customerId) affectedCustomerIds.add(customerId);
                    const gpPercent = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
                    const pointsEarned = Math.floor(netSales / 10000);
                    const txRes = await pool.query(
                        `INSERT INTO transactions (no_faktur, tanggal, customer_id, no_customer, tipe_faktur, total_faktur, diskon, net_sales, gp_percent, gross_profit, points_earned)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                         ON CONFLICT (no_faktur) DO UPDATE SET tanggal=EXCLUDED.tanggal, customer_id=EXCLUDED.customer_id, tipe_faktur=EXCLUDED.tipe_faktur,
                         total_faktur=EXCLUDED.total_faktur, diskon=EXCLUDED.diskon, net_sales=EXCLUDED.net_sales,
                         gp_percent=EXCLUDED.gp_percent, gross_profit=EXCLUDED.gross_profit, points_earned=EXCLUDED.points_earned
                         RETURNING id`,
                        [noFaktur, tanggal, customerId, noCustomer, tipeFaktur, totalFaktur, diskon, netSales, gpPercent, grossProfit, pointsEarned]
                    );
                    const transactionId = txRes.rows[0].id;
                    await pool.query('DELETE FROM transaction_items WHERE transaction_id = $1', [transactionId]);
                    const iv = [], ip = [];
                    let pi = 1;
                    for (const item of items) {
                        const tf = parseNum(item.total_faktur);
                        const ppn = parseNum(item.ppn);
                        const hp = parseNum(item.harga_pokok);
                        const q = parseNum(item.qty);
                        const np = String(item.no_part || '').trim();
                        const sales = parseNum(item.sales);
                        const gm = item.group_material || item.group_tobpm || item.group_part || '';
                        const ns = parseNum(item.net_sales) || (tf - ppn);
                        const gp = parseNum(item.gross_profit) || (tf - ppn - hp);
                        ip.push(`($${pi},$${pi + 1},$${pi + 2},$${pi + 3},$${pi + 4},$${pi + 5},$${pi + 6},$${pi + 7},$${pi + 8},$${pi + 9})`);
                        iv.push(transactionId, np, item.nama_part || '', q, sales, ns, Math.abs(parseNum(item.diskon)), hp, gp, gm);
                        pi += 10;
                    }
                    if (ip.length > 0) {
                        await pool.query(
                            `INSERT INTO transaction_items (transaction_id,no_part,nama_part,qty,price,subtotal,diskon,cost_price,gross_profit,group_material) VALUES ${ip.join(',')}`,
                            iv
                        );
                    }
                    successCount++;
                } catch (err) {
                    failedCount++;
                    errors.push(`Faktur ${noFaktur}: ${err.message}`);
                }
            }));
        }
        // ... (rest of function)

        // Fix Database Schema & Debug
        const fixDatabase = async (req, res) => {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // 1. Ensure Columns Exist
                await client.query('ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS diskon DECIMAL(15,2) DEFAULT 0');
                await client.query('ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(20,2) DEFAULT 0');
                await client.query('ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS group_material VARCHAR(100)');

                // ... (rest of fixDatabase)


                const transactionId = txRes.rows[0].id;

                // Delete existing items for this transaction (overwrite strategy)
                await pool.query('DELETE FROM transaction_items WHERE transaction_id = $1', [transactionId]);

                // Insert Items
                if (items.length > 0) {
                    const itemValues = [];
                    const itemPlaceholders = [];
                    let idx = 1;

                    for (const item of items) {
                        const noPart = item.no_part || '';
                        const namaPart = item.nama_part || '';
                        const qty = parseNum(item.qty);

                        // DEBUG: Trace Diskon Parsing
                        const rawDiskon = item.diskon;
                        const parsedDiskon = Math.abs(parseNum(item.diskon));
                        if (parsedDiskon > 0 && idx === 1) { // Log first item of invoice if discount exists
                            console.log(`[Upload] Invoice ${noFaktur}, Part ${noPart}, RawDiskon: '${rawDiskon}', Parsed: ${parsedDiskon}`);
                        }

                        // FIX: Use Calculated Net Sales for Subtotal consistency
                        // const subtotal = parseNum(item.sales); 
                        const itemTotalFaktur = parseNum(item.total_faktur);
                        const subtotal = itemTotalFaktur / 1.11;

                        const price = qty > 0 ? subtotal / qty : 0;

                        // UNIT COST LOGIC
                        // Priority: 1. CSV Harga Pokok (converted to Unit Cost), 2. Master Part Cost, 3. CSV Gross Profit (Derived)
                        let unitCost = 0;
                        let itemGrossProfit = 0;

                        const hargaPokokCSV = parseNum(item.harga_pokok);
                        const masterCost = partCosts[item.no_part] || 0;

                        if (hargaPokokCSV > 0) {
                            // CSV Harga Pokok is Total Cost for the line
                            unitCost = qty > 0 ? hargaPokokCSV / qty : 0;
                            itemGrossProfit = subtotal - hargaPokokCSV;
                        } else if (masterCost > 0) {
                            unitCost = masterCost;
                            itemGrossProfit = subtotal - (qty * unitCost);
                        } else {
                            // Fallback: Use CSV Gross Profit to derive cost
                            // GP = Sales - Cost => Cost = Sales - GP
                            const csvGP = parseNum(item.gross_profit);
                            const derivedTotalCost = subtotal - csvGP;
                            unitCost = qty > 0 ? derivedTotalCost / qty : 0;
                            itemGrossProfit = csvGP; // Use reported GP directly if no cost info
                        }

                        // Ensure non-negative cost if logic fails? No, allow it, but maybe warn.
                        if (unitCost < 0) unitCost = 0;

                        itemPlaceholders.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7})`);
                        itemValues.push(transactionId, noPart, namaPart, qty, price, subtotal, Math.abs(parseNum(item.diskon)), unitCost);
                        idx += 8;
                    }

                    // Batch insert items
                    if (itemValues.length > 0) {
                        const itemQuery = `
                            INSERT INTO transaction_items (transaction_id, no_part, nama_part, qty, price, subtotal, diskon, cost_price)
                            VALUES ${itemPlaceholders.join(', ')}
                        `;
                        await pool.query(itemQuery, itemValues);
                    }
                }

                successCount += items.length; // Count processed rows, not invoices
            } catch (err) {
                failedCount += items.length;
                errors.push({ row: `${items[0]._origRow}-${items[items.length - 1]._origRow}`, error: `Invoice ${noFaktur}: ${err.message}` });
            }
        }

        // 5. Update customer points
        for (const customerId of affectedCustomerIds) {
            try {
                const totalPoints = await pool.query(
                    'SELECT COALESCE(SUM(points_earned), 0) as total FROM transactions WHERE customer_id = $1', [customerId]
                );
                const newTotalPoints = parseInt(totalPoints.rows[0].total);
                const newTier = determineTier(newTotalPoints);
                await pool.query(
                    'UPDATE customers SET total_points = $1, tier = $2, updated_at = NOW() WHERE id = $3',
                    [newTotalPoints, newTier, customerId]
                );
            } catch (err) { /* ignore tier update errors */ }
        }

        // Update upload history
        await pool.query(
            `UPDATE upload_history SET success_count = $1, failed_count = $2, status = $3, error_log = $4 WHERE id = $5`,
            [successCount, failedCount, failedCount > 0 && successCount === 0 ? 'failed' : 'completed', JSON.stringify(errors.slice(0, 50)), uploadId]
        );

        // Log activity
        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin', req.user.id, req.user.username, 'Upload Sales', `Upload data penjualan: ${successCount} baris berhasil, ${failedCount} gagal`, req.ip]
        );

        // Clean up
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            message: failedCount > 0
                ? `Proses selesai dengan error. ${successCount} berhasil, ${failedCount} gagal. Contoh Error: ${typeof errors[0] === 'string' ? errors[0] : (errors[0]?.error || JSON.stringify(errors[0]))}`
                : `Data penjualan berhasil diproses. ${successCount} baris berhasil.`,
            data: { rows_processed: data.length, success_count: successCount, failed_count: failedCount, errors: errors.slice(0, 20) }
        });
    } catch (error) {
        next(error);
    }
};

// Upload stock data
const uploadStock = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File tidak ditemukan.' });
        }

        const filePath = req.file.path;
        let data;
        try {
            data = parseExcelFile(filePath);
        } catch (e) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ success: false, message: 'File tidak dapat dibaca.' });
        }

        const validation = validateStockColumns(data);
        if (!validation.valid) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ success: false, message: `Kolom wajib tidak ditemukan: ${validation.missing.join(', ')}` });
        }

        const upload = await pool.query(
            `INSERT INTO upload_history (admin_id, admin_username, file_type, file_name, rows_processed, status) 
       VALUES ($1, $2, 'stock', $3, $4, 'processing') RETURNING id`,
            [req.user.id, req.user.username, req.file.originalname, data.length]
        );
        const uploadId = upload.rows[0].id;

        let successCount = 0;
        let failedCount = 0;
        const errors = [];

        // Wipe all existing stock — new upload fully replaces old data
        await pool.query('DELETE FROM parts');

        const { normalizeStockRow } = require('../utils/excelParser');

        for (let i = 0; i < data.length; i++) {
            try {
                const row = normalizeStockRow(data[i]);

                // Keys are now UPPERCASE_WITH_UNDERSCORES from normalizeStockRow (e.g. NO_PART, GROUP_PART)
                // Map common variations
                const noPart = row.NO_PART || row.PART_NUMBER || row.NOMOR_PART || '';
                const namaPart = row.NAMA_PART || row.PART_NAME || row.DESKRIPSI || '';
                const groupPart = String(row.GROUP_PART || row.GROUP || '').trim() || null;
                const groupTobpm = String(row.GROUP_TOBPM || row.TOBPM || '').trim() || null;
                const groupMaterial = String(row.GROUP_MATERIAL || row.MATERIAL_GROUP || '').trim() || null;

                // Qty and Amount
                const qtyVal = row.QTY || row.QUANTITY || row.STOK || row.STOCK || 0;
                const amountVal = row.AMOUNT || row.TOTAL_VALUE || row.PRICE || row.HARGA || 0;

                const qty = parseInt(String(qtyVal).replace(/,/g, '')) || 0;
                const amount = parseFloat(String(amountVal).replace(/,/g, '')) || 0;

                if (!noPart) {
                    failedCount++;
                    errors.push({ row: i + 2, error: 'NO PART kosong' });
                    continue;
                }

                await pool.query(
                    `INSERT INTO parts (no_part, nama_part, group_part, group_material, group_tobpm, qty, amount, last_updated)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (no_part) DO UPDATE SET
           nama_part = $2, group_part = $3, group_material = $4, group_tobpm = $5, qty = $6, amount = $7, last_updated = NOW()`,
                    [noPart, namaPart, groupPart, groupMaterial, groupTobpm, qty, amount]
                );

                successCount++;
            } catch (err) {
                failedCount++;
                errors.push({ row: i + 2, error: err.message });
            }
        }

        await pool.query(
            `UPDATE upload_history SET success_count = $1, failed_count = $2, status = $3, error_log = $4 WHERE id = $5`,
            [successCount, failedCount, failedCount > 0 && successCount === 0 ? 'failed' : 'completed', JSON.stringify(errors), uploadId]
        );

        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin', req.user.id, req.user.username, 'Upload Stock', `Upload data stok: ${successCount} berhasil, ${failedCount} gagal`, req.ip]
        );

        fs.unlinkSync(filePath);

        res.json({
            success: true,
            message: 'Data stok berhasil diproses.',
            data: { rows_processed: data.length, success_count: successCount, failed_count: failedCount, errors }
        });
    } catch (error) {
        next(error);
    }
};

// Get upload history
const getUploadHistory = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, file_type, status } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM upload_history WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (file_type) { query += ` AND file_type = $${paramIndex}`; params.push(file_type); paramIndex++; }
        if (status) { query += ` AND status = $${paramIndex}`; params.push(status); paramIndex++; }

        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
        const countResult = await pool.query(countQuery, params);

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: {
                uploads: result.rows,
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                totalPages: Math.ceil(countResult.rows[0].count / limit),
            }
        });
    } catch (error) {
        next(error);
    }
};

// Download template
const downloadTemplate = async (req, res, next) => {
    try {
        const { type } = req.params;
        let wb;
        let filename;

        if (type === 'sales') {
            wb = createSalesTemplate();
            filename = 'template_data_penjualan.xlsx';
        } else if (type === 'stock') {
            wb = createStockTemplate();
            filename = 'template_data_stok.xlsx';
        } else {
            return res.status(400).json({ success: false, message: 'Tipe template tidak valid.' });
        }

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

// Generate report
const generateReport = async (req, res, next) => {
    try {
        const { type, startDate, endDate, customer, group_material } = req.body;

        let reportData = {};

        if (type === 'sales') {
            let query = `SELECT t.*, c.name as customer_name FROM transactions t LEFT JOIN customers c ON t.customer_id = c.id WHERE 1=1`;
            const params = [];
            let pi = 1;
            if (startDate) { query += ` AND t.tanggal >= $${pi}`; params.push(startDate); pi++; }
            if (endDate) { query += ` AND t.tanggal <= $${pi}`; params.push(endDate); pi++; }
            if (customer) { query += ` AND (c.name ILIKE $${pi} OR t.no_customer ILIKE $${pi})`; params.push(`%${customer}%`); pi++; }
            query += ' ORDER BY t.tanggal DESC';

            const transactions = await pool.query(query, params);
            const summary = await pool.query(
                query.replace('SELECT t.*, c.name as customer_name',
                    `SELECT COALESCE(SUM(t.total_faktur), 0) as total_sales, COUNT(*) as transactions, 
           COALESCE(AVG(t.gp_percent), 0) as avg_gp, COALESCE(SUM(t.diskon), 0) as total_discount,
           COALESCE(SUM(t.net_sales), 0) as net_sales`).replace(' ORDER BY t.tanggal DESC', ''),
                params
            );

            reportData = { summary: summary.rows[0], tableData: transactions.rows };
        } else if (type === 'stock') {
            const stock = await pool.query('SELECT * FROM parts ORDER BY no_part');
            const overview = await pool.query(
                `SELECT COALESCE(SUM(amount), 0) as total_value, COUNT(*) as total_parts,
         SUM(CASE WHEN qty > 0 AND qty <= 20 THEN 1 ELSE 0 END) as low_stock,
         SUM(CASE WHEN qty = 0 THEN 1 ELSE 0 END) as out_of_stock FROM parts`
            );
            reportData = { overview: overview.rows[0], tableData: stock.rows };
        } else if (type === 'customer') {
            const customers = await pool.query(
                `SELECT c.*, COALESCE(SUM(t.net_sales), 0) as total_spent, COUNT(t.id) as transaction_count
         FROM customers c LEFT JOIN transactions t ON c.id = t.customer_id
         GROUP BY c.id ORDER BY total_spent DESC`
            );
            reportData = { tableData: customers.rows };
        } else if (type === 'profit') {
            let query = `SELECT TO_CHAR(tanggal, 'YYYY-MM') as period, SUM(gross_profit) as profit, 
                   AVG(gp_percent) as avg_gp, SUM(net_sales) as revenue
                   FROM transactions WHERE 1=1`;
            const params = [];
            let pi = 1;
            if (startDate) { query += ` AND tanggal >= $${pi}`; params.push(startDate); pi++; }
            if (endDate) { query += ` AND tanggal <= $${pi}`; params.push(endDate); pi++; }
            query += ` GROUP BY TO_CHAR(tanggal, 'YYYY-MM') ORDER BY period`;

            const profitByPeriod = await pool.query(query, params);
            reportData = { tableData: profitByPeriod.rows };
        }

        res.json({ success: true, data: reportData });
    } catch (error) {
        next(error);
    }
};

// Get customer analytics
const getCustomerAnalytics = async (req, res, next) => {
    try {
        const today = new Date();
        const sixtyDaysAgo = new Date(today);
        sixtyDaysAgo.setDate(today.getDate() - 60);

        // 1. Top Customers
        const topRevenueQuery = `
            SELECT c.name, c.no_customer, SUM(t.net_sales) as total_value, COUNT(t.id) as transactions
            FROM transactions t
            JOIN customers c ON t.customer_id = c.id
            GROUP BY c.id ORDER BY total_value DESC LIMIT 10
        `;
        const topFreqQuery = `
            SELECT c.name, c.no_customer, COUNT(t.id) as total_value, SUM(t.net_sales) as revenue
            FROM transactions t
            JOIN customers c ON t.customer_id = c.id
            GROUP BY c.id ORDER BY total_value DESC LIMIT 10
        `;
        const topProfitQuery = `
             SELECT c.name, c.no_customer, SUM(t.gross_profit) as total_value, SUM(t.net_sales) as revenue
            FROM transactions t
            JOIN customers c ON t.customer_id = c.id
            GROUP BY c.id ORDER BY total_value DESC LIMIT 10
        `;

        const [topRevenue, topFreq, topProfit] = await Promise.all([
            pool.query(topRevenueQuery),
            pool.query(topFreqQuery),
            pool.query(topProfitQuery)
        ]);

        // 2. Value Metrics
        const valueMetricsQuery = `
            SELECT 
                COUNT(DISTINCT customer_id) as total_customers,
                SUM(net_sales) as total_revenue,
                SUM(net_sales) / NULLIF(COUNT(DISTINCT customer_id), 0) as arpc
            FROM transactions
        `;
        const valueMetrics = await pool.query(valueMetricsQuery);
        const totalRevenue = parseFloat(valueMetrics.rows[0].total_revenue) || 0;
        const top10Revenue = topRevenue.rows.reduce((sum, row) => sum + parseFloat(row.total_value), 0);
        const concentrationRisk = totalRevenue > 0 ? (top10Revenue / totalRevenue) * 100 : 0;

        // 3. Behavior (Frequency Distribution)
        const freqDistQuery = `
            WITH customer_freq AS (
                SELECT customer_id, COUNT(*) as freq FROM transactions GROUP BY customer_id
            )
            SELECT 
                CASE 
                    WHEN freq = 1 THEN '1x'
                    WHEN freq BETWEEN 2 AND 5 THEN '2-5x'
                    WHEN freq BETWEEN 6 AND 10 THEN '6-10x'
                    ELSE '11x+' 
                END as bucket,
                COUNT(*) as count
            FROM customer_freq
            GROUP BY bucket
        `;
        const freqDist = await pool.query(freqDistQuery);

        // 4. Risk Alerts (Dormant > 60 days)
        const dormantQuery = `
            SELECT c.name, c.no_customer, MAX(t.tanggal) as last_purchase,
            EXTRACT(DAY FROM NOW() - MAX(t.tanggal)) as days_inactive
            FROM transactions t
            JOIN customers c ON t.customer_id = c.id
            GROUP BY c.id
            HAVING MAX(t.tanggal) < $1
            ORDER BY days_inactive DESC LIMIT 20
        `;
        const dormant = await pool.query(dormantQuery, [sixtyDaysAgo]);

        res.json({
            success: true,
            data: {
                top: {
                    revenue: topRevenue.rows.map(r => ({ ...r, total_value: parseFloat(r.total_value) })),
                    frequency: topFreq.rows.map(r => ({ ...r, total_value: parseInt(r.total_value) })),
                    profit: topProfit.rows.map(r => ({ ...r, total_value: parseFloat(r.total_value) }))
                },
                value: {
                    arpc: parseFloat(valueMetrics.rows[0].arpc),
                    avg_clv: parseFloat(valueMetrics.rows[0].arpc), // Simple proxy for now
                    concentration_risk: concentrationRisk
                },
                behavior: {
                    frequency_dist: freqDist.rows.map(r => ({ ...r, count: parseInt(r.count) }))
                },
                alerts: {
                    dormant: dormant.rows
                }
            }
        });
    } catch (error) {
        next(error);
    }
};


// Get sales analytics (Trends & Patterns)
const getSalesAnalytics = async (req, res, next) => {
    try {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const oneYearAgo = new Date(today);
        oneYearAgo.setMonth(today.getMonth() - 12);

        // 1. Daily Trend (Last 30 Days)
        const dailyTrend = await pool.query(`
            SELECT TO_CHAR(tanggal, 'YYYY-MM-DD') as date, SUM(net_sales) as total_sales, COUNT(*) as transactions
            FROM transactions
            WHERE tanggal >= $1
            GROUP BY date ORDER BY date ASC
        `, [thirtyDaysAgo]);

        // 2. Weekly Pattern (Avg per Day of Week)
        const weeklyPattern = await pool.query(`
            SELECT TRIM(TO_CHAR(tanggal, 'Day')) as day_name, 
                   EXTRACT(DOW FROM tanggal) as day_idx,
                   AVG(net_sales) as avg_sales
            FROM transactions
            GROUP BY day_name, day_idx ORDER BY day_idx ASC
        `);

        // 3. Monthly Trend (Last 12 Months)
        const monthlyTrend = await pool.query(`
            SELECT TO_CHAR(tanggal, 'YYYY-MM') as month, SUM(net_sales) as total_sales
            FROM transactions
            WHERE tanggal >= $1
            GROUP BY month ORDER BY month ASC
        `, [oneYearAgo]);

        // 4. Growth Metrics (MoM, YoY)
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        const lastYear = currentYear - 1;

        const growthQuery = `
            SELECT 
                -- Current Month (for MoM)
                SUM(CASE WHEN EXTRACT(MONTH FROM tanggal) = $1 AND EXTRACT(YEAR FROM tanggal) = $2 THEN net_sales ELSE 0 END) as current_month_sales,
                -- Last Month (for MoM)
                SUM(CASE WHEN EXTRACT(MONTH FROM tanggal) = $3 AND EXTRACT(YEAR FROM tanggal) = $4 THEN net_sales ELSE 0 END) as last_month_sales,
                -- YTD Current Year (Jan to Current Month) (for YoY)
                SUM(CASE WHEN EXTRACT(YEAR FROM tanggal) = $2 AND EXTRACT(MONTH FROM tanggal) <= $1 THEN net_sales ELSE 0 END) as current_ytd_sales,
                -- YTD Last Year (Jan to Current Month) (for YoY)
                SUM(CASE WHEN EXTRACT(YEAR FROM tanggal) = $5 AND EXTRACT(MONTH FROM tanggal) <= $1 THEN net_sales ELSE 0 END) as last_year_ytd_sales
            FROM transactions
        `;
        const growth = await pool.query(growthQuery, [currentMonth, currentYear, lastMonth, lastMonthYear, lastYear]);
        const { current_month_sales, last_month_sales, current_ytd_sales, last_year_ytd_sales } = growth.rows[0];

        const momGrowth = last_month_sales > 0 ? ((current_month_sales - last_month_sales) / last_month_sales) * 100 : 0;
        const yoyGrowth = last_year_ytd_sales > 0 ? ((current_ytd_sales - last_year_ytd_sales) / last_year_ytd_sales) * 100 : 0;

        // 5. Transaction Type Analysis
        const byType = await pool.query(`
            SELECT tipe_faktur, SUM(net_sales) as total_sales, COUNT(*) as count
            FROM transactions
            GROUP BY tipe_faktur ORDER BY total_sales DESC
        `);

        // 6. Forecasting (Simple Moving Average - Last 30 days avg extended to next 30 days)
        const avgDailySales = dailyTrend.rows.reduce((sum, r) => sum + parseFloat(r.total_sales), 0) / (dailyTrend.rows.length || 1);
        const forecast = [];
        for (let i = 1; i <= 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            forecast.push({
                date: d.toISOString().split('T')[0],
                predicted_sales: avgDailySales // basic flat forecast for now
            });
        }

        res.json({
            success: true,
            data: {
                daily: dailyTrend.rows.map(r => ({ ...r, total_sales: parseFloat(r.total_sales) })),
                weekly: weeklyPattern.rows.map(r => ({ ...r, avg_sales: parseFloat(r.avg_sales) })),
                monthly: monthlyTrend.rows.map(r => ({ ...r, total_sales: parseFloat(r.total_sales) })),
                growth: {
                    mom: parseFloat(momGrowth),
                    yoy: parseFloat(yoyGrowth),
                    current_month: parseFloat(current_month_sales),
                    last_month: parseFloat(last_month_sales)
                },
                by_type: byType.rows.map(r => ({ ...r, total_sales: parseFloat(r.total_sales) })),
                forecast
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get pricing & discount analytics
const getPriceAnalytics = async (req, res, next) => {
    try {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const oneYearAgo = new Date(today);
        oneYearAgo.setMonth(today.getMonth() - 12);

        // 1. Discount Metrics & Impact Analysis
        // Recalculate Profit using Master Part Cost (amount / qty) to fix 0% or wrong GP
        const impactQuery = `
            WITH Recalculated AS (
                SELECT 
                    t.id,
                    t.net_sales,
                    t.diskon,
                    (t.net_sales - COALESCE(SUM(ti.qty * (COALESCE(p.amount, 0) / NULLIF(p.qty, 0))), 0)) as profit
                FROM transactions t
                LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
                LEFT JOIN parts p ON ti.no_part = p.no_part
                GROUP BY t.id, t.net_sales, t.diskon
            )
            SELECT 
                CASE WHEN ABS(diskon) > 0 THEN 'Discounted' ELSE 'No Discount' END as type,
                COUNT(*) as trx_count,
                SUM(net_sales) as total_sales,
                SUM(profit) as total_profit,
                AVG(net_sales) as avg_ticket_size,
                CASE WHEN SUM(net_sales) > 0 THEN (SUM(profit) / SUM(net_sales)) * 100 ELSE 0 END as avg_gp_percent
            FROM Recalculated
            GROUP BY type
        `;
        const impact = await pool.query(impactQuery);

        const discountedStats = impact.rows.find(r => r.type === 'Discounted') || { trx_count: 0, total_sales: 0, total_profit: 0, avg_ticket_size: 0, avg_gp_percent: 0 };
        const noDiscountStats = impact.rows.find(r => r.type === 'No Discount') || { trx_count: 0, total_sales: 0, total_profit: 0, avg_ticket_size: 0, avg_gp_percent: 0 };

        const totalSales = parseFloat(discountedStats.total_sales) + parseFloat(noDiscountStats.total_sales);
        const totalDiscountQuery = `SELECT SUM(ABS(diskon)) as total_discount FROM transactions`;
        const totalDiscountResult = await pool.query(totalDiscountQuery);
        const totalDiscount = parseFloat(totalDiscountResult.rows[0].total_discount || 0);

        // 2. Monthly Discount Trend
        // Uses ABS(diskon) and Recalculated GP for checks if needed, but trend just shows dist%
        const trendQuery = `
            SELECT TO_CHAR(tanggal, 'YYYY-MM') as month, 
                   SUM(ABS(diskon)) as total_discount,
                   (SUM(ABS(diskon)) / NULLIF(SUM(total_faktur), 0)) * 100 as discount_percent
            FROM transactions
            WHERE tanggal >= $1
            GROUP BY month ORDER BY month ASC
        `;
        const trend = await pool.query(trendQuery, [oneYearAgo]);

        // 3. Top Discounted Parts (by Amount)
        // Ensure column exists first (Lazy Migration)
        try {
            await pool.query('ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS diskon DECIMAL(15,2) DEFAULT 0');
        } catch (e) { /* ignore if exists/error */ }

        // 3. Discount vs Profit Scatter Data (Top 50 Discounted Parts)
        // Shows Part No, Name, Group Material, Total Discount, Total Revenue, Disc%, GP%
        const topPartsQuery = `
            SELECT ti.no_part, ti.nama_part, 
                   COALESCE(MAX(ti.group_material), MAX(p.group_material), 'Unknown') as group_material,
                   SUM(ABS(ti.diskon)) as total_discount, 
                   SUM(ti.subtotal) as total_revenue,
                   CASE WHEN SUM(ti.subtotal + ABS(ti.diskon)) > 0 THEN 
                        (SUM(ABS(ti.diskon)) / SUM(ti.subtotal + ABS(ti.diskon))) * 100 
                   ELSE 0 END as discount_percent,
                   CASE WHEN SUM(ti.subtotal) > 0 THEN
                        (SUM(ti.subtotal - (ti.qty * CASE 
                            WHEN ti.cost_price > 0 THEN ti.cost_price 
                            ELSE COALESCE(p.amount / NULLIF(p.qty, 0), 0) 
                        END)) / SUM(ti.subtotal)) * 100
                   ELSE 0 END as gp_percent
            FROM transaction_items ti
            LEFT JOIN parts p ON ti.no_part = p.no_part
            WHERE ABS(ti.diskon) > 0
            GROUP BY ti.no_part, ti.nama_part, p.amount, p.qty
            ORDER BY total_discount DESC LIMIT 50
        `;
        const topPartsResults = await pool.query(topPartsQuery);
        console.log(`[PriceAnalytics] Top Parts Count: ${topPartsResults.rows.length}`);
        if (topPartsResults.rows.length > 0) {
            console.log('[PriceAnalytics] Sample Part:', topPartsResults.rows[0]);
        }

        const topParts = {
            rows: topPartsResults.rows.map((row, index) => ({
                rank: index + 1,
                no_part: row.no_part,
                nama_part: row.nama_part,
                group_material: row.group_material,
                total_discount: parseFloat(row.total_discount),
                discount_percent: parseFloat(row.discount_percent),
                gp_percent: parseFloat(row.gp_percent)
            }))
        };

        // 4. Top Discounted Customers
        const topCustomersQuery = `
            SELECT c.name, COUNT(t.id) as trx_count, SUM(ABS(t.diskon)) as total_discount
            FROM transactions t
            JOIN customers c ON t.customer_id = c.id
            WHERE ABS(t.diskon) > 0
            GROUP BY c.id, c.name
            ORDER BY total_discount DESC LIMIT 10
        `;
        const topCustomers = await pool.query(topCustomersQuery);

        // 5. Alerts
        // Excessive Discount (> 50%)
        const highDiscountAlerts = await pool.query(`
            SELECT no_faktur, tanggal, ABS(diskon) as total_discount, (ABS(diskon) / NULLIF(total_faktur, 0)) * 100 as discount_percent
            FROM transactions
            WHERE (ABS(diskon) / NULLIF(total_faktur, 0)) > 0.5
            ORDER BY tanggal DESC LIMIT 20
        `);

        // Negative Profit (Below Cost)
        // RECALCULATED using Part Cost
        const negativeGPAlerts = await pool.query(`
            WITH RecalculatedGP AS (
                SELECT 
                    t.no_faktur, 
                    t.tanggal, 
                    t.net_sales, 
                    COALESCE(SUM(ti.qty * (COALESCE(p.amount, 0) / NULLIF(p.qty, 0))), 0) as est_cost
                FROM transactions t
                JOIN transaction_items ti ON t.id = ti.transaction_id
                JOIN parts p ON ti.no_part = p.no_part
                WHERE p.qty > 0
                GROUP BY t.id, t.no_faktur, t.tanggal, t.net_sales
            )
            SELECT 
                no_faktur, 
                tanggal, 
                net_sales, 
                (net_sales - est_cost) as gross_profit, 
                CASE WHEN net_sales > 0 THEN ((net_sales - est_cost) / net_sales) * 100 ELSE 0 END as gp_percent
            FROM RecalculatedGP
            WHERE (net_sales - est_cost) < 0
            ORDER BY tanggal DESC LIMIT 20
        `);

        res.json({
            success: true,
            data: {
                metrics: {
                    total_discount: totalDiscount,
                    discount_rate: totalSales > 0 ? (totalDiscount / (totalSales + totalDiscount)) * 100 : 0,
                    avg_discount_trx: parseFloat(discountedStats.trx_count) > 0 ? totalDiscount / parseFloat(discountedStats.trx_count) : 0,
                    trx_with_discount: parseInt(discountedStats.trx_count),
                    trx_no_discount: parseInt(noDiscountStats.trx_count)
                },
                impact: {
                    discounted: {
                        avg_ticket: parseFloat(discountedStats.avg_ticket_size),
                        avg_gp: parseFloat(discountedStats.avg_gp_percent)
                    },
                    no_discount: {
                        avg_ticket: parseFloat(noDiscountStats.avg_ticket_size),
                        avg_gp: parseFloat(noDiscountStats.avg_gp_percent)
                    }
                },
                trend: trend.rows.map(r => ({
                    month: r.month,
                    total_discount: parseFloat(r.total_discount),
                    discount_percent: parseFloat(r.discount_percent)
                })),
                lists: {
                    top_parts: [],
                    top_customers: topCustomers.rows.map(r => ({ ...r, total_discount: parseFloat(r.total_discount) }))
                },
                alerts: {
                    high_discount: highDiscountAlerts.rows.map(r => ({ ...r, discount_percent: parseFloat(r.discount_percent) })),
                    negative_gp: negativeGPAlerts.rows.map(r => ({ ...r, gp_percent: parseFloat(r.gp_percent) }))
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Upload QRIS Image
const uploadSettingsQR = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File tidak ditemukan.' });
        }

        const tempPath = req.file.path;
        const targetPath = path.join(__dirname, '../uploads/qris.jpg');

        // Rename/Move file to qris.jpg to overwrite previous one
        fs.rename(tempPath, targetPath, (err) => {
            if (err) throw err;
            res.json({ success: true, message: 'QRIS berhasil diperbarui.', url: '/uploads/qris.jpg' });
        });

        // Log
        await pool.query(
            `INSERT INTO activity_logs (user_type, user_id, user_name, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin', req.user.id, req.user.username, 'Update QRIS', 'Memperbarui QR Code ASTRAPAY', req.ip]
        );

    } catch (error) {
        next(error);
    }
};

// Recalculate Financials for Existing Data
const recalculateFinancials = async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Update Transaction Headers
        // Net Sales = Total Faktur / 1.11
        await client.query(`
            UPDATE transactions 
            SET net_sales = total_faktur / 1.11
        `);

        // 2. Update Transaction Items
        // Subtotal = (Total Faktur of Header / Count Items)? No, we don't know item breakdown perfectly if we only have totals.
        // But for uploaded items, we usually stored 'sales' (line amount). 
        // Let's assume 'subtotal' column in items was populated from 'sales' in CSV.
        // If we want to correct it, we should do: subtotal = subtotal / 1.11? 
        // No, 'Sales' in CSV is usually Tax Inc or Exc? 
        // User said: "Net Sales =[@[Total Faktur]]/1.11".
        // If item.sales was tax inclusive, then yes, divide by 1.11.
        await client.query(`
            UPDATE transaction_items
            SET subtotal = subtotal / 1.11,
                price = (subtotal / 1.11) / NULLIF(qty, 0)
        `);

        // 3. Update Gross Profit on Headers
        // GP = Net Sales - (Qty * UnitCost)
        // Priority: 1. Stored `cost_price` in transaction_items, 2. Master Part Cost (parts.amount / qty)
        await client.query(`
            UPDATE transactions t
            SET gross_profit = (
                SELECT COALESCE(SUM(
                    ti.subtotal - (ti.qty * CASE 
                        WHEN ti.cost_price > 0 THEN ti.cost_price
                        ELSE COALESCE(p.amount / NULLIF(p.qty, 0), 0)
                    END)
                ), 0)
                FROM transaction_items ti
                LEFT JOIN parts p ON ti.no_part = p.no_part
                WHERE ti.transaction_id = t.id
            )
        `);

        // 4. Update GP %
        await client.query(`
            UPDATE transactions
            SET gp_percent = CASE WHEN net_sales > 0 THEN (gross_profit / net_sales) * 100 ELSE 0 END
        `);

        // 5. Recalculate Points (assuming 1 point per 10,000 net sales)
        await client.query(`
             UPDATE transactions
             SET points_earned = FLOOR(net_sales / 10000)
        `);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Financials recalculated successfully based on current validation rules.' });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

// Fix Database Schema & Debug
const fixDatabase = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Ensure Columns Exist
        await client.query('ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS diskon DECIMAL(15,2) DEFAULT 0');
        await client.query('ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(20,2) DEFAULT 0');

        // 2. Debug: Count items with discount
        const countRes = await client.query('SELECT COUNT(*) as cnt FROM transaction_items WHERE diskon > 0');
        const count = parseInt(countRes.rows[0].cnt);

        // Debug: Count items with discount AND valid part number
        const countWithPartRes = await client.query("SELECT COUNT(*) as cnt FROM transaction_items WHERE diskon > 0 AND no_part != '' AND no_part IS NOT NULL");
        const countWithPart = parseInt(countWithPartRes.rows[0].cnt);

        // 3. Debug: Sample one item
        const sampleRes = await client.query('SELECT * FROM transaction_items WHERE diskon > 0 LIMIT 1');
        const sample = sampleRes.rows[0];

        // 4. Check Transactions with Discount
        const txCountRes = await client.query('SELECT COUNT(*) as cnt FROM transactions WHERE diskon > 0');
        const txCount = parseInt(txCountRes.rows[0].cnt);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `DB Stat: ${count} Items Disc > 0. (${countWithPart} w/ PartNo). ${txCount} Trx.`,
            debug: { count, countWithPart, txCount, sample }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Fix DB Error:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

module.exports = {
    getDashboard, getSales, getSaleDetail, getStock, adjustStock,
    uploadSales, uploadStock, getUploadHistory, downloadTemplate, generateReport,
    getCustomerAnalytics, getInventoryAnalytics, getSalesAnalytics, getPriceAnalytics,
    uploadSettingsQR, recalculateFinancials, fixDatabase
};

