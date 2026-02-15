import { useState, useEffect } from 'react';
import { Calendar, Search, Filter, ChevronDown, ChevronUp, Download, Printer } from 'lucide-react';
import api from '../../api/axios';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../components/Toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function PurchaseHistory() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        search: '',
        category: 'Semua'
    });
    const [expandedRow, setExpandedRow] = useState(null);
    const { addToast } = useToast();

    // Fetch data
    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 10,
                ...filters
            };
            const res = await api.get('/customer/transactions', { params });
            setTransactions(res.data.data.transactions);
            setTotalPages(res.data.data.totalPages);
        } catch (err) {
            addToast('Gagal memuat riwayat transaksi', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [page, filters]); // Re-fetch when page or filters change

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
        setPage(1); // Reset to page 1 on filter change
    };

    const toggleRow = (id) => {
        if (expandedRow === id) {
            setExpandedRow(null);
        } else {
            setExpandedRow(id);
        }
    };

    const downloadPDF = (trx) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.text('INVOICE', 105, 20, null, null, 'center');

        doc.setFontSize(10);
        doc.text(`No Faktur: ${trx.no_faktur}`, 14, 30);
        doc.text(`Tanggal: ${formatDate(trx.tanggal)}`, 14, 35);
        doc.text(`Customer ID: ${trx.customer_id || '-'}`, 14, 40);

        // Table
        const tableColumn = ["No Part", "Nama Part", "Qty", "Harga", "Diskon", "Subtotal"];
        const tableRows = [];

        trx.items.forEach(item => {
            const itemData = [
                item.no_part,
                item.nama_part,
                item.qty,
                formatCurrency(item.price),
                formatCurrency(item.diskon || 0),
                formatCurrency(item.subtotal)
            ];
            tableRows.push(itemData);
        });

        doc.autoTable({
            startY: 45,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 8 }
        });

        // Footer totals
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.text(`Total: ${formatCurrency(trx.net_sales)}`, 140, finalY);
        doc.text(`Poin Didapat: ${trx.points_earned}`, 140, finalY + 5);

        doc.save(`Invoice_${trx.no_faktur}.pdf`);
    };

    return (
        <div className="purchase-history-page">
            <div className="page-header">
                <h1>Riwayat Pembelian</h1>
                <p>Lihat detail transaksi dan unduh faktur Anda</p>
            </div>

            {/* Filters */}
            <div className="card mb-4">
                <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    <div className="form-group">
                        <label>Periode Mulai</label>
                        <input type="date" name="startDate" className="input" value={filters.startDate} onChange={handleFilterChange} />
                    </div>
                    <div className="form-group">
                        <label>Periode Akhir</label>
                        <input type="date" name="endDate" className="input" value={filters.endDate} onChange={handleFilterChange} />
                    </div>
                    <div className="form-group">
                        <label>Cari No Faktur</label>
                        <input type="text" name="search" className="input" placeholder="H531-..." value={filters.search} onChange={handleFilterChange} />
                    </div>
                    <div className="form-group">
                        <label>Kategori Part</label>
                        <select name="category" className="input" value={filters.category} onChange={handleFilterChange}>
                            <option value="Semua">Semua Kategori</option>
                            <option value="OIL">Oil</option>
                            <option value="TIRE">Tire</option>
                            <option value="BATTERY">Battery</option>
                            <option value="SPARK PLUG">Spark Plug</option>
                            <option value="BRAKE SHOE">Brake Shoe</option>
                            <option value="Part">Sparepart Lain</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="card">
                {loading ? (
                    <div className="loading-spinner"><div className="spinner"></div></div>
                ) : transactions.length === 0 ? (
                    <div className="empty-state">
                        <p>Tidak ada transaksi ditemukan untuk filter ini.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>No Faktur</th>
                                    <th>Total</th>
                                    <th>Poin</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(trx => (
                                    <>
                                        <tr key={trx.id} onClick={() => toggleRow(trx.id)} style={{ cursor: 'pointer', background: expandedRow === trx.id ? '#f8fafc' : 'white' }}>
                                            <td>{formatDate(trx.tanggal)}</td>
                                            <td style={{ fontWeight: 500, color: 'var(--primary)' }}>{trx.no_faktur}</td>
                                            <td style={{ fontWeight: 600 }}>{formatCurrency(trx.net_sales)}</td>
                                            <td><span className="badge badge-success">+{trx.points_earned} pts</span></td>
                                            <td>
                                                {expandedRow === trx.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </td>
                                        </tr>
                                        {/* Expanded Row */}
                                        {expandedRow === trx.id && (
                                            <tr>
                                                <td colSpan="5" style={{ padding: 0, borderBottom: '2px solid #e2e8f0' }}>
                                                    <div style={{ padding: 20, background: '#f8fafc' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                                            <h4 style={{ margin: 0 }}>Detail Barang</h4>
                                                            <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); downloadPDF(trx); }}>
                                                                <Download size={16} /> Download Invoice
                                                            </button>
                                                        </div>
                                                        <table className="table-sm" style={{ width: '100%', background: 'white', borderRadius: 8 }}>
                                                            <thead style={{ background: '#e2e8f0' }}>
                                                                <tr>
                                                                    <th>Nama Part</th>
                                                                    <th>No Part</th>
                                                                    <th>Qty</th>
                                                                    <th style={{ textAlign: 'right' }}>Harga</th>
                                                                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {trx.items && trx.items.map((item, idx) => (
                                                                    <tr key={idx}>
                                                                        <td>{item.nama_part}</td>
                                                                        <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{item.no_part}</td>
                                                                        <td>{item.qty}</td>
                                                                        <td style={{ textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                                                                        <td style={{ textAlign: 'right' }}>{formatCurrency(item.subtotal)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        <div style={{ marginTop: 15, textAlign: 'right', fontSize: '0.9rem' }}>
                                                            <p><strong>Total Diskon:</strong> <span style={{ color: '#dc2626' }}>{formatCurrency(trx.diskon || 0)}</span></p>
                                                            <p style={{ fontSize: '1.2rem', marginTop: 5 }}><strong>Total Bayar: {formatCurrency(trx.net_sales)}</strong></p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <div className="pagination" style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 10 }}>
                    <button className="btn btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                    <span style={{ display: 'flex', alignItems: 'center' }}>Page {page} of {totalPages}</span>
                    <button className="btn btn-outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
            </div>
        </div>
    );
}
