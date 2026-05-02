import { ReactNode } from 'react';
import { Wordmark } from './wordmark';
import { StatusPill, type StatusKind } from './status-pill';

interface TopBarProps {
  breadcrumb?: string;
  status?: string;
  statusKind?: StatusKind;
  sessionId?: string;
  right?: ReactNode;
}

export function TopBar({
  breadcrumb,
  status,
  statusKind,
  sessionId,
  right,
}: TopBarProps) {
  return (
    <header
      className="flex shrink-0 items-center"
      style={{
        height: 56,
        borderBottom: '1px solid var(--rule)',
        padding: '0 24px',
        background: 'var(--paper)',
      }}
    >
      <div
        className="flex flex-1 items-center"
        style={{ gap: 16, minWidth: 0 }}
      >
        <Wordmark size={20} />
        {breadcrumb && (
          <>
            <span
              className="serif-i"
              style={{ color: 'var(--ink-faint)', fontSize: 14 }}
            >
              ·
            </span>
            <span
              className="serif-i truncate"
              style={{
                fontSize: 14,
                color: 'var(--ink-2)',
                flex: 1,
                minWidth: 0,
                maxWidth: 720,
              }}
            >
              {breadcrumb}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center" style={{ gap: 12 }}>
        {sessionId && (
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--ink-faint)',
              letterSpacing: '0.08em',
            }}
          >
            {sessionId}
          </span>
        )}
        {status && (
          <StatusPill kind={statusKind || 'idle'}>{status}</StatusPill>
        )}
        {right}
      </div>
    </header>
  );
}
