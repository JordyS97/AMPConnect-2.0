import { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { DollarSign, TrendingUp, Calendar, Package } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';
import api from '../../api/axios';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function Trends() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchTrends = async () => {
            try {
                const res = await api.get('/customer/trends');
                setData(res.data.data);
            } catch (err) {
                addToast('Gagal memuat data tren', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchTrends();
    }, []);

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
    if (!data) return <div className="empty-state"><h3>Tidak ada data</h3></div>;

    const { summary, monthlySpending, spendingByGroup, topParts, purchaseFrequency } = data;

    const colors = ['#2563eb', '#7c3aed', '#16a34a', '#eab308', '#dc2626', '#0891b2', '#db2777', '#ea580c', '#4f46e5', '#059669'];

    const lineData = {
        labels: monthlySpending.map(m => m.month),
        datasets: [{
            label: 'Pengeluaran Bulanan',
            data: monthlySpending.map(m => m.total),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true, tension: 0.4, pointRadius: 4,
        }],
    };

    const pieData = {
        labels: spendingByGroup.map(g => g.group_name),
        datasets: [{
            data: spendingByGroup.map(g => g.total),
            backgroundColor: colors.slice(0, spendingByGroup.length),
        }],
    };

    const barData = {
        labels: topParts.map(p => p.nama_part.length > 20 ? p.nama_part.slice(0, 20) + '...' : p.nama_part),
        datasets: [{
            label: 'Jumlah Dibeli',
            data: topParts.map(p => p.total_qty),
            backgroundColor: '#7c3aed',
            borderRadius: 6,
        }],
    };

    const freqData = {
        labels: purchaseFrequency.map(p => p.month),
        datasets: [{
            label: 'Jumlah Transaksi',
            data: purchaseFrequency.map(p => p.count),
            backgroundColor: '#16a34a',
            borderRadius: 6,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
    };

    return (
        <div>
            <div className="page-header">
                <h1>Tren Pembelian</h1>
                <p>Analisis pola pembelian Anda</p>
            </div>

            {/* Summary */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#eff6ff' }}><DollarSign size={24} color="var(--primary)" /></div>
                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{formatCurrency(summary.total_spent)}</div>
                    <div className="stat-label">Total Belanja</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f0fdf4' }}><TrendingUp size={24} color="var(--success)" /></div>
                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{formatCurrency(summary.avg_transaction)}</div>
                    <div className="stat-label">Rata-rata Transaksi</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fef3c7' }}><Calendar size={24} color="#d97706" /></div>
                    <div className="stat-value" style={{ fontSize: '1.1rem' }}>{summary.most_active_month}</div>
                    <div className="stat-label">Bulan Teraktif</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fae8ff' }}><Package size={24} color="var(--secondary)" /></div>
                    <div className="stat-value">{formatNumber(summary.unique_parts)}</div>
                    <div className="stat-label">Jenis Part Dibeli</div>
                </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
                <div className="chart-card">
                    <h3>📈 Pengeluaran Bulanan (12 bulan terakhir)</h3>
                    <div style={{ height: 300 }}>
                        <Line data={lineData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} />
                    </div>
                </div>
                <div className="chart-card">
                    <h3>🥧 Belanja per Kategori Material</h3>
                    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } } }} />
                    </div>
                </div>
                <div className="chart-card">
                    <h3>📊 Top 10 Part Paling Sering Dibeli</h3>
                    <div style={{ height: 300 }}>
                        <Bar data={barData} options={{ ...chartOptions, indexAxis: 'y' }} />
                    </div>
                </div>
                <div className="chart-card">
                    <h3>📅 Frekuensi Pembelian per Bulan</h3>
                    <div style={{ height: 300 }}>
                        <Bar data={freqData} options={chartOptions} />
                    </div>
                </div>
            </div>
        </div>
    );
}
