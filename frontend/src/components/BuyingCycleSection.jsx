import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BuyingCycleSection = ({ data }) => {
    if (!data) return <div className="p-4 bg-white rounded-xl shadow-sm">Loading Cycle Data...</div>;

    const { patterns, distribution } = data;

    const chartData = {
        labels: Object.keys(distribution),
        datasets: [
            {
                label: 'Customers',
                data: Object.values(distribution),
                backgroundColor: [
                    '#4ade80', '#4ade80', // Green for short
                    '#facc15', '#facc15', // Yellow for medium
                    '#fb923c', '#fb923c', // Orange for long
                    '#f87171'  // Red for very long
                ],
                borderRadius: 4
            }
        ]
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: true, text: 'Buying Cycle Distribution' }
        },
        scales: {
            y: { beginAtZero: true }
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Pattern List */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🔄 Customer Purchase Patterns</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-500 text-sm border-b">
                                <th className="p-2">Customer</th>
                                <th className="p-2">Avg Cycle</th>
                                <th className="p-2">Properties</th>
                                <th className="p-2">Next Due</th>
                                <th className="p-2">Confidence</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {patterns.map((p, i) => (
                                <tr key={i} className="border-b hover:bg-gray-50">
                                    <td className="p-2 font-medium">{p.customer}</td>
                                    <td className="p-2">{p.avg_cycle} days</td>
                                    <td className="p-2 text-gray-500 text-xs">Last: {p.last_purchase.split('T')[0]}</td>
                                    <td className="p-2 text-blue-600 font-medium">
                                        {new Date(p.next_due).toLocaleDateString()}
                                    </td>
                                    <td className="p-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                            ${p.confidence === 'High' ? 'bg-green-100 text-green-700' :
                                                p.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-600'}`}>
                                            {p.confidence}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Distribution Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <Bar data={chartData} options={options} />
                <div className="mt-4 text-xs text-gray-500">
                    <p>🟢 0-30 days: Frequent Buyers</p>
                    <p>🟡 31-60 days: Regular Buyers</p>
                    <p>🔴 60+ days: Infrequent/Risk</p>
                </div>
            </div>
        </div>
    );
};

export default BuyingCycleSection;
