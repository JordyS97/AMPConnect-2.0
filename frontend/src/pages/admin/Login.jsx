import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import api from '../../api/axios';

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
            console.error('Login Error:', err);
            const status = err.response?.status;
            const msg = err.response?.data?.message || err.message || 'Login gagal';
            addToast(status === 401 ? msg : `Error: ${msg}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(125% 125% at 50% 10%, #0f172a 40%, #020617 100%)',
            fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{
                background: 'rgba(30, 41, 59, 0.4)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                padding: '40px',
                width: '100%',
                maxWidth: '420px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                        <img src="/logo_white.png" alt="AMPConnect" style={{ width: '180px', height: 'auto', maxWidth: '100%', filter: 'brightness(0) invert(1)' }} />
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '14px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: '500' }}>Portal Administrasi</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', color: '#cbd5e1', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>Username</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                            <input
                                type="text"
                                placeholder="admin"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 14px 12px 42px',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(51, 65, 85, 0.8)',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(51, 65, 85, 0.8)'}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', color: '#cbd5e1', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 42px 12px 42px',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(51, 65, 85, 0.8)',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(51, 65, 85, 0.8)'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: '8px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)',
                            color: 'white',
                            fontWeight: '600',
                            padding: '14px',
                            borderRadius: '12px',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '15px',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                            transition: 'opacity 0.2s',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Memproses...' : 'Masuk'}
                    </button>
                </form>

                <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                    <p style={{ color: '#475569', fontSize: '12px' }}>Sistem Internal © 2024 AMPConnect</p>
                </div>
            </div>
        </div>
    );
}
