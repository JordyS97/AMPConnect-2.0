import React from 'react';

const RFMSegmentation = ({ data }) => {
    if (!data) return null;

    const segments = [
        { key: 'Champions', bg: '#e0e7ff', color: '#4338ca', desc: 'High spend, frequent, recent' },
        { key: 'Loyal', bg: '#dbeafe', color: '#1d4ed8', desc: 'Regular happy customers' },
        { key: 'New', bg: '#dcfce7', color: '#15803d', desc: 'Recent first-time buyers' },
        { key: 'At Risk', bg: '#ffedd5', color: '#c2410c', desc: 'Declining frequency' },
        { key: 'Lost', bg: '#fee2e2', color: '#b91c1c', desc: 'Long time no see' }
    ];

    return (
        <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>🎯 Customer Segmentation (RFM)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
                {segments.map((seg) => (
                    <div key={seg.key} style={{
                        padding: 16,
                        borderRadius: 12,
                        textAlign: 'center',
                        background: seg.bg,
                        color: seg.color
                    }}>
                        <h4 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: 4 }}>{data[seg.key] || 0}</h4>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{seg.key}</p>
                        <p style={{ fontSize: '0.65rem', opacity: 0.8, lineHeight: 1.2 }}>{seg.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RFMSegmentation;
