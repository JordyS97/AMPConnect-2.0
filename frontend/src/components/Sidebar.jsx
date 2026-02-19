import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Package, Star, TrendingUp, CreditCard, User, LogOut, Menu, X,
    BarChart3, Upload, Users, FileText, Settings, ShoppingCart, Layers, Percent,
    Clock, Gift, Heart, Calendar
} from 'lucide-react';

const customerLinks = [
    { path: '/customer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/customer/history', label: 'Riwayat Pembelian', icon: Clock },
    { path: '/customer/spending', label: 'Analisis Belanja', icon: TrendingUp },
    { path: '/customer/rewards', label: 'Reward Points', icon: Gift },
    { path: '/customer/favorites', label: 'Part Favorit', icon: Heart },
    { path: '/customer/comparison', label: 'Laporan', icon: FileText },
    { path: '/customer/parts', label: 'Stok Part', icon: Package },
    { path: '/customer/payment', label: 'Pembayaran', icon: CreditCard },
    { path: '/customer/profile', label: 'Profil', icon: User },
];

const adminLinks = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/sales', label: 'Analitik Penjualan', icon: BarChart3 },
    { path: '/admin/seasonality', label: 'Seasonal Insight', icon: Calendar },
    { path: '/admin/customer-analytics', label: 'Analitik Customer', icon: TrendingUp },
    { path: '/admin/inventory-analytics', label: 'Analitik Produk', icon: Layers },
    { path: '/admin/price-analytics', label: 'Analitik Harga', icon: Percent },
    { path: '/admin/stock', label: 'Manajemen Stok', icon: Package },
    { path: '/admin/upload', label: 'Upload Data', icon: Upload },
    { path: '/admin/users', label: 'Manajemen User', icon: Users },
    { path: '/admin/reports', label: 'Laporan', icon: FileText },
    { path: '/admin/settings', label: 'Pengaturan', icon: Settings },
];

export default function Sidebar({ type = 'customer' }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const links = type === 'admin' ? adminLinks : customerLinks;

    const handleLogout = () => {
        logout();
        navigate(type === 'admin' ? '/admin/login' : '/customer/login');
    };

    return (
        <>
            {/* Mobile toggle */}
            <button
                className="mobile-only"
                onClick={() => setMobileOpen(!mobileOpen)}
                style={{
                    position: 'fixed', top: 16, left: 16, zIndex: 1100,
                    background: 'var(--bg-sidebar)', color: 'white',
                    border: 'none', borderRadius: 'var(--radius)', padding: '10px',
                    cursor: 'pointer', boxShadow: 'var(--shadow-lg)'
                }}
            >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Overlay */}
            {mobileOpen && (
                <div
                    className="mobile-only"
                    onClick={() => setMobileOpen(false)}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', zIndex: 999
                    }}
                />
            )}

            {/* Sidebar */}
            <aside style={{
                position: 'fixed', top: 0, left: 0, bottom: 0,
                width: 260, background: 'var(--bg-sidebar)',
                color: 'white', zIndex: 1000,
                transform: mobileOpen ? 'translateX(0)' : undefined,
                display: 'flex', flexDirection: 'column', // Changed to Flexbox
                transition: 'transform 0.3s ease',
                ...(typeof window !== 'undefined' && window.innerWidth <= 768 && !mobileOpen
                    ? { transform: 'translateX(-100%)' } : {})
            }}>
                {/* Scrollable Content Wrapper */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {/* Logo */}
                    <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', flexShrink: 0 }}>
                        <img src="/logo_white.png" alt="Logo" style={{ width: '130px', height: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
                        <div style={{ paddingLeft: 4 }}>
                            <p style={{ fontSize: '0.65rem', color: '#64748b', margin: 0, marginTop: 4 }}>
                                {type === 'admin' ? 'Admin Portal' : 'Customer Portal'}
                            </p>
                        </div>
                    </div>

                    {/* User info */}
                    {user && (
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.name || user.username}</p>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {type === 'admin' ? user.role : user.no_customer}
                            </p>
                        </div>
                    )}

                    {/* Nav Links */}
                    <nav style={{ padding: '12px 0', flex: 1 }}>
                        {links.map((link) => {
                            const isActive = location.pathname === link.path;
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setMobileOpen(false)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '12px 20px', margin: '2px 8px', borderRadius: 'var(--radius)',
                                        color: isActive ? 'white' : '#94a3b8',
                                        background: isActive ? 'var(--primary)' : 'transparent',
                                        textDecoration: 'none', fontSize: '0.9rem', fontWeight: isActive ? 600 : 400,
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => { if (!isActive) e.target.style.background = 'var(--bg-sidebar-hover)'; }}
                                    onMouseLeave={(e) => { if (!isActive) e.target.style.background = 'transparent'; }}
                                >
                                    <Icon size={20} />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Logout - Fixed at bottom of flex container */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, backgroundColor: 'var(--bg-sidebar)' }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            width: '100%', padding: '12px 16px', borderRadius: 'var(--radius)',
                            background: 'transparent', border: 'none', color: '#ef4444',
                            cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(239,68,68,0.1)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                        <LogOut size={20} />
                        Keluar
                    </button>
                </div>
            </aside>
        </>
    );
}
