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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {data.map((item, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 12,
                        background: '#f8fafc',
                        borderRadius: 8,
                        border: '1px solid var(--border-light)'
                    }}>
                        <div>
                            <p style={{ fontWeight: 600, color: 'var(--text)', margin: 0 }}>{item.category}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', margin: 0 }}>{item.sample_size} buyers analyzed</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>{Math.round(item.avg_cycle)}d</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Avg Cycle</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProductCycleTable;
