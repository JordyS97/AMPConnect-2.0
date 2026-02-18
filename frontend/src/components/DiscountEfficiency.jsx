import React from 'react';
import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

const DiscountEfficiency = ({ data }) => {
    if (!data) return null;

    // Data comes as { x: avg_discount, y: transaction_count, r: 5 }
    // Ensure data format matches Chart.js requirements
    const chartData = {
        datasets: [{
            label: 'Discount Impact',
            data: data,
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderColor: 'rgba(255, 99, 132, 1)',
        }]
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: true, text: 'Discount % vs Frequency' },
            tooltip: {
                callbacks: {
                    label: (ctx) => `Disc: ${ctx.parsed.x}%, Txs: ${ctx.parsed.y}`
                }
            }
        },
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
                title: { display: true, text: 'Avg Discount (%)' }
            },
            y: {
                title: { display: true, text: 'Purchases' }
            }
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">🏷️ Discount Efficiency</h3>
            <div className="h-64">
                <Scatter data={chartData} options={options} />
            </div>
            <p className="text-xs text-center text-gray-400 mt-2">
                Higher discounts do not always equal higher retention. Look for the sweet spot.
            </p>
        </div>
    );
};

export default DiscountEfficiency;
