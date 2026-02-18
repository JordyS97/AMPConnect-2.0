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
            color: 'text-blue-600',
            bg: 'bg-blue-100'
        },
        {
            title: 'Active Patterns',
            value: data.active_patterns,
            sub: 'Predictable customers',
            icon: Users,
            color: 'text-green-600',
            bg: 'bg-green-100'
        },
        {
            title: 'Repeat Purchase Rate',
            value: `${data.repeat_rate}%`,
            sub: 'Returning customers',
            icon: RefreshCw,
            color: 'text-purple-600',
            bg: 'bg-purple-100'
        },
        {
            title: 'Revenue at Risk',
            value: `Rp ${data.revenue_at_risk?.toLocaleString() || 0}`,
            sub: `${data.overdue_count} overdue customers`,
            icon: AlertTriangle,
            color: 'text-red-600',
            bg: 'bg-red-100'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {cards.map((card, index) => (
                <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className={`p-3 rounded-full ${card.bg} mr-4`}>
                        <card.icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm">{card.title}</p>
                        <h3 className="text-xl font-bold text-gray-800">{card.value}</h3>
                        <p className="text-xs text-gray-400">{card.sub}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DashboardKPIs;
