import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { User, Lock, Eye, EyeOff, Shield } from 'lucide-react';
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

            if (!err.response) {
                addToast(`Network Error: ${msg}. Check API URL & CORS.`, 'error');
            } else if (status === 401) {
                addToast(msg, 'error'); // Wrong password
            } else {
                addToast(`Error (${status}): ${msg}`, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
            <div className="auth-card admin">
                <div className="auth-logo">
                    <div style={{
                        width: 80, height: 80, borderRadius: 'var(--radius-md)',
                        background: 'rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px', backdropFilter: 'blur(10px)',
                    }}>
                        <img src="/logo.svg" alt="AMPConnect Logo" style={{ width: 50, height: 50 }} />
                    </div>
                    <h1 style={{ WebkitTextFillColor: 'white', background: 'none', WebkitBackgroundClip: 'unset' }}>AMPConnect Admin</h1>
                    <p>Portal Administrasi</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
                            <input type="text" className="form-control" placeholder="Masukkan username"
                                value={username} onChange={(e) => setUsername(e.target.value)}
                                style={{ paddingLeft: 40 }} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
                            <input type={showPassword ? 'text' : 'password'} className="form-control" placeholder="Masukkan password"
                                value={password} onChange={(e) => setPassword(e.target.value)}
                                style={{ paddingLeft: 40, paddingRight: 40 }} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: 12, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                        {loading ? 'Memproses...' : 'Masuk'}
                    </button>
                </form>
            </div>
        </div>
    );
}
