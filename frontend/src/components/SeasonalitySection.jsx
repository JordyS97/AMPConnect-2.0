import React from 'react';

const SeasonalitySection = ({ data }) => {
    if (!data) return <div className="card p-4 animate-pulse">Loading Seasonality...</div>;

    const { heatmap, seasonalIndex } = data;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const categories = Object.keys(heatmap || {}).slice(0, 8); // Top 8 categories

    // Helper to determine cell color
    const getCellColor = (val, cat) => {
        if (!val) return '#f9fafb';
        // Normalize against category max
        const max = Math.max(...Object.values(heatmap[cat]));
        const ratio = val / (max || 1);

        if (ratio > 0.8) return '#22c55e'; // green-500
        if (ratio > 0.5) return '#86efac'; // green-300
        return '#dcfce7'; // green-100
    };

    const getTextColor = (val, cat) => {
        if (!val) return '#9ca3af';
        const max = Math.max(...Object.values(heatmap[cat]));
        const ratio = val / (max || 1);
        if (ratio > 0.8) return 'white';
        if (ratio > 0.5) return '#14532d';
        return '#166534';
    };

    return (
        <div className="charts-grid-custom" style={{ marginBottom: 20 }}>
            {/* Heatmap */}
            <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>📅 Seasonal Heatmap</h3>
                <div className="table-container">
                    <table style={{ fontSize: '0.8rem' }}>
                        <thead>
                            <tr>
                                <th style={{ padding: 8 }}>Category</th>
                                {months.map(m => <th key={m} style={{ padding: 8, textAlign: 'center' }}>{m}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(cat => (
                                <tr key={cat}>
                                    <td style={{ padding: 8, fontWeight: 500 }}>{cat}</td>
                                    {months.map((_, idx) => {
                                        const m = idx + 1;
                                        const val = heatmap[cat][m];
                                        return (
                                            <td key={m} style={{ padding: 4, textAlign: 'center', background: getCellColor(val, cat), color: getTextColor(val, cat), borderRadius: 4 }}>
                                                {val || '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Seasonal Index Strength */}
            <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>🌡️ Seasonal Strength Index</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {seasonalIndex.slice(0, 5).map((item, i) => (
                        <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 4 }}>
                                <span style={{ fontWeight: 600 }}>{item.category}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>Idx: {item.index}</span>
                            </div>
                            <div className="progress-bar" style={{ height: 8 }}>
                                <div
                                    className="progress-fill"
                                    style={{ width: `${Math.min(item.index * 100, 100)}%`, background: 'var(--primary)' }}
                                ></div>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 4 }}>
                                Peak: {months[item.peak_month - 1]} • Avg: {item.avg_monthly}/mo
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SeasonalitySection;
