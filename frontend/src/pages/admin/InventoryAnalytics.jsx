import { useState, useEffect } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Package, TrendingUp, TrendingDown, AlertCircle, Layers, Link as LinkIcon } from 'lucide-react';
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

    const categoryChartData = {
        labels: category.group_part.map(c => c.category || 'Lainnya'),
        datasets: [{
            data: category.group_part.map(c => c.revenue),
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'],
        }]
    };

    return (
        <div className="analytics-page">
            <div className="page-header">
                <h1>Analitik Produk & Inventaris</h1>
                <p>Optimalisasi stok dan performa produk</p>
            </div>

            {/* Inventory Health */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fff7ed' }}><TrendingDown size={24} color="#ea580c" /></div>
                    <div className="stat-value">{health.slow_moving.length}</div>
                    <div className="stat-label">Slow Moving (&gt;60 hari)</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fef2f2' }}><AlertCircle size={24} color="#dc2626" /></div>
                    <div className="stat-value">{health.dead_stock.length}</div>
                    <div className="stat-label">Dead Stock (&gt;90 hari)</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fefce8' }}><AlertCircle size={24} color="#ca8a04" /></div>
                    <div className="stat-value">{worst.negative_gp.length}</div>
                    <div className="stat-label">Negative GP% (Rugi)</div>
                </div>
            </div>

            <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginTop: 24 }}>
                {/* Best Performers */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3>🏆 Performa Produk Terbaik</h3>
                        <div className="tabs-sm">
                            <button className={bestTab === 'revenue' ? 'active' : ''} onClick={() => setBestTab('revenue')}>Revenue</button>
                            <button className={bestTab === 'qty' ? 'active' : ''} onClick={() => setBestTab('qty')}>Quantity</button>
                            <button className={bestTab === 'gp_percent' ? 'active' : ''} onClick={() => setBestTab('gp_percent')}>GP %</button>
                        </div>
                    </div>
                    <div className="table-container" style={{ maxHeight: 400, overflowY: 'auto' }}>
                        <table className="table-sm">
                            <thead>
                                <tr>
                                    <th>Kode Part</th>
                                    <th>Nama Part</th>
                                    <th style={{ textAlign: 'right' }}>
                                        {bestTab === 'revenue' ? 'Total Sales' : bestTab === 'qty' ? 'Terjual' : 'Avg GP%'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {best[bestTab].map((item, i) => (
                                    <tr key={i}>
                                        <td style={{ fontFamily: 'monospace' }}>{item.no_part}</td>
                                        <td>{item.nama_part}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                            {bestTab === 'revenue' ? formatCurrency(item.total_value) :
                                                bestTab === 'qty' ? formatNumber(item.total_value) :
                                                    formatPercent(item.avg_gp)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Category Analysis */}
                <div className="card">
                    <h3>🥧 Revenue per Kategori</h3>
                    <div style={{ height: 250, display: 'flex', justifyContent: 'center' }}>
                        <Pie data={categoryChartData} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }} />
                    </div>
                </div>
            </div>

            <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginTop: 24 }}>
                {/* Cross Sell */}
                <div className="card">
                    <h3>💡 Peluang Cross-Sell (Dibeli Bersamaan)</h3>
                    <div className="table-container">
                        <table className="table-sm">
                            <thead><tr><th>Produk A</th><th>Produk B</th><th>Frekuensi</th></tr></thead>
                            <tbody>
                                {cross_sell.map((item, i) => (
                                    <tr key={i}>
                                        <td><div style={{ fontSize: '0.85rem' }}>{item.part_a}<br /><strong>{item.name_a}</strong></div></td>
                                        <td><div style={{ fontSize: '0.85rem' }}>{item.part_b}<br /><strong>{item.name_b}</strong></div></td>
                                        <td><span className="badge badge-info">{item.frequency}x</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Worst Performers / Alerts */}
                <div className="card">
                    <h3>📉 Performa Rendah (Low GP%)</h3>
                    <div className="table-container">
                        <table className="table-sm">
                            <thead><tr><th>Part</th><th>GP%</th></tr></thead>
                            <tbody>
                                {worst.gp_percent.slice(0, 10).map((item, i) => (
                                    <tr key={i}>
                                        <td>{item.nama_part}</td>
                                        <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{formatPercent(item.avg_gp)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
