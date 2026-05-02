'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icon';
import type { SessionStatus } from '@/lib/types';

type SessionRow = {
  id: string;
  topic: string;
  providers: string[];
  maxRounds: number;
  status: SessionStatus;
  createdAt: string | number | Date;
};

type Verdict = 'live' | 'consensus' | 'split';

interface SessionsRailProps {
  current?: string | null;
}

function relativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const day = 86400000;
  if (diffMs < day) return 'Today';
  if (diffMs < 2 * day) return 'Yesterday';
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function verdictFromStatus(status: SessionStatus): Verdict {
  if (status === 'completed') return 'consensus';
  if (status === 'error') return 'split';
  return 'live';
}

const VERDICT_COLOR: Record<Verdict, string> = {
  live: 'var(--accent)',
  consensus: 'var(--done)',
  split: 'var(--err)',
};

export function SessionsRail({ current }: SessionsRailProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;
    fetch('/api/session')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: SessionRow[]) => {
        if (aborted) return;
        setSessions(rows);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => {
      aborted = true;
    };
  }, []);

  return (
    <aside
      className="flex flex-col"
      style={{
        width: 240,
        borderRight: '1px solid var(--rule)',
        background: 'var(--paper-2)',
        flexShrink: 0,
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          height: 56,
          padding: '0 18px',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <span className="micro micro-strong">Sessions</span>
        <button
          className="btn-ghost"
          onClick={() => router.push('/')}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 4,
            color: 'var(--ink-2)',
          }}
          title="New deliberation"
        >
          <Icon name="plus" size={14} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {loading && (
          <div style={{ padding: '12px 18px' }}>
            <span className="micro" style={{ color: 'var(--ink-faint)' }}>
              Loading…
            </span>
          </div>
        )}
        {!loading && sessions.length === 0 && (
          <div style={{ padding: '12px 18px' }}>
            <span
              className="serif-i"
              style={{ fontSize: 13, color: 'var(--ink-faint)' }}
            >
              No proceedings yet.
            </span>
          </div>
        )}
        {sessions.map((s) => {
          const active = s.id === current;
          const verdict = verdictFromStatus(s.status);
          const verdictColor = VERDICT_COLOR[verdict];
          const verdictLabel = verdict;
          const when = relativeTime(new Date(s.createdAt));
          return (
            <button
              key={s.id}
              onClick={() => router.push(`/session/${s.id}`)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 18px',
                background: active ? 'var(--paper)' : 'transparent',
                border: 'none',
                borderLeft: active
                  ? '2px solid var(--accent)'
                  : '2px solid transparent',
                cursor: 'pointer',
                display: 'block',
                color: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--paper)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.35,
                  color: active ? 'var(--ink)' : 'var(--ink-2)',
                  marginBottom: 6,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {s.topic}
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--ink-faint)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {when}
                </span>
                <span
                  className="dot"
                  style={{ background: verdictColor, width: 5, height: 5 }}
                />
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--ink-mute)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {verdictLabel}
                </span>
                <span style={{ flex: 1 }} />
                <span
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--ink-faint)' }}
                >
                  {s.providers.length}p · R{s.maxRounds}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div
        className="flex items-center justify-between"
        style={{
          borderTop: '1px solid var(--rule)',
          padding: '12px 18px',
        }}
      >
        <span className="micro" style={{ fontSize: 9.5 }}>
          {sessions.length} archived
        </span>
        <button
          className="btn-ghost"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 4,
            color: 'var(--ink-mute)',
          }}
          title="Settings"
        >
          <Icon name="gear" size={13} />
        </button>
      </div>
    </aside>
  );
}
