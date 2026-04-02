/**
 * Calculate points earned from a transaction's net sales
 * Formula: Math.floor(net_sales / 500000)
 */
const calculatePoints = (netSales) => {
    return Math.floor(netSales / 500000);
};

// Tier Thresholds based on Lifetime Net Sales
const TIER_THRESHOLDS = {
    GOLD: 10000000,
    DIAMOND: 100000000,
    MOON_STONE: 200000000
};

/**
 * Determine tier based on effective net sales (lifetime sales minus redeemed equivalent)
 */
const determineTier = (effectiveNetSales) => {
    if (effectiveNetSales >= TIER_THRESHOLDS.MOON_STONE) return 'Moon Stone';
    if (effectiveNetSales >= TIER_THRESHOLDS.DIAMOND) return 'Diamond';
    if (effectiveNetSales >= TIER_THRESHOLDS.GOLD) return 'Gold';
    return 'Silver';
};

/**
 * Get sales needed for next tier
 */
const salesToNextTier = (effectiveNetSales) => {
    if (effectiveNetSales >= TIER_THRESHOLDS.MOON_STONE) return { nextTier: null, salesNeeded: 0 };
    if (effectiveNetSales >= TIER_THRESHOLDS.DIAMOND) return { nextTier: 'Moon Stone', salesNeeded: TIER_THRESHOLDS.MOON_STONE - effectiveNetSales };
    if (effectiveNetSales >= TIER_THRESHOLDS.GOLD) return { nextTier: 'Diamond', salesNeeded: TIER_THRESHOLDS.DIAMOND - effectiveNetSales };
    return { nextTier: 'Gold', salesNeeded: TIER_THRESHOLDS.GOLD - effectiveNetSales };
};

/**
 * Get tier color
 */
const getTierColor = (tier) => {
    const colors = {
        Silver: '#C0C0C0',
        Gold: '#FFD700',
        Diamond: '#B9F2FF',
        'Moon Stone': '#E2E8F0', // Or perhaps a glowing indigo/purple for moon stone
    };
    return colors[tier] || '#C0C0C0';
};

module.exports = { calculatePoints, determineTier, salesToNextTier, getTierColor, TIER_THRESHOLDS };
