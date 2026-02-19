import React from 'react';
import { Calendar, Users, RefreshCw, AlertTriangle } from 'lucide-react';

const DashboardKPIs = ({ data }) => {
    if (!data) return null;

    const cards = [
        {
            title: 'Avg Buying Cycle',
            value: `${data.avg_cycle} days`,
            sub: 'Based on active patterns',
            icon: Calendar,
            color: 'var(--primary)',
            bg: '#eff6ff',
            // No historical data for trend yet
            trend: null,
            trendClass: 'badge-secondary',
            barColor: 'var(--primary)',
            progress: 100 // Full bar as baseline
        },
        {
            title: 'Active Patterns',
            value: data.active_patterns,
            sub: 'Predictable customers',
            icon: Users,
            color: 'var(--secondary)',
            bg: '#f5f3ff',
            trend: null,
            trendClass: 'badge-secondary',
            barColor: 'var(--secondary)',
            progress: (data.active_patterns > 0 ? 100 : 0) // Simple non-empty check
        },
        {
            title: 'Repeat Purchase Rate',
            value: `${data.repeat_rate}%`,
            sub: 'Returning customers',
            icon: RefreshCw,
            color: 'var(--success)',
            bg: '#f0fdf4',
            trend: null,
            trendClass: 'badge-secondary',
            barColor: 'var(--success)',
            progress: parseFloat(data.repeat_rate)
        },
        {
            title: 'Revenue at Risk',
            value: `Rp ${data.revenue_at_risk?.toLocaleString() || 0}`,
            sub: `${data.overdue_count} overdue customers`,
            icon: AlertTriangle,
            color: 'var(--warning)',
            bg: '#fffbeb',
            trend: data.overdue_count > 0 ? '⚠️ Action Needed' : 'Good',
            trendClass: data.overdue_count > 0 ? 'badge-warning' : 'badge-success',
            barColor: 'var(--warning)',
            progress: data.overdue_count > 0 ? 100 : 0
        }
    ];

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            marginBottom: 20
        }}>
            {cards.map((card, index) => (
                <div key={index} style={{
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: 20,
                    boxShadow: 'var(--shadow)',
                    border: '1px solid var(--border-light)',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 'var(--radius)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 12,
                            background: card.bg,
                            color: card.color
                        }}>
                            <card.icon size={24} />
                        </div>
                        {card.trend && (
                            <span className={`badge ${card.trendClass}`}>
                                {card.trend}
                            </span>
                        )}
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <h3 className="stat-value">{card.value}</h3>
                        <p className="stat-label">{card.title}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: 8 }}>{card.sub}</p>

                        {/* Progress Bar */}
                        <div style={{
                            width: '100%',
                            height: 6,
                            background: 'var(--border-light)',
                            borderRadius: 999
                        }}>
                            <div
                                style={{
                                    height: '100%',
                                    borderRadius: 999,
                                    width: `${Math.min(card.progress, 100)}%`,
                                    background: card.barColor,
                                    transition: 'width 0.5s ease'
                                }}
                            ></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DashboardKPIs;
