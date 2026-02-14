import axios from 'axios';

const getBaseUrl = () => {
    let url = import.meta.env.VITE_API_URL || '/api';
    if (url !== '/api' && !url.endsWith('/api')) {
        url = url.endsWith('/') ? `${url}api` : `${url}/api`;
    }
    console.log('🔌 API Base URL:', url); // Debug log
    return url;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: { 'Content-Type': 'application/json' },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            const isAdmin = window.location.pathname.startsWith('/admin');
            window.location.href = isAdmin ? '/admin/login' : '/customer/login';
        }
        return Promise.reject(error);
    }
);

export default api;
