import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { ShieldCheck } from 'lucide-react';
import api from '../../api/axios';

export default function VerifyOTP() {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const inputRefs = useRef([]);
    const location = useLocation();
    const navigate = useNavigate();
    const { login } = useAuth();
    const { addToast } = useToast();
    const email = location.state?.email;

    useEffect(() => {
        if (!email) navigate('/customer/register');
    }, [email]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [countdown]);

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = [...otp];
        for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] || '';
        setOtp(newOtp);
        if (pasted.length > 0) inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length !== 6) { addToast('Masukkan 6 digit kode OTP', 'warning'); return; }
        setLoading(true);
        try {
            const res = await api.post('/auth/verify-otp', { email, code });
            login(res.data.token, res.data.user);
            addToast(res.data.message, 'success');
            navigate('/customer/dashboard');
        } catch (err) {
            addToast(err.response?.data?.message || 'Verifikasi gagal', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        try {
            await api.post('/auth/resend-otp', { email });
            setCountdown(60);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']);
            addToast('Kode OTP baru telah dikirim', 'success');
        } catch (err) {
            addToast(err.response?.data?.message || 'Gagal mengirim OTP', 'error');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card" style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 24 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                        <ShieldCheck size={32} color="var(--primary)" />
                    </div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>Verifikasi OTP</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Masukkan kode 6 digit yang dikirim ke<br />
                        <strong>{email}</strong>
                    </p>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginTop: 8 }}>
                        💡 Cek console server untuk kode OTP (mode pengembangan)
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }} onPaste={handlePaste}>
                    {otp.map((digit, i) => (
                        <input
                            key={i}
                            ref={el => inputRefs.current[i] = el}
                            type="text" inputMode="numeric" maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            style={{
                                width: 48, height: 56, textAlign: 'center',
                                fontSize: '1.5rem', fontWeight: 700,
                                border: '2px solid var(--border)',
                                borderRadius: 'var(--radius)', outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                        />
                    ))}
                </div>

                <button onClick={handleVerify} className="btn btn-primary btn-lg" disabled={loading}
                    style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}>
                    {loading ? 'Memverifikasi...' : 'Verifikasi'}
                </button>

                <div>
                    {canResend ? (
                        <button onClick={handleResend} className="btn btn-ghost" style={{ margin: '0 auto' }}>
                            Kirim Ulang OTP
                        </button>
                    ) : (
                        <p style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>
                            Kirim ulang dalam <strong style={{ color: 'var(--primary)' }}>{countdown}s</strong>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
