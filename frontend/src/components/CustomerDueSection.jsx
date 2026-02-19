import React, { useState } from 'react';
import { Phone, Mail, MessageCircle, AlertTriangle, Calendar, CheckCircle } from 'lucide-react';

const CustomerDueSection = ({ data }) => {
    const [activeTab, setActiveTab] = useState('due'); // 'due' or 'overdue'

    if (!data) return <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse">Loading Due List...</div>;

    const { due_this_week, overdue } = data;

    return (
        <div className="card" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ padding: 6, background: '#e0e7ff', borderRadius: 6, color: '#4338ca' }}>⏰</span>
                    Customer Due Tracking
                </h3>
                <div style={{ background: '#f1f5f9', padding: 4, borderRadius: 8, display: 'flex', gap: 4 }}>
                    <button
                        onClick={() => setActiveTab('due')}
                        style={{
                            padding: '6px 16px',
                            background: activeTab === 'due' ? 'white' : 'transparent',
                            color: activeTab === 'due' ? 'var(--primary)' : 'var(--text-secondary)',
                            borderRadius: 6,
                            border: 'none',
                            boxShadow: activeTab === 'due' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        Due This Week <span className="badge-info" style={{ fontSize: '0.7em', padding: '2px 4px', marginLeft: 4 }}>{due_this_week.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('overdue')}
                        style={{
                            padding: '6px 16px',
                            background: activeTab === 'overdue' ? 'white' : 'transparent',
                            color: activeTab === 'overdue' ? 'var(--danger)' : 'var(--text-secondary)',
                            borderRadius: 6,
                            border: 'none',
                            boxShadow: activeTab === 'overdue' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        Overdue Recovery <span className="badge-danger" style={{ fontSize: '0.7em', padding: '2px 4px', marginLeft: 4 }}>{overdue.length}</span>
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>{activeTab === 'due' ? 'Due Date' : 'Status'}</th>
                            <th>Buying Power</th>
                            <th>Potential Value</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(activeTab === 'due' ? due_this_week : overdue).slice(0, 10).map((row, i) => (
                            <tr key={i}>
                                <td style={{ fontWeight: 600 }}>{row.name}</td>
                                <td>
                                    {activeTab === 'due' ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                                            <Calendar size={14} />
                                            {new Date(row.due_date).toLocaleDateString()}
                                        </div>
                                    ) : (
                                        <div style={{ width: 140 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                                                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{row.overdue_days} days late</span>
                                            </div>
                                            <div className="progress-bar" style={{ height: 6, background: '#fee2e2' }}>
                                                <div
                                                    style={{
                                                        height: '100%',
                                                        background: 'var(--danger)',
                                                        borderRadius: 4,
                                                        width: `${Math.min((row.overdue_days / 60) * 100, 100)}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </td>
                                <td style={{ color: 'var(--text-secondary)' }}>
                                    <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem' }}>Every {row.cycle} days</span>
                                </td>
                                <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                                    Rp {(row.last_value || 0).toLocaleString()}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                                            <MessageCircle size={16} />
                                        </button>
                                        <button className="btn-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                                            <Phone size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {(activeTab === 'due' ? due_this_week : overdue).length === 0 && (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        <div style={{ background: '#f0fdf4', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <CheckCircle style={{ color: 'var(--success)', width: 32, height: 32 }} />
                        </div>
                        <h4 style={{ fontWeight: 'bold', marginBottom: 4 }}>All caught up!</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No customers found in this category.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerDueSection;
