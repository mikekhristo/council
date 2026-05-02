'use client';

import { useState, useCallback, useRef } from 'react';
import type { ProviderId, Response } from '@/lib/types';
import { ResponseCard, type CardStatus } from './response-card';

interface ResponseGridProps {
  providers: ProviderId[];
  streamingResponses: Record<string, string>;
  completedResponses: Record<string, Response>;
  activeProviders: Set<string>;
  syncScrollEnabled: boolean;
  focusedPane: string | null;
  onFocusPane: (providerId: string | null) => void;
  viewRound?: number;
}

export function ResponseGrid({
  providers,
  streamingResponses,
  completedResponses,
  activeProviders,
  syncScrollEnabled,
  focusedPane,
  onFocusPane,
  viewRound,
}: ResponseGridProps) {
  const count = providers.length;
  const [syncScrollPercent, setSyncScrollPercent] = useState<number | undefined>(undefined);
  const scrollSourceRef = useRef<string | null>(null);

  function getStatus(providerId: ProviderId): CardStatus {
    const completed = completedResponses[providerId];
    if (completed?.status === 'error') return 'error';
    if (completed?.status === 'completed') return 'complete';
    if (activeProviders.has(providerId) || (streamingResponses[providerId]?.length ?? 0) > 0) return 'streaming';
    return 'waiting';
  }

  const handleSyncScroll = useCallback((providerId: string, percent: number) => {
    if (scrollSourceRef.current && scrollSourceRef.current !== providerId) return;
    scrollSourceRef.current = providerId;
    setSyncScrollPercent(percent);
    requestAnimationFrame(() => {
      scrollSourceRef.current = null;
    });
  }, []);

  const handleFocusToggle = useCallback((providerId: string) => {
    onFocusPane(focusedPane === providerId ? null : providerId);
  }, [focusedPane, onFocusPane]);

  // Focus mode layout
  if (focusedPane) {
    const focusedProvider = providers.find(p => p === focusedPane);
    const otherProviders = providers.filter(p => p !== focusedPane);

    if (!focusedProvider) {
      onFocusPane(null);
      return null;
    }

    return (
      <div className="grid h-full gap-px bg-rule" style={{ gridTemplateColumns: '7fr 3fr', gridTemplateRows: '1fr' }}>
        {/* Focused pane */}
        <ResponseCard
          key={focusedProvider}
          providerId={focusedProvider}
          streamingText={streamingResponses[focusedProvider] ?? ''}
          completedResponse={completedResponses[focusedProvider] ?? null}
          status={getStatus(focusedProvider)}
          isFocused={true}
          onFocusToggle={() => handleFocusToggle(focusedProvider)}
          syncScrollEnabled={syncScrollEnabled}
          onSyncScroll={(pct) => handleSyncScroll(focusedProvider, pct)}
          syncScrollPercent={scrollSourceRef.current !== focusedProvider ? syncScrollPercent : undefined}
          viewRound={viewRound}
        />

        {/* Compressed sidebar */}
        <div className="flex min-h-0 flex-col gap-px bg-rule overflow-hidden">
          {otherProviders.map((providerId) => (
            <ResponseCard
              key={providerId}
              providerId={providerId}
              streamingText={streamingResponses[providerId] ?? ''}
              completedResponse={completedResponses[providerId] ?? null}
              status={getStatus(providerId)}
              isCompressed={true}
              onFocusToggle={() => handleFocusToggle(providerId)}
              viewRound={viewRound}
            />
          ))}
        </div>
      </div>
    );
  }

  // Determine grid layout based on provider count
  let gridStyle: React.CSSProperties;
  let spanClass: Record<string, string> = {};

  if (count <= 1) {
    gridStyle = { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
  } else if (count === 2) {
    gridStyle = { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr' };
  } else if (count === 3) {
    gridStyle = { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
    // Third provider spans full bottom row
    spanClass[providers[2]] = 'col-span-2';
  } else if (count === 4) {
    gridStyle = { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
  } else {
    // 5+ providers: 3 columns, 2 rows
    gridStyle = { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr' };
  }

  return (
    <div
      className="grid h-full gap-px bg-rule"
      style={gridStyle}
    >
      {providers.map((providerId) => (
        <div key={providerId} className={`min-h-0 min-w-0 ${spanClass[providerId] ?? ''}`}>
          <ResponseCard
            providerId={providerId}
            streamingText={streamingResponses[providerId] ?? ''}
            completedResponse={completedResponses[providerId] ?? null}
            status={getStatus(providerId)}
            onFocusToggle={() => handleFocusToggle(providerId)}
            syncScrollEnabled={syncScrollEnabled}
            onSyncScroll={(pct) => handleSyncScroll(providerId, pct)}
            syncScrollPercent={scrollSourceRef.current !== providerId ? syncScrollPercent : undefined}
            viewRound={viewRound}
          />
        </div>
      ))}
    </div>
  );
}
