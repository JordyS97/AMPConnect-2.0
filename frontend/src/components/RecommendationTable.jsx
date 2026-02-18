import React from 'react';

const RecommendationTable = ({ data }) => {
    // data: array of follow-up items
    // { name, prev_purchase, avg_cycle, next_expected, days_until_due, status, phone }

    const getStatusColor = (status) => {
        switch (status) {
            case 'Overdue': return 'bg-red-100 text-red-800';
            case 'Due Soon': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-green-100 text-green-800';
        }
    };

    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
            {(!data || data.length === 0) ? (
                <div className="p-4 text-center text-gray-500">No overdue customers found. Good job!</div>
            ) : (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Purchase</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Cycle</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Due</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.slice(0, 10).map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{row.name}</div>
                                    <div className="text-xs text-gray-500">{row.phone || '-'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.last_purchase}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.avg_cycle} Days</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {row.next_expected}
                                    <div className={`text-xs ${row.days_until_due < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                        {row.days_until_due < 0 ? `${Math.abs(row.days_until_due)} days late` : `in ${row.days_until_due} days`}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(row.status)}`}>
                                        {row.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded">Follow Up</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default RecommendationTable;
