// Bulk upload logic - replaces the per-invoice loop in adminController.js
// This processes all invoices in just 3-4 SQL queries total

/**
 * Process all invoice data using bulk SQL operations.
 * @param {Object} pool - pg Pool
 * @param {Object} invoiceGroups - { noFaktur: [items] }
 * @param {string[]} invoices - list of unique no_faktur
 * @param {Object} customerMap - { noCustomer: customerId }
 * @param {Function} parseNum - number parser
 * @param {Function} parseDate - date parser
 * @returns {{ successCount, failedCount, errors, affectedCustomerIds }}
 */
async function bulkProcessSales(pool, invoiceGroups, invoices, customerMap, parseNum, parseDate) {
    let successCount = 0;
    let failedCount = 0;
    const errors = [];
    const affectedCustomerIds = new Set();

    console.log(`Processing ${invoices.length} invoices...`);
    const startTime = Date.now();

    // Step A: Compute all transaction-level data in memory
    const txData = [];
    for (const noFaktur of invoices) {
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
                const ns = parseNum(item.net_sales) || (tf - ppn);
                netSales += ns;
                const gp = parseNum(item.gross_profit) || (tf - ppn - hp);
                grossProfit += gp;
            }
            const customerId = customerMap[noCustomer] || null;
            if (customerId) affectedCustomerIds.add(customerId);
            const gpPercent = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
            const pointsEarned = Math.floor(netSales / 10000);
            txData.push({ noFaktur, tanggal, customerId, noCustomer, tipeFaktur, totalFaktur, diskon, netSales, gpPercent, grossProfit, pointsEarned, items });
        } catch (err) {
            failedCount++;
            errors.push(`Faktur ${noFaktur}: ${err.message}`);
        }
    }

    // Step B: Bulk UPSERT all transactions (chunks of 200)
    const TX_CHUNK = 200;
    const txIdMap = {};
    for (let i = 0; i < txData.length; i += TX_CHUNK) {
        const chunk = txData.slice(i, i + TX_CHUNK);
        const vals = [], phs = [];
        let pi = 1;
        for (const tx of chunk) {
            phs.push(`($${pi},$${pi + 1},$${pi + 2},$${pi + 3},$${pi + 4},$${pi + 5},$${pi + 6},$${pi + 7},$${pi + 8},$${pi + 9},$${pi + 10})`);
            vals.push(tx.noFaktur, tx.tanggal, tx.customerId, tx.noCustomer, tx.tipeFaktur, tx.totalFaktur, tx.diskon, tx.netSales, tx.gpPercent, tx.grossProfit, tx.pointsEarned);
            pi += 11;
        }
        const res = await pool.query(
            `INSERT INTO transactions (no_faktur, tanggal, customer_id, no_customer, tipe_faktur, total_faktur, diskon, net_sales, gp_percent, gross_profit, points_earned)
             VALUES ${phs.join(',')}
             ON CONFLICT (no_faktur) DO UPDATE SET tanggal=EXCLUDED.tanggal, customer_id=EXCLUDED.customer_id, tipe_faktur=EXCLUDED.tipe_faktur,
             total_faktur=EXCLUDED.total_faktur, diskon=EXCLUDED.diskon, net_sales=EXCLUDED.net_sales,
             gp_percent=EXCLUDED.gp_percent, gross_profit=EXCLUDED.gross_profit, points_earned=EXCLUDED.points_earned
             RETURNING id, no_faktur`,
            vals
        );
        for (const row of res.rows) {
            txIdMap[row.no_faktur] = row.id;
        }
    }
    console.log(`Upserted ${Object.keys(txIdMap).length} transactions in ${Date.now() - startTime}ms`);

    // Step C: Bulk DELETE old items
    const allTxIds = Object.values(txIdMap);
    if (allTxIds.length > 0) {
        await pool.query('DELETE FROM transaction_items WHERE transaction_id = ANY($1::int[])', [allTxIds]);
    }
    console.log(`Deleted old items in ${Date.now() - startTime}ms`);

    // Step D: Bulk INSERT all items (chunks of 300)
    const ITEM_CHUNK = 300;
    const allItemRows = [];
    for (const tx of txData) {
        const transactionId = txIdMap[tx.noFaktur];
        if (!transactionId) continue;
        for (const item of tx.items) {
            const tf = parseNum(item.total_faktur);
            const ppn = parseNum(item.ppn);
            const hp = parseNum(item.harga_pokok);
            const q = parseNum(item.qty);
            const np = String(item.no_part || '').trim();
            const sales = parseNum(item.sales);
            const gm = item.group_material || item.group_tobpm || item.group_part || '';
            const ns = parseNum(item.net_sales) || (tf - ppn);
            const gp = parseNum(item.gross_profit) || (tf - ppn - hp);
            allItemRows.push([transactionId, np, item.nama_part || '', q, sales, ns, Math.abs(parseNum(item.diskon)), hp, gp, gm]);
        }
    }

    for (let i = 0; i < allItemRows.length; i += ITEM_CHUNK) {
        const chunk = allItemRows.slice(i, i + ITEM_CHUNK);
        const vals = [], phs = [];
        let pi = 1;
        for (const r of chunk) {
            phs.push(`($${pi},$${pi + 1},$${pi + 2},$${pi + 3},$${pi + 4},$${pi + 5},$${pi + 6},$${pi + 7},$${pi + 8},$${pi + 9})`);
            vals.push(...r);
            pi += 10;
        }
        await pool.query(
            `INSERT INTO transaction_items (transaction_id,no_part,nama_part,qty,price,subtotal,diskon,cost_price,gross_profit,group_material) VALUES ${phs.join(',')}`,
            vals
        );
    }

    successCount = txData.length;
    console.log(`Inserted ${allItemRows.length} items. Total time: ${Date.now() - startTime}ms`);

    return { successCount, failedCount, errors, affectedCustomerIds };
}

module.exports = { bulkProcessSales };
