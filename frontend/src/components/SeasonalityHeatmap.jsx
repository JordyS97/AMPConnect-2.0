import React from 'react';

const SeasonalityHeatmap = ({ data }) => {
    // data format: { "Category A": { "1": 100, "2": 200, ... }, "Category B": ... }
    // months: 1..12

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const categories = Object.keys(data || {});

    // Find max value for color scaling
    let maxVal = 0;
    categories.forEach(cat => {
        Object.values(data[cat]).forEach(val => {
            if (val > maxVal) maxVal = val;
        });
    });

    const getColor = (val) => {
        if (!val) return 'bg-gray-100';
        const intensity = Math.min(Math.ceil((val / maxVal) * 5), 5);
        // Simple 5-step blue scale
        const colors = [
            'bg-blue-50', 'bg-blue-100', 'bg-blue-300', 'bg-blue-500', 'bg-blue-700 text-white'
        ];
        return colors[intensity - 1] || 'bg-gray-50';
    };

    if (!data || categories.length === 0) return <div className="p-4 text-center text-gray-500">No seasonality data available</div>;

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
                <thead>
                    <tr>
                        <th className="px-2 py-1 text-left text-gray-500">Category</th>
                        {months.map(m => (
                            <th key={m} className="px-2 py-1 text-center text-gray-500">{m}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {categories.map(cat => (
                        <tr key={cat} className="border-b border-gray-100">
                            <td className="px-2 py-2 font-medium text-gray-700 whitespace-nowrap">{cat}</td>
                            {months.map((m, idx) => {
                                const monthNum = idx + 1;
                                const val = data[cat][monthNum] || 0;
                                return (
                                    <td key={monthNum} className="p-1">
                                        <div
                                            className={`w-full h-8 rounded flex items-center justify-center ${getColor(val)}`}
                                            title={`${val} units`}
                                        >
                                            {val > 0 && <span className={`text-[10px] ${val > (maxVal * 0.6) ? 'text-white' : 'text-transparent hover:text-gray-600'}`}>{val}</span>}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SeasonalityHeatmap;
