export const formatCurrency = (amount) => {
    return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
};

export const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
};

export const formatNumber = (num) => {
    return Number(num || 0).toLocaleString('id-ID');
};

export const formatPercent = (num) => {
    return Number(num || 0).toFixed(1) + '%';
};

export const getStockStatus = (qty) => {
    if (qty > 20) return { label: 'Tersedia', className: 'badge-success', qtyClass: 'in-stock' };
    if (qty > 0) return { label: `Stok Rendah (${qty} tersisa)`, className: 'badge-warning', qtyClass: 'low-stock' };
    return { label: 'Habis', className: 'badge-danger', qtyClass: 'out-of-stock' };
};

export const getTierInfo = (tier) => {
    const tiers = {
        Silver: { color: '#C0C0C0', bg: '#f0f0f0', icon: '⭐', className: 'silver' },
        Gold: { color: '#FFD700', bg: '#fff8e1', icon: '🌟', className: 'gold' },
        Diamond: { color: '#B9F2FF', bg: '#e0f7fa', icon: '💎', className: 'diamond' },
    };
    return tiers[tier] || tiers.Silver;
};
