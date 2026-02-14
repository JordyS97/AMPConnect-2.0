import { useState } from 'react';
import { useToast } from '../../components/Toast';
import { FileText, Download, BarChart3, Package, Users, TrendingUp, Calendar, Loader } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import api from '../../api/axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Reports() {
    const [activeReport, setActiveReport] = useState(null);
    const [filters, setFilters] = useState({ startDate: '', endDate: '', groupBy: 'daily' });
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    const reportTypes = [
        { id: 'sales', label: 'Laporan Penjualan', icon: BarChart3, description: 'Ringkasan penjualan, laba kotor, dan performa', color: '#2563eb' },
        { id: 'stock', label: 'Laporan Stok', icon: Package, description: 'Status stok, pergerakan, dan peringatan', color: '#7c3aed' },
        { id: 'customer', label: 'Laporan Customer', icon: Users, description: 'Data customer, tier, dan aktivitas', color: '#16a34a' },
        { id: 'profit', label: 'Analisis Profit', icon: TrendingUp, description: 'Margin laba, GP%, dan tren profitabilitas', color: '#d97706' },
    ];

    const generateReport = async (type) => {
        setActiveReport(type);
        setLoading(true);
        setReportData(null);
        try {
            const res = await api.get(`/admin/reports/${type}`, { params: filters });
            setReportData(res.data.data);
        } catch (err) {
            addToast('Gagal menghasilkan laporan', 'error');
        } finally {
            setLoading(false);
        }
    };

    const exportPDF = () => {
        if (!reportData) return;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`Laporan ${reportTypes.find(r => r.id === activeReport)?.label}`, 14, 22);
        doc.setFontSize(10);
        doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 30);
        if (filters.startDate) doc.text(`Periode: ${filters.startDate} s/d ${filters.endDate || 'sekarang'}`, 14, 36);

        // Summary
        let y = 44;
        if (reportData.summary) {
            doc.setFontSize(12);
            doc.text('Ringkasan:', 14, y);
            y += 8;
            doc.setFontSize(10);
            Object.entries(reportData.summary).forEach(([key, val]) => {
                doc.text(`${key}: ${val}`, 14, y);
                y += 6;
            });
            y += 4;
        }

        // Table data
        if (reportData.tableData && reportData.tableData.length > 0) {
            const cols = Object.keys(reportData.tableData[0]);
            doc.autoTable({
                head: [cols],
                body: reportData.tableData.map(row => cols.map(c => String(row[c] ?? ''))),
                startY: y,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [37, 99, 235] },
            });
        }

        doc.save(`laporan_${activeReport}_${Date.now()}.pdf`);
        addToast('Laporan berhasil diexport sebagai PDF', 'success');
    };

    const exportCSV = () => {
        if (!reportData?.tableData?.length) return;
        const cols = Object.keys(reportData.tableData[0]);
        const csv = [cols.join(','), ...reportData.tableData.map(row => cols.map(c => `"${row[c] ?? ''}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laporan_${activeReport}_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Laporan berhasil diexport sebagai CSV', 'success');
    };

    return (
        <div>
            <div className="page-header"><h1>Laporan</h1><p>Buat dan export laporan bisnis</p></div>

            {/* Report type cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 24 }}>
                {reportTypes.map(report => (
                    <div key={report.id} onClick={() => generateReport(report.id)}
                        style={{
                            padding: 24, borderRadius: 'var(--radius-md)', cursor: 'pointer',
                            background: activeReport === report.id ? `${report.color}10` : 'var(--bg-card)',
                            border: `2px solid ${activeReport === report.id ? report.color : 'var(--border-light)'}`,
                            transition: 'all 0.2s ease',
                            boxShadow: 'var(--shadow)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                    >
                        <report.icon size={32} color={report.color} style={{ marginBottom: 12 }} />
                        <h3 style={{ fontSize: '1.05rem', marginBottom: 4 }}>{report.label}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{report.description}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            {activeReport && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="search-filters" style={{ marginBottom: 0 }}>
                        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
                            <label style={{ fontSize: '0.75rem' }}>Dari Tanggal</label>
                            <input type="date" className="form-control" value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
                            <label style={{ fontSize: '0.75rem' }}>Sampai Tanggal</label>
                            <input type="date" className="form-control" value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
                        </div>
                        {activeReport === 'sales' && (
                            <div className="form-group" style={{ margin: 0, minWidth: 140 }}>
                                <label style={{ fontSize: '0.75rem' }}>Kelompokkan</label>
                                <select className="form-control" value={filters.groupBy}
                                    onChange={(e) => setFilters({ ...filters, groupBy: e.target.value })}>
                                    <option value="daily">Harian</option>
                                    <option value="weekly">Mingguan</option>
                                    <option value="monthly">Bulanan</option>
                                </select>
                            </div>
                        )}
                        <button onClick={() => generateReport(activeReport)} className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
                            <FileText size={16} /> Generate
                        </button>
                        {reportData && (
                            <>
                                <button onClick={exportPDF} className="btn btn-secondary" style={{ alignSelf: 'flex-end' }}>
                                    <Download size={16} /> PDF
                                </button>
                                <button onClick={exportCSV} className="btn btn-success" style={{ alignSelf: 'flex-end' }}>
                                    <Download size={16} /> CSV
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Report content */}
            {loading && <div className="loading-spinner"><div className="spinner"></div></div>}

            {reportData && !loading && (
                <div className="card">
                    <div className="card-header">
                        <h3>{reportTypes.find(r => r.id === activeReport)?.label}</h3>
                    </div>

                    {/* Summary */}
                    {reportData.summary && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
                            {Object.entries(reportData.summary).map(([key, val]) => (
                                <div key={key} style={{ padding: 16, background: '#f8fafc', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)' }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</p>
                                    <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{val}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Table */}
                    {reportData.tableData?.length > 0 && (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>{Object.keys(reportData.tableData[0]).map(col => <th key={col} style={{ textTransform: 'capitalize' }}>{col.replace(/_/g, ' ')}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {reportData.tableData.map((row, i) => (
                                        <tr key={i}>{Object.values(row).map((val, j) => <td key={j}>{val ?? '-'}</td>)}</tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {(!reportData.tableData || reportData.tableData.length === 0) && !reportData.summary && (
                        <div className="empty-state"><p>Tidak ada data untuk filter yang dipilih</p></div>
                    )}
                </div>
            )}
        </div>
    );
}
