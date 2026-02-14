const XLSX = require('xlsx');
const path = require('path');

/**
 * Parse Excel/CSV file and return array of objects
 */
const parseExcelFile = (filePath) => {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    return data;
};

/**
 * Column mapping from user's Excel headers to internal field names
 */
const SALES_COLUMN_MAP = {
    'No Faktur': 'no_faktur',
    'Tgl Faktur': 'tanggal',
    'Transaksi': 'transaksi',
    'Tipe Faktur': 'tipe_faktur',
    'No Customer': 'no_customer',
    'Customer Name': 'customer_name',
    'Tipe Part': 'tipe_part',
    'No Part': 'no_part',
    'Nama Part': 'nama_part',
    'Group Material': 'group_material',
    'Rank': 'rank',
    'Quantity': 'qty',
    'Sales': 'sales',
    'Diskon': 'diskon',
    'Total Faktur': 'total_faktur',
    'DPP': 'dpp',
    'PPN': 'ppn',
    'Harga Pokok': 'harga_pokok',
    'Gross Profit': 'gross_profit',
    'Net Sales': 'net_sales',
    'Disc%': 'disc_percent',
    'GP%': 'gp_percent',
    'Day': 'day',
    'Month': 'month',
    'MATGROUP FIX': 'matgroup_fix',
    'Group Part': 'group_part',
    'Group TOBPM': 'group_tobpm',
};

/**
 * Normalize a row's keys using the column map
 */
const normalizeSalesRow = (row) => {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
        const trimmedKey = key.trim();
        const mappedKey = SALES_COLUMN_MAP[trimmedKey] || trimmedKey.toLowerCase().replace(/\s+/g, '_').replace(/%/g, '_percent');
        normalized[mappedKey] = value;
    }
    return normalized;
};

/**
 * Validate sales data columns
 */
const validateSalesColumns = (data) => {
    const requiredColumns = [
        'No Faktur', 'Tgl Faktur', 'No Customer', 'No Part', 'Nama Part',
        'Quantity', 'Total Faktur', 'Net Sales'
    ];

    if (data.length === 0) return { valid: false, missing: requiredColumns };

    const columns = Object.keys(data[0]).map(c => c.trim());
    const missing = requiredColumns.filter(col => !columns.includes(col));

    return { valid: missing.length === 0, missing };
};

/**
 * Validate stock data columns
 */
const validateStockColumns = (data) => {
    const requiredColumns = ['NO_PART', 'NAMA_PART', 'QTY'];

    if (data.length === 0) return { valid: false, missing: requiredColumns };

    const columns = Object.keys(data[0]).map(c => c.toUpperCase().trim());
    const missing = requiredColumns.filter(col => !columns.includes(col));

    return { valid: missing.length === 0, missing };
};

/**
 * Create sales template workbook with user's actual column headers
 */
const createSalesTemplate = () => {
    const wb = XLSX.utils.book_new();
    const templateData = [
        {
            'No Faktur': 'INV-2026-001',
            'Tgl Faktur': '2026-01-15',
            'Transaksi': 'Penjualan',
            'Tipe Faktur': 'Regular',
            'No Customer': 'CUST001',
            'Customer Name': 'Budi Santoso',
            'Tipe Part': 'OEM',
            'No Part': 'HND-BRK-001',
            'Nama Part': 'Kampas Rem Depan Honda Beat',
            'Group Material': 'Honda',
            'Rank': 'A',
            'Quantity': 2,
            'Sales': 70000,
            'Diskon': 5000,
            'Total Faktur': 1500000,
            'DPP': 1363636,
            'PPN': 136364,
            'Harga Pokok': 52500,
            'Gross Profit': 12500,
            'Net Sales': 65000,
            'Disc%': 7.14,
            'GP%': 19.23,
            'Day': 15,
            'Month': 1,
            'MATGROUP FIX': 'Honda',
            'Group Part': 'Brake System',
            'Group TOBPM': 'Parts',
        }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    ws['!cols'] = Object.keys(templateData[0]).map(key => ({ wch: Math.max(key.length + 2, 15) }));

    XLSX.utils.book_append_sheet(wb, ws, 'Sales Data');
    return wb;
};

/**
 * Create stock template workbook
 */
const createStockTemplate = () => {
    const wb = XLSX.utils.book_new();
    const templateData = [
        {
            NO_PART: 'HND-001',
            NAMA_PART: 'Kampas Rem Depan Honda Beat',
            GROUP_PART: 'Brake System',
            GROUP_MATERIAL: 'Honda',
            QTY: 45,
            AMOUNT: 35000
        }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Data');
    return wb;
};

module.exports = {
    parseExcelFile,
    validateSalesColumns,
    validateStockColumns,
    createSalesTemplate,
    createStockTemplate,
    normalizeSalesRow,
    SALES_COLUMN_MAP,
};
