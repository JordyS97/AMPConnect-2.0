import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Save } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';

export default function Settings() {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);
    const { addToast } = useToast();
    // Cache bust query param
    const [qrUrl, setQrUrl] = useState(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/uploads/qris.jpg?t=${Date.now()}`);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            addToast('Hanya file gambar yang diizinkan', 'error');
            return;
        }

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        const file = fileInputRef.current?.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            await api.post('/admin/settings/qr', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            addToast('QRIS ASTRAPAY berhasil diperbarui', 'success');
            setPreview(null);
            // Refresh Image
            setQrUrl(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/uploads/qris.jpg?t=${Date.now()}`);
            if (fileInputRef.current) fileInputRef.current.value = null;
        } catch (err) {
            addToast(err.response?.data?.message || 'Gagal mengupload QRIS', 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>Pengaturan</h1>
                <p>Kelola konfigurasi sistem</p>
            </div>

            <div className="card" style={{ maxWidth: 600 }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: 20 }}>Metode Pembayaran</h2>

                <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: 15 }}>QRIS ASTRAPAY</h3>
                    <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: 20 }}>
                        Upload gambar QR Code ASTRAPAY terbaru yang akan ditampilkan di halaman pembayaran customer.
                    </p>

                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                        {/* Current/Preview Image */}
                        <div style={{
                            width: 200, height: 200,
                            background: 'white',
                            border: '2px dashed #cbd5e1',
                            borderRadius: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            <img
                                src={preview || qrUrl}
                                alt="QRIS Preview"
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://via.placeholder.com/200x200?text=No+QR+Image';
                                }}
                            />
                        </div>

                        {/* Upload Controls */}
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Ganti QR Image</label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="form-control"
                                    style={{ padding: 8 }}
                                />
                                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 5 }}>
                                    Format: JPG, PNG. Maks: 2MB.
                                </p>
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={!preview || uploading}
                                className="btn btn-primary"
                                style={{ width: '100%', marginTop: 10 }}
                            >
                                {uploading ? <div className="spinner-sm"></div> : <Save size={18} />}
                                {uploading ? ' Mengupload...' : ' Simpan Perubahan'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
