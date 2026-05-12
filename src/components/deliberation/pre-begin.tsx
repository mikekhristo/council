'use client';

import type { ProviderConfig } from '@/lib/types';
import { SeatMark, ArbiterSeal } from '@/components/shared/seat-mark';
import { Icon } from '@/components/shared/icon';

interface PreBeginProps {
  providers: ProviderConfig[];
  totalRounds: number;
  arbiter: ProviderConfig;
  onBegin: () => void;
}

export function PreBegin({
  providers,
  totalRounds,
  arbiter,
  onBegin,
}: PreBeginProps) {
  const others = providers.filter((p) => p.id !== arbiter.id);

  // The table sits inside a 320×200 container with 40px horizontal and
  // 50px vertical padding — so the table itself spans x:[40,280],
  // y:[50,150]. Seats are positioned with their HORIZONTAL center on
  // the table edge so they appear to sit at it (chair half-on the
  // edge, half-off).
  function positionFor(
    i: number,
    n: number,
  ): React.CSSProperties {
    const LEFT_EDGE = 40;
    const RIGHT_EDGE = 280;
    const CENTER_X = 160;
    // Vertical offsets put the seat box (32px tall) centered on the
    // table edge: top = edge_y - 16.
    const TOP_BAND = 34;     // seat center at y≈50 (table top edge)
    const BOTTOM_BAND = 134; // seat center at y≈150 (table bottom edge)
    const MID_BAND = 84;     // seat center at y≈100 (table mid)

    const at = (x: number, top: number): React.CSSProperties => ({
      left: x,
      top,
      transform: 'translateX(-50%)',
    });

    if (n === 1) return at(CENTER_X, BOTTOM_BAND);
    if (n === 2) {
      return i === 0 ? at(LEFT_EDGE, MID_BAND) : at(RIGHT_EDGE, MID_BAND);
    }
    if (n === 3) {
      if (i === 0) return at(LEFT_EDGE, MID_BAND);
      if (i === 1) return at(RIGHT_EDGE, MID_BAND);
      return at(CENTER_X, BOTTOM_BAND);
    }
    // n === 4 (only triggers if there are 5+ total members)
    if (i === 0) return at(LEFT_EDGE, TOP_BAND);
    if (i === 1) return at(RIGHT_EDGE, TOP_BAND);
    if (i === 2) return at(LEFT_EDGE, BOTTOM_BAND);
    return at(RIGHT_EDGE, BOTTOM_BAND);
  }

  return (
    <div
      className="flex flex-1 items-center justify-center"
      style={{ padding: 40 }}
    >
      <div style={{ maxWidth: 560, textAlign: 'center' }}>
        <div className="micro" style={{ marginBottom: 18 }}>
          Council assembled · awaiting opening
        </div>

        <div
          className="mx-auto"
          style={{
            position: 'relative',
            width: 320,
            height: 200,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 40,
              right: 40,
              top: 50,
              bottom: 50,
              border: '1px solid var(--rule-strong)',
              background: 'var(--paper-2)',
            }}
          />
          {others.map((p, i) => (
            <div
              key={p.id}
              className="flex flex-col items-center"
              style={{
                position: 'absolute',
                gap: 4,
                ...positionFor(i, others.length),
              }}
            >
              <SeatMark provider={p} size={32} />
              <span
                className="mono"
                style={{
                  fontSize: 9.5,
                  color: 'var(--ink-mute)',
                  letterSpacing: '0.08em',
                }}
              >
                {p.short}
              </span>
            </div>
          ))}
          <div
            className="flex flex-col items-center"
            style={{
              position: 'absolute',
              top: -10,
              left: '50%',
              transform: 'translateX(-50%)',
              gap: 4,
            }}
          >
            <ArbiterSeal size={36} />
            <span
              className="mono"
              style={{
                fontSize: 9.5,
                color: 'var(--seat-arb)',
                letterSpacing: '0.08em',
                fontWeight: 500,
              }}
            >
              {arbiter.short} · arbiter
            </span>
          </div>
        </div>

        <h2
          className="serif"
          style={{
            fontSize: 28,
            fontWeight: 400,
            lineHeight: 1.25,
            margin: 0,
            color: 'var(--ink)',
          }}
        >
          {providers.length} members configured for {totalRounds}{' '}
          {totalRounds === 1 ? 'round' : 'rounds'}.
        </h2>
        <p
          className="serif-i"
          style={{
            color: 'var(--ink-mute)',
            fontSize: 17,
            marginTop: 12,
            marginBottom: 28,
          }}
        >
          Press{' '}
          <span className="mono" style={{ fontStyle: 'normal', fontSize: 13 }}>
            Begin
          </span>{' '}
          to open the floor.
        </p>
        <button
          type="button"
          className="btn btn-accent"
          onClick={onBegin}
          style={{ padding: '12px 32px', fontSize: 14 }}
        >
          <span
            className="serif"
            style={{ fontSize: 15, fontStyle: 'italic' }}
          >
            Begin deliberation
          </span>
          <Icon name="caret-right" size={13} />
        </button>
      </div>
    </div>
  );
}
