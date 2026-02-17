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
    // Aliases for robust parsing
    'Part Number': 'no_part',
    'Part No': 'no_part',
    'Material': 'no_part',
    'Material Number': 'no_part',
    'Part Name': 'nama_part',
    'Description': 'nama_part',
    'Material Description': 'nama_part',
    'Material Group': 'group_material',
    'Qty': 'qty',
    'Amount': 'sales',
    // Aliases for robust parsing
    'Discount': 'diskon',
    'Disc': 'diskon',
    'Potongan': 'diskon',
    'Amount Discount': 'diskon',
    'Total Discount': 'diskon', // Common variation
    'Net Amount': 'net_sales',
    'Total Net': 'net_sales',
    'Cost': 'harga_pokok',
    'HPP': 'harga_pokok',
    'Pajak': 'ppn',
    'Tax': 'ppn',
};

/**
 * Normalize a row's keys using the column map
 */
const normalizeSalesRow = (row) => {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
        const trimmedKey = key.trim();
        const mappedKey = SALES_COLUMN_MAP[trimmedKey] || trimmedKey.toLowerCase().replace(/\s+/g, '_').replace(/%/g, '_percent');

        // If key mapped, ensure we don't overwrite existing valid value with empty
        // Use loose check for now or strict?
        // Let's assume if we already have a value, and the new one is empty string/null, ignore new one.
        const isEmpty = value === null || value === undefined || String(value).trim() === '';

        if (normalized[mappedKey] !== undefined && !isEmpty) {
            normalized[mappedKey] = value; // Overwrite if new has value
        } else if (normalized[mappedKey] === undefined) {
            normalized[mappedKey] = value; // Set if not exists
        }
        // If exists and new is empty, do nothing (keep old)
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
    // Required normalized keys (UPPERCASE_WITH_UNDERSCORES)
    const requiredColumns = ['NO_PART', 'NAMA_PART', 'QTY'];

    if (data.length === 0) return { valid: false, missing: requiredColumns };

    // Get keys from first row and normalize them
    const firstRow = data[0];
    const normalizedKeys = Object.keys(firstRow).map(k => k.toString().trim().toUpperCase().replace(/\s+/g, '_'));

    // Check if required columns exist in normalized keys
    // Allow variations: NO_PART might be PART_NUMBER etc. (handled in uploadStock but validation needs to be passable)
    // Let's stick to standard strict validation for now:
    // If user provides "No Part", normalized is "NO_PART". Match!
    // If user provides "Part Number", normalized is "PART_NUMBER".
    // We should probably allow alternative required columns in validation too if we support them in upload.

    // For now, let's keep it simple: Ensure standard headers are present (case insensitive)
    // The previous validation was: required = ['NO PART', ...] and checked against UpperCase keys.
    // If user has 'No Part', Upper is 'NO PART'. It matched.
    // The issue might be extra spaces or different names.

    // Let's check for mapped existence.
    const missing = requiredColumns.filter(req => {
        // Check if this required column (or its aliases) exists in normalized keys
        if (req === 'NO_PART') return !normalizedKeys.includes('NO_PART') && !normalizedKeys.includes('PART_NUMBER') && !normalizedKeys.includes('NOMOR_PART');
        if (req === 'NAMA_PART') return !normalizedKeys.includes('NAMA_PART') && !normalizedKeys.includes('PART_NAME') && !normalizedKeys.includes('DESKRIPSI');
        if (req === 'QTY') return !normalizedKeys.includes('QTY') && !normalizedKeys.includes('QUANTITY') && !normalizedKeys.includes('STOK') && !normalizedKeys.includes('STOCK');
        return !normalizedKeys.includes(req);
    });

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
            'Group Material': 'HND-09A', // Moved or Ensure it exists
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
    normalizeStockRow: (row) => {
        const normalized = {};
        for (const [key, value] of Object.entries(row)) {
            const cleanKey = key.toString().trim().toUpperCase().replace(/\s+/g, '_');
            normalized[cleanKey] = value;
        }
        return normalized;
    },
    SALES_COLUMN_MAP,
};
