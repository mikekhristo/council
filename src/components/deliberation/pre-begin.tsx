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

  function positionFor(
    i: number,
    n: number,
  ): React.CSSProperties {
    if (n === 1) return { left: '50%', bottom: 0, transform: 'translateX(-50%)' };
    if (n === 2) {
      return i === 0
        ? { left: 0, top: '50%', transform: 'translateY(-50%)' }
        : { right: 0, top: '50%', transform: 'translateY(-50%)' };
    }
    if (n === 3) {
      if (i === 0) return { left: 0, top: 30 };
      if (i === 1) return { right: 0, top: 30 };
      return { left: '50%', bottom: 0, transform: 'translateX(-50%)' };
    }
    if (i === 0) return { left: 0, top: 20 };
    if (i === 1) return { right: 0, top: 20 };
    if (i === 2) return { left: 0, bottom: 20 };
    return { right: 0, bottom: 20 };
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
