import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '../../components/Toast';
import { Upload as UploadIcon, FileSpreadsheet, Clock, CheckCircle, XCircle, Download, Trash2 } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import api from '../../api/axios';

export default function UploadPage() {
    const [activeTab, setActiveTab] = useState('sales');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const { addToast } = useToast();

    useEffect(() => { fetchHistory(); }, []);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/admin/upload/history');
            setHistory(res.data.data);
        } catch (err) { /* ignore */ }
        finally { setHistoryLoading(false); }
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls', 'csv'].includes(ext)) {
            addToast('Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setProgress(0);
        setResult(null);

        try {
            const endpoint = activeTab === 'sales' ? '/admin/upload/sales' : '/admin/upload/stock';
            const res = await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 300000, // 5 minute timeout for large uploads
                onUploadProgress: (e) => {
                    const pct = Math.round((e.loaded * 100) / e.total);
                    setProgress(pct);
                },
            });
            setResult(res.data);
            addToast(res.data.message, 'success');
            fetchHistory();
        } catch (err) {
            setResult({ success: false, message: err.response?.data?.message || 'Upload gagal', errors: err.response?.data?.errors });
            addToast(err.response?.data?.message || 'Upload gagal', 'error');
        } finally {
            setUploading(false);
        }
    }, [activeTab]);

    const downloadTemplate = async (type) => {
        try {
            const res = await api.get(`/admin/upload/template/${type}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `template_${type}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            addToast('Gagal mengunduh template', 'error');
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop, accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'], 'text/csv': ['.csv'] },
        multiple: false, maxSize: 10 * 1024 * 1024,
    });

    return (
        <div>
            <div className="page-header">
                <h1>Upload Data</h1>
                <p>Unggah data penjualan dan stok dari file Excel</p>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => { setActiveTab('sales'); setResult(null); }}>
                    Data Penjualan
                </button>
                <button className={`tab ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => { setActiveTab('stock'); setResult(null); }}>
                    Data Stok
                </button>
                <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                    Riwayat Upload
                </button>
            </div>

            {/* Upload Tab */}
            {(activeTab === 'sales' || activeTab === 'stock') && (
                <div className="card">
                    {/* Template download */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <h3>Upload Data {activeTab === 'sales' ? 'Penjualan' : 'Stok'}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Format: .xlsx, .xls, atau .csv (maks. 10MB)
                            </p>
                        </div>
                        <button onClick={() => downloadTemplate(activeTab)} className="btn btn-outline">
                            <Download size={16} /> Download Template
                        </button>
                    </div>

                    {/* Drop zone */}
                    <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'active' : ''}`}>
                        <input {...getInputProps()} />
                        <div className="upload-icon"><UploadIcon size={48} /></div>
                        {isDragActive ? (
                            <p style={{ fontSize: '1rem', fontWeight: 500 }}>Lepaskan file di sini...</p>
                        ) : (
                            <>
                                <p style={{ fontSize: '1rem', fontWeight: 500 }}>Seret file ke sini atau klik untuk memilih</p>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                                    Format yang didukung: Excel (.xlsx, .xls) dan CSV (.csv)
                                </p>
                            </>
                        )}
                    </div>

                    {/* Progress */}
                    {uploading && (
                        <div style={{ marginTop: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Mengunggah...</span>
                                <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600 }}>{progress}%</span>
                            </div>
                            <div className="progress-bar" style={{ height: 12 }}>
                                <div className="progress-fill" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div style={{
                            marginTop: 20, padding: 16, borderRadius: 'var(--radius)',
                            background: result.success ? '#f0fdf4' : '#fef2f2',
                            border: `1px solid ${result.success ? '#86efac' : '#fca5a5'}`,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                {result.success ? <CheckCircle size={20} color="var(--success)" /> : <XCircle size={20} color="var(--danger)" />}
                                <strong style={{ color: result.success ? 'var(--success)' : 'var(--danger)' }}>{result.message}</strong>
                            </div>
                            {result.data?.inserted !== undefined && (
                                <p style={{ fontSize: '0.9rem' }}>
                                    ✅ {result.data.inserted} data berhasil diproses
                                    {result.data.skipped > 0 && <> | ⚠️ {result.data.skipped} data dilewati</>}
                                </p>
                            )}
                            {result.errors?.length > 0 && (
                                <div style={{ marginTop: 8 }}>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--danger)' }}>Error:</p>
                                    <ul style={{ paddingLeft: 20, fontSize: '0.85rem' }}>
                                        {result.errors.slice(0, 5).map((e, i) => <li key={i} style={{ color: '#b91c1c' }}>{e}</li>)}
                                        {result.errors.length > 5 && <li>...dan {result.errors.length - 5} error lainnya</li>}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Column info */}
                    <div style={{ marginTop: 20, padding: 16, background: '#f8fafc', borderRadius: 'var(--radius)' }}>
                        <h4 style={{ marginBottom: 8, fontSize: '0.9rem' }}>
                            {activeTab === 'sales' ? '📋 Kolom yang Dibutuhkan (Penjualan):' : '📋 Kolom yang Dibutuhkan (Stok):'}
                        </h4>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {(activeTab === 'sales'
                                ? ['Tanggal', 'No Faktur', 'Tipe Faktur', 'No Customer', 'Nama Customer', 'No Part', 'Nama Part', 'Qty', 'Harga Pokok', 'Total Faktur', 'Diskon', 'Net Sales', 'HPP', 'Gross Profit', 'GP%']
                                : ['No Part', 'Nama Part', 'Group Material', 'Group Part', 'Qty']
                            ).map(col => <span key={col} className="badge badge-info">{col}</span>)}
                        </div>
                    </div>
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="card">
                    <div className="card-header"><h3>Riwayat Upload</h3></div>
                    {historyLoading ? <div className="loading-spinner"><div className="spinner"></div></div> : history.length === 0 ? (
                        <div className="empty-state"><p>Belum ada riwayat upload</p></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead><tr><th>Tanggal</th><th>File</th><th>Tipe</th><th>Status</th><th>Berhasil</th><th>Gagal</th><th>Pengunggah</th></tr></thead>
                                <tbody>
                                    {history.map((h, i) => (
                                        <tr key={i}>
                                            <td>{formatDate(h.uploaded_at)}</td>
                                            <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileSpreadsheet size={16} color="var(--success)" />{h.filename}</div></td>
                                            <td><span className="badge badge-info">{h.upload_type}</span></td>
                                            <td><span className={`badge ${h.status === 'success' ? 'badge-success' : h.status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>{h.status}</span></td>
                                            <td>{h.rows_success || 0}</td>
                                            <td>{h.rows_failed || 0}</td>
                                            <td>{h.uploaded_by}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
