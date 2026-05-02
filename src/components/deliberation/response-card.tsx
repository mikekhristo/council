'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { ProviderId, Response } from '@/lib/types';
import { DEFAULT_PROVIDERS, seatNumeral } from '@/lib/providers/config';
import { MarkdownRenderer } from '@/components/shared/markdown-renderer';
import { SeatMark } from '@/components/shared/seat-mark';
import { StatusPill, type StatusKind } from '@/components/shared/status-pill';
import { Icon } from '@/components/shared/icon';
import { formatLatency, formatTokens } from '@/lib/utils/format';

export type CardStatus = 'waiting' | 'streaming' | 'complete' | 'error';

const STATUS_META: Record<CardStatus, { kind: StatusKind; label: string }> = {
  waiting: { kind: 'idle', label: 'Idle' },
  streaming: { kind: 'live', label: 'Speaking' },
  complete: { kind: 'done', label: 'Done' },
  error: { kind: 'err', label: 'Error' },
};

interface ResponseCardProps {
  providerId: ProviderId;
  streamingText: string;
  completedResponse: Response | null;
  status: CardStatus;
  isFocused?: boolean;
  isCompressed?: boolean;
  onFocusToggle?: () => void;
  syncScrollEnabled?: boolean;
  onSyncScroll?: (scrollPercent: number) => void;
  syncScrollPercent?: number;
  viewRound?: number;
}

export function ResponseCard({
  providerId,
  streamingText,
  completedResponse,
  status,
  isFocused,
  isCompressed,
  onFocusToggle,
  syncScrollEnabled,
  onSyncScroll,
  syncScrollPercent,
  viewRound,
}: ResponseCardProps) {
  const provider = DEFAULT_PROVIDERS[providerId];
  const name = provider?.short ?? providerId;
  const content = completedResponse?.content ?? streamingText;

  const bodyRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const isScrollSourceRef = useRef(false);
  const isSyncingRef = useRef(false);

  const checkIfAtBottom = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  }, []);

  const handleScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (isSyncingRef.current) return;

    const atBottom = checkIfAtBottom();
    if (status === 'streaming') {
      if (!atBottom) {
        setAutoScroll(false);
        setShowJumpButton(true);
      } else {
        setAutoScroll(true);
        setShowJumpButton(false);
      }
    }

    if (syncScrollEnabled && onSyncScroll && !isSyncingRef.current) {
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll > 0) {
        isScrollSourceRef.current = true;
        const percent = el.scrollTop / maxScroll;
        onSyncScroll(percent);
        requestAnimationFrame(() => {
          isScrollSourceRef.current = false;
        });
      }
    }
  }, [status, checkIfAtBottom, syncScrollEnabled, onSyncScroll]);

  useEffect(() => {
    if (status === 'streaming' && autoScroll && bodyRef.current) {
      requestAnimationFrame(() => {
        if (bodyRef.current) {
          bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
      });
    }
  }, [streamingText, status, autoScroll]);

  useEffect(() => {
    if (status !== 'streaming') {
      setShowJumpButton(false);
      setAutoScroll(true);
    }
  }, [status]);

  useEffect(() => {
    if (
      syncScrollEnabled &&
      syncScrollPercent !== undefined &&
      !isScrollSourceRef.current &&
      bodyRef.current
    ) {
      const el = bodyRef.current;
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll > 0) {
        isSyncingRef.current = true;
        el.scrollTop = syncScrollPercent * maxScroll;
        requestAnimationFrame(() => {
          isSyncingRef.current = false;
        });
      }
    }
  }, [syncScrollPercent, syncScrollEnabled]);

  const jumpToBottom = useCallback(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
      setAutoScroll(true);
      setShowJumpButton(false);
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    onFocusToggle?.();
  }, [onFocusToggle]);

  const wash =
    provider && provider.seat
      ? `var(--seat-${provider.seat}-wash)`
      : 'var(--paper-2)';
  const seatColor =
    provider && provider.seat ? `var(--seat-${provider.seat})` : 'var(--ink-mute)';

  const { kind: statusKind, label: statusLabel } = STATUS_META[status];

  // Compressed (focus-mode sidebar)
  if (isCompressed) {
    return (
      <article
        className="flex min-h-0 flex-col"
        style={{
          background: 'var(--paper)',
          borderLeft: `2px solid ${seatColor}`,
          flex: 1,
          cursor: 'pointer',
          minHeight: 0,
        }}
        onClick={onFocusToggle}
      >
        <header
          className="flex shrink-0 items-center"
          style={{
            gap: 10,
            padding: '8px 12px',
            borderBottom: '1px solid var(--rule)',
            background: wash,
          }}
        >
          {provider && <SeatMark provider={provider} size={18} />}
          <span
            className="serif"
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--ink)',
            }}
          >
            {name}
          </span>
          <StatusPill kind={statusKind}>{statusLabel}</StatusPill>
        </header>
        <div
          className="min-h-0 flex-1 overflow-y-auto"
          style={{
            padding: '12px 14px',
            fontFamily: 'var(--serif)',
            fontSize: 13,
            lineHeight: 1.65,
            color: 'var(--ink-2)',
          }}
        >
          {content && <MarkdownRenderer content={content} />}
        </div>
      </article>
    );
  }

  return (
    <article
      className="flex h-full flex-col"
      style={{
        background: 'var(--paper)',
        borderLeft: `2px solid ${seatColor}`,
        position: 'relative',
        minHeight: 0,
      }}
    >
      <header
        className="flex shrink-0 items-center"
        style={{
          gap: 10,
          padding: '12px 18px',
          borderBottom: '1px solid var(--rule)',
          background: wash,
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onDoubleClick={handleDoubleClick}
      >
        {provider && <SeatMark provider={provider} size={22} />}
        <div
          className="flex flex-col"
          style={{ minWidth: 0, flex: 1 }}
        >
          <span
            className="serif"
            style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: '-0.005em',
              color: 'var(--ink)',
            }}
          >
            {name}
          </span>
          {provider && (
            <span
              className="mono"
              style={{
                fontSize: 9.5,
                color: 'var(--ink-mute)',
                letterSpacing: '0.08em',
              }}
            >
              Seat {seatNumeral(provider.seat)} · {provider.house}
            </span>
          )}
        </div>
        <StatusPill kind={statusKind}>{statusLabel}</StatusPill>
        {!isFocused && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFocusToggle?.();
            }}
            className="btn-ghost"
            style={{
              background: 'transparent',
              border: 'none',
              padding: 4,
              color: 'var(--ink-mute)',
            }}
            title={provider ? `Focus (press ${provider.seat})` : 'Focus'}
          >
            <Icon name="expand" size={13} />
          </button>
        )}
        {isFocused && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFocusToggle?.();
            }}
            className="btn-ghost"
            style={{
              background: 'transparent',
              border: 'none',
              padding: 4,
              color: 'var(--ink-mute)',
            }}
            title="Exit focus (Esc)"
          >
            <Icon name="collapse" size={13} />
          </button>
        )}
      </header>

      <div
        ref={bodyRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto"
        style={{
          padding: isFocused ? '24px 32px' : '20px 22px',
          fontFamily: 'var(--serif)',
          fontSize: isFocused ? 17 : 15,
          lineHeight: 1.65,
          color: 'var(--ink)',
        }}
      >
        {status === 'waiting' && (
          <span
            className="serif-i"
            style={{ color: 'var(--ink-faint)' }}
          >
            <span className="cursor" />
          </span>
        )}
        {status === 'streaming' && content && (
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {content}
            <span className="cursor" />
          </div>
        )}
        {status === 'complete' && content && (
          <MarkdownRenderer content={content} />
        )}
        {status === 'error' && (
          <p
            className="serif-i"
            style={{ color: 'var(--err)', fontSize: 14 }}
          >
            {completedResponse?.error ?? 'An error occurred'}
          </p>
        )}
      </div>

      {showJumpButton && (
        <button
          type="button"
          onClick={jumpToBottom}
          className="inline-flex items-center"
          style={{
            position: 'absolute',
            bottom: 56,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 12px',
            background: 'var(--ink)',
            color: 'var(--paper)',
            border: 'none',
            gap: 6,
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '0 4px 16px oklch(0.18 0.01 60 / 0.18)',
          }}
        >
          <Icon name="jump" size={11} />
          Jump to latest
        </button>
      )}

      {status === 'complete' && completedResponse && (
        <footer
          className="flex shrink-0 justify-between"
          style={{
            padding: '8px 18px',
            borderTop: '1px solid var(--rule)',
            background: 'var(--paper-2)',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 10.5,
              color: 'var(--ink-mute)',
              letterSpacing: '0.06em',
            }}
          >
            {formatTokens(completedResponse.completionTokens)} tok ·{' '}
            {formatLatency(completedResponse.latencyMs)}
          </span>
          {viewRound && (
            <span
              className="mono"
              style={{
                fontSize: 10.5,
                color: 'var(--ink-faint)',
                letterSpacing: '0.06em',
              }}
            >
              R{viewRound} · {name.toLowerCase()}
            </span>
          )}
        </footer>
      )}
    </article>
  );
}
