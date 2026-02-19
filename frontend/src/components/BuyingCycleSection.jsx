import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BuyingCycleSection = ({ data }) => {
    if (!data) return <div className="card p-8 text-center animate-pulse">Loading Cycle Data...</div>;

    const { patterns, distribution } = data;

    const chartData = {
        labels: Object.keys(distribution),
        datasets: [
            {
                label: 'Customers',
                data: Object.values(distribution),
                backgroundColor: [
                    'rgba(74, 222, 128, 0.8)', // Green
                    'rgba(250, 204, 21, 0.8)', // Yellow
                    'rgba(251, 146, 60, 0.8)', // Orange
                    'rgba(248, 113, 113, 0.8)'  // Red
                ],
                borderColor: [
                    '#22c55e', '#eab308', '#f97316', '#ef4444'
                ],
                borderWidth: 1,
                borderRadius: 8,
                hoverBackgroundColor: [
                    '#22c55e', '#eab308', '#f97316', '#ef4444'
                ]
            }
        ]
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: true, text: 'Buying Cycle Distribution', font: { size: 16, weight: 'bold' }, color: '#374151' },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#1f2937',
                bodyColor: '#4b5563',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                padding: 10,
                boxPadding: 4
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: '#f3f4f6' },
                ticks: { color: '#9ca3af' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#6b7280', font: { weight: '500' } }
            }
        },
        maintainAspectRatio: false
    };

    return (
        <div className="charts-grid-custom" style={{ marginBottom: 20 }}>
            {/* Pattern List */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ padding: 6, background: '#eff6ff', borderRadius: 6, color: 'var(--primary)' }}>🔄</span>
                        Customer Purchase Patterns
                    </h3>
                    <span className="badge badge-secondary">{patterns.length} Active Patterns</span>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Avg Cycle</th>
                                <th>Last Purchase</th>
                                <th>Next Due</th>
                                <th>Confidence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patterns.map((p, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 500 }}>{p.customer}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontWeight: 'bold' }}>{p.avg_cycle}</span> days
                                            {/* Mini visual bar */}
                                            <div style={{ width: 50, height: 4, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                                <div
                                                    style={{
                                                        height: '100%',
                                                        background: p.avg_cycle < 30 ? 'var(--success)' : p.avg_cycle < 60 ? 'var(--warning)' : 'var(--danger)',
                                                        width: `${Math.min((p.avg_cycle / 90) * 100, 100)}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(p.last_purchase).toLocaleDateString()}</td>
                                    <td>
                                        <span style={{ color: 'var(--primary)', fontWeight: 600, background: '#eff6ff', padding: '2px 6px', borderRadius: 4 }}>
                                            {new Date(p.next_due).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 60, height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                                <div
                                                    style={{
                                                        height: '100%',
                                                        background: p.confidence === 'High' ? 'var(--success)' : p.confidence === 'Medium' ? 'var(--warning)' : 'var(--text-light)',
                                                        width: p.confidence === 'High' ? '90%' : p.confidence === 'Medium' ? '60%' : '30%'
                                                    }}
                                                ></div>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.confidence}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Distribution Chart */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '240px', marginBottom: 16 }}>
                    <Bar data={chartData} options={options} />
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 8, background: '#f0fdf4', borderRadius: 8, border: '1px solid #dcfce7', fontSize: '0.9rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}></span> 0-30 days</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--success-dark)' }}>Frequent</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 8, background: '#fefce8', borderRadius: 8, border: '1px solid #fef9c3', fontSize: '0.9rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)' }}></span> 31-60 days</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--warning-dark)' }}>Regular</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 8, background: '#fef2f2', borderRadius: 8, border: '1px solid #fee2e2', fontSize: '0.9rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }}></span> 60+ days</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--danger-dark)' }}>Risk</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuyingCycleSection;
