// AMPConnect Frontend v2.1 - Deployment Trigger
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';

// Customer pages
import CustomerLogin from './pages/customer/Login';
import CustomerRegister from './pages/customer/Register';
import VerifyOTP from './pages/customer/VerifyOTP';
import CustomerDashboard from './pages/customer/Dashboard';
import Parts from './pages/customer/Parts';
import Payment from './pages/customer/Payment';
import Profile from './pages/customer/Profile';

// New Customer Pages
import PurchaseHistory from './pages/customer/PurchaseHistory';
import SpendingAnalytics from './pages/customer/SpendingAnalytics';
import Rewards from './pages/customer/Rewards';
import FavoriteParts from './pages/customer/FavoriteParts';
import Comparison from './pages/customer/Comparison';

// Admin pages
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import Sales from './pages/admin/Sales';
import Stock from './pages/admin/Stock';
import UploadPage from './pages/admin/Upload';
import UsersPage from './pages/admin/Users';
import Reports from './pages/admin/Reports';
import CustomerAnalytics from './pages/admin/CustomerAnalytics';
import InventoryAnalytics from './pages/admin/InventoryAnalytics';
import PricingAnalytics from './pages/admin/PricingAnalytics';
import DashboardAnalytics from './pages/DashboardAnalytics';
import Settings from './pages/admin/Settings';


import Sidebar from './components/Sidebar';

function CustomerRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
    if (!user || user.role) return <Navigate to="/customer/login" />;
    return (
        <div className="app-layout">
            <Sidebar type="customer" />
            <main className="main-content">{children}</main>
        </div>
    );
}

function AdminRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
    if (!user || !user.role) return <Navigate to="/admin/login" />;
    return (
        <div className="app-layout">
            <Sidebar type="admin" />
            <main className="main-content">{children}</main>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <Routes>
                        {/* Public */}
                        <Route path="/" element={<Navigate to="/customer/login" />} />

                        {/* Customer Auth */}
                        <Route path="/customer/login" element={<CustomerLogin />} />
                        <Route path="/customer/register" element={<CustomerRegister />} />
                        <Route path="/customer/verify-otp" element={<VerifyOTP />} />

                        {/* Customer Protected */}
                        <Route path="/customer/dashboard" element={<CustomerRoute><CustomerDashboard /></CustomerRoute>} />
                        <Route path="/customer/parts" element={<CustomerRoute><Parts /></CustomerRoute>} />
                        <Route path="/customer/payment" element={<CustomerRoute><Payment /></CustomerRoute>} />
                        <Route path="/customer/profile" element={<CustomerRoute><Profile /></CustomerRoute>} />

                        {/* New Routes */}
                        <Route path="/customer/history" element={<CustomerRoute><PurchaseHistory /></CustomerRoute>} />
                        <Route path="/customer/spending" element={<CustomerRoute><SpendingAnalytics /></CustomerRoute>} />
                        <Route path="/customer/rewards" element={<CustomerRoute><Rewards /></CustomerRoute>} />
                        <Route path="/customer/favorites" element={<CustomerRoute><FavoriteParts /></CustomerRoute>} />
                        <Route path="/customer/comparison" element={<CustomerRoute><Comparison /></CustomerRoute>} />

                        {/* Admin Auth */}
                        <Route path="/admin/login" element={<AdminLogin />} />

                        {/* Admin Protected */}
                        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                        <Route path="/admin/sales" element={<AdminRoute><Sales /></AdminRoute>} />
                        <Route path="/admin/stock" element={<AdminRoute><Stock /></AdminRoute>} />
                        <Route path="/admin/upload" element={<AdminRoute><UploadPage /></AdminRoute>} />
                        <Route path="/admin/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
                        <Route path="/admin/reports" element={<AdminRoute><Reports /></AdminRoute>} />
                        <Route path="/admin/customer-analytics" element={<AdminRoute><CustomerAnalytics /></AdminRoute>} />
                        <Route path="/admin/inventory-analytics" element={<AdminRoute><InventoryAnalytics /></AdminRoute>} />
                        <Route path="/admin/inventory-analytics" element={<AdminRoute><InventoryAnalytics /></AdminRoute>} />
                        <Route path="/admin/price-analytics" element={<AdminRoute><PricingAnalytics /></AdminRoute>} />
                        <Route path="/admin/seasonality" element={<AdminRoute><DashboardAnalytics /></AdminRoute>} />
                        <Route path="/admin/settings" element={<AdminRoute><Settings /></AdminRoute>} />

                        {/* Catch all */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
