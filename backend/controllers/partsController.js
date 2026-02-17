const pool = require('../config/db');

// Get parts list with search, filter, sort, pagination
const getParts = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, group_material, group_part, stock_status, sort = 'nama_part_asc' } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM parts WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (search) {
            query += ` AND (LOWER(nama_part) LIKE LOWER($${paramIndex}) OR LOWER(no_part) LIKE LOWER($${paramIndex}))`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (group_material && group_material !== 'All') {
            query += ` AND group_material = $${paramIndex}`;
            params.push(group_material);
            paramIndex++;
        }

        if (group_part && group_part !== 'All') {
            query += ` AND group_part = $${paramIndex}`;
            params.push(group_part);
            paramIndex++;
        }

        // Stock Status Filter
        if (stock_status && stock_status !== 'all') {
            if (stock_status === 'in_stock') {
                query += ` AND qty > 20`;
            } else if (stock_status === 'low_stock') {
                query += ` AND qty > 0 AND qty <= 20`;
            } else if (stock_status === 'out_of_stock') {
                query += ` AND qty = 0`;
            }
        }

        // Count total
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        // Sort
        const sortMap = {
            'nama_part_asc': 'nama_part ASC',
            'nama_part_desc': 'nama_part DESC',
            'qty_high': 'qty DESC',
            'qty_low': 'qty ASC',
            'no_part_asc': 'no_part ASC',
        };
        query += ` ORDER BY ${sortMap[sort] || 'nama_part ASC'}`;

        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: {
                parts: result.rows,
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / limit),
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get unique group values for filter dropdowns
const getGroups = async (req, res, next) => {
    try {
        const groupMaterial = await pool.query('SELECT DISTINCT group_material FROM parts WHERE group_material IS NOT NULL ORDER BY group_material');
        const groupPart = await pool.query('SELECT DISTINCT group_part FROM parts WHERE group_part IS NOT NULL ORDER BY group_part');

        res.json({
            success: true,
            data: {
                group_materials: groupMaterial.rows.map(r => r.group_material),
                group_parts: groupPart.rows.map(r => r.group_part),
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get Inventory Stats for Dashboard
const getInventoryStats = async (req, res, next) => {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_parts,
                COUNT(CASE WHEN qty > 0 AND qty <= 20 THEN 1 END) as low_stock,
                COUNT(CASE WHEN qty = 0 THEN 1 END) as out_of_stock,
                COALESCE(SUM(qty * amount), 0) as total_value
            FROM parts
        `);

        res.json({
            success: true,
            data: {
                total_parts: parseInt(stats.rows[0].total_parts),
                low_stock: parseInt(stats.rows[0].low_stock),
                out_of_stock: parseInt(stats.rows[0].out_of_stock),
                total_value: parseFloat(stats.rows[0].total_value)
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getParts, getGroups, getInventoryStats };
