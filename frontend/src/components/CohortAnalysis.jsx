import React from 'react';

const CohortAnalysis = ({ data }) => {
    if (!data) return null;

    const getRetentionColor = (val) => {
        val = parseFloat(val);
        if (val >= 80) return '#2563eb'; // blue-600
        if (val >= 60) return '#60a5fa'; // blue-400
        if (val >= 40) return '#bfdbfe'; // blue-200
        if (val >= 20) return '#dbeafe'; // blue-100
        return '#f9fafb'; // gray-50
    };

    const getTextColor = (val) => {
        val = parseFloat(val);
        if (val >= 60) return 'white';
        if (val >= 20) return '#1e40af';
        return '#9ca3af';
    };

    return (
        <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>📊 Cohort Retention Analysis</h3>
            <div className="table-container">
                <table style={{ textAlign: 'center' }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>First Purchase</th>
                            <th>Users</th>
                            <th>Month 1</th>
                            <th>Month 2</th>
                            <th>Month 3</th>
                            <th>Month 6</th>
                            <th>Month 12</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i}>
                                <td style={{ textAlign: 'left', fontWeight: 500 }}>{row.cohort}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{row.total}</td>
                                {['m1', 'm2', 'm3', 'm6', 'm12'].map(m => (
                                    <td key={m} style={{
                                        padding: 8,
                                        background: getRetentionColor(row.retention[m]),
                                        color: getTextColor(row.retention[m]),
                                        border: '1px solid white'
                                    }}>
                                        {row.retention[m] > 0 ? `${Math.round(row.retention[m])}%` : '-'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CohortAnalysis;
