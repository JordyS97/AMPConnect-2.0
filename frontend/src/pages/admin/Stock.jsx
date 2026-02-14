import { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { Search, Edit3, X, Plus, Minus, Package } from 'lucide-react';
import { formatNumber, getStockStatus } from '../../utils/formatters';
import api from '../../api/axios';

export default function Stock() {
    const [parts, setParts] = useState([]);
    const [groups, setGroups] = useState({ group_materials: [], group_parts: [] });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [groupMaterial, setGroupMaterial] = useState('All');
    const [stockFilter, setStockFilter] = useState('all');
    const [sort, setSort] = useState('nama_part_asc');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [adjustModal, setAdjustModal] = useState(null);
    const [adjustQty, setAdjustQty] = useState(0);
    const [adjustReason, setAdjustReason] = useState('');
    const { addToast } = useToast();

    useEffect(() => { fetchGroups(); }, []);
    useEffect(() => { fetchStock(); }, [page, sort, groupMaterial, stockFilter]);

    const fetchGroups = async () => {
        try { const res = await api.get('/parts/groups'); setGroups(res.data.data); } catch (err) { /* ignore */ }
    };

    const fetchStock = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/stock', { params: { page, limit: 25, sort, search, group_material: groupMaterial, stock_status: stockFilter } });
            setParts(res.data.data.parts);
            setTotalPages(res.data.data.totalPages);
        } catch (err) {
            addToast('Gagal memuat data stok', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdjust = async () => {
        if (!adjustQty || !adjustReason) { addToast('Isi jumlah dan alasan', 'warning'); return; }
        try {
            await api.post(`/admin/stock/${adjustModal.id}/adjust`, { quantity: parseInt(adjustQty), reason: adjustReason });
            addToast('Stok berhasil disesuaikan', 'success');
            setAdjustModal(null);
            setAdjustQty(0);
            setAdjustReason('');
            fetchStock();
        } catch (err) {
            addToast(err.response?.data?.message || 'Gagal menyesuaikan stok', 'error');
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>Manajemen Stok</h1>
                <p>Kelola stok part motor</p>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: 24 }}>
                <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchStock(); }} className="search-filters" style={{ marginBottom: 0 }}>
                    <div style={{ position: 'relative', flex: 2, minWidth: 200 }}>
                        <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-light)' }} />
                        <input type="text" className="form-control" placeholder="Cari part..."
                            value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
                    </div>
                    <select className="form-control filter-select" value={groupMaterial}
                        onChange={(e) => { setGroupMaterial(e.target.value); setPage(1); }}>
                        <option value="All">Semua Material</option>
                        {groups.group_materials.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select className="form-control filter-select" value={stockFilter}
                        onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}>
                        <option value="all">Semua Status</option>
                        <option value="in_stock">Tersedia (&gt;20)</option>
                        <option value="low_stock">Stok Rendah (1-20)</option>
                        <option value="out_of_stock">Habis (0)</option>
                    </select>
                    <select className="form-control filter-select" value={sort}
                        onChange={(e) => { setSort(e.target.value); setPage(1); }}>
                        <option value="nama_part_asc">Nama A-Z</option>
                        <option value="nama_part_desc">Nama Z-A</option>
                        <option value="qty_high">Stok Terbanyak</option>
                        <option value="qty_low">Stok Terendah</option>
                    </select>
                    <button type="submit" className="btn btn-primary"><Search size={16} /> Cari</button>
                </form>
            </div>

            {/* Table */}
            {loading ? (
                <div className="loading-spinner"><div className="spinner"></div></div>
            ) : (
                <div className="card">
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>No. Part</th>
                                    <th>Nama Part</th>
                                    <th>Group Material</th>
                                    <th>Group Part</th>
                                    <th>Qty</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parts.map(part => {
                                    const status = getStockStatus(part.qty);
                                    return (
                                        <tr key={part.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{part.no_part}</td>
                                            <td><strong>{part.nama_part}</strong></td>
                                            <td>{part.group_material || '-'}</td>
                                            <td>{part.group_part || '-'}</td>
                                            <td style={{ fontWeight: 700 }}>{formatNumber(part.qty)}</td>
                                            <td><span className={`badge ${status.className}`}>{status.label}</span></td>
                                            <td>
                                                <button onClick={() => setAdjustModal(part)} className="btn btn-outline btn-sm">
                                                    <Edit3 size={14} /> Adjust
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                const p = i + 1;
                                return <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
                            })}
                            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
                        </div>
                    )}
                </div>
            )}

            {/* Adjust Modal */}
            {adjustModal && (
                <div className="modal-overlay" onClick={() => setAdjustModal(null)}>
                    <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Penyesuaian Stok</h2>
                            <button onClick={() => setAdjustModal(null)} className="btn btn-ghost btn-icon"><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div style={{ padding: 12, background: '#f8fafc', borderRadius: 'var(--radius)', marginBottom: 16 }}>
                                <p style={{ fontWeight: 600 }}>{adjustModal.nama_part}</p>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{adjustModal.no_part}</p>
                                <p style={{ marginTop: 8 }}>Stok saat ini: <strong>{formatNumber(adjustModal.qty)}</strong></p>
                            </div>
                            <div className="form-group">
                                <label>Jumlah Penyesuaian (positif untuk tambah, negatif untuk kurang)</label>
                                <input type="number" className="form-control" value={adjustQty}
                                    onChange={(e) => setAdjustQty(e.target.value)} placeholder="Contoh: 10 atau -5" />
                                {adjustQty && (
                                    <p style={{ fontSize: '0.85rem', marginTop: 4, color: 'var(--text-secondary)' }}>
                                        Stok baru: <strong>{adjustModal.qty + parseInt(adjustQty || 0)}</strong>
                                    </p>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Alasan Penyesuaian</label>
                                <textarea className="form-control" rows={3} value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    placeholder="Jelaskan alasan penyesuaian stok..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setAdjustModal(null)} className="btn btn-outline">Batal</button>
                            <button onClick={handleAdjust} className="btn btn-primary">Simpan Penyesuaian</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
