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
            borderRadius: 8,
            barThickness: 50
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
                        <div className="kpi-label">Total Revenue (Month)</div>
                        <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb', width: 36, height: 36, borderRadius: 10 }}>
                            <DollarSign size={18} />
                        </div>
                    </div>
                    <div className="kpi-value">{formatCurrency(todayStats.total_sales).replace('Rp', '')}</div>
                    <div className={`kpi-trend ${salesGrowth >= 0 ? 'up' : 'down'}`}>
                        {salesGrowth >= 0 ? '↑' : '↓'} {Math.abs(salesGrowth).toFixed(1)}% vs Last Month
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="kpi-label">Total Transactions</div>
                        <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a', width: 36, height: 36, borderRadius: 10 }}>
                            <ShoppingCart size={18} />
                        </div>
                    </div>
                    <div className="kpi-value">{formatNumber(todayStats.transactions)}</div>
                    <div className="kpi-trend up">
                        ↑ Active
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="kpi-label">Gross Profit</div>
                        <div className="stat-icon" style={{ background: '#fae8ff', color: '#7c3aed', width: 36, height: 36, borderRadius: 10 }}>
                            <TrendingUp size={18} />
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
                        <div className="stat-icon" style={{ background: '#fff7ed', color: '#ea580c', width: 36, height: 36, borderRadius: 10 }}>
                            <Percent size={18} />
                        </div>
                    </div>
                    <div className="kpi-value">{formatPercent(todayStats.avg_gp)}</div>
                    <div className="kpi-trend up">
                        target
                    </div>
                </div>
            </div>

            {/* 2. PRIMARY INSIGHT AREA (2-Column) */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
                {/* Hero Chart - Sales Trend */}
                <div className="glass-card">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 24 }}>Sales Trend Overview</h3>
                    <div style={{ height: 320 }}>
                        <Line
                            data={areaChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    x: { grid: { display: false }, ticks: { maxTicksLimit: 8, color: '#94a3b8' } },
                                    y: { border: { display: false }, grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', callback: (val) => val >= 1000 ? `${val / 1000}k` : val } }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Revenue Composition */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Revenue Composition</h3>
                    <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: 24 }}>Sales by Product Category</p>

                    <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center' }}>
                        <Doughnut
                            data={donutData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                cutout: '75%',
                                plugins: { legend: { display: false } }
                            }}
                        />
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{formatNumber(salesByGroup.reduce((a, b) => a + Number(b.total), 0) / 1000000)}M+</div>
                        </div>
                    </div>
                    <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {salesByGroup.slice(0, 4).map((g, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: donutColors[i] }}></div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{g.group_name}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. SECONDARY INSIGHT AREA (2-Column) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Ranked List - Top Products */}
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Top Performing Products</h3>
                        <Link to="/admin/analytics/inventory" style={{ fontSize: '0.85rem', color: '#2563eb' }}>View All</Link>
                    </div>
                    <div>
                        {topParts.slice(0, 5).map((part, i) => {
                            // Calculate simple percentage relative to top item for bar width
                            const maxVal = Number(topParts[0].total_value);
                            const percent = (Number(part.total_value) / maxVal) * 100;

                            return (
                                <div key={i} className="ranked-item">
                                    <div className={`rank-badge top-${i + 1}`}>{i + 1}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{part.nama_part}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                                            <span>{part.no_part}</span>
                                            <span>{formatCurrency(part.total_value)}</span>
                                        </div>
                                        <div className="progress-thin">
                                            <div className="bar" style={{ width: `${percent}%`, background: i === 0 ? '#2563eb' : i === 1 ? '#3b82f6' : '#93c5fd' }}></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Monthly Comparison */}
                <div className="glass-card">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 24 }}>Monthly Comparison</h3>
                    <div style={{ height: 250, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 40, paddingBottom: 20 }}>
                        <Bar
                            data={monthCompData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    x: { grid: { display: false } },
                                    y: { display: false }
                                }
                            }}
                        />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#2563eb', lineHeight: 1 }}>
                            {salesGrowth >= 0 ? '+' : ''}{salesGrowth.toFixed(1)}%
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: 8 }}>
                            Growth vs Previous Month
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
