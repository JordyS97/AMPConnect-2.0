import { createContext, useContext, useState, useEffect } from 'react';
import { secureStorage } from '../utils/secureStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedToken = secureStorage.getItem('token');
        const savedUser = secureStorage.getItem('user');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = (tokenData, userData) => {
        secureStorage.setItem('token', tokenData);
        secureStorage.setItem('user', JSON.stringify(userData));
        setToken(tokenData);
        setUser(userData);
    };

    const logout = () => {
        secureStorage.removeItem('token');
        secureStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const updateUser = (userData) => {
        const updated = { ...user, ...userData };
        secureStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export default AuthContext;
