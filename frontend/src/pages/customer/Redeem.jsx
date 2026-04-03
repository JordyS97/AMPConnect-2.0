import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';
import { Droplets, Circle, HardHat, CheckCircle, XCircle } from 'lucide-react';

const REWARD_ICONS = {
    oil_mpx_spx: Droplets,
    tire: Circle,
    helmet: HardHat,
};

const REWARD_COLORS = {
    oil_mpx_spx: '#f59e0b',
    tire: '#3b82f6',
    helmet: '#10b981',
};

export default function Redeem() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(null); // reward being confirmed
    const [redeeming, setRedeeming] = useState(false);
    const { addToast } = useToast();

    const fetchRewards = async () => {
        try {
            const res = await api.get('/customer/redeem/rewards');
            setData(res.data.data);
        } catch {
            addToast('Gagal memuat data reward', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRewards(); }, []);

    const handleRedeem = async () => {
        if (!confirming) return;
        setRedeeming(true);
        try {
            const res = await api.post('/customer/redeem', { reward_id: confirming.id });
            addToast(res.data.message, 'success');
            setConfirming(null);
            await fetchRewards();
        } catch (err) {
            addToast(err.response?.data?.message || 'Penukaran gagal', 'error');
        } finally {
            setRedeeming(false);
        }
    };

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
    if (!data) return <div>Data tidak tersedia</div>;

    const { currentPoints, rewards } = data;

    return (
        <div className="rewards-page">
            <div className="page-header">
                <h1>Tukar Poin</h1>
                <p>Gunakan poin Anda untuk mendapatkan hadiah menarik</p>
            </div>

            {/* Points Banner */}
            <div className="card mb-4" style={{ background: 'linear-gradient(to right, #1e293b, #0f172a)', color: 'white', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div>
                        <p style={{ opacity: 0.7, marginBottom: 4, fontSize: '0.9rem' }}>Poin Anda Saat Ini</p>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0 }}>{currentPoints} Poin</h2>
                    </div>
                </div>
            </div>

            {/* Reward Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                {rewards.map((reward) => {
                    const Icon = REWARD_ICONS[reward.id] || Circle;
                    const color = REWARD_COLORS[reward.id] || '#6366f1';
                    const canRedeem = currentPoints >= reward.points_cost;
                    return (
                        <div key={reward.id} className="card" style={{ textAlign: 'center', opacity: canRedeem ? 1 : 0.6, transition: 'opacity 0.2s' }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: '50%',
                                background: `${color}20`, display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                <Icon size={28} color={color} />
                            </div>
                            <h3 style={{ marginBottom: 8, fontSize: '1.1rem' }}>{reward.name}</h3>
                            <div style={{
                                display: 'inline-block', padding: '4px 14px',
                                background: `${color}15`, borderRadius: 20,
                                color, fontWeight: 700, fontSize: '0.95rem', marginBottom: 20
                            }}>
                                {reward.points_cost} Poin
                            </div>
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', background: canRedeem ? color : '#94a3b8', border: 'none' }}
                                disabled={!canRedeem}
                                onClick={() => setConfirming(reward)}
                            >
                                {canRedeem ? 'Tukar Sekarang' : 'Poin Tidak Cukup'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Confirmation Modal */}
            {confirming && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                }}>
                    <div className="card" style={{ maxWidth: 400, width: '90%', textAlign: 'center' }}>
                        <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
                        <h3 style={{ marginBottom: 8 }}>Konfirmasi Penukaran</h3>
                        <p style={{ color: '#64748b', marginBottom: 4 }}>
                            Anda akan menukarkan <strong>{confirming.points_cost} poin</strong> untuk:
                        </p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{confirming.name}</p>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 24 }}>
                            Sisa poin setelah penukaran: <strong>{currentPoints - confirming.points_cost} poin</strong>
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button
                                className="btn btn-outline"
                                onClick={() => setConfirming(null)}
                                disabled={redeeming}
                                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                                <XCircle size={16} /> Batal
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleRedeem}
                                disabled={redeeming}
                                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                                <CheckCircle size={16} />
                                {redeeming ? 'Memproses...' : 'Konfirmasi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
