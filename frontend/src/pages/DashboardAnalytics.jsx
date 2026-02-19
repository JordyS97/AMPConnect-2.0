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
            fetchSection('overview', 'overview');
            fetchSection('buying-cycle', 'buyingCycle');
            fetchSection('seasonality', 'seasonality');
            fetchSection('due-tracking', 'dueTracking');
            fetchSection('product-cycles', 'productCycles');
            fetchSection('predictive', 'predictive');
            fetchSection('cohorts', 'cohorts');
            fetchSection('rfm', 'rfm');
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

    return (
        <div className="main-content" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)' }}>
            <div style={{ maxWidth: '100%', margin: '0 auto' }}>
                <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--primary)' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                        Seasonal & Buying Cycle Intelligence
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Advanced analytics for retention, seasonality, and inventory forecasting.
                    </p>
                </div>

                {/* 1. Overview KPIs */}
                <DashboardKPIs data={data.overview} />

                {/* 2. Buying Cycle Analysis */}
                <BuyingCycleSection data={data.buyingCycle} />

                {/* 3. Seasonality */}
                <SeasonalitySection data={data.seasonality} />

                {/* Main Content Grid: 3fr (Main Data) - 1fr (Sidebar/Actions) */}
                <div className="charts-grid-custom">
                    <style>
                        {`
                            .charts-grid-custom {
                                display: grid;
                                grid-template-columns: 3fr 1fr;
                                gap: 16px;
                            }
                            @media (max-width: 1200px) {
                                .charts-grid-custom {
                                    grid-template-columns: 2fr 1fr;
                                }
                            }
                            @media (max-width: 1024px) {
                                .charts-grid-custom {
                                    grid-template-columns: 1fr;
                                }
                            }
                        `}
                    </style>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* 4. Due Tracking */}
                        <CustomerDueSection data={data.dueTracking} />

                        {/* 6. Predictive Analytics */}
                        <PredictiveSection data={data.predictive} />

                        {/* 8. Cohort Analysis */}
                        <CohortAnalysis data={data.cohorts} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* 10. Action Plan (Priority List) */}
                        <ActionPlan
                            overdueData={data.dueTracking?.overdue}
                            inventoryData={data.predictive?.inventory}
                        />

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
