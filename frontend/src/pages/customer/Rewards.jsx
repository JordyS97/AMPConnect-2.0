import { useState, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import api from '../../api/axios';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../../components/Toast';
import { Award, Zap, Gift, CheckCircle } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const REWARD_CATALOG = [
    { id: 1, name: 'Voucher Diskon 5%', points: 10, description: 'Diskon 5% untuk 1 transaksi berikutnya', icon: '🎟️' },
    { id: 2, name: 'Voucher Diskon 10%', points: 25, description: 'Diskon 10% untuk 1 transaksi berikutnya', icon: '🏷️' },
    { id: 3, name: 'Gratis Ongkir', points: 15, description: 'Gratis ongkos kirim untuk 1 pengiriman', icon: '🚚' },
    { id: 4, name: 'Voucher Belanja Rp 50.000', points: 50, description: 'Voucher senilai Rp 50.000', icon: '💳' },
    { id: 5, name: 'Konsultasi Part Gratis', points: 30, description: 'Sesi konsultasi part 1 jam dengan teknisi', icon: '🔧' },
    { id: 6, name: 'Voucher Belanja Rp 150.000', points: 100, description: 'Voucher senilai Rp 150.000', icon: '💰' },
];

export default function Rewards() {
    const [pointsData, setPointsData] = useState(null);
    const [trendsData, setTrendsData] = useState(null);
    const [redemptionHistory, setRedemptionHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [redeeming, setRedeeming] = useState(null); // reward id being redeemed
    const [confirmReward, setConfirmReward] = useState(null); // reward pending confirmation
    const [page, setPage] = useState(1);
    const { addToast } = useToast();

    const fetchData = useCallback(async () => {
        try {
            const [pointsRes, trendsRes, redemptionsRes] = await Promise.all([
                api.get('/customer/points/history', { params: { page, limit: 10 } }),
                api.get('/customer/trends'),
                api.get('/customer/redemptions'),
            ]);
            setPointsData(pointsRes.data.data);
            setTrendsData(trendsRes.data.data);
            setRedemptionHistory(redemptionsRes.data.data);
        } catch (err) {
            addToast('Gagal memuat data poin', 'error');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRedeem = async (reward) => {
        setRedeeming(reward.id);
        try {
            const res = await api.post('/customer/redeem', {
                reward_name: reward.name,
                points_cost: reward.points,
            });
            addToast(res.data.message, 'success');
            setConfirmReward(null);
            // Refresh data to reflect new point balance
            const [pointsRes, redemptionsRes] = await Promise.all([
                api.get('/customer/points/history', { params: { page, limit: 10 } }),
                api.get('/customer/redemptions'),
            ]);
            setPointsData(pointsRes.data.data);
            setRedemptionHistory(redemptionsRes.data.data);
        } catch (err) {
            addToast(err.response?.data?.message || 'Gagal menukar poin', 'error');
        } finally {
            setRedeeming(null);
        }
    };

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
    if (!pointsData || !trendsData) return <div>Data tidak tersedia</div>;

    const { history, total, totalPages, currentPoints, tierProgress } = pointsData;
    const currentTier = pointsData.currentTier || 'Silver';
    const { monthlyPoints } = trendsData;

    const chartData = {
        labels: monthlyPoints?.map(d => d.month) || [],
        datasets: [{
            label: 'Poin Didapat',
            data: monthlyPoints?.map(d => Number(d.total)) || [],
            backgroundColor: '#fbbf24',
            borderRadius: 4
        }]
    };

    const getTierColor = (tier) => {
        switch (tier) {
            case 'Moon Stone': return '#A78BFA';
            case 'Diamond': return '#B9F2FF';
            case 'Gold': return '#eab308';
            default: return '#94a3b8';
        }
    };

    const formatCurrencyLocal = (amount) => 'Rp ' + Number(amount || 0).toLocaleString('id-ID');

    return (
        <div className="rewards-page">
            <div className="page-header">
                <h1>Reward Points</h1>
                <p>Kumpulkan poin dan nikmati keuntungan eksklusif</p>
            </div>

            {/* Status Card */}
            <div className="rewards-hero">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
                    <div>
                        <div className="badge" style={{ 
                            background: getTierColor(currentTier), 
                            color: (currentTier === 'Diamond' || currentTier === 'Silver') ? 'black' : 'white', 
                            marginBottom: 10,
                            padding: '6px 12px',
                            fontWeight: 'bold',
                            borderRadius: '20px'
                        }}>
                            {currentTier.toUpperCase()} MEMBER
                        </div>
                        <h2 style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: 5 }}>{currentPoints} Poin</h2>
                        <p style={{ opacity: 0.9, fontSize: '1.1rem' }}>Total Poin Aktif Anda</p>
                    </div>

                    {tierProgress.nextTier && (
                        <div style={{ flex: 1, minWidth: 300, maxWidth: 500 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                <span>Progress ke {tierProgress.nextTier}</span>
                                <span>{tierProgress.percentage}%</span>
                            </div>
                            <div style={{ height: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 5, overflow: 'hidden' }}>
                                <div style={{
                                    width: `${Math.min(tierProgress.percentage, 100)}%`,
                                    height: '100%',
                                    background: getTierColor(tierProgress.nextTier),
                                    transition: 'width 0.5s ease'
                                }}></div>
                            </div>
                            <div style={{ marginTop: 10, fontSize: '0.9rem', opacity: 0.8 }}>
                                <Zap size={14} style={{ display: 'inline', marginRight: 5 }} />
                                {formatCurrencyLocal(tierProgress.salesNeeded)} lagi belanja untuk upgrade!
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Redeem Points Section */}
            <div className="card" style={{ marginBottom: 32 }}>
                <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Gift className="text-primary" />
                        <h3 style={{ margin: 0 }}>Katalog Hadiah</h3>
                    </div>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Saldo: <strong>{currentPoints} poin</strong></span>
                </div>
                
                <div className="reward-cards">
                    {REWARD_CATALOG.map(reward => {
                        const canRedeem = currentPoints >= reward.points;
                        return (
                            <div key={reward.id} className="reward-card" style={{ opacity: canRedeem ? 1 : 0.8 }}>
                                <div className="reward-card-image" style={{ background: `linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ fontSize: '3.5rem' }}>{reward.icon}</div>
                                    {!canRedeem && <div className="reward-card-badge">Poin Kurang</div>}
                                </div>
                                <div className="reward-card-content">
                                    <div className="reward-card-title">{reward.name}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 15, flexGrow: 1 }}>
                                        {reward.description}
                                    </div>
                                    <div className="reward-card-points">{reward.points} Poin</div>
                                    <button
                                        className={`reward-card-btn ${canRedeem ? 'redeemable' : 'locked'}`}
                                        disabled={!canRedeem || redeeming !== null}
                                        onClick={() => setConfirmReward(reward)}
                                    >
                                        {redeeming === reward.id ? 'Memproses...' : 'Tukar Sekarang'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 }}>
                {/* Chart Section */}
                <div className="card">
                    <h3>Riwayat Perolehan Poin</h3>
                    <div style={{ height: 250 }}>
                        <Bar data={chartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                    </div>
                </div>

                {/* Benefits Section */}
                <div className="card">
                    <h3>Manfaat Membership</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <Gift size={20} color="#10b981" style={{ marginRight: 10 }} />
                            Notifikasi stok prioritas (Silver)
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <Award size={20} color="#eab308" style={{ marginRight: 10 }} />
                            Diskon spesial 5% (Gold)
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', padding: '10px 0' }}>
                            <Zap size={20} color="#a855f7" style={{ marginRight: 10 }} />
                            Prioritas pengiriman (Platinum)
                        </li>
                    </ul>
                </div>
            </div>

            {/* Redemption History */}
            {redemptionHistory.length > 0 && (
                <div className="card mt-4" style={{ marginTop: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>Riwayat Penukaran</h3>
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Reward</th>
                                    <th>Poin Digunakan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {redemptionHistory.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{formatDate(item.created_at)}</td>
                                        <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <CheckCircle size={14} color="#10b981" />
                                            {item.reward_name}
                                        </td>
                                        <td style={{ color: '#ef4444', fontWeight: 'bold' }}>-{item.points_cost}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* History Table */}
            <div className="card mt-4" style={{ marginTop: 24 }}>
                <h3>Riwayat Mutasi Poin</h3>
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Tanggal</th>
                                <th>No Faktur</th>
                                <th>Keterangan</th>
                                <th>Poin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((item, idx) => (
                                <tr key={idx}>
                                    <td>{formatDate(item.date)}</td>
                                    <td style={{ fontFamily: 'monospace' }}>{item.invoice || '-'}</td>
                                    <td>{item.description}</td>
                                    <td>
                                        {item.points_earned > 0 ? (
                                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{item.points_earned}</span>
                                        ) : (
                                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>-{item.points_used}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="pagination" style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 10 }}>
                    <button className="btn btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                    <span>Page {page} of {totalPages}</span>
                    <button className="btn btn-outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmReward && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: 400, margin: 24 }}>
                        <h3 style={{ marginBottom: 8 }}>Konfirmasi Penukaran</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                            Tukar <strong>{confirmReward.points} poin</strong> untuk mendapatkan:
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: '#f8fafc', borderRadius: 'var(--radius)', marginBottom: 20 }}>
                            <span style={{ fontSize: '2rem' }}>{confirmReward.icon}</span>
                            <div>
                                <div style={{ fontWeight: 600 }}>{confirmReward.name}</div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{confirmReward.description}</div>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                            Sisa poin setelah penukaran: <strong>{currentPoints - confirmReward.points} poin</strong>
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline" onClick={() => setConfirmReward(null)} disabled={redeeming !== null}>
                                Batal
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => handleRedeem(confirmReward)}
                                disabled={redeeming !== null}
                            >
                                {redeeming !== null ? 'Memproses...' : 'Konfirmasi Tukar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
