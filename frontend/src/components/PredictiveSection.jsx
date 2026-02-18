import React from 'react';
import { TrendingUp, Package } from 'lucide-react';

const PredictiveSection = ({ data }) => {
    if (!data) return null;

    const { forecast, inventory } = data;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Sales Forecast */}
            <div className="bg-gradient-to-br from-indigo-900 to-blue-900 text-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-300" />
                    🔮 Predicted Sales (30 Days)
                </h3>
                <div className="space-y-4">
                    {forecast.map((week, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-blue-800 pb-2 last:border-0">
                            <div>
                                <p className="font-medium text-blue-100">{week.week}</p>
                                <p className="text-xs text-blue-300">Exp: {week.customers} customers</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg">Rp {(week.revenue / 1000000).toFixed(1)}M</p>
                                <p className="text-xs text-blue-300">Top: {week.top_product}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Inventory Recs */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-gray-500" />
                    Stock Recommendations
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-gray-500 border-b">
                            <tr>
                                <th className="p-2">Part</th>
                                <th className="p-2">Stock</th>
                                <th className="p-2">Need</th>
                                <th className="p-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventory.map((item, i) => (
                                <tr key={i} className="border-b">
                                    <td className="p-2 font-medium">{item.part}</td>
                                    <td className="p-2">{item.current}</td>
                                    <td className="p-2 font-bold text-blue-600">{item.needed}</td>
                                    <td className="p-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold
                                            ${item.status === 'Urgent' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PredictiveSection;
