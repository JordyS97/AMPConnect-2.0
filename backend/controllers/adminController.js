const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parseExcelFile, validateSalesColumns, validateStockColumns, createSalesTemplate, createStockTemplate, normalizeSalesRow } = require('../utils/excelParser');
const { calculatePoints, determineTier } = require('../utils/pointsCalculator');
const XLSX = require('xlsx');

// Get admin dashboard data
const getDashboard = async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Today's stats
        const todaySales = await pool.query(
            `SELECT COALESCE(SUM(total_faktur), 0) as total_sales, COUNT(*) as transactions,
       COALESCE(SUM(gross_profit), 0) as gross_profit, COALESCE(AVG(gp_percent), 0) as avg_gp
       FROM transactions WHERE tanggal = $1`, [today]
        );

        // Sales trend last 30 days
        const salesTrend = await pool.query(
            `SELECT tanggal::text as date, SUM(net_sales) as total
       FROM transactions WHERE tanggal >= NOW() - INTERVAL '30 days'
       GROUP BY tanggal ORDER BY tanggal`
        );

        // Sales by group material (current month)
        const salesByGroup = await pool.query(
            `SELECT COALESCE(p.group_material, 'Lainnya') as group_name, SUM(ti.subtotal) as total
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       LEFT JOIN parts p ON ti.no_part = p.no_part
       WHERE EXTRACT(MONTH FROM t.tanggal) = EXTRACT(MONTH FROM NOW())
       AND EXTRACT(YEAR FROM t.tanggal) = EXTRACT(YEAR FROM NOW())
       GROUP BY p.group_material ORDER BY total DESC`
        );

        // Top 10 best selling parts (current month)
        const topParts = await pool.query(
            `SELECT ti.nama_part, SUM(ti.qty) as total_qty
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       WHERE EXTRACT(MONTH FROM t.tanggal) = EXTRACT(MONTH FROM NOW())
       AND EXTRACT(YEAR FROM t.tanggal) = EXTRACT(YEAR FROM NOW())
       GROUP BY ti.nama_part ORDER BY total_qty DESC LIMIT 10`
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
                salesByGroup: salesByGroup.rows,
                topParts: topParts.rows,
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
            `SELECT COALESCE(SUM(t.total_faktur), 0) as total_revenue, COUNT(*) as total_transactions,
       COALESCE(SUM(t.diskon), 0) as total_discount, COALESCE(SUM(t.net_sales), 0) as net_sales,
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
        const parseNum = (v) => { const s = String(v || 0).replace(/,/g, '').replace(/%/g, '').trim(); return parseFloat(s) || 0; };

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

        for (const noFaktur of invoices) {
            const items = invoiceGroups[noFaktur];
            const header = items[0]; // Take header info from first row

            try {
                const tanggal = header.tanggal || null;
                const noCustomer = header.no_customer || '';
                const tipeFaktur = header.tipe_faktur || 'Regular';
                const totalFaktur = parseNum(header.total_faktur);
                const diskon = parseNum(header.diskon); // Usually invoice level discount
                const netSales = parseNum(header.net_sales);
                const gpPercent = parseNum(header.gp_percent);
                const grossProfit = parseNum(header.gross_profit);

                if (!tanggal) throw new Error('Tgl Faktur kosong');

                const customerId = customerMap[noCustomer] || null;
                const pointsEarned = calculatePoints(netSales);
                if (customerId) affectedCustomerIds.add(customerId);

                // Upsert Transaction Header
                const txRes = await pool.query(
                    `INSERT INTO transactions (no_faktur, tanggal, customer_id, no_customer, tipe_faktur, total_faktur, diskon, net_sales, gp_percent, gross_profit, points_earned)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                     ON CONFLICT (no_faktur) DO UPDATE SET
                     tanggal = EXCLUDED.tanggal, customer_id = EXCLUDED.customer_id, tipe_faktur = EXCLUDED.tipe_faktur,
                     total_faktur = EXCLUDED.total_faktur, diskon = EXCLUDED.diskon, net_sales = EXCLUDED.net_sales,
                     gp_percent = EXCLUDED.gp_percent, gross_profit = EXCLUDED.gross_profit, points_earned = EXCLUDED.points_earned
                     RETURNING id`,
                    [noFaktur, tanggal, customerId, noCustomer, tipeFaktur, totalFaktur, diskon, netSales, gpPercent, grossProfit, pointsEarned]
                );

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
                        const subtotal = parseNum(item.sales); // 'Sales' column is usually the line amount
                        const price = qty !== 0 ? subtotal / qty : 0; // Calculate unit price

                        itemPlaceholders.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5})`);
                        itemValues.push(transactionId, noPart, namaPart, qty, price, subtotal);
                        idx += 6;
                    }

                    // Batch insert items
                    if (itemValues.length > 0) {
                        await pool.query(
                            `INSERT INTO transaction_items (transaction_id, no_part, nama_part, qty, price, subtotal)
                             VALUES ${itemPlaceholders.join(', ')}`,
                            itemValues
                        );
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
            message: `Data penjualan berhasil diproses. ${successCount} baris berhasil, ${failedCount} gagal.`,
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

        for (let i = 0; i < data.length; i++) {
            try {
                const row = data[i];
                const noPart = row['NO PART'] || row.NO_PART || row.no_part || '';
                const namaPart = row['NAMA PART'] || row.NAMA_PART || row.nama_part || '';
                const groupPart = String(row['GROUP PART'] || row.GROUP_PART || row.group_part || '').trim() || null;
                const groupTobpm = String(row['GROUP TOBPM'] || row.GROUP_TOBPM || '').trim() || null;
                const groupMaterial = String(row['GROUP MATERIAL'] || row.GROUP_MATERIAL || row.group_material || '').trim() || null;
                const qty = parseInt(String(row.QTY || row.qty || 0).replace(/,/g, '')) || 0;
                const amount = parseFloat(String(row.AMOUNT || row.amount || 0).replace(/,/g, '')) || 0;

                if (!noPart) {
                    failedCount++;
                    errors.push({ row: i + 2, error: 'NO PART kosong' });
                    continue;
                }

                await pool.query(
                    `INSERT INTO parts (no_part, nama_part, group_part, group_material, qty, amount, last_updated)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (no_part) DO UPDATE SET
           nama_part = $2, group_part = $3, group_material = $4, qty = $5, amount = $6, last_updated = NOW()`,
                    [noPart, namaPart, groupPart, groupMaterial, qty, amount]
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

            reportData = { summary: summary.rows[0], transactions: transactions.rows };
        } else if (type === 'stock') {
            const stock = await pool.query('SELECT * FROM parts ORDER BY no_part');
            const overview = await pool.query(
                `SELECT COALESCE(SUM(amount * qty), 0) as total_value, COUNT(*) as total_parts,
         SUM(CASE WHEN qty > 0 AND qty <= 20 THEN 1 ELSE 0 END) as low_stock,
         SUM(CASE WHEN qty = 0 THEN 1 ELSE 0 END) as out_of_stock FROM parts`
            );
            reportData = { overview: overview.rows[0], parts: stock.rows };
        } else if (type === 'customer') {
            const customers = await pool.query(
                `SELECT c.*, COALESCE(SUM(t.net_sales), 0) as total_spent, COUNT(t.id) as transaction_count
         FROM customers c LEFT JOIN transactions t ON c.id = t.customer_id
         GROUP BY c.id ORDER BY total_spent DESC`
            );
            reportData = { customers: customers.rows };
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
            reportData = { profitByPeriod: profitByPeriod.rows };
        }

        res.json({ success: true, data: reportData });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboard, getSales, getSaleDetail, getStock, adjustStock,
    uploadSales, uploadStock, getUploadHistory, downloadTemplate, generateReport
};
