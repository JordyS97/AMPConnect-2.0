import { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { Search, Calendar, Eye, X, DollarSign, TrendingUp, ShoppingCart, Percent } from 'lucide-react';
import { formatCurrency, formatDate, formatNumber, formatPercent } from '../../utils/formatters';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import api from '../../api/axios';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function Sales() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ startDate: '', endDate: '', customer: '' });
    const [activeTab, setActiveTab] = useState('overview'); // overview, analytics
    const [analyticsData, setAnalyticsData] = useState(null);
    const [page, setPage] = useState(1);
    const [selectedTx, setSelectedTx] = useState(null);

    useEffect(() => {
        if (activeTab === 'overview') fetchData();
        if (activeTab === 'analytics' && !analyticsData) fetchAnalytics();
    }, [page, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/sales', { params: { ...filters, page, limit: 20 } });
            setData(res.data.data);
        } catch (err) {
            addToast('Gagal memuat data penjualan', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/sales-analytics');
            setAnalyticsData(res.data.data);
        } catch (err) {
            addToast('Gagal memuat analitik penjualan', 'error');
        } finally {
            setLoading(false);
        }
    };

    const viewDetail = async (txId) => {
        try {
            const res = await api.get(`/admin/sales/${txId}`);
            setSelectedTx(res.data.data);
        } catch (err) {
            addToast('Gagal memuat detail transaksi', 'error');
        }
    };

    const renderAnalytics = () => {
        if (!analyticsData) return <div className="loading-spinner"><div className="spinner"></div></div>;
        const { daily, weekly, growth, by_type, forecast } = analyticsData;

        // Combine daily actuals with forecast for chart
        const labels = [...daily.map(d => formatDate(d.date)), ...forecast.map(d => formatDate(d.date) + ' (Est)')];
        const actuals = daily.map(d => d.total_sales);
        const predictions = [...Array(daily.length).fill(null), ...forecast.map(d => d.predicted_sales)];

        const trendChartData = {
            labels,
            datasets: [
                {
                    label: 'Penjualan Aktual',
                    data: [...actuals, null], // Connect to start of forecast
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Forecast (30 Hari)',
                    data: [...Array(daily.length - 1).fill(null), actuals[actuals.length - 1], ...forecast.map(d => d.predicted_sales)],
                    borderColor: '#9333ea',
                    borderDash: [5, 5],
                    tension: 0.3
                }
            ]
        };

        const weeklyChartData = {
            labels: weekly.map(w => w.day_name),
            datasets: [{
                label: 'Rata-rata Penjualan',
                data: weekly.map(w => w.avg_sales),
                backgroundColor: '#10b981',
                borderRadius: 6
            }]
        };

        const typeChartData = {
            labels: by_type.map(t => t.tipe_faktur || 'N/A'),
            datasets: [{
                data: by_type.map(t => t.total_sales),
                backgroundColor: ['#f59e0b', '#ef4444', '#3b82f6', '#10b981'],
            }]
        };

        return (
            <div className="analytics-view fade-in">
                {/* Growth Cards */}
                <div className="stats-grid" style={{ marginBottom: 24 }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#eff6ff' }}><TrendingUp size={24} color="#3b82f6" /></div>
                        <div className="stat-value">
                            {formatPercent(growth.mom)}
                            <span style={{ fontSize: '0.8rem', color: growth.mom >= 0 ? 'var(--success)' : 'var(--danger)', marginLeft: 8 }}>
                                {growth.mom >= 0 ? '↑' : '↓'} vs Bulan Lalu
                            </span>
                        </div>
                        <div className="stat-label">Pertumbuhan MoM</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#f0fdf4' }}><Calendar size={24} color="#10b981" /></div>
                        <div className="stat-value">
                            {formatPercent(growth.yoy)}
                            <span style={{ fontSize: '0.8rem', color: growth.yoy >= 0 ? 'var(--success)' : 'var(--danger)', marginLeft: 8 }}>
                                {growth.yoy >= 0 ? '↑' : '↓'} vs Tahun Lalu
                            </span>
                        </div>
                        <div className="stat-label">Pertumbuhan YoY</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#fff7ed' }}><DollarSign size={24} color="#f59e0b" /></div>
                        <div className="stat-value">{formatCurrency(growth.current_month)}</div>
                        <div className="stat-label">Pendapatan Bulan Ini</div>
                    </div>
                </div>

                <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                    <div className="card">
                        <h3>📈 Tren Penjualan & Forecast</h3>
                        <div style={{ height: 300 }}>
                            <Line data={trendChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }} />
                        </div>
                    </div>
                    <div className="card">
                        <h3>📊 Pola Penjualan Mingguan</h3>
                        <div style={{ height: 300 }}>
                            <Bar data={weeklyChartData} options={{ maintainAspectRatio: false }} />
                        </div>
                    </div>
                </div>

                <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
                    <div className="card">
                        <h3>🛒 Penjualan per Tipe Faktur</h3>
                        <div style={{ height: 250, display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: '60%' }}>
                                <Bar data={typeChartData} options={{ indexAxis: 'y', plugins: { legend: { display: false } } }} />
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <h3>📅 Tabel Tren Harian (30 Hari Terakhir)</h3>
                        <div className="table-container" style={{ maxHeight: 250, overflowY: 'auto' }}>
                            <table className="table-sm">
                                <thead><tr><th>Tanggal</th><th>Sales</th><th>Trx</th></tr></thead>
                                <tbody>
                                    {daily.slice().reverse().map((d, i) => (
                                        <tr key={i}>
                                            <td>{formatDate(d.date)}</td>
                                            <td>{formatCurrency(d.total_sales)}</td>
                                            <td>{d.transactions}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading && !data && activeTab === 'overview') return <div className="loading-spinner"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <div style={{ flex: 1 }}>
                    <h1>Analitik Penjualan</h1>
                    <p>Analisis data penjualan secara detail</p>
                </div>
                <div className="tabs">
                    <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
                    <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>Trends & Forecast</button>
                </div>
            </div>

            {activeTab === 'analytics' ? renderAnalytics() : (
                <>
                    {/* Filter */}
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
                            <button onClick={() => { setPage(1); fetchData(); }} className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
                                <Search size={16} /> Filter
                            </button>
                        </div>
                    </div>

                    {data && (
                        <>
                            {/* Summary */}
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: '#eff6ff' }}><DollarSign size={24} color="var(--primary)" /></div>
                                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{formatCurrency(data.summary.total_sales)}</div>
                                    <div className="stat-label">Total Penjualan</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: '#f0fdf4' }}><ShoppingCart size={24} color="var(--success)" /></div>
                                    <div className="stat-value">{formatNumber(data.summary.total_transactions)}</div>
                                    <div className="stat-label">Total Transaksi</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: '#fae8ff' }}><TrendingUp size={24} color="var(--secondary)" /></div>
                                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{formatCurrency(data.summary.gross_profit)}</div>
                                    <div className="stat-label">Laba Kotor</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: '#fef3c7' }}><Percent size={24} color="#d97706" /></div>
                                    <div className="stat-value">{formatPercent(data.summary.avg_gp)}</div>
                                    <div className="stat-label">Rata-rata GP%</div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="card">
                                <div className="card-header"><h3>Daftar Transaksi</h3></div>
                                {data.transactions.length === 0 ? (
                                    <div className="empty-state"><p>Tidak ada transaksi ditemukan</p></div>
                                ) : (
                                    <>
                                        <div className="table-container">
                                            <table>
                                                <thead>
                                                    <tr><th>Tanggal</th><th>No. Faktur</th><th>Customer</th><th>Tipe</th><th>Total Faktur</th><th>Net Sales</th><th>Laba Kotor</th><th>GP%</th><th>Aksi</th></tr>
                                                </thead>
                                                <tbody>
                                                    {data.transactions.map((tx) => (
                                                        <tr key={tx.id}>
                                                            <td>{formatDate(tx.tanggal)}</td>
                                                            <td><strong>{tx.no_faktur}</strong></td>
                                                            <td>{tx.customer_name}</td>
                                                            <td><span className="badge badge-info">{tx.tipe_faktur}</span></td>
                                                            <td>{formatCurrency(tx.total_faktur)}</td>
                                                            <td>{formatCurrency(tx.net_sales)}</td>
                                                            <td>{formatCurrency(tx.gross_profit)}</td>
                                                            <td style={{ color: tx.gp_percentage > 20 ? 'var(--success)' : tx.gp_percentage > 10 ? 'var(--warning)' : 'var(--danger)' }}>
                                                                {formatPercent(tx.gp_percentage)}
                                                            </td>
                                                            <td><button onClick={() => viewDetail(tx.id)} className="btn btn-ghost btn-sm"><Eye size={16} /></button></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {data.totalPages > 1 && (
                                            <div className="pagination">
                                                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
                                                {Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => {
                                                    const p = i + 1;
                                                    return <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
                                                })}
                                                <button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next →</button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}

            {/* Detail Modal */}
            {selectedTx && (
                <div className="modal-overlay" onClick={() => setSelectedTx(null)}>
                    <div className="modal" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Detail Transaksi - {selectedTx.no_faktur}</h2>
                            <button onClick={() => setSelectedTx(null)} className="btn btn-ghost btn-icon"><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                <div><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tanggal</span><p style={{ fontWeight: 500 }}>{formatDate(selectedTx.tanggal)}</p></div>
                                <div><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Customer</span><p style={{ fontWeight: 500 }}>{selectedTx.customer_name}</p></div>
                                <div><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Faktur</span><p style={{ fontWeight: 500 }}>{formatCurrency(selectedTx.total_faktur)}</p></div>
                                <div><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Net Sales</span><p style={{ fontWeight: 500 }}>{formatCurrency(selectedTx.net_sales)}</p></div>
                            </div>
                            <h4 style={{ marginBottom: 8 }}>Item Transaksi</h4>
                            <div className="table-container">
                                <table>
                                    <thead><tr><th>Part</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
                                    <tbody>
                                        {selectedTx.items?.map((item, i) => (
                                            <tr key={i}>
                                                <td>{item.nama_part}</td>
                                                <td>{item.qty}</td>
                                                <td>{formatCurrency(item.harga)}</td>
                                                <td>{formatCurrency(item.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
