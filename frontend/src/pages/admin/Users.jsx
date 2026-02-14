import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import TierBadge from '../../components/TierBadge';
import { Search, UserPlus, Edit3, X, RefreshCw, ToggleLeft, ToggleRight, Shield, Trash2, Upload } from 'lucide-react';
import { formatDate, formatNumber } from '../../utils/formatters';
import api from '../../api/axios';

export default function UsersPage() {
    const [activeTab, setActiveTab] = useState('customers');
    const [customers, setCustomers] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [modal, setModal] = useState(null); // { type: 'addCustomer' | 'editCustomer' | 'addAdmin' | 'editAdmin', data }
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);
    const { user } = useAuth();
    const { addToast } = useToast();

    useEffect(() => {
        if (activeTab === 'customers') fetchCustomers();
        else if (activeTab === 'admins') fetchAdmins();
        else fetchLogs();
    }, [activeTab, page]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/users/customers', { params: { page, limit: 20, search } });
            setCustomers(res.data.data.customers);
            setTotalPages(res.data.data.totalPages);
        } catch (err) { addToast('Gagal memuat data customer', 'error'); }
        finally { setLoading(false); }
    };

    const fetchAdmins = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/users/admins');
            setAdmins(res.data.data);
        } catch (err) { addToast('Gagal memuat data admin', 'error'); }
        finally { setLoading(false); }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/activity-logs', { params: { page, limit: 30 } });
            setLogs(res.data.data.logs);
            setTotalPages(res.data.data.totalPages);
        } catch (err) { addToast('Gagal memuat log', 'error'); }
        finally { setLoading(false); }
    };

    const toggleStatus = async (id) => {
        try {
            await api.put(`/admin/users/customers/${id}/toggle-status`);
            addToast('Status customer berhasil diubah', 'success');
            fetchCustomers();
        } catch (err) { addToast('Gagal mengubah status', 'error'); }
    };

    const resetPassword = async (id) => {
        if (!confirm('Reset password customer ini?')) return;
        try {
            const res = await api.put(`/admin/users/customers/${id}/reset-password`);
            addToast(`Password direset ke: ${res.data.data.newPassword}`, 'success');
        } catch (err) { addToast('Gagal reset password', 'error'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Apakah Anda yakin ingin menghapus customer ini? Tindakan ini tidak dapat dibatalkan.')) return;
        try {
            await api.delete(`/admin/users/customers/${id}`);
            addToast('Customer berhasil dihapus', 'success');
            fetchCustomers();
        } catch (err) {
            addToast(err.response?.data?.message || 'Gagal menghapus customer', 'error');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setImporting(true);
        try {
            const res = await api.post('/admin/users/customers/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            addToast(res.data.message, 'success');
            fetchCustomers();
        } catch (err) {
            addToast(err.response?.data?.message || 'Gagal import file', 'error');
        } finally {
            setImporting(false);
            e.target.value = null; // Reset input
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (modal.type === 'addCustomer') {
                await api.post('/admin/users/customers', formData);
                addToast('Customer berhasil ditambahkan', 'success');
            } else if (modal.type === 'editCustomer') {
                await api.put(`/admin/users/customers/${modal.data.id}`, formData);
                addToast('Customer berhasil diperbarui', 'success');
            } else if (modal.type === 'addAdmin') {
                await api.post('/admin/users/admins', formData);
                addToast('Admin berhasil ditambahkan', 'success');
            } else if (modal.type === 'editAdmin') {
                await api.put(`/admin/users/admins/${modal.data.id}`, formData);
                addToast('Admin berhasil diperbarui', 'success');
            }
            setModal(null);
            if (activeTab === 'customers') fetchCustomers(); else fetchAdmins();
        } catch (err) {
            addToast(err.response?.data?.message || 'Gagal menyimpan', 'error');
        } finally { setSaving(false); }
    };

    const openModal = (type, data = null) => {
        if (type === 'addCustomer') setFormData({ no_customer: '', name: '', email: '', phone: '' });
        else if (type === 'editCustomer') setFormData({ name: data.name, email: data.email, phone: data.phone, address: data.address || '' });
        else if (type === 'addAdmin') setFormData({ username: '', password: '', name: '', role: 'admin' });
        else if (type === 'editAdmin') setFormData({ name: data.name, role: data.role });
        setModal({ type, data });
    };

    return (
        <div>
            <div className="page-header"><h1>Manajemen User</h1><p>Kelola customer dan admin</p></div>

            <div className="tabs">
                <button className={`tab ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => { setActiveTab('customers'); setPage(1); }}>Customer</button>
                <button className={`tab ${activeTab === 'admins' ? 'active' : ''}`} onClick={() => { setActiveTab('admins'); setPage(1); }}>Admin</button>
                <button className={`tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => { setActiveTab('logs'); setPage(1); }}>Activity Logs</button>
            </div>

            {/* Customers Tab */}
            {activeTab === 'customers' && (
                <div className="card">
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                            <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-light)' }} />
                            <input type="text" className="form-control" placeholder="Cari customer..." value={search}
                                onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchCustomers()} style={{ paddingLeft: 40 }} />
                        </div>
                        <button onClick={fetchCustomers} className="btn btn-outline"><Search size={16} /></button>

                        <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} accept=".xlsx, .xls, .csv" />
                        <button onClick={handleImportClick} className="btn btn-outline" disabled={importing}>
                            {importing ? <div className="spinner-sm"></div> : <Upload size={16} />} Import Excel
                        </button>

                        <button onClick={() => openModal('addCustomer')} className="btn btn-primary"><UserPlus size={16} /> Tambah Customer</button>
                    </div>
                    {loading ? <div className="loading-spinner"><div className="spinner"></div></div> : (
                        <>
                            <div className="table-container">
                                <table>
                                    <thead><tr><th>No. Customer</th><th>Nama</th><th>Email</th><th>Telepon</th><th>Tier</th><th>Poin</th><th>Status</th><th>Aksi</th></tr></thead>
                                    <tbody>
                                        {customers.map(c => (
                                            <tr key={c.id}>
                                                <td style={{ fontFamily: 'monospace' }}>{c.no_customer}</td>
                                                <td><strong>{c.name}</strong></td>
                                                <td>{c.email}</td>
                                                <td>{c.phone || '-'}</td>
                                                <td><TierBadge tier={c.tier} /></td>
                                                <td>{formatNumber(c.total_points)}</td>
                                                <td>
                                                    <button onClick={() => toggleStatus(c.id)} className="btn btn-ghost btn-sm" title={c.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                                                        {c.is_active ? <ToggleRight size={20} color="var(--success)" /> : <ToggleLeft size={20} color="var(--text-light)" />}
                                                    </button>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button onClick={() => openModal('editCustomer', c)} className="btn btn-ghost btn-sm" title="Edit"><Edit3 size={14} /></button>
                                                        <button onClick={() => resetPassword(c.id)} className="btn btn-ghost btn-sm" title="Reset Password"><RefreshCw size={14} /></button>
                                                        <button onClick={() => handleDelete(c.id)} className="btn btn-ghost btn-sm" title="Hapus" style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        const p = i + 1;
                                        return <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
                                    })}
                                    <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Admins Tab */}
            {activeTab === 'admins' && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                        {user?.role === 'super_admin' && (
                            <button onClick={() => openModal('addAdmin')} className="btn btn-primary"><Shield size={16} /> Tambah Admin</button>
                        )}
                    </div>
                    {loading ? <div className="loading-spinner"><div className="spinner"></div></div> : (
                        <div className="table-container">
                            <table>
                                <thead><tr><th>Username</th><th>Nama</th><th>Role</th><th>Dibuat</th><th>Aksi</th></tr></thead>
                                <tbody>
                                    {admins.map(a => (
                                        <tr key={a.id}>
                                            <td><strong>{a.username}</strong></td>
                                            <td>{a.name}</td>
                                            <td><span className={`badge ${a.role === 'super_admin' ? 'badge-danger' : 'badge-info'}`}>{a.role}</span></td>
                                            <td>{formatDate(a.created_at)}</td>
                                            <td>
                                                {user?.role === 'super_admin' && a.role !== 'super_admin' && (
                                                    <button onClick={() => openModal('editAdmin', a)} className="btn btn-ghost btn-sm"><Edit3 size={14} /></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
                <div className="card">
                    {loading ? <div className="loading-spinner"><div className="spinner"></div></div> : logs.length === 0 ? (
                        <div className="empty-state"><p>Belum ada log aktivitas</p></div>
                    ) : (
                        <>
                            <div className="table-container">
                                <table>
                                    <thead><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Detail</th><th>IP Address</th></tr></thead>
                                    <tbody>
                                        {logs.map((l, i) => (
                                            <tr key={i}>
                                                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(l.created_at)}</td>
                                                <td><strong>{l.admin_name || l.customer_name || '-'}</strong></td>
                                                <td><span className="badge badge-secondary">{l.action}</span></td>
                                                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.details || '-'}</td>
                                                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{l.ip_address || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        const p = i + 1;
                                        return <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
                                    })}
                                    <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Modal */}
            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {modal.type === 'addCustomer' ? 'Tambah Customer' :
                                    modal.type === 'editCustomer' ? 'Edit Customer' :
                                        modal.type === 'addAdmin' ? 'Tambah Admin' : 'Edit Admin'}
                            </h2>
                            <button onClick={() => setModal(null)} className="btn btn-ghost btn-icon"><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            {(modal.type === 'addCustomer' || modal.type === 'editCustomer') && (
                                <>
                                    {modal.type === 'addCustomer' && (
                                        <div className="form-group">
                                            <label>No. Customer</label>
                                            <input type="text" className="form-control" value={formData.no_customer || ''}
                                                onChange={(e) => setFormData({ ...formData, no_customer: e.target.value })} />
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label>Nama</label>
                                        <input type="text" className="form-control" value={formData.name || ''}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input type="email" className="form-control" value={formData.email || ''}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Telepon</label>
                                        <input type="tel" className="form-control" value={formData.phone || ''}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                    </div>
                                    {modal.type === 'editCustomer' && (
                                        <div className="form-group">
                                            <label>Alamat</label>
                                            <textarea className="form-control" rows={2} value={formData.address || ''}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                                        </div>
                                    )}
                                </>
                            )}
                            {(modal.type === 'addAdmin' || modal.type === 'editAdmin') && (
                                <>
                                    {modal.type === 'addAdmin' && (
                                        <>
                                            <div className="form-group">
                                                <label>Username</label>
                                                <input type="text" className="form-control" value={formData.username || ''}
                                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                                            </div>
                                            <div className="form-group">
                                                <label>Password</label>
                                                <input type="password" className="form-control" value={formData.password || ''}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                                            </div>
                                        </>
                                    )}
                                    <div className="form-group">
                                        <label>Nama</label>
                                        <input type="text" className="form-control" value={formData.name || ''}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Role</label>
                                        <select className="form-control" value={formData.role || 'admin'}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                            <option value="admin">Admin</option>
                                            <option value="super_admin">Super Admin</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setModal(null)} className="btn btn-outline">Batal</button>
                            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
