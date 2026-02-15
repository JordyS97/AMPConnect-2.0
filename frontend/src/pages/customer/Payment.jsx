import { useAuth } from '../../context/AuthContext';
import TierBadge from '../../components/TierBadge';
import { User, Phone, CreditCard, Smartphone, CheckCircle } from 'lucide-react';

export default function Payment() {
    const { user } = useAuth();

    const steps = [
        'Buka aplikasi ASTRAPAY di ponsel Anda',
        'Pilih menu "Scan QR Code"',
        'Scan kode QR di bawah ini',
        'Masukkan jumlah yang harus dibayar',
        'Selesaikan pembayaran',
        'Tunjukkan konfirmasi pembayaran ke kasir',
    ];

    return (
        <div>
            <div className="page-header">
                <h1>Pembayaran</h1>
                <p>Bayar belanja Anda dengan mudah</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 }}>
                {/* Info Card */}
                <div className="card">
                    <h3 style={{ marginBottom: 16 }}>Informasi Anda</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <User size={20} color="var(--text-secondary)" />
                            <div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nama Customer</p>
                                <p style={{ fontWeight: 600 }}>{user?.name}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <CreditCard size={20} color="var(--text-secondary)" />
                            <div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No. Customer</p>
                                <p style={{ fontWeight: 600 }}>{user?.no_customer}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tingkat Member</p>
                                <TierBadge tier={user?.tier} />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 24, padding: 16, background: '#eff6ff', borderRadius: 'var(--radius)', border: '1px solid #dbeafe' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Smartphone size={20} color="var(--primary)" />
                            <strong style={{ color: 'var(--primary)' }}>Metode Pembayaran</strong>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Kami menerima pembayaran melalui <strong>ASTRAPAY</strong>
                        </p>
                    </div>
                </div>

                {/* QR Code */}
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ marginBottom: 16 }}>Scan QR Code untuk Bayar</h3>
                    <div style={{
                        width: 260, height: 260, margin: '0 auto 16px',
                        background: 'linear-gradient(135deg, #f0f0f0, #e0e0e0)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid var(--border)',
                    }}>
                        <div style={{ textAlign: 'center', width: '100%', height: '100%' }}>
                            <img
                                src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/uploads/qris.jpg?t=${Date.now()}`}
                                alt="QR Code ASTRAPAY"
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#94a3b8"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h.01"/><path d="M7 17h.01"/><path d="M17 7h.01"/><path d="M17 17h.01"/></svg><p style="margin-top:8px;font-size:0.8rem">QR Code belum tersedia</p></div>';
                                }}
                            />
                        </div>
                    </div>
                    <p style={{ fontWeight: 500, color: 'var(--text)' }}>Scan dengan aplikasi ASTRAPAY</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        Astra Motor Part Centre Bima
                    </p>
                </div>

                {/* Instructions */}
                <div className="card" style={{ gridColumn: '1 / -1' }}>
                    <h3 style={{ marginBottom: 16 }}>Cara Pembayaran</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                        {steps.map((step, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12,
                                background: '#f8fafc', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)',
                            }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: 'var(--primary)', color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                                }}>
                                    {i + 1}
                                </div>
                                <p style={{ fontSize: '0.9rem' }}>{step}</p>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 20, padding: 16, background: '#fef9c3', borderRadius: 'var(--radius)', border: '1px solid #fde047' }}>
                        <p style={{ fontSize: '0.85rem', color: '#92400e' }}>
                            <strong>📌 Catatan:</strong> Poin Anda akan diperbarui setelah admin mengunggah data penjualan.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
