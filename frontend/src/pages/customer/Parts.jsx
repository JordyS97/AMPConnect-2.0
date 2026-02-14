import { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { Search, Filter } from 'lucide-react';
import { formatNumber, getStockStatus } from '../../utils/formatters';
import api from '../../api/axios';

export default function Parts() {
    const [parts, setParts] = useState([]);
    const [groups, setGroups] = useState({ group_materials: [], group_parts: [] });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [groupMaterial, setGroupMaterial] = useState('All');
    const [groupPart, setGroupPart] = useState('All');
    const [sort, setSort] = useState('nama_part_asc');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const { addToast } = useToast();

    useEffect(() => { fetchGroups(); }, []);
    useEffect(() => { fetchParts(); }, [page, sort, groupMaterial, groupPart]);

    const fetchGroups = async () => {
        try {
            const res = await api.get('/parts/groups');
            setGroups(res.data.data);
        } catch (err) { /* ignore */ }
    };

    const fetchParts = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 20, sort, search, group_material: groupMaterial, group_part: groupPart };
            const res = await api.get('/parts', { params });
            setParts(res.data.data.parts);
            setTotalPages(res.data.data.totalPages);
        } catch (err) {
            addToast('Gagal memuat data part', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchParts();
    };

    return (
        <div>
            <div className="page-header">
                <h1>Stok Part</h1>
                <p>Cari dan lihat ketersediaan part motor</p>
            </div>

            {/* Filters */}
            <form onSubmit={handleSearch} className="search-filters">
                <div className="search-input" style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-light)' }} />
                    <input type="text" className="form-control" placeholder="Cari nama atau nomor part..."
                        value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
                </div>
                <select className="form-control filter-select" value={groupMaterial}
                    onChange={(e) => { setGroupMaterial(e.target.value); setPage(1); }}>
                    <option value="All">Semua Material</option>
                    {groups.group_materials.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select className="form-control filter-select" value={groupPart}
                    onChange={(e) => { setGroupPart(e.target.value); setPage(1); }}>
                    <option value="All">Semua Group Part</option>
                    {groups.group_parts.map(g => <option key={g} value={g}>{g}</option>)}
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

            {/* Parts Grid */}
            {loading ? (
                <div className="loading-spinner"><div className="spinner"></div></div>
            ) : parts.length === 0 ? (
                <div className="empty-state"><h3>Part tidak ditemukan</h3><p>Coba ubah kata kunci pencarian</p></div>
            ) : (
                <>
                    <div className="parts-grid">
                        {parts.map(part => {
                            const status = getStockStatus(part.qty);
                            return (
                                <div key={part.id} className="part-card">
                                    <div className="part-number">{part.no_part}</div>
                                    <div className="part-name">{part.nama_part}</div>
                                    <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                                        {part.group_material && <span className="badge badge-info">{part.group_material}</span>}
                                        {part.group_part && <span className="badge badge-secondary">{part.group_part}</span>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div className={`part-qty ${status.qtyClass}`}>{formatNumber(part.qty)}</div>
                                        <span className={`badge ${status.className}`}>{status.label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                const p = page <= 3 ? i + 1 : page + i - 2;
                                if (p > totalPages || p < 1) return null;
                                return <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
                            })}
                            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
