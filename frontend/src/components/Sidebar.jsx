import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoMark } from './Logo';
import {
    LayoutDashboard, Package, TrendingUp, CreditCard, User, LogOut, Menu, X,
    BarChart3, Upload, Users, FileText, Settings, Layers, Percent,
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
    // Single source of truth for the drawer. The old component read
    // window.innerWidth at render time with no resize listener, so the sidebar
    // showed the wrong state after a rotate or resize. Visibility is now pure
    // CSS (a media query); this flag only drives the mobile drawer open/close.
    const [open, setOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const links = type === 'admin' ? adminLinks : customerLinks;
    const portal = type === 'admin' ? 'Admin Portal' : 'Customer Portal';

    // Close on route change — a tapped link should navigate then dismiss.
    useEffect(() => { setOpen(false); }, [location.pathname]);

    // Lock body scroll while the drawer covers the page, and close on Escape.
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const handleLogout = () => {
        logout();
        navigate(type === 'admin' ? '/admin/login' : '/customer/login');
    };

    return (
        <>
            {/* Mobile top bar — a real 56px app bar instead of a floating button
                that overlapped the page heading. Only rendered on mobile. */}
            <header className="app-topbar">
                <button
                    className="app-topbar-toggle"
                    onClick={() => setOpen(true)}
                    aria-label="Buka menu"
                    aria-expanded={open}
                >
                    <Menu size={22} />
                </button>
                <div className="app-topbar-brand">
                    <LogoMark size={26} tone="light" />
                    <span>
                        <b>AMP</b>Connect
                    </span>
                </div>
            </header>

            {/* Scrim — fades in, click to dismiss. */}
            <div
                className={`app-overlay ${open ? 'is-open' : ''}`}
                onClick={() => setOpen(false)}
                aria-hidden="true"
            />

            <aside className={`app-sidebar ${open ? 'is-open' : ''}`}>
                <div className="app-sidebar-scroll">
                    <div className="app-sidebar-brand">
                        <LogoMark size={30} tone="light" />
                        <div>
                            <div className="app-sidebar-word"><b>AMP</b>Connect</div>
                            <div className="app-sidebar-portal">{portal}</div>
                        </div>
                        {/* Close affordance inside the drawer, mobile only. */}
                        <button
                            className="app-sidebar-close"
                            onClick={() => setOpen(false)}
                            aria-label="Tutup menu"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {user && (
                        <div className="app-sidebar-user">
                            <p className="app-sidebar-user-name">{user.name || user.username}</p>
                            <p className="app-sidebar-user-meta">
                                {type === 'admin' ? user.role : user.no_customer}
                            </p>
                        </div>
                    )}

                    <nav className="app-sidebar-nav">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = location.pathname === link.path;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`app-nav-link ${isActive ? 'is-active' : ''}`}
                                >
                                    <Icon size={19} strokeWidth={2} />
                                    <span>{link.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="app-sidebar-foot">
                    <button className="app-nav-link app-nav-logout" onClick={handleLogout}>
                        <LogOut size={19} strokeWidth={2} />
                        <span>Keluar</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
