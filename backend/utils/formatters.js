// Format currency to Indonesian Rupiah
const formatCurrency = (amount) => {
    return 'Rp ' + Number(amount).toLocaleString('id-ID');
};

// Format date to Indonesian format DD/MM/YYYY
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

module.exports = { formatCurrency, formatDate };
