import { useState } from 'react';
import { ArrowUp, ArrowDown, Minus, Download, Calendar } from 'lucide-react';
import api from '../../api/axios';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { useToast } from '../../components/Toast';
import jsPDF from 'jspdf';

export default function Comparison() {
    const [p1Start, setP1Start] = useState('');
    const [p1End, setP1End] = useState('');
    const [p2Start, setP2Start] = useState('');
    const [p2End, setP2End] = useState('');
    const [comparisonData, setComparisonData] = useState(null);
    const [loadingComparison, setLoadingComparison] = useState(false);

    const [year, setYear] = useState(new Date().getFullYear());
    const [reportData, setReportData] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);

    const { addToast } = useToast();

    const handleCompare = async () => {
        if (!p1Start || !p1End || !p2Start || !p2End) {
            addToast('Harap isi semua tanggal periode', 'error');
            return;
        }
        setLoadingComparison(true);
        try {
            const res = await api.get('/customer/comparison', {
                params: { p1_start: p1Start, p1_end: p1End, p2_start: p2Start, p2_end: p2End }
            });
            setComparisonData(res.data.data);
        } catch (err) {
            addToast('Gagal memuat perbandingan', 'error');
        } finally {
            setLoadingComparison(false);
        }
    };

    const handleGenerateReport = async () => {
        setLoadingReport(true);
        try {
            const res = await api.get('/customer/year-end-report', { params: { year } });
            setReportData(res.data.data);
        } catch (err) {
            addToast('Gagal memuat laporan tahunan', 'error');
        } finally {
            setLoadingReport(false);
        }
    };

    const downloadReportPDF = () => {
        if (!reportData) return;
        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.text(`Laporan Tahunan ${year}`, 105, 20, null, null, 'center');

        doc.setFontSize(12);
        doc.text(`Ringkasan Pembelian Anda Sepanjang Tahun ${year}`, 105, 30, null, null, 'center');

        doc.setDrawColor(0);
        doc.line(20, 35, 190, 35);

        doc.setFontSize(14);
        doc.text('Statistik Utama', 20, 50);

        doc.setFontSize(12);
        doc.text(`Total Belanja: ${formatCurrency(reportData.summary.total_spent)}`, 20, 60);
        doc.text(`Total Transaksi: ${reportData.summary.total_trx} kali`, 20, 70);
        doc.text(`Poin Terkumpul: ${reportData.summary.total_points} poin`, 20, 80);
        doc.text(`Total Diskon Didapat: ${formatCurrency(reportData.summary.total_discount)}`, 20, 90);

        doc.text('Kategori Terfavorit', 20, 110);
        doc.text(`${reportData.top_category.category}`, 20, 120);
        doc.text(`(Total Belanja: ${formatCurrency(reportData.top_category.total)})`, 20, 126);

        doc.save(`Laporan_Tahunan_${year}.pdf`);
    };

    const getDiffIndicator = (val1, val2) => {
        if (val1 === val2) return <Minus size={16} color="#94a3b8" />;
        const diff = val2 - val1; // P1 is current (left), P2 is previous (right)? No, usually compare P1 vs P2.
        // Let's assume P1 is "Current" and P2 is "Previous".
        // Growth = (Current - Previous) / Previous

        // Wait, normally we compare Period 1 (Recent) vs Period 2 (Past).
        // If P1 > P2 -> Green Up Arrow.

        if (val1 > val2) return <ArrowUp size={16} color="#10b981" />;
        return <ArrowDown size={16} color="#ef4444" />;
    };

    const calculateGrowth = (val1, val2) => {
        if (!val2) return val1 ? 100 : 0;
        return ((val1 - val2) / val2) * 100;
    };

    return (
        <div className="comparison-page">
            <div className="page-header">
                <h1>Perbandingan & Laporan</h1>
                <p>Analisis performa belanja antar periode dan laporan tahunan</p>
            </div>

            {/* Comparison Section */}
            <div className="card mb-4">
                <h3>Bandingkan Periode</h3>
                <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 10, alignItems: 'end' }}>
                    <div>
                        <label>Periode 1 (Utama)</label>
                        <div style={{ display: 'flex', gap: 5 }}>
                            <input type="date" className="input" value={p1Start} onChange={(e) => setP1Start(e.target.value)} />
                            <input type="date" className="input" value={p1End} onChange={(e) => setP1End(e.target.value)} />
                        </div>
                    </div>
                    <div style={{ paddingBottom: 10, fontWeight: 'bold' }}>VS</div>
                    <div>
                        <label>Periode 2 (Pembanding)</label>
                        <div style={{ display: 'flex', gap: 5 }}>
                            <input type="date" className="input" value={p2Start} onChange={(e) => setP2Start(e.target.value)} />
                            <input type="date" className="input" value={p2End} onChange={(e) => setP2End(e.target.value)} />
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleCompare} disabled={loadingComparison}>
                        {loadingComparison ? 'Loading...' : 'Bandingkan'}
                    </button>
                </div>

                {comparisonData && (
                    <div className="comparison-results mt-4">
                        <table className="table" style={{ textAlign: 'center' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>Metrik</th>
                                    <th>Periode 1</th>
                                    <th>Perbedaan</th>
                                    <th>Periode 2</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ textAlign: 'left' }}>Total Belanja</td>
                                    <td style={{ fontWeight: 'bold' }}>{formatCurrency(comparisonData.period1.total_spent)}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                            {getDiffIndicator(comparisonData.period1.total_spent, comparisonData.period2.total_spent)}
                                            <span style={{
                                                color: comparisonData.period1.total_spent >= comparisonData.period2.total_spent ? '#10b981' : '#ef4444',
                                                fontWeight: 'bold'
                                            }}>
                                                {formatPercent(calculateGrowth(comparisonData.period1.total_spent, comparisonData.period2.total_spent))}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ color: '#64748b' }}>{formatCurrency(comparisonData.period2.total_spent)}</td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'left' }}>Jumlah Transaksi</td>
                                    <td style={{ fontWeight: 'bold' }}>{comparisonData.period1.trx_count}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                            {getDiffIndicator(comparisonData.period1.trx_count, comparisonData.period2.trx_count)}
                                            {comparisonData.period1.trx_count - comparisonData.period2.trx_count}
                                        </div>
                                    </td>
                                    <td style={{ color: '#64748b' }}>{comparisonData.period2.trx_count}</td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'left' }}>Poin Didapat</td>
                                    <td style={{ fontWeight: 'bold' }}>{comparisonData.period1.points}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                            {getDiffIndicator(comparisonData.period1.points, comparisonData.period2.points)}
                                            {comparisonData.period1.points - comparisonData.period2.points}
                                        </div>
                                    </td>
                                    <td style={{ color: '#64748b' }}>{comparisonData.period2.points}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Annual Report Section */}
            <div className="card">
                <h3>Laporan Tahunan</h3>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
                    <select className="input" value={year} onChange={(e) => setYear(e.target.value)} style={{ width: 100 }}>
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                    </select>
                    <button className="btn btn-outline" onClick={handleGenerateReport} disabled={loadingReport}>
                        {loadingReport ? 'Loading...' : 'Generate Report'}
                    </button>
                    {reportData && (
                        <button className="btn btn-primary" onClick={downloadReportPDF}>
                            <Download size={18} style={{ marginRight: 5 }} /> Download PDF
                        </button>
                    )}
                </div>

                {reportData && (
                    <div className="report-preview" style={{ background: '#f8fafc', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <h4 style={{ textAlign: 'center', marginBottom: 20 }}>Ringkasan Tahun {year}</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div>
                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Total Pengeluaran</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(reportData.summary.total_spent)}</p>
                            </div>
                            <div>
                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Total Transaksi</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{reportData.summary.total_trx}x</p>
                            </div>
                            <div>
                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Poin Dikumpulkan</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#eab308' }}>{reportData.summary.total_points}</p>
                            </div>
                            <div>
                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Kategori Favorit</p>
                                <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{reportData.top_category.category}</p>
                                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{formatCurrency(reportData.top_category.total)}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
