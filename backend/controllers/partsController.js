const pool = require('../config/db');

// Get parts list with search, filter, sort, pagination
const getParts = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, group_material, group_part, sort = 'nama_part_asc' } = req.query;
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

module.exports = { getParts, getGroups };
