import React from 'react';
import { Calendar, Users, RefreshCw, AlertTriangle } from 'lucide-react';

const DashboardKPIs = ({ data }) => {
    if (!data) return null;

    // Every card previously carried a progress bar, but only repeat_rate had a
    // real 0-100 value: the other three were hardcoded to 100 or to a
    // binary 100/0. Three of four bars were decoration shaped like data, and
    // together with the 48px icons they were what made this strip so tall.
    // The bars are gone; the figures are the point.
    const cards = [
        {
            title: 'Avg Buying Cycle',
            value: data.avg_cycle,
            unit: 'hari',
            sub: 'rata-rata jeda antar pembelian',
            icon: Calendar,
        },
        {
            title: 'Active Patterns',
            value: data.active_patterns,
            unit: 'pelanggan',
            sub: 'punya pola beli yang terbaca',
            icon: Users,
        },
        {
            title: 'Repeat Purchase Rate',
            value: data.repeat_rate,
            unit: '%',
            sub: 'beli lebih dari sekali (12 bln)',
            icon: RefreshCw,
        },
        {
            title: 'Revenue at Risk',
            value: `Rp ${Number(data.revenue_at_risk || 0).toLocaleString('id-ID')}`,
            sub: `${data.overdue_count} pelanggan lewat jatuh tempo`,
            icon: AlertTriangle,
            // The only card where a state is genuinely being asserted, so the
            // only one that gets colour.
            tone: data.overdue_count > 0 ? 'warn' : null,
        },
    ];

    return (
        <div className="kpi-row">
            {cards.map((card, index) => (
                <div key={index} className="kpi-tile">
                    <div className="kpi-tile-head">
                        <span className="kpi-tile-title">{card.title}</span>
                        <card.icon size={15} strokeWidth={2} className="kpi-tile-icon" />
                    </div>
                    <div className={`kpi-tile-value ${card.tone === 'warn' ? 'is-warn' : ''}`}>
                        {card.value}
                        {card.unit && <span className="kpi-tile-unit">{card.unit}</span>}
                    </div>
                    <div className="kpi-tile-sub">{card.sub}</div>
                </div>
            ))}
        </div>
    );
};

export default DashboardKPIs;
