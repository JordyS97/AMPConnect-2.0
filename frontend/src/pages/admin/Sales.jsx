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
    const [selectedTx, setSelectedTx] = useState(null);
    const [page, setPage] = useState(1);
    const { addToast } = useToast();

    useEffect(() => { fetchData(); }, [page]);

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

    const viewDetail = async (txId) => {
        try {
            const res = await api.get(`/admin/sales/${txId}`);
            setSelectedTx(res.data.data);
        } catch (err) {
            addToast('Gagal memuat detail transaksi', 'error');
        }
    };

    if (loading && !data) return <div className="loading-spinner"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <h1>Analitik Penjualan</h1>
                <p>Analisis data penjualan secara detail</p>
            </div>

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
