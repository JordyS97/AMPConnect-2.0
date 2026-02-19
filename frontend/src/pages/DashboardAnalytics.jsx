import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DashboardKPIs from '../components/DashboardKPIs';
import BuyingCycleSection from '../components/BuyingCycleSection';
import SeasonalitySection from '../components/SeasonalitySection';
import CustomerDueSection from '../components/CustomerDueSection';
import ProductCycleTable from '../components/ProductCycleTable';
import PredictiveSection from '../components/PredictiveSection';
import CohortAnalysis from '../components/CohortAnalysis';
import RFMSegmentation from '../components/RFMSegmentation';
import ActionPlan from '../components/ActionPlan';
import DiscountEfficiency from '../components/DiscountEfficiency';

const DashboardAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        overview: null,
        buyingCycle: null,
        seasonality: null,
        dueTracking: null,
        productCycles: null,
        predictive: null,
        cohorts: null,
        rfm: null,
        discounts: null
    });

    useEffect(() => {
        // Fetch each section independently to avoid blocking the whole UI
        const loadData = () => {
            // 1. Overview
            fetchSection('overview', 'overview');
            // 2. Buying Cycle
            fetchSection('buying-cycle', 'buyingCycle');
            // 3. Seasonality
            fetchSection('seasonality', 'seasonality');
            // 4. Due Tracking
            fetchSection('due-tracking', 'dueTracking');
            // 5. Product Cycles
            fetchSection('product-cycles', 'productCycles');
            // 6. Predictive
            fetchSection('predictive', 'predictive');
            // 7. Cohorts
            fetchSection('cohorts', 'cohorts');
            // 8. RFM
            fetchSection('rfm', 'rfm');
            // 9. Discounts
            fetchSection('discounts', 'discounts');
        };

        loadData();
    }, []);

    const fetchSection = async (endpoint, key) => {
        try {
            const res = await api.get(`/dashboard/${endpoint}`);
            if (res.data && res.data.success) {
                setData(prev => ({ ...prev, [key]: res.data.data }));
            } else {
                console.warn(`API returned success:false for ${key}`, res.data);
            }
        } catch (error) {
            console.error(`Error fetching ${key}:`, error);
        }
    };

    // Check if at least overview is loaded to show the main structure, 
    // but we want to render immediately so individual components can show their loading states.
    // So we effectively remove the global loading check.


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

                        {/* 7. Discount Efficiency */}
                        <DiscountEfficiency data={data.discounts} />

                        {/* 5. Product Cycles */}
                        <ProductCycleTable data={data.productCycles} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardAnalytics;
