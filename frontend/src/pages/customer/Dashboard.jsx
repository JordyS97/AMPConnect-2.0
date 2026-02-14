import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import TierBadge from '../../components/TierBadge';
import { ShoppingCart, DollarSign, Wrench, Calendar, Package, TrendingUp, CreditCard, Star, Eye } from 'lucide-react';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import api from '../../api/axios';

export default function CustomerDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { addToast } = useToast();

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/customer/dashboard');
            setData(res.data.data);
        } catch (err) {
            addToast('Gagal memuat data dashboard', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
    if (!data) return <div className="empty-state"><h3>Tidak ada data</h3></div>;

    const { customer, tierProgress, statistics, recentTransactions } = data;

    return (
        <div>
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <h1>Selamat Datang, {customer.name}! 👋</h1>
                    <p>Dashboard AMPConnect Anda</p>
                </div>
                <TierBadge tier={customer.tier} size="large" />
            </div>

            {/* Points Card */}
            <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: 'white', border: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: 4 }}>Total Poin Reward Anda</p>
                        <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.1 }}>
                            {formatNumber(customer.total_points)}
                            <span style={{ fontSize: '1.2rem', fontWeight: 400, marginLeft: 8 }}>poin</span>
                        </div>
                        <div style={{ marginTop: 8 }}>
                            <TierBadge tier={customer.tier} />
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        {tierProgress.nextTier && (
                            <div style={{ minWidth: 200 }}>
                                <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: 8 }}>
                                    {formatNumber(tierProgress.pointsNeeded)} poin lagi ke {tierProgress.nextTier}
                                </p>
                                <div className="progress-bar" style={{ height: 10, background: 'rgba(255,255,255,0.2)' }}>
                                    <div className="progress-fill" style={{
                                        width: `${Math.min(100, ((customer.total_points % (tierProgress.nextTier === 'Gold' ? 500 : 1000)) / (tierProgress.nextTier === 'Gold' ? 500 : 1000)) * 100)}%`,
                                        background: 'linear-gradient(90deg, #ffd700, #ff6b6b)'
                                    }} />
                                </div>
                            </div>
                        )}
                        <Link to="/customer/points" className="btn btn-outline" style={{ marginTop: 12, color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                            <Eye size={16} /> Lihat Riwayat Poin
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#eff6ff' }}><ShoppingCart size={24} color="var(--primary)" /></div>
                    <div className="stat-value">{formatNumber(statistics.total_transactions)}</div>
                    <div className="stat-label">Total Pembelian</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f0fdf4' }}><DollarSign size={24} color="var(--success)" /></div>
                    <div className="stat-value" style={{ fontSize: '1.3rem' }}>{formatCurrency(statistics.total_spent)}</div>
                    <div className="stat-label">Total Belanja</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fef3c7' }}><Wrench size={24} color="#d97706" /></div>
                    <div className="stat-value" style={{ fontSize: '1rem' }}>{statistics.favorite_part}</div>
                    <div className="stat-label">Part Favorit</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fae8ff' }}><Calendar size={24} color="var(--secondary)" /></div>
                    <div className="stat-value" style={{ fontSize: '1rem' }}>{formatDate(statistics.member_since)}</div>
                    <div className="stat-label">Member Sejak</div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <h3>Transaksi Terakhir</h3>
                    <Link to="/customer/profile" className="btn btn-ghost btn-sm">Lihat Semua</Link>
                </div>
                {recentTransactions.length === 0 ? (
                    <div className="empty-state"><p>Belum ada transaksi</p></div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>No. Faktur</th>
                                    <th>Total</th>
                                    <th>Poin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTransactions.map((tx, i) => (
                                    <tr key={i}>
                                        <td>{formatDate(tx.tanggal)}</td>
                                        <td><strong>{tx.no_faktur}</strong></td>
                                        <td>{formatCurrency(tx.net_sales)}</td>
                                        <td><span className="badge badge-success">+{tx.points_earned}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick Links */}
            <div className="card">
                <h3 style={{ marginBottom: 16, fontWeight: 600 }}>Akses Cepat</h3>
                <div className="quick-links">
                    <Link to="/customer/parts" className="quick-link">
                        <Package size={24} color="var(--primary)" />
                        <div><strong>Stok Part</strong><br /><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Lihat ketersediaan part</span></div>
                    </Link>
                    <Link to="/customer/trends" className="quick-link">
                        <TrendingUp size={24} color="var(--secondary)" />
                        <div><strong>Tren Pembelian</strong><br /><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Analisis pembelian Anda</span></div>
                    </Link>
                    <Link to="/customer/payment" className="quick-link">
                        <CreditCard size={24} color="var(--success)" />
                        <div><strong>Pembayaran</strong><br /><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Bayar via ASTRAPAY</span></div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
