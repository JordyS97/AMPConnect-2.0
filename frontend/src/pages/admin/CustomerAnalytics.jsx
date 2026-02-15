import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { DollarSign, Users, AlertTriangle, TrendingUp, Activity, Award } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { useToast } from '../../components/Toast';
import api from '../../api/axios';

export default function CustomerAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await api.get('/admin/customer-analytics');
                setData(res.data.data);
            } catch (err) {
                addToast('Gagal memuat analitik customer', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
    if (!data) return <div className="empty-state"><h3>Belum ada data analitik</h3></div>;

    const { top, value, behavior, alerts } = data;

    const freqChartData = {
        labels: behavior.frequency_dist.map(d => d.bucket),
        datasets: [{
            label: 'Jumlah Customer',
            data: behavior.frequency_dist.map(d => d.count),
            backgroundColor: ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8'],
            borderRadius: 6
        }]
    };

    return (
        <div className="analytics-page">
            <div className="page-header">
                <h1>Customer Performance Dashboard</h1>
                <p>Analisis mendalam perilaku dan nilai pelanggan</p>
            </div>

            {/* Value Metrics */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#eff6ff' }}><DollarSign size={24} color="#2563eb" /></div>
                    <div className="stat-value">{formatCurrency(value.avg_clv)}</div>
                    <div className="stat-label">Rata-rata CLV (Lifetime Value)</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f0fdf4' }}><Activity size={24} color="#16a34a" /></div>
                    <div className="stat-value">{formatCurrency(value.arpc)}</div>
                    <div className="stat-label">Avg. Revenue Per Customer (ARPC)</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fff7ed' }}><AlertTriangle size={24} color="#ea580c" /></div>
                    <div className="stat-value">{formatNumber(value.concentration_risk)}%</div>
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
