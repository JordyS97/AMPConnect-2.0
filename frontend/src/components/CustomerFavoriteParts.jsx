import { useState, useEffect, useCallback } from 'react';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';
import api from '../api/axios';

const SORTS = [
    { key: 'qty', label: 'Quantity' },
    { key: 'value', label: 'Nilai' },
    { key: 'disc', label: 'Diskon' },
    { key: 'trx', label: 'Frekuensi' },
];

/**
 * What each customer actually buys, one row per (customer, part).
 *
 * The discount column is the weighted rate SUM(diskon)/SUM(price), not an
 * average of per-line percentages — a Rp 50k line should not move the number
 * as much as a Rp 5m one. It is colour-coded because discount depth is the
 * single lever with the clearest margin consequence in this data: the >=30%
 * band carries 30% of revenue at 10.4% GP, against 32.6% GP under 10%.
 */
export default function CustomerFavoriteParts({ filters }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState('qty');
    const [group, setGroup] = useState('All');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/customer-favorites', {
                params: { ...filters, page, limit: 25, sort, group_material: group },
            });
            setData(res.data.data);
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [filters, page, sort, group]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Any filter change invalidates the current page number.
    useEffect(() => { setPage(1); }, [filters, sort, group]);

    const discTone = (pct) => {
        const v = parseFloat(pct);
        if (!Number.isFinite(v)) return { color: 'var(--text-light)' };
        if (v >= 30) return { color: 'var(--danger-dark)', fontWeight: 600 };
        if (v >= 20) return { color: 'var(--warning-dark)', fontWeight: 600 };
        return { color: 'var(--text)' };
    };

    const rows = data?.rows ?? [];

    return (
        <div className="card" style={{ marginTop: 20 }}>
            <div className="section-head">
                <div>
                    <h3 className="section-title">
                        <Package size={16} strokeWidth={2} />
                        Part Favorit per Pelanggan
                    </h3>
                    <p className="section-sub">
                        Barang yang paling sering dipesan tiap pelanggan, dengan diskon rata-rata tertimbang
                    </p>
                </div>

                <div className="section-controls">
                    <select
                        className="control-select"
                        value={group}
                        onChange={(e) => setGroup(e.target.value)}
                        aria-label="Filter kategori"
                    >
                        <option value="All">Semua kategori</option>
                        {(data?.groups ?? []).map((g) => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>

                    <div className="segmented" role="group" aria-label="Urutkan">
                        {SORTS.map((s) => (
                            <button
                                key={s.key}
                                type="button"
                                className={`segmented-item ${sort === s.key ? 'is-active' : ''}`}
                                aria-pressed={sort === s.key}
                                onClick={() => setSort(s.key)}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading && !data ? (
                <div className="table-skeleton" aria-busy="true">
                    {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton-row" />)}
                </div>
            ) : rows.length === 0 ? (
                <div className="empty-state">
                    <p>Tidak ada data untuk filter ini.</p>
                </div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Pelanggan</th>
                                    <th>Mat Group</th>
                                    <th>No Part</th>
                                    <th>Nama Part</th>
                                    <th className="num">Qty</th>
                                    <th className="num">Trx</th>
                                    <th className="num">Nilai</th>
                                    <th className="num">Ø Diskon</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={`${r.customer_id}-${r.no_part}-${i}`}>
                                        <td className="cell-strong">{r.customer}</td>
                                        <td><span className="tag">{r.group_material}</span></td>
                                        <td className="cell-mono">{r.no_part}</td>
                                        <td className="cell-muted">{r.nama_part}</td>
                                        <td className="num cell-strong">{formatNumber(r.total_qty)}</td>
                                        <td className="num cell-muted">{r.trx_count}×</td>
                                        <td className="num">{formatCurrency(r.total_value)}</td>
                                        <td className="num" style={discTone(r.avg_disc_pct)}>
                                            {r.avg_disc_pct == null ? '—' : `${r.avg_disc_pct}%`}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="table-foot">
                        <span>
                            {formatNumber(data.total)} kombinasi pelanggan × part
                        </span>
                        <div className="pager">
                            <button
                                type="button"
                                className="pager-btn"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                aria-label="Halaman sebelumnya"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="pager-label">{page} / {data.totalPages}</span>
                            <button
                                type="button"
                                className="pager-btn"
                                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                                disabled={page >= data.totalPages}
                                aria-label="Halaman berikutnya"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
