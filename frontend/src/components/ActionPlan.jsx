import React from 'react';
import { CheckCircle } from 'lucide-react';

const ActionPlan = () => {
    // Static mockup as per request structure, ideally fetched dynamically
    const actions = [
        { priority: 'High', task: 'Call 8 overdue high-value customers (Rp 12.3M risk)', type: 'bg-red-50 text-red-700 border-red-200' },
        { priority: 'High', task: 'Order 25 TIRE RR units (stock critical)', type: 'bg-red-50 text-red-700 border-red-200' },
        { priority: 'Medium', task: 'Prepare quote for 18 customers due next week', type: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
        { priority: 'Medium', task: 'Launch win-back campaign for 23 at-risk customers', type: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
        { priority: 'Low', task: 'Plan April promotions (historically slow month)', type: 'bg-green-50 text-green-700 border-green-200' }
    ];

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">🎬 Recommended Actions</h3>
            <div className="space-y-3">
                {actions.map((action, i) => (
                    <div key={i} className={`flex items-start p-3 rounded-lg border ${action.type}`}>
                        <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider">{action.priority} Priority</span>
                            <p className="font-medium">{action.task}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActionPlan;
