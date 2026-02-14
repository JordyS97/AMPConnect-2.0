import { Star, Gem } from 'lucide-react';
import { getTierInfo } from '../utils/formatters';

export default function TierBadge({ tier, size = 'normal' }) {
    const info = getTierInfo(tier);
    const isLarge = size === 'large';

    return (
        <span className={`tier-badge ${info.className}`} style={isLarge ? { fontSize: '1.05rem', padding: '10px 20px' } : {}}>
            <span>{info.icon}</span>
            {tier}
        </span>
    );
}
