'use client';

import { Icon } from '@/components/shared/icon';

interface RoundNavigatorProps {
  totalRounds: number;
  currentRound: number;
  completedRounds: number;
  onRoundSelect: (round: number) => void;
  syncScrollEnabled: boolean;
  onToggleSyncScroll: () => void;
  isLive: boolean;
}

export function RoundNavigator({
  totalRounds,
  currentRound,
  completedRounds,
  onRoundSelect,
  syncScrollEnabled,
  onToggleSyncScroll,
  isLive,
}: RoundNavigatorProps) {
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <div
      className="flex shrink-0 items-center"
      style={{
        borderBottom: '1px solid var(--rule)',
        padding: '0 24px',
        height: 44,
        gap: 16,
        background: 'var(--paper)',
      }}
    >
      <span className="micro">Rounds</span>
      <div
        className="flex"
        style={{
          border: '1px solid var(--rule-strong)',
          // Scroll horizontally when there are many rounds. The
          // sync/keyboard-legend area to the right keeps its space.
          overflowX: 'auto',
          maxWidth: 'min(60vw, 720px)',
        }}
      >
        {rounds.map((r) => {
          const isActive = r === currentRound;
          const isCompleted = r <= completedRounds;
          const isCurrent = isActive && isLive;
          const isFuture = r > completedRounds && !isActive;
          return (
            <button
              key={r}
              type="button"
              onClick={() => !isFuture && onRoundSelect(r)}
              disabled={isFuture}
              className="inline-flex items-center justify-center"
              style={{
                width: 52,
                height: 28,
                background: isActive ? 'var(--accent-wash)' : 'var(--paper)',
                color: isActive
                  ? 'var(--accent-ink)'
                  : isFuture
                    ? 'var(--ink-faint)'
                    : 'var(--ink-2)',
                border: 'none',
                borderRight: r < totalRounds ? '1px solid var(--rule)' : 'none',
                cursor: isFuture ? 'not-allowed' : 'pointer',
                gap: 5,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.08em',
                position: 'relative',
              }}
            >
              <span>R{r}</span>
              {isCurrent && <span className="dot dot-live" />}
              {isCompleted && !isCurrent && !isActive && (
                <Icon name="check" size={10} />
              )}
            </button>
          );
        })}
      </div>

      <div className="rule-v" style={{ height: 16 }} />

      <button
        type="button"
        onClick={onToggleSyncScroll}
        className="inline-flex items-center"
        style={{
          background: syncScrollEnabled ? 'var(--accent-wash)' : 'transparent',
          border: '1px solid',
          borderColor: syncScrollEnabled ? 'var(--accent)' : 'var(--rule)',
          padding: '5px 10px',
          color: syncScrollEnabled ? 'var(--accent-ink)' : 'var(--ink-mute)',
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          gap: 6,
          cursor: 'pointer',
        }}
      >
        <Icon name="sync" size={11} />
        <span>Sync {syncScrollEnabled ? 'on' : 'off'}</span>
      </button>

      <div style={{ flex: 1 }} />

      <div
        className="flex items-center"
        style={{ gap: 14, color: 'var(--ink-faint)' }}
      >
        <LegendItem keys={['1', '…', '4']} label="focus" />
        <LegendItem keys={['Esc']} label="exit" />
        <LegendItem keys={['S']} label="sync" />
        <LegendItem keys={['R1', 'R2']} label="rounds" />
      </div>
    </div>
  );
}

interface LegendItemProps {
  keys: string[];
  label: string;
}

function LegendItem({ keys, label }: LegendItemProps) {
  return (
    <span className="inline-flex items-center" style={{ gap: 6 }}>
      <span className="inline-flex" style={{ gap: 3 }}>
        {keys.map((k, i) => (
          <span key={i} className="kbd">
            {k}
          </span>
        ))}
      </span>
      <span
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--ink-faint)',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
    </span>
  );
}
