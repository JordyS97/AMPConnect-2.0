import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { DollarSign, Users, AlertTriangle, TrendingUp, Activity, Award, Search } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { useToast } from '../../components/Toast';
import api from '../../api/axios';

export default function CustomerAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ startDate: '', endDate: '', customer: '' });
    const { addToast } = useToast();

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/customer-analytics', { params: filters });
            setData(res.data.data);
        } catch (err) {
            addToast('Gagal memuat analitik customer', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) return <div className="loading-spinner"><div className="spinner"></div></div>;
    // Keep data view even if reloading, or handle loading state better?
    // Current pattern in Sales.jsx is simple blocking load or silent update if strict.
    // Here we just use the initial loading state for now.

    if (!data && !loading) return <div className="empty-state"><h3>Belum ada data analitik</h3></div>;

    const { top, value, behavior, alerts } = data || { top: { revenue: [], frequency: [], profit: [] }, value: {}, behavior: { frequency_dist: [] }, alerts: { dormant: [] } };

    const freqChartData = {
        labels: behavior.frequency_dist?.map(d => d.bucket) || [],
        datasets: [{
            label: 'Jumlah Customer',
            data: behavior.frequency_dist?.map(d => d.count) || [],
            backgroundColor: ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8'],
            borderRadius: 6
        }]
    };

    return (
        <div className="analytics-page">
            <div className="page-header">
                <div style={{ flex: 1 }}>
                    <h1>Customer Performance Dashboard</h1>
                    <p>Analisis mendalam perilaku dan nilai pelanggan</p>
                </div>
            </div>

            {/* Filter Section */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="search-filters" style={{ marginBottom: 0 }}>
                    <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
                        <label style={{ fontSize: '0.75rem' }}>Dari Tanggal</label>
                        <input type="date" className="form-control" value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
                        <label style={{ fontSize: '0.75rem' }}>Sampai Tanggal</label>
                        <input type="date" className="form-control" value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: 2, minWidth: 200 }}>
                        <label style={{ fontSize: '0.75rem' }}>Customer</label>
                        <input type="text" className="form-control" placeholder="Cari nama/no. customer"
                            value={filters.customer} onChange={(e) => setFilters({ ...filters, customer: e.target.value })} />
                    </div>
                    <button onClick={fetchAnalytics} className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
                        <Search size={16} /> Filter
                    </button>
                </div>
            </div>

            {/* Value Metrics */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#eff6ff' }}><DollarSign size={24} color="#2563eb" /></div>
                    <div className="stat-value">{formatCurrency(value.avg_clv || 0)}</div>
                    <div className="stat-label">Rata-rata CLV (Lifetime Value)</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f0fdf4' }}><Activity size={24} color="#16a34a" /></div>
                    <div className="stat-value">{formatCurrency(value.arpc || 0)}</div>
                    <div className="stat-label">Avg. Revenue Per Customer (ARPC)</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fff7ed' }}><AlertTriangle size={24} color="#ea580c" /></div>
                    <div className="stat-value">{formatNumber(value.concentration_risk || 0)}%</div>
                    <div className="stat-label">Konsentrasi Revenue (Top 10)</div>
                </div>
            </div>

            {/* Top 10 Lists */}
            <div className="grid-3-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginTop: 24 }}>
                <div className="card">
                    <h3>🏆 Top 10 Revenue</h3>
                    <div className="table-container" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        <table className="table-sm">
                            <thead><tr><th>Customer</th><th>Total</th></tr></thead>
                            <tbody>
                                {top.revenue.map((c, i) => (
                                    <tr key={i}>
                                        <td>{c.name}</td>
                                        <td><strong>{formatCurrency(c.total_value)}</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <h3>🔄 Top 10 Frekuensi</h3>
                    <div className="table-container" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        <table className="table-sm">
                            <thead><tr><th>Customer</th><th>Trx</th></tr></thead>
                            <tbody>
                                {top.frequency.map((c, i) => (
                                    <tr key={i}>
                                        <td>{c.name}</td>
                                        <td><strong>{c.total_value}x</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <h3>💰 Top 10 Profitabilitas</h3>
                    <div className="table-container" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        <table className="table-sm">
                            <thead><tr><th>Customer</th><th>GP Total</th></tr></thead>
                            <tbody>
                                {top.profit.map((c, i) => (
                                    <tr key={i}>
                                        <td>{c.name}</td>
                                        <td style={{ color: 'var(--success)' }}><strong>{formatCurrency(c.total_value)}</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Behavior & Risk */}
            <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginTop: 24 }}>
                {/* Frequency Distribution Chart */}
                <div className="chart-card">
                    <h3>📊 Distribusi Frekuensi Pembelian</h3>
                    <div style={{ height: 300 }}>
                        <Bar data={freqChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                    </div>
                </div>

                {/* Risk Alerts */}
                <div className="card">
                    <h3>⚠️ Risiko Churn (Dormant &gt; 60 hari)</h3>
                    {alerts.dormant.length === 0 ? <p className="text-muted">Tidak ada customer dormant.</p> : (
                        <div className="table-container" style={{ maxHeight: 300, overflowY: 'auto' }}>
                            <table className="table-sm">
                                <thead><tr><th>Customer</th><th>Terakhir Beli</th><th>Hari</th></tr></thead>
                                <tbody>
                                    {alerts.dormant.map((c, i) => (
                                        <tr key={i}>
                                            <td>{c.name}</td>
                                            <td>{new Date(c.last_purchase).toLocaleDateString()}</td>
                                            <td><span className="badge badge-danger">{c.days_inactive} hari</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
