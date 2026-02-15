import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
    ShoppingBag, CreditCard, TrendingUp, Clock,
    Gift, Heart, FileText, Box, ArrowRight, Star
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentTx, setRecentTx] = useState([]);
    const [tierProgress, setTierProgress] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await api.get('/customer/dashboard');
                setStats(res.data.data.statistics);
                setRecentTx(res.data.data.recentTransactions);
                setTierProgress(res.data.data.tierProgress);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

    const QuickAction = ({ to, icon: Icon, title, desc, color }) => (
        <Link to={to} className="card quick-action-card" style={{ textDecoration: 'none', color: 'inherit', transition: 'transform 0.2s' }}>
            <div className="icon-wrapper" style={{ background: color, width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
                <Icon color="white" size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 5 }}>{title}</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>{desc}</p>
        </Link>
    );

    return (
        <div className="dashboard-page">
            {/* Welcome Banner */}
            <div className="welcome-banner mb-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', padding: 30, borderRadius: 16, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: 10 }}>Halo, {user?.name} 👋</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="badge" style={{ background: '#eab308', color: 'black', fontWeight: 'bold' }}>{stats?.member_since ? 'MEMBER' : 'CUSTOMER'}</span>
                        <span style={{ opacity: 0.9 }}>Selamat datang kembali di AMPConnect Bima</span>
                    </div>
                </div>
                {tierProgress && (
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 12, minWidth: 250 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: '0.9rem' }}>{tierProgress.nextTier ? `Menuju ${tierProgress.nextTier}` : 'Top Tier'}</span>
                            <span style={{ fontWeight: 'bold' }}>{tierProgress.percentage}%</span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${tierProgress.percentage}%`, height: '100%', background: '#10b981' }}></div>
                        </div>
                        <div style={{ fontSize: '0.8rem', marginTop: 5, opacity: 0.8 }}>
                            {tierProgress.pointsNeeded > 0 ? `${tierProgress.pointsNeeded} poin lagi` : 'Anda mencapai level tertinggi!'}
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Overview */}
            <div className="stats-grid mb-6">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#eff6ff' }}><CreditCard color="#3b82f6" /></div>
                    <div className="stat-value">{formatCurrency(stats?.total_spent || 0)}</div>
                    <div className="stat-label">Total Belanja</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f0fdf4' }}><ShoppingBag color="#10b981" /></div>
                    <div className="stat-value">{stats?.total_transactions || 0}</div>
                    <div className="stat-label">Total Transaksi</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fff7ed' }}><Star color="#f59e0b" /></div>
                    <div className="stat-value">{tierProgress?.currentPoints || 0}</div>
                    <div className="stat-label">Poin Reward</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f5f3ff' }}><Heart color="#8b5cf6" /></div>
                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{stats?.favorite_part || '-'}</div>
                    <div className="stat-label">Part Favorit</div>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <h2 className="section-title mb-4">Menu Utama</h2>
            <div className="grid-3-cols mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                <QuickAction to="/customer/history" icon={Clock} title="Riwayat Pembelian" desc="Lihat detail transaksi & unduh faktur" color="#3b82f6" />
                <QuickAction to="/customer/spending" icon={TrendingUp} title="Analisis Belanja" desc="Statistik pengeluaran & tren" color="#10b981" />
                <QuickAction to="/customer/rewards" icon={Gift} title="Reward Points" desc="Tukar poin & cek status member" color="#f59e0b" />
                <QuickAction to="/customer/favorites" icon={Heart} title="Part Favorit" desc="Stok part langganan Anda" color="#ef4444" />
                <QuickAction to="/customer/comparison" icon={FileText} title="Laporan & Perbandingan" desc="Cek performa periode & laporan tahunan" color="#8b5cf6" />
                <QuickAction to="/customer/parts" icon={Box} title="Katalog Part" desc="Cari & cek stok sparepart" color="#64748b" />
            </div>

            {/* Recent Transactions */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3>Transaksi Terakhir</h3>
                    <Link to="/customer/history" className="btn-link">Lihat Semua <ArrowRight size={16} /></Link>
                </div>
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>No Faktur</th>
                                <th>Tanggal</th>
                                <th>Total</th>
                                <th>Poin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTx.map((tx, i) => (
                                <tr key={i}>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 500 }}>{tx.no_faktur}</td>
                                    <td>{formatDate(tx.tanggal)}</td>
                                    <td style={{ fontWeight: 600 }}>{formatCurrency(tx.net_sales)}</td>
                                    <td><span className="badge badge-success">+{tx.points_earned}</span></td>
                                </tr>
                            ))}
                            {recentTx.length === 0 && <tr><td colSpan="4" className="text-center">Belum ada transaksi</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
