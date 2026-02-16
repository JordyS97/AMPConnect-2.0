import { useState, useEffect } from 'react';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Package, TrendingUp, TrendingDown, AlertCircle, Layers, Link as LinkIcon } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';
import { useToast } from '../../components/Toast';
import api from '../../api/axios';

export default function InventoryAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bestTab, setBestTab] = useState('revenue'); // revenue, qty, gp_percent
    const { addToast } = useToast();

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await api.get('/admin/inventory-analytics');
                setData(res.data.data);
            } catch (err) {
                addToast('Gagal memuat analitik produk', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
    if (!data) return <div className="empty-state"><h3>Belum ada data analitik produk</h3></div>;

    const { best, worst, health, category, cross_sell } = data;

    // Use a soft, premium color palette for the chart
    const chartColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

    const categoryChartData = {
        labels: category.group_part.map(c => c.category || 'Lainnya'),
        datasets: [{
            data: category.group_part.map(c => c.revenue),
            backgroundColor: chartColors,
            borderWidth: 0,
            hoverOffset: 10
        }]
    };

    return (
        <div className="analytics-page analytics-premium" style={{ background: '#F6F8FB', minHeight: '100vh', padding: 0 }}>
            <div className="page-header" style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Product Performance Dashboard</h1>
                <p style={{ marginTop: 8, fontSize: '1rem' }}>Real-time inventory insights and sales analytics</p>
            </div>

            {/* Inventory Health Cards (Top Row - Optional/Keep subtle) */}
            <div className="stats-grid" style={{ gap: 24, marginBottom: 32 }}>
                <div className="glass-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div className="stat-icon" style={{ background: '#fff7ed', borderRadius: 12 }}><TrendingDown size={24} color="#ea580c" /></div>
                        <div>
                            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{health.slow_moving.length}</div>
                            <div className="stat-label">Slow Moving (&gt;60 days)</div>
                        </div>
                    </div>
                </div>
                <div className="glass-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div className="stat-icon" style={{ background: '#fef2f2', borderRadius: 12 }}><AlertCircle size={24} color="#dc2626" /></div>
                        <div>
                            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{health.dead_stock.length}</div>
                            <div className="stat-label">Dead Stock (&gt;90 days)</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid: Best Performers Table (Left) & Donut Chart (Right) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32 }}>

                {/* Left: Top Product Performance Table */}
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ background: '#eff6ff', padding: 8, borderRadius: 10 }}><Package size={20} color="#2563eb" /></div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Top Product Performance</h3>
                        </div>
                        <div className="segmented-toggle">
                            <button className={bestTab === 'revenue' ? 'active' : ''} onClick={() => setBestTab('revenue')}>Revenue</button>
                            <button className={bestTab === 'qty' ? 'active' : ''} onClick={() => setBestTab('qty')}>Quantity</button>
                            <button className={bestTab === 'gp_percent' ? 'active' : ''} onClick={() => setBestTab('gp_percent')}>GP %</button>
                        </div>
                    </div>

                    <div className="table-container" style={{ maxHeight: 500, overflowY: 'auto', border: 'none', boxShadow: 'none' }}>
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th style={{ paddingLeft: 24 }}>Part Info</th>
                                    <th>Performance</th>
                                    <th style={{ textAlign: 'right', paddingRight: 24 }}>
                                        {bestTab === 'revenue' ? 'Total Sales' : bestTab === 'qty' ? 'Sold Qty' : 'Avg GP%'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {best[bestTab].map((item, i) => (
                                    <tr key={i}>
                                        <td style={{ paddingLeft: 24 }}>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.nama_part}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: 4 }}>{item.no_part}</div>
                                        </td>
                                        <td>
                                            {/* Simulated Trend + Indicator Bar */}
                                            <div className={`trend-indicator ${i < 3 ? 'trend-up' : 'trend-down'}`} style={{ marginBottom: 4 }}>
                                                {i < 3 ? '↑ High' : '• Stable'}
                                            </div>
                                            <div className="indicator-bar">
                                                <div className="indicator-fill" style={{ width: `${Math.max(10, 100 - (i * 5))}%` }}></div>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: 24 }}>
                                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                                                {bestTab === 'revenue' ? formatCurrency(item.total_value) :
                                                    bestTab === 'qty' ? formatNumber(item.total_value) :
                                                        formatPercent(item.avg_gp)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Revenue Per Category Donut Chart */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Revenue per Category</h3>
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>Sales distribution by product group</p>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 400 }}>
                        <Doughnut
                            data={categoryChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                cutout: '70%',
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                        labels: {
                                            usePointStyle: true,
                                            pointStyle: 'circle',
                                            padding: 20,
                                            font: { size: 11, family: 'Inter' },
                                            color: '#64748b'
                                        }
                                    },
                                    tooltip: {
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        titleColor: '#0f172a',
                                        bodyColor: '#475569',
                                        borderColor: '#e2e8f0',
                                        borderWidth: 1,
                                        padding: 12,
                                        cornerRadius: 8,
                                        displayColors: true,
                                        boxPadding: 4,
                                        callbacks: {
                                            label: function (context) {
                                                let label = context.label || '';
                                                if (label) { label += ': '; }
                                                if (context.parsed !== null) { label += formatCurrency(context.parsed); }
                                                return label;
                                            }
                                        }
                                    }
                                }
                            }}
                        />
                        {/* Center Text */}
                        <div style={{
                            position: 'absolute',
                            top: '45%', // Adjusted for bottom legend
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            pointerEvents: 'none'
                        }}>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Total Revenue</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-1px' }}>
                                {formatNumber(category.group_part.reduce((a, b) => a + Number(b.revenue), 0) / 1000000)}M+
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Section (Cross-Sell / Alerts) - Optional in this view but kept for completeness */}
            {/* Bottom Section (Cross-Sell / Alerts) */}
            <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                {/* Cross Selling Opportunities */}
                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <div style={{ background: '#f0fdf4', padding: 8, borderRadius: 10 }}><LinkIcon size={20} color="#16a34a" /></div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Cross-Selling Insights</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Frequently bought together items</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {cross_sell.length > 0 ? (
                            cross_sell.slice(0, 5).map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: 12 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{item.name_a}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: '0.8rem' }}>
                                            <span>+</span>
                                            <span>{item.name_b}</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#16a34a' }}>{item.frequency}x</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Orders</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                                No cross-selling patterns detected yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Low Performing Alerts (Detailed) */}
                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <div style={{ background: '#fef2f2', padding: 8, borderRadius: 10 }}><AlertCircle size={20} color="#dc2626" /></div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Inventory Alerts</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Items requiring attention</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
                        {health.dead_stock.length > 0 ? (
                            health.dead_stock.slice(0, 5).map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #fee2e2', borderRadius: 12, background: '#fef2f2' }}>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#991b1b' }}>{item.nama_part}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>Dead Stock (&gt;90 days)</div>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#991b1b' }}>
                                        {item.qty} Qty
                                    </div>
                                </div>
                            ))
                        ) : health.slow_moving.length > 0 ? (
                            health.slow_moving.slice(0, 5).map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #ffedd5', borderRadius: 12, background: '#fff7ed' }}>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#9a3412' }}>{item.nama_part}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#c2410c' }}>Slow Moving (&gt;60 days)</div>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#9a3412' }}>
                                        {item.qty} Qty
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                                Inventory health is excellent!
                            </div>
                        )}
                        {health.dead_stock.length > 5 && (
                            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', marginTop: 8 }}>
                                +{health.dead_stock.length - 5} more dead stock items
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
