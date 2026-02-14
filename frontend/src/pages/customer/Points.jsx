import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import TierBadge from '../../components/TierBadge';
import { Star, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import api from '../../api/axios';

const tierBenefits = {
    Silver: ['Akses ke katalog part online', 'Riwayat transaksi lengkap', 'Notifikasi promo'],
    Gold: ['Semua benefit Silver', 'Diskon khusus 5%', 'Prioritas stok', 'Akses tren pembelian'],
    Diamond: ['Semua benefit Gold', 'Diskon khusus 10%', 'Layanan prioritas', 'Konsultasi part gratis', 'Free ongkir (area tertentu)'],
};

export default function Points() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showBenefits, setShowBenefits] = useState(false);
    const [page, setPage] = useState(1);
    const { user } = useAuth();
    const { addToast } = useToast();

    useEffect(() => { fetchPoints(); }, [page]);

    const fetchPoints = async () => {
        try {
            const res = await api.get('/customer/points/history', { params: { page, limit: 20 } });
            setData(res.data.data);
        } catch (err) {
            addToast('Gagal memuat riwayat poin', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

    const tiers = [
        { name: 'Silver', min: 0, max: 499, color: '#C0C0C0', icon: '⭐' },
        { name: 'Gold', min: 500, max: 1499, color: '#FFD700', icon: '🌟' },
        { name: 'Diamond', min: 1500, max: '∞', color: '#B9F2FF', icon: '💎' },
    ];

    return (
        <div>
            <div className="page-header">
                <h1>Poin Reward</h1>
                <p>Kelola poin dan tingkat keanggotaan Anda</p>
            </div>

            {/* Status Card */}
            <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: 'white', border: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
                    <div>
                        <p style={{ opacity: 0.8, marginBottom: 4 }}>Total Poin Anda</p>
                        <div style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1 }}>
                            {data && formatNumber(data.currentPoints)}
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <TierBadge tier={data?.currentTier} size="large" />
                        </div>
                    </div>
                    <div>
                        <button className="btn" onClick={() => setShowBenefits(!showBenefits)}
                            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                            <Award size={16} /> Benefit Tier {showBenefits ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>
                {showBenefits && (
                    <div style={{ marginTop: 20, padding: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius)' }}>
                        <h4 style={{ marginBottom: 8 }}>Benefit {data?.currentTier}:</h4>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {tierBenefits[data?.currentTier]?.map((b, i) => (
                                <li key={i} style={{ padding: '4px 0', fontSize: '0.9rem' }}>✓ {b}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* History Table */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <h3>Riwayat Poin</h3>
                </div>
                {data?.history?.length === 0 ? (
                    <div className="empty-state"><p>Belum ada riwayat poin</p></div>
                ) : (
                    <>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Tanggal</th>
                                        <th>Deskripsi</th>
                                        <th>No. Faktur</th>
                                        <th>Poin Diperoleh</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.history?.map((h, i) => (
                                        <tr key={i}>
                                            <td>{formatDate(h.date)}</td>
                                            <td>{h.description}</td>
                                            <td>{h.invoice || '-'}</td>
                                            <td><span className="badge badge-success">+{h.points_earned}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {data?.totalPages > 1 && (
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

            {/* Tier Info */}
            <div className="card">
                <h3 style={{ marginBottom: 16 }}>Informasi Tingkat Keanggotaan</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                    {tiers.map(tier => (
                        <div key={tier.name} style={{
                            padding: 20, borderRadius: 'var(--radius-md)',
                            border: data?.currentTier === tier.name ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                            background: data?.currentTier === tier.name ? '#eff6ff' : 'white',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: '1.5rem' }}>{tier.icon}</span>
                                <strong style={{ fontSize: '1.1rem' }}>{tier.name}</strong>
                                {data?.currentTier === tier.name && <span className="badge badge-info">Saat Ini</span>}
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                                {tier.min} - {tier.max} poin
                            </p>
                            <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.85rem' }}>
                                {tierBenefits[tier.name].map((b, i) => (
                                    <li key={i} style={{ padding: '2px 0', color: 'var(--text-secondary)' }}>• {b}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
