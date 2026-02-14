import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { DollarSign, ShoppingCart, TrendingUp, Percent, AlertTriangle, PackageX, UserPlus, Upload as UploadIcon } from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';
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
    const colors = ['#2563eb', '#7c3aed', '#16a34a', '#eab308', '#dc2626', '#0891b2', '#db2777', '#ea580c', '#4f46e5', '#059669'];

    const lineData = {
        labels: salesTrend.map(s => s.date),
        datasets: [{ label: 'Net Sales', data: salesTrend.map(s => s.total), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', fill: true, tension: 0.4 }],
    };

    const pieData = {
        labels: salesByGroup.map(g => g.group_name),
        datasets: [{ data: salesByGroup.map(g => g.total), backgroundColor: colors.slice(0, salesByGroup.length) }],
    };

    const barData = {
        labels: topParts.map(p => p.nama_part.length > 20 ? p.nama_part.slice(0, 20) + '...' : p.nama_part),
        datasets: [{ label: 'Qty Terjual', data: topParts.map(p => p.total_qty), backgroundColor: '#7c3aed', borderRadius: 6 }],
    };

    const compData = {
        labels: ['Bulan Lalu', 'Bulan Ini'],
        datasets: [{ data: [monthlyComparison.last_month, monthlyComparison.this_month], backgroundColor: ['#94a3b8', '#2563eb'], borderRadius: 8 }],
    };

    return (
        <div>
            <div className="page-header">
                <h1>Dashboard Admin</h1>
                <p>Ringkasan data bulan ini</p>
            </div>

            {/* Monthly Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#eff6ff' }}><DollarSign size={24} color="var(--primary)" /></div>
                    <div className="stat-value" style={{ fontSize: '1.3rem' }}>{formatCurrency(todayStats.total_sales)}</div>
                    <div className="stat-label">Penjualan Bulan Ini</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f0fdf4' }}><ShoppingCart size={24} color="var(--success)" /></div>
                    <div className="stat-value">{formatNumber(todayStats.transactions)}</div>
                    <div className="stat-label">Transaksi</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fae8ff' }}><TrendingUp size={24} color="var(--secondary)" /></div>
                    <div className="stat-value" style={{ fontSize: '1.3rem' }}>{formatCurrency(todayStats.gross_profit)}</div>
                    <div className="stat-label">Laba Kotor</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fef3c7' }}><Percent size={24} color="#d97706" /></div>
                    <div className="stat-value">{formatPercent(todayStats.avg_gp)}</div>
                    <div className="stat-label">Rata-rata GP%</div>
                </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
                <div className="chart-card"><h3>📈 Tren Penjualan (30 hari)</h3>
                    <div style={{ height: 280 }}><Line data={lineData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
                </div>
                <div className="chart-card"><h3>🥧 Penjualan per Kategori</h3>
                    <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } } }} />
                    </div>
                </div>
                <div className="chart-card"><h3>📊 Top 10 Part Terlaris</h3>
                    <div style={{ height: 280 }}><Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }} /></div>
                </div>
                <div className="chart-card"><h3>📅 Perbandingan Bulanan</h3>
                    <div style={{ height: 280 }}><Bar data={compData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} /></div>
                </div>
            </div>

            {/* Alerts */}
            <div className="alerts-grid">
                <div className="alert-card" style={{ background: '#fef3c7', border: '1px solid #fde047' }}>
                    <AlertTriangle size={24} color="#d97706" />
                    <div><div className="alert-count" style={{ color: '#92400e' }}>{alerts.low_stock}</div><div className="alert-label" style={{ color: '#a16207' }}>Stok Rendah</div></div>
                </div>
                <div className="alert-card" style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
                    <PackageX size={24} color="#dc2626" />
                    <div><div className="alert-count" style={{ color: '#991b1b' }}>{alerts.out_of_stock}</div><div className="alert-label" style={{ color: '#b91c1c' }}>Stok Habis</div></div>
                </div>
                <div className="alert-card" style={{ background: '#dcfce7', border: '1px solid #86efac' }}>
                    <UserPlus size={24} color="#16a34a" />
                    <div><div className="alert-count" style={{ color: '#166534' }}>{alerts.new_customers}</div><div className="alert-label" style={{ color: '#15803d' }}>Customer Baru</div></div>
                </div>
                <div className="alert-card" style={{ background: '#dbeafe', border: '1px solid #93c5fd' }}>
                    <UploadIcon size={24} color="#2563eb" />
                    <div><div className="alert-count" style={{ color: '#1e40af' }}>{alerts.pending_uploads}</div><div className="alert-label" style={{ color: '#1d4ed8' }}>Upload Pending</div></div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
                <h3 style={{ marginBottom: 16 }}>Aksi Cepat</h3>
                <div className="quick-links" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <Link to="/admin/upload" className="quick-link"><UploadIcon size={24} color="var(--primary)" /><strong>Upload Data Penjualan</strong></Link>
                    <Link to="/admin/upload" className="quick-link"><UploadIcon size={24} color="var(--secondary)" /><strong>Upload Data Stok</strong></Link>
                    <Link to="/admin/users" className="quick-link"><UserPlus size={24} color="var(--success)" /><strong>Lihat Semua Customer</strong></Link>
                    <Link to="/admin/reports" className="quick-link"><TrendingUp size={24} color="#d97706" /><strong>Buat Laporan</strong></Link>
                </div>
            </div>
        </div>
    );
}
