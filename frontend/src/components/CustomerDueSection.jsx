import React, { useState } from 'react';
import { Phone, Mail, MessageCircle, AlertTriangle } from 'lucide-react';

const CustomerDueSection = ({ data }) => {
    const [activeTab, setActiveTab] = useState('due'); // 'due' or 'overdue'

    if (!data) return <div className="p-4 bg-white rounded-xl shadow-sm">Loading Due List...</div>;

    const { due_this_week, overdue } = data;

    const renderAction = (type) => { // Simple mockup action types
        return <button className="text-blue-600 hover:text-blue-800 text-xs font-bold">Action</button>;
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">⏰ Customer Due Tracking</h3>
                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('due')}
                        className={`px-4 py-1 text-sm rounded-md transition-all ${activeTab === 'due' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}
                    >
                        Due This Week ({due_this_week.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('overdue')}
                        className={`px-4 py-1 text-sm rounded-md transition-all ${activeTab === 'overdue' ? 'bg-white shadow text-red-600 font-bold' : 'text-gray-500'}`}
                    >
                        Overdue Recovery ({overdue.length})
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-gray-500 text-sm border-b">
                            <th className="p-3">Customer</th>
                            <th className="p-3">{activeTab === 'due' ? 'Due Date' : 'Days Overdue'}</th>
                            <th className="p-3">Pattern</th>
                            <th className="p-3">Potential Value</th>
                            <th className="p-3">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {(activeTab === 'due' ? due_this_week : overdue).slice(0, 10).map((row, i) => (
                            <tr key={i} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-800">{row.name}</td>
                                <td className={`p-3 font-bold ${activeTab === 'overdue' ? 'text-red-500' : 'text-gray-700'}`}>
                                    {activeTab === 'due' ? new Date(row.due_date).toLocaleDateString() : `${row.overdue_days} days`}
                                </td>
                                <td className="p-3 text-gray-500">Every {row.cycle} days</td>
                                <td className="p-3 text-gray-800">
                                    Rp {(row.last_value || 0).toLocaleString()}
                                </td>
                                <td className="p-3">
                                    <div className="flex space-x-2">
                                        <button className="p-1 rounded bg-green-100 text-green-600 hover:bg-green-200"><MessageCircle size={16} /></button>
                                        <button className="p-1 rounded bg-blue-100 text-blue-600 hover:bg-blue-200"><Phone size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {(activeTab === 'due' ? due_this_week : overdue).length === 0 && (
                    <div className="text-center py-8 text-gray-400">No customers found in this category.</div>
                )}
            </div>
        </div>
    );
};

export default CustomerDueSection;
