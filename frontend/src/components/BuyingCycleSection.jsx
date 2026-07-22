import React from 'react';
import { Bar } from 'react-chartjs-2';
import { STATUS, CHROME } from '../utils/chartPalette';

// Elements are registered once in utils/chartSetup.js, imported from main.jsx.
// The per-file re-registration that used to sit here was one of seven competing
// call sites for a single global registry.

const BuyingCycleSection = ({ data }) => {
    // Was "card p-8 text-center animate-pulse" — three of those are Tailwind
    // classes and this project has no Tailwind, so the loading state rendered
    // as unstyled text.
    if (!data) {
        return (
            <div className="card table-skeleton" aria-busy="true">
                {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton-row" />)}
            </div>
        );
    }

    const { patterns, distribution } = data;

    const labels = Object.keys(distribution);
    const values = Object.values(distribution);
    const totalCustomers = values.reduce((a, b) => a + b, 0);

    // The old chart passed 4 colours for 7 buckets, so Chart.js cycled them:
    // "46-60 days" was rendered the same green as "0-7 days". Colour tracked
    // position in a repeating list, not meaning. Worse, the legend underneath
    // described 0-30 / 31-60 / 60+ while the chart plotted seven different
    // buckets — the key did not describe the chart it sat next to.
    //
    // Now each bucket maps to the band the legend actually names, so colour
    // carries one consistent meaning and the key is true.
    const bandOf = (label) => {
        const upper = parseInt(label, 10);
        if (label.startsWith('90+')) return 'risk';
        if (upper <= 30) return 'frequent';
        if (upper <= 60) return 'regular';
        return 'risk';
    };
    const BAND_COLOR = { frequent: STATUS.good, regular: STATUS.warning, risk: STATUS.critical };

    const chartData = {
        labels,
        datasets: [{
            label: 'Pelanggan',
            data: values,
            backgroundColor: labels.map((l) => BAND_COLOR[bandOf(l)]),
            borderWidth: 0,
            // Rounded only on the data end, anchored to the baseline.
            borderRadius: 4,
            borderSkipped: 'start',
            barThickness: 18,
        }],
    };

    const options = {
        // Horizontal. Seven category labels in a narrow sidebar column forced a
        // 45-degree rotation that overlapped and clipped; on the y-axis they
        // read straight, and the bars fill the column height that was empty.
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        // A distribution that loads once does not need to animate in.
        animation: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: {
                backgroundColor: CHROME.ink,
                padding: 10,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: (ctx) => {
                        const pct = totalCustomers ? (ctx.raw / totalCustomers) * 100 : 0;
                        return `${ctx.raw} pelanggan · ${pct.toFixed(0)}%`;
                    },
                },
            },
        },
        scales: {
            x: {
                beginAtZero: true,
                grid: { color: CHROME.grid, drawTicks: false },
                border: { display: false },
                ticks: { color: CHROME.label, font: { size: 11 }, precision: 0 },
            },
            y: {
                grid: { display: false },
                border: { color: CHROME.axis },
                ticks: { color: CHROME.label, font: { size: 11 } },
            },
        },
    };

    return (
        <div className="charts-grid-custom" style={{ marginBottom: 20 }}>
            {/* Pattern List */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ padding: 6, background: '#eff6ff', borderRadius: 6, color: 'var(--primary)' }}>🔄</span>
                        Customer Purchase Patterns
                    </h3>
                    <span className="badge badge-secondary">{patterns.length} Active Patterns</span>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Avg Cycle</th>
                                <th>Last Purchase</th>
                                <th>Next Due</th>
                                <th>Confidence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patterns.map((p, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 500 }}>{p.customer}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontWeight: 'bold' }}>{p.avg_cycle}</span> days
                                            {/* Mini visual bar */}
                                            <div style={{ width: 50, height: 4, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                                <div
                                                    style={{
                                                        height: '100%',
                                                        background: p.avg_cycle < 30 ? 'var(--success)' : p.avg_cycle < 60 ? 'var(--warning)' : 'var(--danger)',
                                                        width: `${Math.min((p.avg_cycle / 90) * 100, 100)}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(p.last_purchase).toLocaleDateString()}</td>
                                    <td>
                                        <span style={{ color: 'var(--primary)', fontWeight: 600, background: '#eff6ff', padding: '2px 6px', borderRadius: 4 }}>
                                            {new Date(p.next_due).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 60, height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                                <div
                                                    style={{
                                                        height: '100%',
                                                        background: p.confidence === 'High' ? 'var(--success)' : p.confidence === 'Medium' ? 'var(--warning)' : 'var(--text-light)',
                                                        width: p.confidence === 'High' ? '90%' : p.confidence === 'Medium' ? '60%' : '30%'
                                                    }}
                                                ></div>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.confidence}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Distribution Chart */}
            <div className="card chart-card">
                <div className="section-head">
                    <div>
                        <h3 className="section-title">Sebaran Siklus Beli</h3>
                        <p className="section-sub">{totalCustomers} pelanggan dengan pola terbaca</p>
                    </div>
                </div>

                <div className="chart-canvas chart-canvas-tall">
                    <Bar data={chartData} options={options} />
                </div>

                {/* Three rows, not seven tinted panels. The key now matches the
                    bands the chart is actually coloured by. */}
                <ul className="legend-list">
                    <li>
                        <span className="legend-dot" style={{ background: STATUS.good }} />
                        <span className="legend-label">0–30 hari</span>
                        <span className="legend-meta">Sering</span>
                    </li>
                    <li>
                        <span className="legend-dot" style={{ background: STATUS.warning }} />
                        <span className="legend-label">31–60 hari</span>
                        <span className="legend-meta">Reguler</span>
                    </li>
                    <li>
                        <span className="legend-dot" style={{ background: STATUS.critical }} />
                        <span className="legend-label">60+ hari</span>
                        <span className="legend-meta">Berisiko</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default BuyingCycleSection;
