/**
 * AMPConnect brand mark.
 *
 * Evolves the existing logo rather than replacing it, so it still reads as the
 * same company: the gear/rotor ring and the connection-node motif both carry
 * over. What changes is the execution.
 *
 * - The old mark had eight heavy gear teeth that turned into a dark blob below
 *   ~32px. Here the ring is a single stroked circle broken by six precise gaps
 *   (a dash pattern computed to close exactly), which reads as machined
 *   precision and survives small sizes.
 * - The three linked nodes inside form a shallow chevron: a network graph for
 *   "Connect", and an implied A for AMP.
 * - Navy with one restrained gold accent. Premium reads as restraint, so the
 *   blue-to-purple gradient is gone.
 *
 * Vector, so it is crisp at any size and themeable. The wordmark stays live
 * text rather than outlines — it renders sharper, is selectable, and is read
 * correctly by screen readers.
 */

const TONES = {
    // On light surfaces.
    dark: { mark: '#0A2540', node: '#0A2540', accent: '#C8A45C', word: '#0A2540', sub: '#5A7184' },
    // On photography or dark panels.
    light: { mark: '#FFFFFF', node: '#FFFFFF', accent: '#E0BE74', word: '#FFFFFF', sub: 'rgba(255,255,255,0.72)' },
};

// Ring: r=18 gives a circumference of 2*pi*18 = 113.097. Six equal segments of
// 13.85 plus six gaps of 5.0 sum to 113.1 — the pattern closes with no visible
// seam, which is the whole point of using a dash array for gear teeth.
const R = 18;
const DASH = '13.85 5';

export function LogoMark({ size = 40, tone = 'dark', className }) {
    const c = TONES[tone] ?? TONES.dark;
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            className={className}
            aria-hidden="true"
            focusable="false"
        >
            <circle
                cx="24"
                cy="24"
                r={R}
                stroke={c.mark}
                strokeWidth="2.6"
                strokeDasharray={DASH}
                strokeLinecap="round"
                transform="rotate(-90 24 24)"
            />
            <polyline
                points="17,28.5 24,18.5 31,28.5"
                stroke={c.node}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="17" cy="28.5" r="2.5" fill={c.node} />
            <circle cx="31" cy="28.5" r="2.5" fill={c.node} />
            <circle cx="24" cy="18.5" r="2.9" fill={c.accent} />
        </svg>
    );
}

/**
 * Horizontal lockup. `subtitle` renders the portal name under the wordmark so
 * admin and customer entry points are distinguishable at a glance.
 */
export default function Logo({ size = 36, tone = 'dark', subtitle, className }) {
    const c = TONES[tone] ?? TONES.dark;
    return (
        <div
            className={className}
            style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.32 }}
        >
            <LogoMark size={size} tone={tone} />
            <div style={{ lineHeight: 1.1 }}>
                <div
                    style={{
                        fontSize: size * 0.56,
                        fontWeight: 400,
                        // Optical tightening: at display sizes the default tracking
                        // reads loose and generic.
                        letterSpacing: '-0.02em',
                        color: c.word,
                        whiteSpace: 'nowrap',
                    }}
                >
                    <span style={{ fontWeight: 700 }}>AMP</span>Connect
                </div>
                {subtitle && (
                    <div
                        style={{
                            fontSize: size * 0.26,
                            fontWeight: 600,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color: c.sub,
                            marginTop: size * 0.11,
                        }}
                    >
                        {subtitle}
                    </div>
                )}
            </div>
        </div>
    );
}
