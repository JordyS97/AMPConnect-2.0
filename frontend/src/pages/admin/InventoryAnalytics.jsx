import { useState, useEffect } from 'react';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Package, TrendingUp, TrendingDown, AlertCircle, Layers, Link as LinkIcon, Search } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';
import { useToast } from '../../components/Toast';
import api from '../../api/axios';
import { seriesColors, CHROME } from '../../utils/chartPalette';
import SalesVsStock from '../../components/SalesVsStock';

export default function InventoryAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bestTab, setBestTab] = useState('revenue'); // revenue, qty, gp_percent
    const [filters, setFilters] = useState({ startDate: '', endDate: '' });
    const { addToast } = useToast();

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/inventory-analytics', { params: filters });
            setData(res.data.data);
        } catch (err) {
            addToast('Gagal memuat analitik produk', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) return <div className="loading-spinner"><div className="spinner"></div></div>;
    if (!data && !loading) return <div className="empty-state"><h3>Belum ada data analitik produk</h3></div>;

    const { best, worst, health, category, cross_sell } = data;

    // The donut had ~35 slices and a legend wall that dwarfed the chart. Cap to
    // the top 8 categories by revenue and fold the long tail into "Lainnya", so
    // the legend is nine readable rows and colour comes from the validated,
    // colour-blind-safe palette (the 9th slot is the muted "other" tone — the
    // right meaning for the aggregated remainder).
    const sortedCats = [...category.group_part].sort((a, b) => Number(b.revenue) - Number(a.revenue));
    const TOP_N = 8;
    const topCats = sortedCats.slice(0, TOP_N);
    const tailTotal = sortedCats.slice(TOP_N).reduce((a, b) => a + Number(b.revenue), 0);
    const donutCats = tailTotal > 0
        ? [...topCats, { category: 'Lainnya', revenue: tailTotal }]
        : topCats;
    const totalRevenue = category.group_part.reduce((a, b) => a + Number(b.revenue), 0);

    const categoryChartData = {
        labels: donutCats.map(c => c.category || 'Lainnya'),
        datasets: [{
            data: donutCats.map(c => c.revenue),
            backgroundColor: seriesColors(donutCats.length),
            borderColor: '#fff',
            borderWidth: 2,
            hoverOffset: 6
        }]
    };

    return (
        <div className="analytics-page analytics-premium" style={{ background: '#F6F8FB', minHeight: '100vh', padding: 0 }}>
            <div className="page-header" style={{ marginBottom: 24 }}>
                <h1>Product Performance Dashboard</h1>
                <p>Real-time inventory insights and sales analytics</p>
            </div>

            {/* Filter Section */}
            <div className="glass-card" style={{ marginBottom: 32, padding: 20 }}>
                <div className="search-filters" style={{ marginBottom: 0 }}>
                    <div className="form-group" style={{ margin: 0, flex: 0, minWidth: 200 }}>
                        <label style={{ fontSize: '0.75rem' }}>Dari Tanggal</label>
                        <input type="date" className="form-control" value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: 0, minWidth: 200 }}>
                        <label style={{ fontSize: '0.75rem' }}>Sampai Tanggal</label>
                        <input type="date" className="form-control" value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
                    </div>
                    <button onClick={fetchAnalytics} className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
                        <Search size={16} /> Filter
                    </button>
                </div>
            </div>

            {/* Inventory Health Cards (Top Row - Optional/Keep subtle) */}
            <div className="stats-grid" style={{ gap: 24, marginBottom: 32 }}>
                <div className="glass-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div className="stat-icon" style={{ background: '#fff7ed', borderRadius: 12 }}><TrendingDown size={24} color="#ea580c" /></div>
                        <div>
                            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{health.slow_moving.length}</div>
                            <div className="stat-label">Slow Moving (&gt;60 days)</div>
                        </div>
                    </div>
                </div>
                <div className="glass-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div className="stat-icon" style={{ background: '#fef2f2', borderRadius: 12 }}><AlertCircle size={24} color="#dc2626" /></div>
                        <div>
                            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{health.dead_stock.length}</div>
                            <div className="stat-label">Dead Stock (&gt;90 days)</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid: Best Performers Table (Left) & Donut Chart (Right).
                Was an inline 1.6fr/1fr grid with no collapse; .analytics-split
                falls to one column under 768px. */}
            <div className="analytics-split" style={{ gap: 24, marginBottom: 24 }}>

                {/* Left: Top Product Performance Table */}
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ background: '#eff6ff', padding: 8, borderRadius: 10 }}><Package size={20} color="#2563eb" /></div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Top Product Performance</h3>
                        </div>
                        <div className="segmented-toggle">
                            <button className={bestTab === 'revenue' ? 'active' : ''} onClick={() => setBestTab('revenue')}>Revenue</button>
                            <button className={bestTab === 'qty' ? 'active' : ''} onClick={() => setBestTab('qty')}>Quantity</button>
                            <button className={bestTab === 'gp_percent' ? 'active' : ''} onClick={() => setBestTab('gp_percent')}>GP %</button>
                        </div>
                    </div>

                    <div className="table-container" style={{ maxHeight: 500, overflowY: 'auto', border: 'none', boxShadow: 'none' }}>
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th style={{ paddingLeft: 24 }}>Part Info</th>
                                    <th>Performance</th>
                                    <th style={{ textAlign: 'right', paddingRight: 24 }}>
                                        {bestTab === 'revenue' ? 'Total Sales' : bestTab === 'qty' ? 'Sold Qty' : 'Avg GP%'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {best[bestTab].map((item, i) => (
                                    <tr key={i}>
                                        <td style={{ paddingLeft: 24 }}>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.nama_part}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: 4 }}>{item.no_part}</div>
                                        </td>
                                        <td>
                                            {/* Simulated Trend + Indicator Bar */}
                                            <div className={`trend-indicator ${i < 3 ? 'trend-up' : 'trend-down'}`} style={{ marginBottom: 4 }}>
                                                {i < 3 ? '↑ High' : '• Stable'}
                                            </div>
                                            <div className="indicator-bar">
                                                <div className="indicator-fill" style={{ width: `${Math.max(10, 100 - (i * 5))}%` }}></div>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: 24 }}>
                                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                                                {bestTab === 'revenue' ? formatCurrency(item.total_value) :
                                                    bestTab === 'qty' ? formatNumber(item.total_value) :
                                                        formatPercent(item.avg_gp)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Revenue Per Category Donut Chart */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Revenue per Category</h3>
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>Sales distribution by product group</p>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 340 }}>
                        <Doughnut
                            data={categoryChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                cutout: '68%',
                                animation: false,
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                        labels: {
                                            usePointStyle: true,
                                            pointStyle: 'circle',
                                            boxWidth: 8,
                                            padding: 12,
                                            font: { size: 11, family: 'Inter' },
                                            color: '#52514e'
                                        }
                                    },
                                    tooltip: {
                                        backgroundColor: CHROME.ink,
                                        padding: 12,
                                        cornerRadius: 8,
                                        displayColors: true,
                                        boxPadding: 4,
                                        callbacks: {
                                            label: (ctx) => {
                                                const pct = totalRevenue ? (ctx.parsed / totalRevenue) * 100 : 0;
                                                return ` ${ctx.label}: ${formatCurrency(ctx.parsed)} · ${pct.toFixed(1)}%`;
                                            }
                                        }
                                    }
                                }
                            }}
                        />
                        {/* Center Text — sits over the ring, above the bottom legend. */}
                        <div style={{
                            position: 'absolute',
                            top: '42%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            pointerEvents: 'none'
                        }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total Revenue</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                                {formatCurrency(totalRevenue)}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Sales vs Stock by TOBPM — bar + detail table */}
            <div style={{ marginTop: 24 }}>
                <SalesVsStock filters={filters} />
            </div>

            {/* Bottom Section (Cross-Sell / Alerts) */}
            <div className="grid-2-cols" style={{ marginTop: 24, gap: 24 }}>
                {/* Cross Selling Opportunities */}
                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <div style={{ background: '#f0fdf4', padding: 8, borderRadius: 10 }}><LinkIcon size={20} color="#16a34a" /></div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Cross-Selling Insights</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Frequently bought together items</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {cross_sell.length > 0 ? (
                            cross_sell.slice(0, 5).map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: 12 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{item.name_a}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: '0.8rem' }}>
                                            <span>+</span>
                                            <span>{item.name_b}</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#16a34a' }}>{item.frequency}x</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Orders</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                                No cross-selling patterns detected yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Low Performing Alerts (Detailed) */}
                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <div style={{ background: '#fef2f2', padding: 8, borderRadius: 10 }}><AlertCircle size={20} color="#dc2626" /></div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Inventory Alerts</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Items requiring attention</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
                        {health.dead_stock.length > 0 ? (
                            health.dead_stock.slice(0, 5).map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #fee2e2', borderRadius: 12, background: '#fef2f2' }}>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#991b1b' }}>{item.nama_part}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>Dead Stock (&gt;90 days)</div>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#991b1b' }}>
                                        {item.qty} Qty
                                    </div>
                                </div>
                            ))
                        ) : health.slow_moving.length > 0 ? (
                            health.slow_moving.slice(0, 5).map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #ffedd5', borderRadius: 12, background: '#fff7ed' }}>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#9a3412' }}>{item.nama_part}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#c2410c' }}>Slow Moving (&gt;60 days)</div>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#9a3412' }}>
                                        {item.qty} Qty
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                                Inventory health is excellent!
                            </div>
                        )}
                        {health.dead_stock.length > 5 && (
                            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', marginTop: 8 }}>
                                +{health.dead_stock.length - 5} more dead stock items
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
