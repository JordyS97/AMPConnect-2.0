import React from 'react';

const SeasonalitySection = ({ data }) => {
    if (!data) return <div className="p-4 bg-white rounded-xl shadow-sm">Loading Seasonality...</div>;

    const { heatmap, seasonalIndex } = data;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const categories = Object.keys(heatmap || {}).slice(0, 8); // Top 8 categories

    // Helper to determine cell color
    const getCellColor = (val, cat) => {
        if (!val) return 'bg-gray-50';
        // Normalize against category max
        const max = Math.max(...Object.values(heatmap[cat]));
        const ratio = val / (max || 1);

        if (ratio > 0.8) return 'bg-green-500 text-white';
        if (ratio > 0.5) return 'bg-green-300 text-green-900';
        return 'bg-green-100 text-green-800';
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            {/* Heatmap */}
            <div className="xl:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📅 Seasonal Heatmap</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr>
                                <th className="p-2 text-left text-gray-500">Category</th>
                                {months.map(m => <th key={m} className="p-2 text-center text-gray-500 text-xs">{m}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(cat => (
                                <tr key={cat} className="border-b">
                                    <td className="p-2 font-medium text-xs">{cat}</td>
                                    {months.map((_, idx) => {
                                        const m = idx + 1;
                                        const val = heatmap[cat][m];
                                        return (
                                            <td key={m} className={`p-1 text-center border border-white ${getCellColor(val, cat)}`}>
                                                <span className="text-[10px]">{val || '-'}</span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Seasonal Index Strength */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🌡️ Seasonal Strength Index</h3>
                <div className="space-y-4">
                    {seasonalIndex.slice(0, 5).map((item, i) => (
                        <div key={i}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-semibold">{item.category}</span>
                                <span className="text-gray-500">Idx: {item.index}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${Math.min(item.index * 100, 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                Peak: {months[item.peak_month - 1]} • Avg: {item.avg_monthly}/mo
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SeasonalitySection;
