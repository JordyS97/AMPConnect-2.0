import React from 'react';
import { TrendingUp, Package } from 'lucide-react';

const PredictiveSection = ({ data }) => {
    if (!data) return null;

    const { forecast, inventory } = data;

    return (
        <div style={{ marginBottom: 24 }}>
            {/* Sales Forecast */}
            <div className="card" style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', color: 'white', marginBottom: 24 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', color: 'white' }}>
                    <TrendingUp size={20} style={{ marginRight: 8, color: '#93c5fd' }} />
                    🔮 Predicted Sales (30 Days)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {forecast.map((week, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
                            <div>
                                <p style={{ fontWeight: 500, color: '#dbeafe' }}>{week.week}</p>
                                <p style={{ fontSize: '0.75rem', color: '#93c5fd' }}>Exp: {week.customers} customers</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>Rp {(week.revenue / 1000000).toFixed(1)}M</p>
                                <p style={{ fontSize: '0.75rem', color: '#93c5fd' }}>Top: {week.top_product}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Inventory Recs */}
            <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center' }}>
                    <Package size={20} style={{ marginRight: 8, color: 'var(--text-secondary)' }} />
                    Stock Recommendations
                </h3>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Part</th>
                                <th>Stock</th>
                                <th>Need</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventory.map((item, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 500 }}>{item.part}</td>
                                    <td>{item.current}</td>
                                    <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{item.needed}</td>
                                    <td>
                                        <span className={`badge ${item.status === 'Urgent' ? 'badge-danger' : 'badge-warning'}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PredictiveSection;
