import { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import api from '../../api/axios';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../components/Toast';
import { TrendingUp, ShoppingBag, PieChart, BarChart2 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

export default function SpendingAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/customer/trends');
                setData(res.data.data);
            } catch (err) {
                addToast('Gagal memuat data analisis', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
    if (!data) return <div>Data tidak tersedia</div>;

    const { summary, monthlySpending, spendingByGroup, topParts } = data;

    // Chart Data Preparation
    const monthlyData = {
        labels: monthlySpending.map(d => d.month),
        datasets: [{
            label: 'Total Belanja (Rp)',
            data: monthlySpending.map(d => d.total),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            fill: true,
            tension: 0.4
        }]
    };

    const categoryData = {
        labels: spendingByGroup.map(d => d.group_name),
        datasets: [{
            data: spendingByGroup.map(d => d.total),
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'],
            borderWidth: 0
        }]
    };

    const topPartsData = {
        labels: topParts.map(d => d.nama_part.substring(0, 15) + '...'), // Truncate names
        datasets: [{
            label: 'Qty Dibeli',
            data: topParts.map(d => d.total_qty),
            backgroundColor: '#10b981',
            borderRadius: 4
        }]
    };

    return (
        <div className="analytics-page">
            <div className="page-header">
                <h1>Analisis Belanja</h1>
                <p>Wawasan mendalam tentang pola pembelian Anda</p>
            </div>

            {/* Insight Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#eff6ff' }}><TrendingUp color="#3b82f6" /></div>
                    <div className="stat-value">{formatCurrency(summary.total_spent)}</div>
                    <div className="stat-label">Total Belanja (Seumur Hidup)</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f0fdf4' }}><ShoppingBag color="#10b981" /></div>
                    <div className="stat-value">{formatCurrency(summary.avg_transaction)}</div>
                    <div className="stat-label">Rata-rata per Transaksi</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fff7ed' }}><BarChart2 color="#f59e0b" /></div>
                    <div className="stat-value">{summary.most_active_month}</div>
                    <div className="stat-label">Bulan Teraktif</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f5f3ff' }}><PieChart color="#8b5cf6" /></div>
                    <div className="stat-value">{summary.unique_parts}</div>
                    <div className="stat-label">Jenis Part Dibeli</div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginTop: 24 }}>
                <div className="card">
                    <h3>Tren Belanja Bulanan</h3>
                    <div style={{ height: 300 }}>
                        <Line data={monthlyData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                    </div>
                </div>

                <div className="card">
                    <h3>Belanja per Kategori</h3>
                    <div style={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                        <Doughnut data={categoryData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
                    </div>
                </div>

                <div className="card" style={{ gridColumn: '1 / -1' }}>
                    <h3>Top 10 Part Paling Sering Dibeli</h3>
                    <div style={{ height: 300 }}>
                        <Bar data={topPartsData} options={{ maintainAspectRatio: false, indexAxis: 'y' }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
