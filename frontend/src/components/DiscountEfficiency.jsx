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
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: true, text: 'Discount % vs Frequency', color: '#374151', font: { weight: 'bold' } },
            tooltip: {
                callbacks: {
                    label: (ctx) => `Disc: ${ctx.parsed.x}%, Txs: ${ctx.parsed.y}`
                },
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#1f2937',
                bodyColor: '#4b5563',
                borderColor: '#e5e7eb',
                borderWidth: 1,
            }
        },
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
                title: { display: true, text: 'Avg Discount (%)' },
                grid: { color: '#f3f4f6' }
            },
            y: {
                title: { display: true, text: 'Purchases' },
                grid: { color: '#f3f4f6' }
            }
        }
    };

    return (
        <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>🏷️ Discount Efficiency</h3>
            <div style={{ height: 260 }}>
                <Scatter data={chartData} options={options} />
            </div>
            <p style={{ fontSize: '0.75rem', textAlign: 'center', color: 'var(--text-light)', marginTop: 12 }}>
                Higher discounts do not always equal higher retention. Look for the sweet spot.
            </p>
        </div>
    );
};

export default DiscountEfficiency;
