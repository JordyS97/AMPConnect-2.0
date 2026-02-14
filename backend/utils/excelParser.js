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
 * Validate sales data columns
 */
const validateSalesColumns = (data) => {
    const requiredColumns = [
        'NO_FAKTUR', 'TANGGAL', 'NO_CUSTOMER', 'TIPE_FAKTUR',
        'TOTAL_FAKTUR', 'DISKON', 'NET_SALES', 'GP_PERCENT', 'GROSS_PROFIT'
    ];

    if (data.length === 0) return { valid: false, missing: requiredColumns };

    const columns = Object.keys(data[0]).map(c => c.toUpperCase().trim());
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
 * Create sales template workbook
 */
const createSalesTemplate = () => {
    const wb = XLSX.utils.book_new();
    const templateData = [
        {
            NO_FAKTUR: 'INV-2026-001',
            TANGGAL: '2026-01-15',
            NO_CUSTOMER: 'CUST001',
            TIPE_FAKTUR: 'Regular',
            TOTAL_FAKTUR: 1500000,
            DISKON: 100000,
            NET_SALES: 1400000,
            GP_PERCENT: 25.5,
            GROSS_PROFIT: 357000
        }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
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
};
