/**
 * Calculate points earned from a transaction's net sales
 * Formula: Math.floor(net_sales / 500000)
 */
const calculatePoints = (netSales) => {
    return Math.floor(netSales / 500000);
};

/**
 * Determine tier based on total points
 * Silver: 0-499
 * Gold: 500-1499
 * Diamond: 1500+
 */
const determineTier = (totalPoints) => {
    if (totalPoints >= 1500) return 'Diamond';
    if (totalPoints >= 500) return 'Gold';
    return 'Silver';
};

/**
 * Get points needed for next tier
 */
const pointsToNextTier = (totalPoints) => {
    if (totalPoints >= 1500) return { nextTier: null, pointsNeeded: 0 };
    if (totalPoints >= 500) return { nextTier: 'Diamond', pointsNeeded: 1500 - totalPoints };
    return { nextTier: 'Gold', pointsNeeded: 500 - totalPoints };
};

/**
 * Get tier color
 */
const getTierColor = (tier) => {
    const colors = {
        Silver: '#C0C0C0',
        Gold: '#FFD700',
        Diamond: '#B9F2FF',
    };
    return colors[tier] || '#C0C0C0';
};

module.exports = { calculatePoints, determineTier, pointsToNextTier, getTierColor };
