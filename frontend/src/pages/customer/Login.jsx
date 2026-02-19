import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import api from '../../api/axios';

export default function CustomerLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) { addToast('Silakan isi semua field', 'warning'); return; }
        setLoading(true);
        try {
            console.log('API Base URL:', import.meta.env.VITE_API_URL || '/api (default)');
            const res = await api.post('/auth/login', { email, password });
            login(res.data.token, res.data.user);
            addToast('Login berhasil! Selamat datang.', 'success');
            navigate('/customer/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            const data = err.response?.data;
            if (data?.needsVerification) {
                navigate('/customer/verify-otp', { state: { email: data.email } });
                return;
            }
            addToast(data?.message || (err.message?.includes('Network') ? 'Tidak dapat terhubung ke server' : 'Login gagal'), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <img src="/logo.svg" alt="AMPConnect Logo" style={{ width: 60, height: 60, marginBottom: 16 }} />
                    <h1>AMPConnect</h1>
                    <p>Masuk ke akun customer Anda</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-light)' }} />
                            <input
                                type="email" className="form-control" placeholder="email@contoh.com"
                                value={email} onChange={(e) => setEmail(e.target.value)}
                                style={{ paddingLeft: 40 }}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-light)' }} />
                            <input
                                type={showPassword ? 'text' : 'password'} className="form-control" placeholder="Masukkan password"
                                value={password} onChange={(e) => setPassword(e.target.value)}
                                style={{ paddingLeft: 40, paddingRight: 40 }}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: 12, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}>
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                        {loading ? 'Memproses...' : 'Masuk'}
                    </button>
                </form>
                <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Belum punya akun? <Link to="/customer/register">Daftar di sini</Link>
                </p>
            </div>
        </div>
    );
}
