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
                fetchAllData();
            }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const endpoints = [
                axios.get('http://localhost:5000/api/dashboard/overview'),
                axios.get('http://localhost:5000/api/dashboard/buying-cycle'),
                axios.get('http://localhost:5000/api/dashboard/seasonality'),
                axios.get('http://localhost:5000/api/dashboard/due-tracking'),
                axios.get('http://localhost:5000/api/dashboard/product-cycles'),
                axios.get('http://localhost:5000/api/dashboard/predictive'),
                axios.get('http://localhost:5000/api/dashboard/cohorts'),
                axios.get('http://localhost:5000/api/dashboard/rfm')
            ];

            const [
                overviewRes,
                cycleRes,
                seasonRes,
                dueRes,
                prodRes,
                predRes,
                cohortRes,
                rfmRes
            ] = await Promise.all(endpoints);

            setData({
                overview: overviewRes.data.data,
                buyingCycle: cycleRes.data.data,
                seasonality: seasonRes.data.data,
                dueTracking: dueRes.data.data,
                productCycles: prodRes.data.data,
                predictive: predRes.data.data,
                cohorts: cohortRes.data.data,
                rfm: rfmRes.data.data
            });

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-xl font-semibold text-gray-500 animate-pulse">Loading Analytics Intelligence...</div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Seasonal & Buying Cycle Intelligence</h1>
                    <p className="text-gray-500">Advanced analytics for retention, seasonality, and inventory forecasting.</p>
                </div>

                {/* 1. Overview KPIs */}
                <DashboardKPIs data={data.overview} />

                {/* 2. Buying Cycle Analysis */}
                <BuyingCycleSection data={data.buyingCycle} />

                {/* 3. Seasonality */}
                <SeasonalitySection data={data.seasonality} />

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Left Column (2/3) */}
                    <div className="xl:col-span-2">
                        {/* 4. Due Tracking */}
                        <CustomerDueSection data={data.dueTracking} />

                        {/* 6. Predictive Analytics */}
                        <PredictiveSection data={data.predictive} />

                        {/* 8. Cohort Analysis */}
                        <CohortAnalysis data={data.cohorts} />
                    </div>

                    {/* Right Column (1/3) */}
                    <div>
                        {/* 10. Action Plan (Priority List) */}
                        <ActionPlan />

                        {/* 9. RFM Segmentation */}
                        <RFMSegmentation data={data.rfm} />

                        {/* 5. Product Cycles */}
                        <ProductCycleTable data={data.productCycles} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardAnalytics;
