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
 * Determine tier based on total lifetime net sales
 */
const determineTier = (lifetimeNetSales) => {
    if (lifetimeNetSales >= TIER_THRESHOLDS.MOON_STONE) return 'Moon Stone';
    if (lifetimeNetSales >= TIER_THRESHOLDS.DIAMOND) return 'Diamond';
    if (lifetimeNetSales >= TIER_THRESHOLDS.GOLD) return 'Gold';
    return 'Silver';
};

/**
 * Get sales needed for next tier
 */
const salesToNextTier = (lifetimeNetSales) => {
    if (lifetimeNetSales >= TIER_THRESHOLDS.MOON_STONE) return { nextTier: null, salesNeeded: 0 };
    if (lifetimeNetSales >= TIER_THRESHOLDS.DIAMOND) return { nextTier: 'Moon Stone', salesNeeded: TIER_THRESHOLDS.MOON_STONE - lifetimeNetSales };
    if (lifetimeNetSales >= TIER_THRESHOLDS.GOLD) return { nextTier: 'Diamond', salesNeeded: TIER_THRESHOLDS.DIAMOND - lifetimeNetSales };
    return { nextTier: 'Gold', salesNeeded: TIER_THRESHOLDS.GOLD - lifetimeNetSales };
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
