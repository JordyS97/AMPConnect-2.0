import axios from 'axios';
import { secureStorage } from '../utils/secureStorage';

const getBaseUrl = () => {
    let url = import.meta.env.VITE_API_URL || '/api';
    if (url !== '/api' && !url.endsWith('/api')) {
        url = url.endsWith('/') ? `${url}api` : `${url}/api`;
    }
    return url;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: { 'Content-Type': 'application/json' },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = secureStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token expiration & unauthorized access
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && [401, 403].includes(error.response.status)) {
            secureStorage.removeItem('token');
            secureStorage.removeItem('user');

            // Redirect based on current portal
            const isAdmin = window.location.pathname.startsWith('/admin');
            if (window.location.pathname !== '/admin/login' && window.location.pathname !== '/customer/login') {
                window.location.href = isAdmin ? '/admin/login' : '/customer/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
