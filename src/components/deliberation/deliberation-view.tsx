'use client';

import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import type { Session, Response as SessionResponse } from '@/lib/types';
import { useSessionStore } from '@/stores/session-store';
import { parseSSEStream } from '@/lib/utils/sse-parser';
import { DEFAULT_PROVIDERS } from '@/lib/providers/config';
import { SessionsRail } from '@/components/shared/sessions-rail';
import { TopBar } from '@/components/shared/top-bar';
import { Icon } from '@/components/shared/icon';
import type { StatusKind } from '@/components/shared/status-pill';
import { ResponseGrid } from './response-grid';
import { RoundNavigator } from './round-navigator';
import { PreBegin } from './pre-begin';
import {
  SynthesisDrawer,
  type DrawerState,
} from '@/components/synthesis/synthesis-drawer';

interface DeliberationViewProps {
  session: Session;
}

export function DeliberationView({ session }: DeliberationViewProps) {
  const store = useSessionStore();
  const [viewingRound, setViewingRound] = useState(1);
  const [activeProviders, setActiveProviders] = useState<Set<string>>(
    new Set(),
  );
  const [completedRoundsCount, setCompletedRoundsCount] = useState(0);
  const [syncScrollEnabled, setSyncScrollEnabled] = useState(false);
  const [focusedPane, setFocusedPane] = useState<string | null>(null);
  const [drawerState, setDrawerState] = useState<DrawerState>('collapsed');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    store.setSession(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const arbiter = useMemo(() => {
    const id = session.arbiterId ?? session.providers[2] ?? session.providers[0];
    return DEFAULT_PROVIDERS[id] ?? DEFAULT_PROVIDERS[session.providers[0]];
  }, [session.arbiterId, session.providers]);

  const startDeliberation = useCallback(async () => {
    store.startDeliberation();
    setViewingRound(1);
    setCompletedRoundsCount(0);
    setActiveProviders(new Set());

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/session/${session.id}/deliberate`, {
        method: 'POST',
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        store.setError(data.error || `Deliberation failed (${res.status})`);
        return;
      }

      for await (const event of parseSSEStream(res)) {
        if (controller.signal.aborted) break;

        const data = event.data as Record<string, unknown>;

        switch (event.type) {
          case 'round-start': {
            const roundNum = data.roundNumber as number;
            store.setCurrentRound(roundNum);
            setViewingRound(roundNum);
            setActiveProviders(new Set());
            break;
          }
          case 'response-chunk': {
            const providerId = data.providerId as string;
            const chunk = data.chunk as string;
            setActiveProviders((prev) =>
              prev.has(providerId) ? prev : new Set(prev).add(providerId),
            );
            store.appendChunk(providerId, chunk);
            break;
          }
          case 'response-complete': {
            const providerId = data.providerId as string;
            const roundNumber = data.roundNumber as number;
            const response = data.response as SessionResponse;
            store.completeResponse(providerId, roundNumber, response);
            setActiveProviders((prev) => {
              const next = new Set(prev);
              next.delete(providerId);
              return next;
            });
            break;
          }
          case 'round-complete': {
            const roundNumber = data.roundNumber as number;
            store.completeRound();
            setCompletedRoundsCount(roundNumber);
            break;
          }
          case 'synthesis-start': {
            store.startSynthesis();
            setDrawerState('half');
            break;
          }
          case 'synthesis-chunk': {
            const chunk = data.chunk as string;
            store.appendSynthesisChunk(chunk);
            break;
          }
          case 'synthesis-complete': {
            const synthesis = data.synthesis as import('@/lib/types').SynthesisResult;
            store.setSynthesis(synthesis);
            break;
          }
          case 'deliberation-complete': {
            break;
          }
          case 'error': {
            store.setError(data.message as string);
            break;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        store.setError((err as Error).message || 'Connection lost');
      }
    }
  }, [session.id, store]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        !store.isDeliberating &&
        completedRoundsCount === 0 &&
        !store.synthesis
      )
        return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )
        return;

      switch (e.key) {
        case '1':
        case '2':
        case '3':
        case '4': {
          const index = parseInt(e.key) - 1;
          if (index < session.providers.length) {
            const providerId = session.providers[index];
            setFocusedPane((prev) => (prev === providerId ? null : providerId));
          }
          break;
        }
        case 'Escape': {
          setFocusedPane(null);
          break;
        }
        case 's':
        case 'S': {
          setSyncScrollEnabled((prev) => !prev);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    store.isDeliberating,
    completedRoundsCount,
    store.synthesis,
    session.providers,
  ]);

  const roundResponses: Record<string, SessionResponse> = {};
  for (const providerId of session.providers) {
    const resp = store.completedResponses[providerId]?.[viewingRound];
    if (resp) roundResponses[providerId] = resp;
  }

  const isViewingCurrentRound = viewingRound === store.currentRound;
  const showStreamingText = isViewingCurrentRound && store.isDeliberating;

  const status: { text: string; kind: StatusKind } = (() => {
    if (store.isDeliberating)
      return {
        text: `Round ${store.currentRound} of ${session.maxRounds}`,
        kind: 'live',
      };
    if (store.isSynthesizing) return { text: 'Synthesizing', kind: 'synth' };
    if (store.synthesis) return { text: 'Complete', kind: 'done' };
    if (store.error) return { text: 'Error', kind: 'err' };
    return { text: 'Ready', kind: 'idle' };
  })();

  const showGrid =
    viewingRound > 0 && (store.isDeliberating || completedRoundsCount > 0);
  const showSynthesisDrawer = store.isSynthesizing || store.synthesis;
  const isLive = store.isDeliberating;
  const sessionProviderConfigs = session.providers
    .map((id) => DEFAULT_PROVIDERS[id])
    .filter(Boolean);

  return (
    <div className="flex" style={{ minHeight: '100vh', maxHeight: '100vh' }}>
      <SessionsRail current={session.id} />

      <main
        className="relative flex flex-1 flex-col"
        style={{ minWidth: 0 }}
      >
        <TopBar
          breadcrumb={session.topic}
          status={status.text}
          statusKind={status.kind}
          sessionId={session.id.slice(0, 8).toUpperCase()}
          right={
            !store.isDeliberating &&
            !store.isSynthesizing &&
            !store.synthesis ? (
              <button
                type="button"
                onClick={startDeliberation}
                className="btn btn-accent"
                style={{ padding: '6px 16px' }}
              >
                <span
                  className="serif"
                  style={{ fontSize: 14, fontStyle: 'italic' }}
                >
                  Begin
                </span>
                <Icon name="caret-right" size={12} />
              </button>
            ) : null
          }
        />

        {(store.isDeliberating ||
          completedRoundsCount > 0 ||
          store.synthesis) && (
          <RoundNavigator
            totalRounds={session.maxRounds}
            currentRound={viewingRound}
            completedRounds={completedRoundsCount}
            onRoundSelect={setViewingRound}
            syncScrollEnabled={syncScrollEnabled}
            onToggleSyncScroll={() => setSyncScrollEnabled((p) => !p)}
            isLive={isLive}
          />
        )}

        <div
          className="flex flex-1 flex-col"
          style={{ overflow: 'hidden', minHeight: 0 }}
        >
          {!store.isDeliberating &&
            !store.isSynthesizing &&
            !store.synthesis &&
            !store.error && (
              <PreBegin
                providers={sessionProviderConfigs}
                totalRounds={session.maxRounds}
                arbiter={arbiter}
                onBegin={startDeliberation}
              />
            )}

          {store.error && (
            <div className="shrink-0" style={{ padding: 24 }}>
              <div
                className="flex justify-between"
                style={{
                  alignItems: 'center',
                  border: '1px solid var(--err)',
                  background: 'oklch(0.94 0.04 25)',
                  padding: '12px 16px',
                  color: 'var(--err)',
                  fontSize: 13,
                }}
              >
                <span>{store.error}</span>
                <button
                  type="button"
                  onClick={() => {
                    store.reset();
                    store.setSession(session);
                  }}
                  className="btn"
                  style={{
                    marginLeft: 16,
                    padding: '4px 12px',
                    fontSize: 11,
                    color: 'var(--err)',
                    borderColor: 'var(--err)',
                    background: 'var(--paper)',
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {showGrid && (
            <div
              className="min-h-0 flex-1 overflow-hidden"
              style={{
                display:
                  drawerState === 'full' && showSynthesisDrawer
                    ? 'none'
                    : undefined,
              }}
            >
              <ResponseGrid
                providers={session.providers}
                streamingResponses={
                  showStreamingText ? store.streamingResponses : {}
                }
                completedResponses={roundResponses}
                activeProviders={
                  showStreamingText ? activeProviders : new Set()
                }
                syncScrollEnabled={syncScrollEnabled}
                focusedPane={focusedPane}
                onFocusPane={setFocusedPane}
                viewRound={viewingRound}
              />
            </div>
          )}

          {showSynthesisDrawer && (
            <SynthesisDrawer
              synthesis={store.synthesis}
              isSynthesizing={store.isSynthesizing}
              synthesisStreamText={store.synthesisStreamText}
              drawerState={drawerState}
              onDrawerStateChange={setDrawerState}
              arbiter={arbiter}
            />
          )}
        </div>
      </main>
    </div>
  );
}
