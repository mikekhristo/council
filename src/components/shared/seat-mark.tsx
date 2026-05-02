import type { ProviderConfig } from '@/lib/types';
import { seatNumeral } from '@/lib/providers/config';

const SEAT_BG_VARS: Record<number, string> = {
  1: 'var(--seat-1-wash)',
  2: 'var(--seat-2-wash)',
  3: 'var(--seat-3-wash)',
  4: 'var(--seat-4-wash)',
};

const SEAT_FG_VARS: Record<number, string> = {
  1: 'var(--seat-1)',
  2: 'var(--seat-2)',
  3: 'var(--seat-3)',
  4: 'var(--seat-4)',
};

interface SeatMarkProps {
  provider: ProviderConfig;
  size?: number;
  role?: 'arbiter' | 'member';
}

export function SeatMark({ provider, size = 28, role = 'member' }: SeatMarkProps) {
  const isArb = role === 'arbiter';
  const numeral = isArb ? '✦' : seatNumeral(provider.seat);
  const bg = isArb ? 'var(--seat-arb-wash)' : SEAT_BG_VARS[provider.seat];
  const fg = isArb ? 'var(--seat-arb)' : SEAT_FG_VARS[provider.seat];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        background: bg,
        color: fg,
        border: `1px solid ${fg}`,
        fontFamily: 'var(--serif)',
        fontStyle: isArb ? 'normal' : 'italic',
        fontSize: size * 0.5,
        fontWeight: 400,
        lineHeight: 1,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {numeral}
    </span>
  );
}

interface ArbiterSealProps {
  size?: number;
  active?: boolean;
  showGlyph?: boolean;
}

export function ArbiterSeal({
  size = 32,
  active = true,
  showGlyph = true,
}: ArbiterSealProps) {
  const fill = active ? 'var(--seat-arb-wash)' : 'transparent';
  const stroke = active ? 'var(--seat-arb)' : 'var(--ink-faint)';
  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size * 1.25, flexShrink: 0 }}
    >
      <svg
        viewBox="0 0 22 28"
        width={size}
        height={size * 1.25}
        style={{ position: 'absolute', inset: 0 }}
      >
        <path
          d="M11 0 C 19 5, 22 14, 11 28 C 0 14, 3 5, 11 0 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.2"
        />
      </svg>
      {showGlyph && (
        <span
          className="serif relative"
          style={{
            fontSize: size * 0.55,
            color: stroke,
            lineHeight: 1,
          }}
        >
          ✦
        </span>
      )}
    </span>
  );
}
