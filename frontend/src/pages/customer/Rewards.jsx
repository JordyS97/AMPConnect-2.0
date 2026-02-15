import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import api from '../../api/axios';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../../components/Toast';
import { Award, Zap, Gift } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Rewards() {
    const [pointsData, setPointsData] = useState(null);
    const [trendsData, setTrendsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pointsRes, trendsRes] = await Promise.all([
                    api.get('/customer/points/history', { params: { page, limit: 10 } }),
                    api.get('/customer/trends')
                ]);
                setPointsData(pointsRes.data.data);
                setTrendsData(trendsRes.data.data);
            } catch (err) {
                addToast('Gagal memuat data poin', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [page]);

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
    if (!pointsData || !trendsData) return <div>Data tidak tersedia</div>;

    const { history, total, totalPages, currentPoints, currentTier, tierProgress } = pointsData;
    const { monthlyPoints } = trendsData;

    // Chart Data
    const chartData = {
        labels: monthlyPoints?.map(d => d.month) || [],
        datasets: [{
            label: 'Poin Didapat',
            data: monthlyPoints?.map(d => d.total) || [],
            backgroundColor: '#fbbf24',
            borderRadius: 4
        }]
    };

    const getTierColor = (tier) => {
        switch (tier) {
            case 'Gold': return '#eab308';
            case 'Platinum': return '#a855f7';
            default: return '#94a3b8'; // Silver
        }
    };

    return (
        <div className="rewards-page">
            <div className="page-header">
                <h1>Reward Points</h1>
                <p>Kumpulkan poin dan nikmati keuntungan eksklusif</p>
            </div>

            {/* Status Card */}
            <div className="card mb-4" style={{ background: 'linear-gradient(to right, #1e293b, #0f172a)', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
                    <div>
                        <div className="badge" style={{ background: getTierColor(currentTier), color: 'white', marginBottom: 10 }}>
                            {currentTier} MEMBER
                        </div>
                        <h2 style={{ fontSize: '2.5rem', marginBottom: 5 }}>{currentPoints} Poin</h2>
                        <p style={{ opacity: 0.8 }}>Total Poin Aktif Anda</p>
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
                                {tierProgress.pointsNeeded} poin lagi untuk upgrade!
                            </div>
                        </div>
                    )}
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

                {/* Benefits Section (Static for now) */}
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

            {/* History Table */}
            <div className="card mt-4">
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
                                    <td style={{ fontFamily: 'monospace' }}>{item.invoice}</td>
                                    <td>{item.description}</td>
                                    <td style={{ color: '#10b981', fontWeight: 'bold' }}>+{item.points_earned}</td>
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
        </div>
    );
}
