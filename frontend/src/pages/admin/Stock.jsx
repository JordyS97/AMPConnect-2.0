import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components/Toast';
import {
    Search, Edit3, X, Filter, Download, Plus, Minus,
    AlertTriangle, Package, CheckCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { formatNumber, formatCurrency, getStockStatus } from '../../utils/formatters';
import api from '../../api/axios';

export default function Stock() {
    // Data States
    const [parts, setParts] = useState([]);
    const [stats, setStats] = useState({ total_parts: 0, low_stock: 0, out_of_stock: 0, total_value: 0 });
    const [groups, setGroups] = useState({ group_materials: [], group_parts: [] });
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);

    // Filter States
    const [filters, setFilters] = useState({
        search: '',
        group_material: 'All',
        stock_status: 'all', // all, in_stock, low_stock, out_of_stock
        sort: 'nama_part_asc'
    });

    // Debounce State
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Modal State
    const [adjustModal, setAdjustModal] = useState(null);
    const [adjustQty, setAdjustQty] = useState('');
    const [adjustReason, setAdjustReason] = useState('');

    const { addToast } = useToast();

    // Initial Load
    useEffect(() => {
        fetchGroups();
        fetchStats();
    }, []);

    // Debounced Search Effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setFilters(prev => ({ ...prev, search: searchTerm }));
            setPage(1);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    // Fetch Data on Filter Change
    useEffect(() => {
        fetchStock();
    }, [page, filters]);

    const fetchGroups = async () => {
        try { const res = await api.get('/parts/groups'); setGroups(res.data.data); } catch (err) { console.error(err); }
    };

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const res = await api.get('/parts/stats');
            setStats(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchStock = async () => {
        setLoading(true);
        try {
            const res = await api.get('/parts', {
                params: {
                    page,
                    limit: 25,
                    ...filters
                }
            });
            setParts(res.data.data.parts);
            setTotalPages(res.data.data.totalPages);
            setTotalItems(res.data.data.total);
        } catch (err) {
            addToast('Gagal memuat data stok', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Search Handler
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleAdjust = async () => {
        if (!adjustQty || !adjustReason) { addToast('Isi jumlah dan alasan', 'warning'); return; }

        try {
            await api.post(`/admin/stock/${adjustModal.id}/adjust`, { quantity: parseInt(adjustQty), reason: adjustReason });
            addToast('Stok berhasil disesuaikan', 'success');
            setAdjustModal(null);
            setAdjustQty('');
            setAdjustReason('');
            fetchStock();
            fetchStats(); // Refresh stats after adjustment
        } catch (err) {
            addToast(err.response?.data?.message || 'Gagal menyesuaikan stok', 'error');
        }
    };

    // --- Component: Summary Card ---
    const SummaryCard = ({ title, value, subtext, icon: Icon, color, loading }) => (
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, borderLeft: `4px solid ${color}` }}>
            <div style={{ padding: 12, borderRadius: '50%', background: `${color}15`, color: color }}>
                <Icon size={24} />
            </div>
            <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 500 }}>{title}</p>
                {loading ? (
                    <div className="skeleton" style={{ width: 80, height: 24, borderRadius: 4 }}></div>
                ) : (
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, lineHeight: 1 }}>{value}</h3>
                )}
                {subtext && <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 4 }}>{subtext}</p>}
            </div>
        </div>
    );

    return (
        <div className="fade-in">
            {/* Page Header */}
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Manajemen Stok</h1>
                    <p className="text-secondary">Kontrol inventaris real-time dan manajemen aset</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        className="btn btn-outline"
                        onClick={async () => {
                            if (window.confirm('Recalculate all financial data? This may take a moment.')) {
                                try {
                                    setLoading(true);
                                    await api.post('/admin/recalculate');
                                    addToast('Financials recalculated successfully', 'success');
                                    fetchStats();
                                    fetchStock();
                                } catch (err) {
                                    addToast('Recalculation failed', 'error');
                                } finally {
                                    setLoading(false);
                                }
                            }
                        }}
                    >
                        <RefreshCw size={16} /> Recalculate Data
                    </button>
                    <button className="btn btn-outline" onClick={() => { fetchStats(); fetchStock(); }}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button className="btn btn-primary">
                        <Download size={16} /> Export Data
                    </button>
                </div>
            </div>

            {/* 1. Summary Metrics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
                <SummaryCard
                    title="Total Items"
                    value={formatNumber(stats.total_parts)}
                    icon={Package}
                    color="#3b82f6"
                    loading={statsLoading}
                />
                <SummaryCard
                    title="Low Stock Warning"
                    value={formatNumber(stats.low_stock)}
                    subtext="Items below 20 qty"
                    icon={AlertTriangle}
                    color="#f59e0b"
                    loading={statsLoading}
                />
                <SummaryCard
                    title="Out of Stock"
                    value={formatNumber(stats.out_of_stock)}
                    subtext="Items with 0 qty"
                    icon={AlertCircle}
                    color="#ef4444"
                    loading={statsLoading}
                />
                <SummaryCard
                    title="Total Inventory Value"
                    value={formatCurrency(stats.total_value)}
                    icon={CheckCircle}
                    color="#10b981"
                    loading={statsLoading}
                />
            </div>

            {/* 2. Smart Filter Section */}
            <div className="card" style={{ padding: 16, marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Cari nama part atau nomor part..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        style={{ paddingLeft: 40, width: '100%' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <select
                        className="form-control"
                        value={filters.group_material}
                        onChange={(e) => handleFilterChange('group_material', e.target.value)}
                        style={{ minWidth: 160 }}
                    >
                        <option value="All">Semua Material</option>
                        {groups.group_materials.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>

                    <select
                        className="form-control"
                        value={filters.stock_status}
                        onChange={(e) => handleFilterChange('stock_status', e.target.value)}
                        style={{ minWidth: 160 }}
                    >
                        <option value="all">Semua Status</option>
                        <option value="in_stock">Tersedia {`(>20)`}</option>
                        <option value="low_stock">Stok Menipis {`(1-20)`}</option>
                        <option value="out_of_stock">Habis {`(0)`}</option>
                    </select>

                    <select
                        className="form-control"
                        value={filters.sort}
                        onChange={(e) => handleFilterChange('sort', e.target.value)}
                        style={{ minWidth: 160 }}
                    >
                        <option value="nama_part_asc">Nama (A-Z)</option>
                        <option value="nama_part_desc">Nama (Z-A)</option>
                        <option value="qty_high">Stok Tertinggi</option>
                        <option value="qty_low">Stok Terendah</option>
                    </select>
                </div>
            </div>

            {/* 3. Data Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                        <p className="text-secondary">Memuat data stok...</p>
                    </div>
                ) : parts.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center' }}>
                        <Package size={48} color="var(--text-light)" style={{ marginBottom: 16, opacity: 0.5 }} />
                        <h3>Tidak ada data ditemukan</h3>
                        <p className="text-secondary" style={{ maxWidth: 400, margin: '0 auto' }}>
                            Coba ubah filter pencarian atau pastikan data stok sudah diupload ke sistem.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                                    <tr>
                                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>No. Part</th>
                                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Nama Part</th>
                                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Group Material</th>
                                        <th style={{ padding: '16px', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Qty</th>
                                        <th style={{ padding: '16px', textAlign: 'center', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                                        <th style={{ padding: '16px', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parts.map((part, index) => {
                                        const status = getStockStatus(part.qty);
                                        return (
                                            <tr key={part.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                                                    {part.no_part}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>
                                                    {part.nama_part}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '0.9rem', color: '#64748b' }}>
                                                    {part.group_material || '-'}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                                                    {formatNumber(part.qty)}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <span className={`badge ${status.className}`} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => setAdjustModal(part)}
                                                        className="btn btn-outline btn-sm"
                                                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                                    >
                                                        <Edit3 size={14} /> Adjust
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Menampilkan <strong>{(page - 1) * 25 + 1}</strong> - <strong>{Math.min(page * 25, totalItems)}</strong> dari <strong>{totalItems}</strong> parts
                            </div>
                            <div className="pagination" style={{ margin: 0 }}>
                                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>←</button>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    // Logic for sliding window (simplified here)
                                    let p = i + 1;
                                    if (totalPages > 5 && page > 3) p = page - 2 + i;
                                    if (p > totalPages) return null;
                                    return <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
                                }).filter(Boolean)}
                                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>→</button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Adjust Modal */}
            {adjustModal && (
                <div className="modal-overlay" onClick={() => setAdjustModal(null)}>
                    <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Penyesuaian Stok</h2>
                            <button onClick={() => setAdjustModal(null)} className="btn btn-ghost btn-icon"><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 'var(--radius)', marginBottom: 20, border: '1px solid #e2e8f0' }}>
                                <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 4 }}>{adjustModal.nama_part}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{adjustModal.no_part}</div>
                                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="text-secondary">Stok Saat Ini:</span>
                                    <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>{formatNumber(adjustModal.qty)}</span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Jumlah Penyesuaian (+/-)</label>
                                <div className="input-with-icon" style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={adjustQty}
                                        onChange={(e) => setAdjustQty(e.target.value)}
                                        placeholder="0"
                                        style={{ fontSize: '1.1rem', fontWeight: 600 }}
                                        autoFocus
                                    />
                                </div>
                                {adjustQty && (
                                    <div style={{ marginTop: 8, padding: '8px 12px', background: '#eff6ff', borderRadius: 6, color: '#1e40af', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Estimasi Stok Baru:</span>
                                        <strong>{parseInt(adjustModal.qty) + parseInt(adjustQty || 0)}</strong>
                                    </div>
                                )}
                            </div>

                            <div className="form-group" style={{ marginTop: 16 }}>
                                <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Alasan Penyesuaian</label>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    placeholder="Contoh: Barang rusak, selisih opname..."
                                />
                            </div>
                        </div>
                        <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', padding: 20 }}>
                            <button onClick={() => setAdjustModal(null)} className="btn btn-outline">Batal</button>
                            <button onClick={handleAdjust} className="btn btn-primary">Simpan Penyesuaian</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
