import { useState, useEffect } from 'react';
import { Bar, Line, Doughnut, Scatter } from 'react-chartjs-2';
import { Tag, TrendingDown, AlertTriangle, DollarSign, Percent, ArrowRight } from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';
import { useToast } from '../../components/Toast';
import api from '../../api/axios';

export default function PricingAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await api.get('/admin/price-analytics');
                setData(res.data.data);
            } catch (err) {
                addToast('Gagal memuat analitik harga', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
    if (!data) return <div className="empty-state"><h3>Belum ada data analitik harga</h3></div>;

    const { metrics, impact, trend, lists, alerts } = data;

    const trendChartData = {
        labels: trend.map(t => t.month),
        datasets: [
            {
                type: 'line',
                label: 'Discount %',
                data: trend.map(t => t.discount_percent),
                borderColor: '#ef4444',
                borderWidth: 2,
                yAxisID: 'y1',
                tension: 0.3
            },
            {
                type: 'bar',
                label: 'Total Discount (Rp)',
                data: trend.map(t => t.total_discount),
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                yAxisID: 'y'
            }
        ]
    };

    return (
        <div className="analytics-page">
            <div className="page-header">
                <h1>Analitik Harga & Diskon</h1>
                <p>Evaluasi efektivitas diskon dan margin produk</p>
            </div>

            {/* KPI Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fef2f2' }}><Tag size={24} color="#dc2626" /></div>
                    <div className="stat-value">{formatCurrency(metrics.total_discount)}</div>
                    <div className="stat-label">Total Diskon Diberikan</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fff1f2' }}><Percent size={24} color="#be123c" /></div>
                    <div className="stat-value">{formatPercent(metrics.discount_rate)}</div>
                    <div className="stat-label">Rate Diskon (vs Gross Sales)</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f0fdf4' }}><DollarSign size={24} color="#15803d" /></div>
                    <div className="stat-value">{formatCurrency(metrics.avg_discount_trx)}</div>
                    <div className="stat-label">Rata-rata Diskon per Trx</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#eff6ff' }}><Tag size={24} color="#2563eb" /></div>
                    <div className="stat-value">{metrics.trx_with_discount} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b' }}>({formatPercent((metrics.trx_with_discount / (metrics.trx_with_discount + metrics.trx_no_discount)) * 100)})</span></div>
                    <div className="stat-label">Transaksi dengan Diskon</div>
                </div>
            </div>

            <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginTop: 24 }}>
                {/* Impact Analysis */}
                <div className="card">
                    <h3>📉 Analisis Dampak Diskon</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 16 }}>
                        <div className="impact-box" style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
                            <h4 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: 8 }}>Rata-rata Nilai Transaksi (AOV)</h4>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2563eb' }}>{formatCurrency(impact.discounted.avg_ticket)}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Dengan Diskon</div>
                                </div>
                                <ArrowRight size={20} color="#94a3b8" />
                                <div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#475569' }}>{formatCurrency(impact.no_discount.avg_ticket)}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tanpa Diskon</div>
                                </div>
                            </div>
                            <div style={{ marginTop: 8, fontSize: '0.8rem', color: impact.discounted.avg_ticket > impact.no_discount.avg_ticket ? 'var(--success)' : 'var(--danger)' }}>
                                {impact.discounted.avg_ticket > impact.no_discount.avg_ticket ? 'Lift Positif' : 'Lift Negatif'}: {formatPercent(((impact.discounted.avg_ticket - impact.no_discount.avg_ticket) / impact.no_discount.avg_ticket) * 100)}
                            </div>
                        </div>

                        <div className="impact-box" style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
                            <h4 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: 8 }}>Margin Keuntungan (GP%)</h4>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2563eb' }}>{formatPercent(impact.discounted.avg_gp)}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Dengan Diskon</div>
                                </div>
                                <ArrowRight size={20} color="#94a3b8" />
                                <div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#475569' }}>{formatPercent(impact.no_discount.avg_gp)}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tanpa Diskon</div>
                                </div>
                            </div>
                            <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#f59e0b' }}>
                                Margin Drop: {formatPercent(impact.no_discount.avg_gp - impact.discounted.avg_gp)} poin
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 24, height: 250 }}>
                        <h4>Tren Diskon Bulanan</h4>
                        <Bar
                            data={trendChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: { type: 'linear', display: true, position: 'left' },
                                    y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Alerts Section */}
                <div className="card">
                    <h3>⚠️ Alert Harga & Margin</h3>
                    <div className="tabs-sm" style={{ marginBottom: 16 }}>
                        <button className="active">High Discount</button>
                    </div>
                    <div className="table-container" style={{ maxHeight: 400, overflowY: 'auto' }}>
                        <table className="table-sm">
                            <thead><tr><th>Faktur</th><th>Diskon</th></tr></thead>
                            <tbody>
                                {alerts.high_discount.map((a, i) => (
                                    <tr key={i}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{a.no_faktur}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(a.tanggal).toLocaleDateString()}</div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#dc2626', fontWeight: 'bold' }}>{formatPercent(a.discount_percent)}</div>
                                            <div style={{ fontSize: '0.75rem' }}>{formatCurrency(a.total_discount)}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <h4 style={{ marginTop: 16, marginBottom: 8, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={16} /> Negative GP (Rugi)
                    </h4>
                    <div className="table-container" style={{ maxHeight: 200, overflowY: 'auto' }}>
                        <table className="table-sm">
                            <thead><tr><th>Faktur</th><th>GP%</th></tr></thead>
                            <tbody>
                                {alerts.negative_gp.map((a, i) => (
                                    <tr key={i}>
                                        <td>{a.no_faktur}</td>
                                        <td style={{ color: '#dc2626', fontWeight: 'bold' }}>{formatPercent(a.gp_percent)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
                {/* Top Parts */}
                <div className="card">
                    <h3>🏆 Top 10 Produk Didiskon (Value)</h3>
                    <div className="table-container">
                        <div style={{ height: 350 }}>
                            <Scatter
                                data={{
                                    datasets: [{
                                        label: 'Products',
                                        data: lists.top_parts.map(p => ({
                                            x: parseFloat(p.discount_percent),
                                            y: parseFloat(p.gp_percent),
                                            name: p.nama_part,
                                            no_part: p.no_part
                                        })),
                                        backgroundColor: lists.top_parts.map(p => {
                                            // Color coding: High Disc + Low GP = Red (Bad)
                                            // Low Disc + High GP = Green (Good)
                                            const disc = parseFloat(p.discount_percent);
                                            const gp = parseFloat(p.gp_percent);
                                            if (disc > 20 && gp < 10) return 'rgba(220, 38, 38, 0.7)'; // Red
                                            if (disc < 10 && gp > 20) return 'rgba(22, 163, 74, 0.7)'; // Green
                                            return 'rgba(37, 99, 235, 0.6)'; // Blue default
                                        }),
                                        pointRadius: 6,
                                        pointHoverRadius: 8
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: {
                                        x: {
                                            title: { display: true, text: 'Discount %' },
                                            min: 0
                                        },
                                        y: {
                                            title: { display: true, text: 'Gross Profit %' },
                                            beginAtZero: true
                                        }
                                    },
                                    plugins: {
                                        tooltip: {
                                            callbacks: {
                                                label: (ctx) => {
                                                    const p = ctx.raw;
                                                    return `${p.name} (${p.no_part}): Disc ${formatPercent(p.x)}, GP ${formatPercent(p.y)}`;
                                                }
                                            }
                                        },
                                        legend: { display: false }
                                    }
                                }}
                            />
                        </div>
                        <div style={{ marginTop: 12, fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: 16, justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(22, 163, 74, 0.7)' }}></span>
                                Safe (Low Disc, High GP)
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(220, 38, 38, 0.7)' }}></span>
                                Dangerous (High Disc, Low GP)
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Customers */}
                <div className="card">
                    <h3>👥 Top 10 Customer Penerima Diskon</h3>
                    <div className="table-container">
                        <table className="table-sm">
                            <thead><tr><th>Customer</th><th>Trx</th><th>Total Diskon</th></tr></thead>
                            <tbody>
                                {lists.top_customers.map((c, i) => (
                                    <tr key={i}>
                                        <td>{c.name}</td>
                                        <td>{c.trx_count}</td>
                                        <td>{formatCurrency(c.total_discount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
