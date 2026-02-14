const XLSX = require('xlsx');
const path = require('path');

/**
 * Parse Excel/CSV file and return array of objects
 */
const parseExcelFile = (filePath) => {
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
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
    const requiredColumns = ['NO PART', 'NAMA PART', 'QTY'];

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
            'No Faktur': 'H531-FSP-2400128',
            'Tgl Faktur': '4/2/2024',
            'Transaksi': 'Part Direct',
            'Tipe Faktur': 'ZPF1',
            'No Customer': '8001073914',
            'Customer Name': 'BENGKEL MOTOR AGUS',
            'Tipe Part': 'ZSPA',
            'No Part': '91009KVY961',
            'Nama Part': 'BRG BALL RADIAL 6902U',
            'Group Material': 'HND-09A',
            'Rank': 'A',
            'Quantity': 1,
            'Sales': 30500,
            'Diskon': -3050,
            'Total Faktur': 27450,
            'DPP': 24730,
            'PPN': 24730,
            'Harga Pokok': 20790,
            'Gross Profit': 3940,
            'Net Sales': 24730,
            'Disc%': '10.0%',
            'GP%': '15.9%',
            'Day': 2,
            'Month': 4,
            'MATGROUP FIX': 'BEARING',
            'Group Part': 'HGP',
            'Group TOBPM': 'NON TOBPM',
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
            'GROUP PART': 'AHM OIL',
            'GROUP TOBPM': 'NON TOBPM',
            'GROUP MATERIAL': 'HND-31D',
            'NO PART': 'HPC480ML',
            'NAMA PART': 'HONDA PARTS CLEANER',
            'QTY': 9,
            'AMOUNT': 223200,
        }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = Object.keys(templateData[0]).map(key => ({ wch: Math.max(key.length + 2, 15) }));
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
