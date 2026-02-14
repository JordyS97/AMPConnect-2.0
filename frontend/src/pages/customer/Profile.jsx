import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import TierBadge from '../../components/TierBadge';
import { Save, Lock, Eye, EyeOff } from 'lucide-react';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import api from '../../api/axios';

export default function Profile() {
    const [activeTab, setActiveTab] = useState('info');
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', address: '' });
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showPasswords, setShowPasswords] = useState(false);
    const [transactions, setTransactions] = useState({ transactions: [], total: 0, page: 1, totalPages: 1 });
    const [txPage, setTxPage] = useState(1);
    const [txSearch, setTxSearch] = useState('');
    const { user, updateUser } = useAuth();
    const { addToast } = useToast();

    useEffect(() => { fetchProfile(); }, []);
    useEffect(() => { if (activeTab === 'transactions') fetchTransactions(); }, [activeTab, txPage]);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/customer/profile');
            setProfile(res.data.data);
            setForm({ name: res.data.data.name || '', phone: res.data.data.phone || '', address: res.data.data.address || '' });
        } catch (err) {
            addToast('Gagal memuat profil', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            const res = await api.get('/customer/transactions', { params: { page: txPage, limit: 20, search: txSearch } });
            setTransactions(res.data.data);
        } catch (err) { /* ignore */ }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await api.put('/customer/profile', form);
            updateUser({ name: form.name });
            addToast('Profil berhasil diperbarui', 'success');
        } catch (err) {
            addToast(err.response?.data?.message || 'Gagal menyimpan profil', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            addToast('Password baru tidak cocok', 'warning'); return;
        }
        if (passwordForm.newPassword.length < 8) {
            addToast('Password minimal 8 karakter', 'warning'); return;
        }
        setSaving(true);
        try {
            await api.put('/customer/password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            addToast('Password berhasil diubah', 'success');
        } catch (err) {
            addToast(err.response?.data?.message || 'Gagal mengubah password', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <h1>Profil Saya</h1>
                <p>Kelola informasi akun Anda</p>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Info Pribadi</button>
                <button className={`tab ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>Keamanan Akun</button>
                <button className={`tab ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>Riwayat Transaksi</button>
            </div>

            {/* Personal Info Tab */}
            {activeTab === 'info' && (
                <div className="card">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                        <div className="form-group">
                            <label>Nama Lengkap</label>
                            <input type="text" className="form-control" value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>No. Telepon</label>
                            <input type="tel" className="form-control" value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Alamat</label>
                            <textarea className="form-control" rows={3} value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })} />
                        </div>

                        {/* Read-only fields */}
                        <div className="form-group">
                            <label>No. Customer</label>
                            <input type="text" className="form-control" value={profile?.no_customer} disabled style={{ background: '#f8fafc' }} />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="text" className="form-control" value={profile?.email} disabled style={{ background: '#f8fafc' }} />
                        </div>
                        <div className="form-group">
                            <label>Tingkat Member</label>
                            <div style={{ padding: '8px 0' }}><TierBadge tier={profile?.tier} /></div>
                        </div>
                        <div className="form-group">
                            <label>Total Poin</label>
                            <input type="text" className="form-control" value={formatNumber(profile?.total_points)} disabled style={{ background: '#f8fafc' }} />
                        </div>
                    </div>
                    <div style={{ marginTop: 20 }}>
                        <button onClick={handleSaveProfile} className="btn btn-primary" disabled={saving}>
                            <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className="card" style={{ maxWidth: 500 }}>
                    <h3 style={{ marginBottom: 20 }}>Ubah Password</h3>
                    {['currentPassword', 'newPassword', 'confirmPassword'].map(field => (
                        <div className="form-group" key={field}>
                            <label>{field === 'currentPassword' ? 'Password Saat Ini' : field === 'newPassword' ? 'Password Baru' : 'Konfirmasi Password Baru'}</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-light)' }} />
                                <input type={showPasswords ? 'text' : 'password'} className="form-control"
                                    value={passwordForm[field]}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, [field]: e.target.value })}
                                    style={{ paddingLeft: 40 }} />
                            </div>
                        </div>
                    ))}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button onClick={handleChangePassword} className="btn btn-primary" disabled={saving}>
                            <Lock size={16} /> {saving ? 'Mengubah...' : 'Ubah Password'}
                        </button>
                        <button onClick={() => setShowPasswords(!showPasswords)} className="btn btn-ghost btn-sm">
                            {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                            {showPasswords ? 'Sembunyikan' : 'Tampilkan'}
                        </button>
                    </div>
                </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
                <div className="card">
                    <div className="search-filters" style={{ marginBottom: 16 }}>
                        <input type="text" className="form-control" placeholder="Cari no. faktur..." value={txSearch}
                            onChange={(e) => setTxSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()} style={{ maxWidth: 300 }} />
                        <button onClick={fetchTransactions} className="btn btn-primary btn-sm">Cari</button>
                    </div>
                    {transactions.transactions.length === 0 ? (
                        <div className="empty-state"><p>Belum ada transaksi</p></div>
                    ) : (
                        <>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr><th>Tanggal</th><th>No. Faktur</th><th>Tipe</th><th>Total</th><th>Diskon</th><th>Net Sales</th><th>Poin</th></tr>
                                    </thead>
                                    <tbody>
                                        {transactions.transactions.map((tx, i) => (
                                            <tr key={i}>
                                                <td>{formatDate(tx.tanggal)}</td>
                                                <td><strong>{tx.no_faktur}</strong></td>
                                                <td><span className="badge badge-info">{tx.tipe_faktur}</span></td>
                                                <td>{formatCurrency(tx.total_faktur)}</td>
                                                <td>{formatCurrency(tx.diskon)}</td>
                                                <td>{formatCurrency(tx.net_sales)}</td>
                                                <td><span className="badge badge-success">+{tx.points_earned}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {transactions.totalPages > 1 && (
                                <div className="pagination">
                                    <button disabled={txPage <= 1} onClick={() => setTxPage(txPage - 1)}>← Prev</button>
                                    {Array.from({ length: Math.min(transactions.totalPages, 5) }, (_, i) => {
                                        const p = i + 1;
                                        return <button key={p} className={p === txPage ? 'active' : ''} onClick={() => setTxPage(p)}>{p}</button>;
                                    })}
                                    <button disabled={txPage >= transactions.totalPages} onClick={() => setTxPage(txPage + 1)}>Next →</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
