import { useState, useEffect } from 'react';
import { Search, ShoppingCart, Clock, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../api/axios';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../../components/Toast';
import { useNavigate } from 'react-router-dom';

export default function FavoriteParts() {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchFavorites = async () => {
            try {
                const res = await api.get('/customer/favorites');
                setFavorites(res.data.data);
            } catch (err) {
                addToast('Gagal memuat data favorit', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchFavorites();
    }, []);

    const filteredFavorites = favorites.filter(item =>
        item.nama_part.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.no_part.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleBuyAgain = (partNo) => {
        navigate(`/customer/parts?search=${partNo}`);
    };

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

    return (
        <div className="favorites-page">
            <div className="page-header">
                <h1>Part Favorit</h1>
                <p>Barang yang paling sering Anda beli & rekomendasi stok</p>
            </div>

            {/* Search Bar */}
            <div className="search-bar mb-4" style={{ position: 'relative', maxWidth: 400 }}>
                <Search size={20} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                <input
                    type="text"
                    className="input"
                    placeholder="Cari nama part atau nomor part..."
                    style={{ paddingLeft: 40 }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Grid */}
            <div className="favorites-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                {filteredFavorites.map((item, idx) => (
                    <div key={idx} className="card part-card" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div className="card-header" style={{ marginBottom: 15 }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: 5 }}>{item.nama_part}</h3>
                            <div className="badge badge-outline" style={{ fontFamily: 'monospace' }}>{item.no_part}</div>
                        </div>

                        <div className="stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.9rem', color: '#64748b' }}>
                            <div>
                                <ShoppingCart size={14} style={{ display: 'inline', marginRight: 5 }} />
                                Dibeli: <span style={{ color: '#0f172a', fontWeight: 'bold' }}>{item.purchase_count}x</span>
                            </div>
                            <div>
                                <TrendingUp size={14} style={{ display: 'inline', marginRight: 5 }} />
                                Total Qty: <span style={{ color: '#0f172a', fontWeight: 'bold' }}>{item.total_qty_purchased}</span>
                            </div>
                            <div>
                                <Clock size={14} style={{ display: 'inline', marginRight: 5 }} />
                                Terakhir: {formatDate(item.last_purchase_date)}
                            </div>
                            <div>
                                Pola: Tiap ~{item.avg_days_between} hari
                            </div>
                        </div>

                        <div className="prediction-box" style={{ background: '#f8fafc', padding: 10, borderRadius: 6, marginTop: 15, marginBottom: 15 }}>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Prediksi Pembelian Berikutnya:</div>
                            <div style={{ fontWeight: 600, color: item.days_until_next < 7 ? '#dc2626' : '#0f172a' }}>
                                {formatDate(item.next_purchase_prediction)}
                                {item.days_until_next < 7 && <span className="badge badge-danger ml-2" style={{ fontSize: '0.7rem' }}>Segera!</span>}
                            </div>
                        </div>

                        <div className="stock-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                {item.current_stock > 10 ? (
                                    <><CheckCircle size={16} color="#10b981" /> <span style={{ color: '#10b981' }}>Stok Aman ({item.current_stock})</span></>
                                ) : item.current_stock > 0 ? (
                                    <><AlertTriangle size={16} color="#f59e0b" /> <span style={{ color: '#f59e0b' }}>Stok Menipis ({item.current_stock})</span></>
                                ) : (
                                    <><AlertTriangle size={16} color="#ef4444" /> <span style={{ color: '#ef4444' }}>Stok Habis</span></>
                                )}
                            </div>
                            <button className="btn btn-sm btn-primary" onClick={() => handleBuyAgain(item.no_part)}>
                                Beli Lagi
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredFavorites.length === 0 && (
                <div className="empty-state">
                    <p>Tidak ada part favorit ditemukan.</p>
                </div>
            )}
        </div>
    );
}
