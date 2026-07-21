import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import api from '../../api/axios';
import Logo from '../../components/Logo';

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
            const res = await api.post('/auth/login', { email, password });
            login(res.data.token, res.data.user);
            addToast('Login berhasil! Selamat datang.', 'success');
            navigate('/customer/dashboard');
        } catch (err) {
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
        <div className="auth-split">
            {/* The employee gestures rightward, across the split, toward the form. */}
            <div className="auth-visual">
                <picture>
                    <source media="(max-width: 900px)" srcSet="/login-shop-sm.webp" />
                    {/* fetchpriority stays lowercase: React 18 has no mapping for
                        the camelCase form and warns, whereas an all-lowercase
                        unknown attribute is passed straight through to the DOM. */}
                    <img
                        src="/login-shop.webp"
                        alt="Pegawai toko sparepart motor mempersilakan masuk, dengan etalase kaca berisi ban, oli, aki, dan kampas rem"
                        width="2400"
                        height="1344"
                        fetchpriority="high"
                    />
                </picture>
                <div className="auth-caption">
                    <h2>Sparepart lengkap, stok selalu terbarui.</h2>
                    <p>Masuk untuk melihat ketersediaan part, riwayat pembelian, dan poin loyalti Anda.</p>
                </div>
            </div>

            <div className="auth-panel">
                <div className="auth-form">
                    <div className="auth-brand">
                        {/* Was <img src="/logo.png">, which is not a logo at all —
                            the file is a screenshot of this very login page, with
                            "Masuk ke akun customer Anda" still cropped into it. */}
                        <Logo size={34} subtitle="Customer Portal" />
                        <h1>Selamat datang kembali</h1>
                        <p>Masuk ke akun pelanggan Anda</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <div className="auth-input-wrap">
                                <Mail size={17} className="auth-icon" />
                                <input
                                    id="email"
                                    type="email"
                                    className="form-control"
                                    placeholder="email@contoh.com"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="auth-input-wrap">
                                <Lock size={17} className="auth-icon" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-control"
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

                        <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                            {loading ? 'Memproses...' : 'Masuk'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        Belum punya akun? <Link to="/customer/register">Daftar di sini</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
