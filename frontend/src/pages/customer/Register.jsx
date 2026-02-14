import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { User, Mail, Phone, Lock, Hash, Eye, EyeOff } from 'lucide-react';
import api from '../../api/axios';

export default function CustomerRegister() {
    const [form, setForm] = useState({ no_customer: '', name: '', email: '', phone: '', password: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const { addToast } = useToast();
    const navigate = useNavigate();

    const validate = () => {
        const errs = {};
        if (!form.no_customer) errs.no_customer = 'Nomor customer wajib diisi';
        if (!form.name) errs.name = 'Nama wajib diisi';
        if (!form.email) errs.email = 'Email wajib diisi';
        if (!form.phone) errs.phone = 'No. telepon wajib diisi';
        if (!form.password || form.password.length < 8) errs.password = 'Password minimal 8 karakter';
        else {
            if (!/[A-Z]/.test(form.password)) errs.password = 'Password harus mengandung huruf besar';
            else if (!/[a-z]/.test(form.password)) errs.password = 'Password harus mengandung huruf kecil';
            else if (!/[0-9]/.test(form.password)) errs.password = 'Password harus mengandung angka';
            else if (!/[!@#$%^&*]/.test(form.password)) errs.password = 'Password harus mengandung karakter spesial (!@#$%^&*)';
        }
        if (form.password !== form.confirmPassword) errs.confirmPassword = 'Password tidak cocok';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const getPasswordStrength = () => {
        const p = form.password;
        if (!p) return { level: 0, label: '', color: '' };
        let score = 0;
        if (p.length >= 8) score++;
        if (/[A-Z]/.test(p)) score++;
        if (/[a-z]/.test(p)) score++;
        if (/[0-9]/.test(p)) score++;
        if (/[!@#$%^&*]/.test(p)) score++;
        if (score <= 2) return { level: score, label: 'Lemah', color: 'var(--danger)' };
        if (score <= 3) return { level: score, label: 'Sedang', color: 'var(--warning)' };
        return { level: score, label: 'Kuat', color: 'var(--success)' };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await api.post('/auth/register', form);
            addToast(res.data.message, 'success');
            navigate('/customer/verify-otp', { state: { email: form.email } });
        } catch (err) {
            addToast(err.response?.data?.message || 'Registrasi gagal', 'error');
        } finally {
            setLoading(false);
        }
    };

    const strength = getPasswordStrength();

    const fields = [
        { key: 'no_customer', label: 'Nomor Customer', icon: Hash, placeholder: 'Masukkan nomor customer dari admin', type: 'text' },
        { key: 'name', label: 'Nama Lengkap', icon: User, placeholder: 'Nama lengkap Anda', type: 'text' },
        { key: 'email', label: 'Email', icon: Mail, placeholder: 'email@contoh.com', type: 'email' },
        { key: 'phone', label: 'No. Telepon', icon: Phone, placeholder: '081234567890', type: 'tel' },
    ];

    return (
        <div className="auth-page">
            <div className="auth-card" style={{ maxWidth: 480 }}>
                <div className="auth-logo">
                    <h1>AMPConnect</h1>
                    <p>Daftar akun customer baru</p>
                </div>
                <form onSubmit={handleSubmit}>
                    {fields.map(f => (
                        <div className="form-group" key={f.key}>
                            <label>{f.label}</label>
                            <div style={{ position: 'relative' }}>
                                <f.icon size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-light)' }} />
                                <input
                                    type={f.type} className={`form-control ${errors[f.key] ? 'error' : ''}`}
                                    placeholder={f.placeholder} value={form[f.key]}
                                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                                    style={{ paddingLeft: 40 }}
                                />
                            </div>
                            {errors[f.key] && <span className="form-error">{errors[f.key]}</span>}
                        </div>
                    ))}

                    <div className="form-group">
                        <label>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-light)' }} />
                            <input
                                type={showPassword ? 'text' : 'password'} className={`form-control ${errors.password ? 'error' : ''}`}
                                placeholder="Buat password" value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                style={{ paddingLeft: 40, paddingRight: 40 }}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: 12, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}>
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {form.password && (
                            <div style={{ marginTop: 6 }}>
                                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strength.level ? strength.color : '#e2e8f0' }} />
                                    ))}
                                </div>
                                <span style={{ fontSize: '0.75rem', color: strength.color, fontWeight: 500 }}>{strength.label}</span>
                            </div>
                        )}
                        {errors.password && <span className="form-error">{errors.password}</span>}
                    </div>

                    <div className="form-group">
                        <label>Konfirmasi Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-light)' }} />
                            <input
                                type={showPassword ? 'text' : 'password'} className={`form-control ${errors.confirmPassword ? 'error' : ''}`}
                                placeholder="Ulangi password" value={form.confirmPassword}
                                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                style={{ paddingLeft: 40 }}
                            />
                        </div>
                        {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                        {loading ? 'Memproses...' : 'Daftar'}
                    </button>
                </form>
                <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Sudah punya akun? <Link to="/customer/login">Masuk di sini</Link>
                </p>
            </div>
        </div>
    );
}
