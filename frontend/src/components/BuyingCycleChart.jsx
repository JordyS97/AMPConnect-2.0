import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BuyingCycleChart = ({ lifecycleData }) => {
    // lifecycleData array of { customer_id, avg_cycle, ... }

    // Binning logic
    const bins = {
        '0-7 days': 0,
        '8-14 days': 0,
        '15-30 days': 0,
        '30-60 days': 0,
        '60+ days': 0
    };

    lifecycleData.forEach(d => {
        const cycle = d.avg_cycle;
        if (cycle <= 7) bins['0-7 days']++;
        else if (cycle <= 14) bins['8-14 days']++;
        else if (cycle <= 30) bins['15-30 days']++;
        else if (cycle <= 60) bins['30-60 days']++;
        else bins['60+ days']++;
    });

    const data = {
        labels: Object.keys(bins),
        datasets: [
            {
                label: 'Number of Customers',
                data: Object.values(bins),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderRadius: 4,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: {
                display: true,
                text: 'Customer Buying Cycle Distribution'
            },
        },
        scales: {
            y: { beginAtZero: true }
        }
    };

    return <Bar data={data} options={options} />;
};

export default BuyingCycleChart;
