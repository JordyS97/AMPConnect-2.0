import { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
Calendar, Filter, TrendingUp, TrendingDown,
AlertCircle, DollarSign, Activity, PieChart,
ArrowRight, ShoppingBag
}
    from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';

export default function SpendingAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        category: 'Semua'
    });
    const { addToast } = useToast();

    // Color Palette for Categories
    const CATEGORY_COLORS = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ];

    useEffect(() => {
        fetchData();
    }, [filters]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.category && filters.category !== 'Semua') params.append('category', filters.category);

            const res = await api.get(`/customer/trends?${params.toString()}`);
            setData(res.data.data);
        } catch (error) {
            console.error(error);
            addToast('Gagal memuat data analisis belanja', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) return (
        <div className="loading-spinner">
            <div className="spinner"></div>
            <p style={{ marginTop: 12, color: '#64748b' }}>Menganalisis pengeluaran Anda...</p>
        </div>
    );

    if (!data) return null;

    const { summary, insights, monthlySpending, spendingByGroup, topParts } = data;

    // Chart Data Preparation
    const trendChartData = {
        labels: monthlySpending.map(d => {
            const date = new Date(d.month + '-01');
            return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        }),
        datasets: [{
            label: 'Total Belanja',
            data: monthlySpending.map(d => d.total),
            borderColor: '#3b82f6',
            backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
                gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
                return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#3b82f6',
            pointBorderWidth: 2
        }]
    };

    const categoryChartData = {
        labels: spendingByGroup.map(g => g.group_name),
        datasets: [{
            data: spendingByGroup.map(g => g.total),
            backgroundColor: CATEGORY_COLORS,
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    return (
        <div className="analytics-page fade-in">
            {/* Header & Sticky Filter */}
            <div className="page-header sticky-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(248, 250, 252, 0.95)', backdropFilter: 'blur(8px)', padding: '16px 0', margin: '0 -24px 24px -24px', paddingLeft: 24, paddingRight: 24, borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Analisis Belanja</h1>
                        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Wawasan mendalam tentang pola pembelian Anda</p>
                    </div>

                    {/* Filter Bar */}
                    <div className="filter-bar" style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#ffffff', padding: 8, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                        <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: 8, borderRight: '1px solid #f1f5f9', paddingRight: 12 }}>
                            <Calendar size={16} color="#64748b" />
                            <select
                                value={filters.startDate} // Simplified for now (could be range picker)
                                onChange={(e) => {
                                    // Logic for quick ranges could go here
                                    // For now just manual inputs or presets
                                }}
                                style={{ border: 'none', fontSize: '0.9rem', color: '#334155', background: 'transparent', cursor: 'pointer' }}
                            >
                                <option value="">Semua Waktu</option>
                                {/* Add logic for "Last 3 Months" etc if needed, acting as triggers */}
                            </select>
                        </div>

                        <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Filter size={16} color="#64748b" />
                            <select
                                value={filters.category}
                                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                style={{ border: 'none', fontSize: '0.9rem', color: '#334155', background: 'transparent', cursor: 'pointer', outline: 'none' }}
                            >
                                <option value="Semua">Semua Kategori</option>
                                <option value="OIL">Oli</option>
                                <option value="TIRE">Ban</option>
                                <option value="BATTERY">Aki</option>
                                <option value="SPARK PLUG">Busi</option>
                                <option value="BRAKE SHOE">Kampas Rem</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Smart Insights Panel */}
            {insights.length > 0 && (
                <div className="insights-panel" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', borderRadius: 16, padding: 20, marginBottom: 24, border: '1px solid #bae6fd', display: 'flex', gap: 16, alignItems: 'start' }}>
                    <div style={{ background: '#ffffff', padding: 10, borderRadius: '50%', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)' }}>
                        <AlertCircle size={24} color="#0ea5e9" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0369a1', marginBottom: 4 }}>Smart Insights</h3>
                        <ul style={{ margin: 0, paddingLeft: 20, color: '#334155', fontSize: '0.9rem' }}>
                            {insights.map((insight, i) => (
                                <li key={i} style={{ marginBottom: 4 }}>{insight}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* KPI Grid */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 24 }}>
                {/* Hero KPI: Total Spending */}
                <div className="stat-card hero" style={{ gridColumn: 'span 2', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <div className="stat-label" style={{ color: '#94a3b8' }}>Total Belanja (Periode Ini)</div>
                            <div className="stat-value" style={{ fontSize: '2rem', color: '#fff', margin: '8px 0' }}>{formatCurrency(summary.total_spent)}</div>
                            <div className="trend-indicator" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: summary.mom_growth >= 0 ? '#4ade80' : '#f87171' }}>
                                {summary.mom_growth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                <span>{Math.abs(summary.mom_growth).toFixed(1)}% {summary.mom_growth >= 0 ? 'Naik' : 'Turun'} vs bulan lalu</span>
                            </div>
                        </div>
                        <div className="icon-bg" style={{ background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 12 }}>
                            <DollarSign size={32} color="#fff" />
                        </div>
                    </div>
                </div>

                {/* Spending Health Score */}
                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div className="stat-label">Kesehatan Belanja</div>
                        <Activity size={20} color={summary.health_score > 70 ? '#10b981' : '#f59e0b'} />
                    </div>
                    <div className="health-score-container" style={{ textAlign: 'center', position: 'relative' }}>
                        <div className="score-ring" style={{ width: 100, height: 100, borderRadius: '50%', background: `conic-gradient(${summary.health_score > 70 ? '#10b981' : '#f59e0b'} ${summary.health_score}%, #f1f5f9 0)`, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 84, height: 84, background: '#fff', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{summary.health_score}</span>
                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>/100</span>
                            </div>
                        </div>
                        <p style={{ marginTop: 8, fontSize: '0.85rem', color: '#64748b' }}>
                            {summary.health_score > 70 ? 'Sangat Baik' : summary.health_score > 50 ? 'Cukup Baik' : 'Perlu Perhatian'}
                        </p>
                    </div>
                </div>

                {/* Forecast */}
                <div className="stat-card">
                    <div className="stat-label">Prediksi Bulan Depan</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', marginTop: 8 }}>{formatCurrency(summary.forecast_next_month)}</div>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 8 }}>
                        Estimasi berdasarkan tren 3 bulan terakhir.
                    </p>
                    <div style={{ marginTop: 16, height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: '100%', height: '100%', background: '#cbd5e1', borderRadius: 2 }}></div> {/* Placeholder bar */}
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
                {/* Monthly Trend */}
                <div className="card">
                    <div className="card-header">
                        <h3>Tren Belanja Bulanan</h3>
                        <button className="btn-icon"><TrendingUp size={16} /></button>
                    </div>
                    <div style={{ height: 300 }}>
                        <Line
                            data={trendChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        mode: 'index',
                                        intersect: false,
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        titleColor: '#0f172a',
                                        bodyColor: '#475569',
                                        borderColor: '#e2e8f0',
                                        borderWidth: 1,
                                        callbacks: {
                                            label: function (context) {
                                                let label = context.dataset.label || '';
                                                if (label) {
                                                    label += ': ';
                                                }
                                                if (context.parsed.y !== null) {
                                                    label += formatCurrency(context.parsed.y);
                                                }
                                                return label;
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        grid: { color: '#f1f5f9' },
                                        ticks: { callback: (val) => val >= 1000000 ? val / 1000000 + 'jt' : val }
                                    },
                                    x: { grid: { display: false } }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="card">
                    <div className="card-header">
                        <h3>Belanja per Kategori</h3>
                    </div>
                    <div style={{ height: 220, position: 'relative' }}>
                        <Doughnut
                            data={categoryChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                cutout: '70%',
                                plugins: { legend: { display: false } }
                            }}
                        />
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Top Kategori</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                                {spendingByGroup.length > 0 ? spendingByGroup[0].group_name : '-'}
                            </div>
                        </div>
                    </div>
                    <div className="legend-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
                        {spendingByGroup.slice(0, 6).map((cat, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}></div>
                                <span style={{ color: '#475569', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.group_name}</span>
                                <span style={{ fontWeight: 600 }}>{((cat.total / summary.total_spent) * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Parts List - Enhanced */}
            <div className="card">
                <div className="card-header" style={{ marginBottom: 16 }}>
                    <h3>Top 10 Part Paling Sering Dibeli</h3>
                    <button className="btn btn-sm btn-outline">Lihat Semua</button>
                </div>
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: 50 }}>#</th>
                                <th>Nama Part</th>
                                <th>Harga Satuan</th>
                                <th style={{ textAlign: 'center' }}>Qty</th>
                                <th style={{ textAlign: 'right' }}>Total Nilai</th>
                                <th style={{ width: 100 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {topParts.map((part, index) => (
                                <tr key={index}>
                                    <td>
                                        <div style={{
                                            width: 24, height: 24, borderRadius: '50%',
                                            background: index < 3 ? '#fbbf24' : '#f1f5f9',
                                            color: index < 3 ? '#fff' : '#64748b',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.75rem', fontWeight: 700
                                        }}>
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500, color: '#1e293b' }}>{part.nama_part}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{part.no_part}</div>
                                    </td>
                                    <td style={{ color: '#64748b' }}>{formatCurrency(part.unit_price)}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{part.total_qty}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>
                                        {formatCurrency(part.total_value)}
                                        <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, marginTop: 4, width: '100%', maxWidth: 100, marginLeft: 'auto' }}>
                                            <div style={{ height: '100%', borderRadius: 2, background: '#3b82f6', width: `${(part.total_value / topParts[0].total_value) * 100}%` }}></div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="btn btn-xs btn-ghost" title="Reorder">
                                            <ShoppingBag size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
