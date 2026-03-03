const pool = require('./config/db');
const { getPointsHistory, getTrends } = require('./controllers/customerController');

const test = async () => {
    // get a valid customer id
    const custRes = await pool.query('SELECT id FROM customers LIMIT 1');
    if (custRes.rows.length === 0) {
        console.log('No customers found.');
        process.exit(0);
    }
    const customerId = custRes.rows[0].id;

    const mockReq = {
        user: { id: customerId },
        query: { page: 1, limit: 10 }
    };
    const mockRes = {
        json: (data) => console.log('JSON RETURNED:', JSON.stringify(data, null, 2)),
        status: (code) => {
            console.log('STATUS:', code);
            return mockRes;
        }
    };
    const mockNext = (err) => console.error('NEXT CALLED WITH ERROR:', err);

    console.log('--- Testing getPointsHistory ---');
    await getPointsHistory(mockReq, mockRes, mockNext);

    console.log('--- Testing getTrends ---');
    await getTrends({ ...mockReq, query: {} }, mockRes, mockNext);

    process.exit(0);
};

test().catch(console.error);
