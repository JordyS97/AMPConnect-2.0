import React from 'react';
import { Wrench } from 'lucide-react';

const ProductCycleTable = ({ data }) => {
    if (!data) return null;

    return (
        <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center' }}>
                <Wrench size={20} style={{ marginRight: 8, color: 'var(--text-secondary)' }} />
                Typical Replacement Cycles
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: 12 }}>
                {data.map((item, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        textAlign: 'center',
                        padding: '12px 8px',
                        background: '#f8fafc',
                        borderRadius: 8,
                        border: '1px solid var(--border-light)'
                    }}>
                        <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.85rem', marginBottom: 4, height: 32, display: 'flex', alignItems: 'center' }}>
                            {item.category}
                        </p>
                        <div style={{ marginBottom: 4 }}>
                            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{Math.round(item.avg_cycle)}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: 2 }}>days</span>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>{item.sample_size} samples</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProductCycleTable;
