import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Scale } from 'lucide-react';
import { SERIES, CHROME } from '../utils/chartPalette';
import { formatCurrency, formatNumber } from '../utils/formatters';
import api from '../api/axios';

/**
 * Sales vs current stock, by group TOBPM.
 *
 * Sales value and stock value are both rupiah, so they share one axis — a
 * grouped bar, never a dual-axis chart. The ratio column (sales ÷ stock value)
 * is the read: a high ratio means the category sells far more than it holds
 * (thin cover, restock risk); a low ratio means capital is parked in slow
 * stock. TIRE ~16× vs NON TOBPM ~2× is the headline that donut-of-revenue
 * alone never showed.
 */
export default function SalesVsStock({ filters }) {
    const [rows, setRows] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        api.get('/admin/sales-vs-stock', { params: filters })
            .then(res => { if (alive) setRows(res.data.data || []); })
            .catch(() => { if (alive) setRows([]); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [filters?.startDate, filters?.endDate]);

    if (loading && !rows) {
        return (
            <div className="glass-card table-skeleton" aria-busy="true">
                {Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton-row" />)}
            </div>
        );
    }
    if (!rows || rows.length === 0) {
        return (
            <div className="glass-card">
                <div className="section-head">
                    <h3 className="section-title"><Scale size={16} /> Penjualan vs Stok per TOBPM</h3>
                </div>
                <div className="empty-state"><p>Belum ada data untuk periode ini.</p></div>
            </div>
        );
    }

    const labels = rows.map(r => r.tobpm);
    const chartData = {
        labels,
        datasets: [
            {
                label: 'Penjualan (Rp)',
                data: rows.map(r => r.net_sales),
                backgroundColor: SERIES[0],
                borderRadius: 4,
                borderSkipped: 'start',
                barPercentage: 0.9,
                categoryPercentage: 0.72,
            },
            {
                label: 'Nilai stok (Rp)',
                data: rows.map(r => r.stock_value),
                backgroundColor: SERIES[3],
                borderRadius: 4,
                borderSkipped: 'start',
                barPercentage: 0.9,
                categoryPercentage: 0.72,
            },
        ],
    };

    const options = {
        indexAxis: 'y', // horizontal — long TOBPM labels read straight
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 14, color: '#52514e', font: { size: 12 } },
            },
            tooltip: {
                backgroundColor: CHROME.ink,
                padding: 10,
                cornerRadius: 8,
                callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` },
            },
        },
        scales: {
            x: {
                beginAtZero: true,
                grid: { color: CHROME.grid, drawTicks: false },
                border: { display: false },
                ticks: {
                    color: CHROME.label, font: { size: 11 },
                    callback: (v) => v >= 1e6 ? `${Math.round(v / 1e6)}jt` : v,
                },
            },
            y: {
                grid: { display: false },
                border: { color: CHROME.axis },
                ticks: { color: CHROME.label, font: { size: 11 } },
            },
        },
    };

    const ratio = (r) => r.stock_value > 0 ? r.net_sales / r.stock_value : null;
    const ratioTone = (v) => {
        if (v == null) return { color: 'var(--text-light)' };
        if (v >= 8) return { color: 'var(--success-dark)', fontWeight: 600 };   // fast — thin cover
        if (v < 2) return { color: 'var(--danger-dark)', fontWeight: 600 };     // capital parked
        return { color: 'var(--text)' };
    };

    return (
        <div className="glass-card">
            <div className="section-head">
                <div>
                    <h3 className="section-title"><Scale size={16} /> Penjualan vs Stok per TOBPM</h3>
                    <p className="section-sub">Nilai jual dibanding nilai stok saat ini · rasio tinggi = perputaran cepat, stok tipis</p>
                </div>
            </div>

            <div className="chart-canvas" style={{ height: Math.max(240, rows.length * 42) }}>
                <Bar data={chartData} options={options} />
            </div>

            <div className="table-container" style={{ marginTop: 18 }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>TOBPM</th>
                            <th className="num">Penjualan</th>
                            <th className="num">Qty jual</th>
                            <th className="num">Nilai stok</th>
                            <th className="num">Stok</th>
                            <th className="num">SKU</th>
                            <th className="num">Rasio jual:stok</th>
                            <th className="num">GP%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => {
                            const rt = ratio(r);
                            return (
                                <tr key={r.tobpm}>
                                    <td className="cell-strong">{r.tobpm}</td>
                                    <td className="num">{formatCurrency(r.net_sales)}</td>
                                    <td className="num cell-muted">{formatNumber(r.qty_sold)}</td>
                                    <td className="num">{formatCurrency(r.stock_value)}</td>
                                    <td className="num cell-muted">{formatNumber(r.stock_qty)}</td>
                                    <td className="num cell-muted">{r.sku_count}</td>
                                    <td className="num" style={ratioTone(rt)}>{rt == null ? '—' : `${rt.toFixed(1)}×`}</td>
                                    <td className="num cell-muted">{r.gp_pct == null ? '—' : `${r.gp_pct}%`}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
