import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import api from '../../api/axios';
import Logo from '../../components/Logo';

export default function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) { addToast('Silakan isi semua field', 'warning'); return; }
        setLoading(true);
        try {
            const res = await api.post('/auth/admin/login', { username, password });
            login(res.data.token, res.data.user);
            addToast('Login berhasil!', 'success');
            navigate('/admin/dashboard');
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data?.message || err.message || 'Login gagal';
            addToast(status === 401 ? msg : `Error: ${msg}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-center">
            <picture>
                <source media="(max-width: 700px)" srcSet="/admin-showroom-sm.webp" />
                {/* Decorative: the showroom carries no information the admin
                    needs, so empty alt + aria-hidden keeps it out of the
                    accessibility tree. */}
                <img
                    className="auth-center-bg"
                    src="/admin-showroom.webp"
                    alt=""
                    aria-hidden="true"
                    width="2400"
                    height="1344"
                    fetchpriority="high"
                />
            </picture>

            <div className="auth-glass">
                <div className="auth-glass-head">
                    <Logo size={38} tone="light" />
                    <div className="auth-glass-title">Portal Administrasi</div>
                    <div className="auth-glass-sub">Masuk untuk mengelola penjualan dan stok</div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 18 }}>
                        <label htmlFor="admin-username">Username</label>
                        <div className="auth-input-wrap">
                            <User size={17} className="auth-icon" />
                            <input
                                id="admin-username"
                                type="text"
                                className="glass-input"
                                placeholder="admin"
                                autoComplete="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: 22 }}>
                        <label htmlFor="admin-password">Password</label>
                        <div className="auth-input-wrap">
                            <Lock size={17} className="auth-icon" />
                            <input
                                id="admin-password"
                                type={showPassword ? 'text' : 'password'}
                                className="glass-input"
                                placeholder="••••••••"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ paddingRight: 44 }}
                            />
                            <button
                                type="button"
                                className="auth-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                            >
                                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="glass-submit" disabled={loading}>
                        {loading ? 'Memproses...' : 'Masuk'}
                    </button>
                </form>

                <div className="auth-glass-foot">
                    Akses terbatas untuk staf AMPConnect
                </div>
            </div>
        </div>
    );
}
