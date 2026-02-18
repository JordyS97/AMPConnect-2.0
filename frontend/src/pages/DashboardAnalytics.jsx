import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BuyingCycleChart from '../components/BuyingCycleChart';
import SeasonalityHeatmap from '../components/SeasonalityHeatmap';
import RecommendationTable from '../components/RecommendationTable';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Scatter } from 'react-chartjs-2';

ChartJS.register(...registerables);

const DashboardAnalytics = () => {
    const [lifecycleData, setLifecycleData] = useState(null);
    const [seasonalityData, setSeasonalityData] = useState(null);
    const [discountData, setDiscountData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Parallel fetch
                const [lifecycleRes, seasonalityRes, discountRes] = await Promise.all([
                    axios.get('/api/dashboard/lifecycle'),
                    axios.get('/api/dashboard/seasonality'),
                    axios.get('/api/dashboard/discounts')
                ]);

                setLifecycleData(lifecycleRes.data.data);
                setSeasonalityData(seasonalityRes.data.data);

                // Transform discount data for scatter plot
                // API return array of { x, y, r } but ChartJS format is [{x,y}]
                // We will use bubble/scatter
                setDiscountData(discountRes.data.data);

                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch dashboard data:", err);
                setError("Failed to load analytics data. Ensure backend is running.");
                setLoading(false);
            }
        };

        fetchData();

        // Auto refresh every 5 mins
        const interval = setInterval(fetchData, 300000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 text-center">Loading Analytics Dashboard...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    // Prepare Scatter Data
    const scatterChartData = {
        datasets: [{
            label: 'Discount vs Repeat Purchase',
            data: discountData, // {x: discount%, y: trans_count}
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
        }]
    };

    const scatterOptions = {
        scales: {
            x: { title: { display: true, text: 'Avg Discount (%)' }, beginAtZero: true },
            y: { title: { display: true, text: 'Transaction Count' }, beginAtZero: true }
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: (ctx) => `Disc: ${ctx.parsed.x}%, Txs: ${ctx.parsed.y}`
                }
            }
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Seasonal & Buying Cycle Intelligence</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-gray-500 text-sm font-medium">Avg Buying Cycle</h3>
                    <div className="text-3xl font-bold text-blue-600">{lifecycleData?.summary?.avg_cycle_all || 0} <span className="text-sm text-gray-400 font-normal">days</span></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-gray-500 text-sm font-medium">Customers Due This Week</h3>
                    <div className="text-3xl font-bold text-yellow-600">{lifecycleData?.summary?.customers_due_this_week || 0}</div>
                    <div className="text-xs text-red-500 mt-1">{lifecycleData?.summary?.overdue_count} Overdue</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-gray-500 text-sm font-medium">Most Seasonal Category</h3>
                    <div className="text-xl font-bold text-green-600 truncate">{seasonalityData?.most_seasonal || '-'}</div>
                </div>
            </div>

            {/* Row 1: Heatmap & Line */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Seasonality Heatmap</h3>
                    <SeasonalityHeatmap data={seasonalityData?.heatmap} />
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Discount Efficiency</h3>
                    <div className="h-64">
                        <Scatter data={scatterChartData} options={scatterOptions} />
                    </div>
                </div>
            </div>

            {/* Row 2: Histogram */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="h-64">
                    <BuyingCycleChart lifecycleData={lifecycleData?.lifecycle || []} />
                </div>
            </div>

            {/* Bottom: Recommendations */}
            <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Follow-Up Action Plan</h3>
                <RecommendationTable data={lifecycleData?.follow_up} />
            </div>
        </div>
    );
};

export default DashboardAnalytics;
