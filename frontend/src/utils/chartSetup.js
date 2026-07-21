import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    BarElement,
    Filler
} from 'chart.js';

// BarElement was missing here. Bar charts only rendered because App.jsx eagerly
// imports every page, and an unrouted page (customer/Trends.jsx) happened to
// register it as a side effect. Code-splitting would have broken them silently.
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
);
