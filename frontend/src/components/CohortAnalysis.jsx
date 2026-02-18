import React from 'react';

const CohortAnalysis = ({ data }) => {
    if (!data) return null;

    const getRetentionColor = (val) => {
        val = parseFloat(val);
        if (val >= 80) return 'bg-blue-600 text-white';
        if (val >= 60) return 'bg-blue-400 text-white';
        if (val >= 40) return 'bg-blue-200 text-blue-800';
        if (val >= 20) return 'bg-blue-100 text-blue-800';
        return 'bg-gray-50 text-gray-400';
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Cohort Retention Analysis</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-sm">
                    <thead>
                        <tr className="text-gray-500">
                            <th className="p-2 text-left">First Purchase</th>
                            <th className="p-2">Users</th>
                            <th className="p-2">Month 1</th>
                            <th className="p-2">Month 2</th>
                            <th className="p-2">Month 3</th>
                            <th className="p-2">Month 6</th>
                            <th className="p-2">Month 12</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i} className="border-b">
                                <td className="p-2 text-left font-medium">{row.cohort}</td>
                                <td className="p-2 text-gray-600">{row.total}</td>
                                {['m1', 'm2', 'm3', 'm6', 'm12'].map(m => (
                                    <td key={m} className={`p-2 border border-white ${getRetentionColor(row.retention[m])}`}>
                                        {row.retention[m] > 0 ? `${Math.round(row.retention[m])}%` : '-'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CohortAnalysis;
