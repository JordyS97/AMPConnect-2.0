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
        <div style={{ width: '100%', minHeight: '100%' }}>
            <div style={{ maxWidth: '100%', margin: '0 auto' }}>
                {/* A page title does not need to be a card. The bordered panel and
                    800-weight heading were spending a full row of vertical space
                    on a label. */}
                <div className="page-header">
                    <h1>Seasonal &amp; Buying Cycle Intelligence</h1>
                    <p>Retensi, musiman, dan perkiraan kebutuhan stok</p>
                </div>

                {/* 1. Overview KPIs */}
                <DashboardKPIs data={data.overview} />

                {/* 2. Buying Cycle Analysis */}
                <BuyingCycleSection data={data.buyingCycle} />

                {/* 3. Seasonality */}
                <SeasonalitySection data={data.seasonality} />

                {/* Main Content Grid: 3fr (Main Data) - 1fr (Sidebar/Actions) */}
                {/* The <style> block that used to live here re-serialised on every
                    render and defined .charts-grid-custom, which BuyingCycleSection
                    also depends on — so that component's layout silently relied on
                    this page being mounted. The rule now lives in index.css. */}
                <div className="charts-grid-custom">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* 4. Due Tracking */}
                        <CustomerDueSection data={data.dueTracking} />

                        {/* 6. Predictive Analytics */}
                        <PredictiveSection data={data.predictive} />

                        {/* 5. Product Cycles (Moved Here) */}
                        <ProductCycleTable data={data.productCycles} />
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
                    </div>
                </div>

                {/* 8. Cohort Analysis (Full Width Bottom) */}
                <div style={{ marginTop: 16 }}>
                    <CohortAnalysis data={data.cohorts} />
                </div>
            </div>
        </div>
    );
};

export default DashboardAnalytics;
