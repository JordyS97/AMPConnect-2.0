/**
 * Single source of truth for chart colour.
 *
 * Previously every chart page declared its own array of hues, so the same
 * category was blue on one screen and orange on the next, and several palettes
 * put two hues side by side that are indistinguishable to a colour-blind
 * reader.
 *
 * This order is validated: worst adjacent pair scores CVD deltaE 9.1 and
 * normal-vision deltaE 19.6 (targets are 8 and 15), so neighbouring series stay
 * separable under protanopia, deuteranopia and tritanopia.
 *
 * Assign in order and never cycle. A ninth series is not a generated hue — fold
 * the tail into "Lainnya" or facet the chart instead.
 */
export const SERIES = [
    '#2a78d6', // 1 blue
    '#008300', // 2 green
    '#e87ba4', // 3 magenta
    '#eda100', // 4 yellow
    '#1baf7a', // 5 aqua
    '#eb6834', // 6 orange
    '#4a3aa7', // 7 violet
    '#e34948', // 8 red
];

/** Reserved for state, never for a series. */
export const STATUS = {
    good: '#0ca30c',
    warning: '#fab219',
    serious: '#ec835a',
    critical: '#d03b3b',
};

/** Chart chrome — deliberately recessive so the marks carry the contrast. */
export const CHROME = {
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    label: '#898781',
    ink: '#0b0b0b',
    surface: '#ffffff',
};

/**
 * Categorical colours for n series, capped at the validated set.
 * Anything past the cap gets the muted "other" tone rather than an invented hue.
 */
export const seriesColors = (n) =>
    Array.from({ length: n }, (_, i) => SERIES[i] ?? '#b8b7b0');

/** Shared Chart.js options: recessive chrome, tabular figures, no chartjunk. */
export const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
        legend: {
            labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                boxWidth: 8,
                padding: 16,
                color: '#52514e',
                font: { size: 12 },
            },
        },
        tooltip: {
            backgroundColor: '#0b0b0b',
            padding: 12,
            cornerRadius: 8,
            titleFont: { size: 12, weight: '600' },
            bodyFont: { size: 12 },
            displayColors: true,
            boxWidth: 8,
            boxPadding: 4,
        },
    },
    scales: {
        x: {
            grid: { display: false },
            border: { color: CHROME.axis },
            ticks: { color: CHROME.label, font: { size: 11 } },
        },
        y: {
            grid: { color: CHROME.grid, drawTicks: false },
            border: { display: false },
            ticks: { color: CHROME.label, font: { size: 11 }, padding: 8 },
        },
    },
};
