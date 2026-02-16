import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { DollarSign, ShoppingCart, TrendingUp, Percent, AlertTriangle, PackageX, UserPlus, Upload as UploadIcon } from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Pie, Bar, Doughnut } from 'react-chartjs-2';
import api from '../../api/axios';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get('/admin/dashboard');
                setData(res.data.data);
            } catch (err) {
                addToast('Gagal memuat dashboard', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
    if (!data) return <div className="empty-state"><h3>Tidak ada data</h3></div>;

    const { todayStats, salesTrend, salesByGroup, topParts, monthlyComparison, alerts } = data;

    // Calculate trends (mock logic or derived where possible)
    const salesGrowth = monthlyComparison.last_month > 0
        ? ((monthlyComparison.this_month - monthlyComparison.last_month) / monthlyComparison.last_month) * 100
        : 100;

    // Chart Data Configs
    const areaChartData = {
        labels: salesTrend.map(s => s.date),
        datasets: [{
            label: 'Net Sales',
            data: salesTrend.map(s => s.total),
            borderColor: '#2563eb',
            backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, 'rgba(37, 99, 235, 0.25)');
                gradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)');
                return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#2563eb',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            borderWidth: 3
        }]
    };

    const donutColors = ['#2563eb', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];
    const donutData = {
        labels: salesByGroup.map(g => g.group_name),
        datasets: [{
            data: salesByGroup.map(g => g.total),
            backgroundColor: donutColors,
            borderWidth: 0,
            hoverOffset: 8
        }]
    };

    const monthCompData = {
        labels: ['Last Month', 'This Month'],
        datasets: [{
            data: [monthlyComparison.last_month, monthlyComparison.this_month],
            backgroundColor: ['#e2e8f0', '#2563eb'],
            barPercentage: 0.8,
            categoryPercentage: 0.9,
            borderRadius: 8,
            barThickness: 60
        }]
    };

    return (
        <div style={{ background: '#F6F8FB', minHeight: '100vh' }}>
            <div className="page-header" style={{ marginBottom: 32 }}>
                <h1 className="gradient-text" style={{ fontSize: '1.8rem', fontWeight: 800 }}>Sales Performance Dashboard</h1>
                <p>Real-time insights and performance analytics</p>
            </div>

            {/* 1. KPI STRIP */}
            <div className="kpi-strip">
                <div className="kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="kpi-label">Total Revenue</div>
                        <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb', width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div className="kpi-value">{formatCurrency(todayStats.total_sales).replace('Rp', '')}</div>
                    <div className={`kpi-trend ${salesGrowth >= 0 ? 'up' : 'down'}`}>
                        {salesGrowth >= 0 ? '↗' : '↘'} {Math.abs(salesGrowth).toFixed(1)}% vs Last Month
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="kpi-label">Transactions</div>
                        <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a', width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShoppingCart size={20} />
                        </div>
                    </div>
                    <div className="kpi-value">{formatNumber(todayStats.transactions)}</div>
                    <div className="kpi-trend up">
                        Active Now
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="kpi-label">Gross Profit</div>
                        <div className="stat-icon" style={{ background: '#fae8ff', color: '#7c3aed', width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div className="kpi-value">{formatCurrency(todayStats.gross_profit).replace('Rp', '')}</div>
                    <div className="kpi-trend up" style={{ color: '#7c3aed', background: '#f3e8ff' }}>
                        Healthy Margin
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="kpi-label">Average GP%</div>
                        <div className="stat-icon" style={{ background: '#fff7ed', color: '#ea580c', width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Percent size={20} />
                        </div>
                    </div>
                    <div className="kpi-value">{formatPercent(todayStats.avg_gp)}</div>
                    <div className="kpi-trend up">
                        On Target
                    </div>
                </div>
            </div>

            {/* 2. PRIMARY INSIGHT AREA (2-Column) */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
                {/* Hero Chart - Sales Trend */}
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Sales Trend Overview</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Daily net sales performance (Last 30 Days)</p>
                        </div>
                    </div>
                    <div style={{ height: 320 }}>
                        <Line
                            data={areaChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        enabled: true,
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        titleColor: '#0f172a',
                                        bodyColor: '#475569',
                                        borderColor: '#e2e8f0',
                                        borderWidth: 1,
                                        padding: 10,
                                        cornerRadius: 8,
                                        displayColors: false,
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
                                    x: { grid: { display: false }, ticks: { maxTicksLimit: 8, color: '#94a3b8', font: { size: 11 } } },
                                    y: { border: { display: false }, grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', callback: (val) => val >= 1000 ? `${val / 1000}k` : val } }
                                },
                                interaction: {
                                    mode: 'nearest',
                                    intersect: false,
                                },
                                elements: {
                                    point: { radius: 0, hitRadius: 20, hoverRadius: 6 }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Revenue Composition */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>Revenue Composition</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 24 }}>Net Sales by Product Category</p>

                    <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Doughnut
                            data={donutData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                cutout: '75%',
                                plugins: { legend: { display: false }, tooltip: { enabled: true } }
                            }}
                        />
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Total</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                                {formatNumber(salesByGroup.reduce((a, b) => a + Number(b.total), 0) / 1000000)}M+
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {salesByGroup.slice(0, 4).map((g, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: donutColors[i] }}></div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>{g.group_name}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. SECONDARY INSIGHT AREA (2-Column) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Ranked List - Top Products */}
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Top Performing Products</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Best sellers by revenue</p>
                        </div>
                        <Link to="/admin/analytics/inventory" style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>View All</Link>
                    </div>
                    <div>
                        {topParts.slice(0, 5).map((part, i) => {
                            // Calculate simple percentage relative to top item for bar width
                            const maxVal = Number(topParts[0].total_value);
                            const percent = (Number(part.total_value) / maxVal) * 100;
                            // Mock trend data for UI purposes as requested (API doesn't provide it yet)
                            const mockTrend = [12.5, 8.2, -2.4, 5.1, 1.8];

                            return (
                                <div key={i} className="ranked-item">
                                    <div className={`rank-badge top-${i + 1}`}>{i + 1}</div>
                                    <div className="product-info">
                                        <div className="product-part" style={{ marginBottom: 2, fontSize: '0.75rem', color: '#94a3b8' }}>{part.no_part}</div>
                                        <div className="product-name" style={{ marginBottom: 6 }}>{part.nama_part}</div>
                                        <div className="progress-thin">
                                            <div className="bar" style={{ width: `${percent}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="revenue-info">
                                        <div className="revenue-value">{formatCurrency(part.total_value).replace('Rp', '')}</div>
                                        <div className={`trend-badge ${mockTrend[i] >= 0 ? 'positive' : 'negative'}`}>
                                            {mockTrend[i] >= 0 ? '+' : ''}{mockTrend[i]}%
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Monthly Comparison */}
                <div className="glass-card">
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Monthly Comparison</h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Growth vs Previous Month</p>
                    </div>

                    <div style={{ height: 220, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 40, paddingBottom: 20 }}>
                        <Bar
                            data={monthCompData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                                scales: {
                                    x: { grid: { display: false }, ticks: { color: '#64748b', font: { weight: 500 } } },
                                    y: { display: false }
                                },
                                barPercentage: 0.8, // Increased for wider bars/less gap
                                categoryPercentage: 0.9
                            }}
                        />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 800, color: salesGrowth >= 0 ? '#2563eb' : '#ef4444', lineHeight: 1, letterSpacing: '-1px' }}>
                            {salesGrowth >= 0 ? '+' : ''}{salesGrowth.toFixed(1)}%
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: 8, fontWeight: 500 }}>
                            {salesGrowth >= 0 ? 'Increase' : 'Decrease'} in Revenue
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
