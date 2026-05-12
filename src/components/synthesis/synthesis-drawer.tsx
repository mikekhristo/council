'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProviderConfig, SynthesisResult } from '@/lib/types';
import { ArbiterSeal } from '@/components/shared/seat-mark';
import { StatusPill } from '@/components/shared/status-pill';
import { Icon } from '@/components/shared/icon';
import { SynthesisView } from './synthesis-view';

export type DrawerState = 'collapsed' | 'half' | 'full';

interface SynthesisDrawerProps {
  synthesis: SynthesisResult | null;
  isSynthesizing: boolean;
  synthesisStreamText: string;
  drawerState: DrawerState;
  onDrawerStateChange: (state: DrawerState) => void;
  arbiter: ProviderConfig;
  topic?: string;
}

const COLLAPSED_HEIGHT = 44;

export function SynthesisDrawer({
  synthesis,
  isSynthesizing,
  synthesisStreamText,
  drawerState,
  onDrawerStateChange,
  arbiter,
  topic,
}: SynthesisDrawerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const cycleState = useCallback(() => {
    const next: DrawerState =
      drawerState === 'collapsed'
        ? 'half'
        : drawerState === 'half'
          ? 'full'
          : 'collapsed';
    onDrawerStateChange(next);
  }, [drawerState, onDrawerStateChange]);

  const getHeight = useCallback((): string => {
    if (isDragging && dragHeight !== null) return `${dragHeight}px`;
    switch (drawerState) {
      case 'collapsed':
        return `${COLLAPSED_HEIGHT}px`;
      case 'half':
        return 'min(48vh, 520px)';
      case 'full':
        return 'calc(100vh - 100px)';
    }
  }, [drawerState, isDragging, dragHeight]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startYRef.current = e.clientY;

      const el = drawerRef.current;
      if (el) startHeightRef.current = el.getBoundingClientRect().height;

      const handleDragMove = (moveEvent: MouseEvent) => {
        const deltaY = startYRef.current - moveEvent.clientY;
        const newHeight = Math.max(
          COLLAPSED_HEIGHT,
          startHeightRef.current + deltaY,
        );
        setDragHeight(newHeight);
      };

      const handleDragEnd = (upEvent: MouseEvent) => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);

        const finalHeight = Math.max(
          COLLAPSED_HEIGHT,
          startHeightRef.current + (startYRef.current - upEvent.clientY),
        );
        const viewportHeight = window.innerHeight;
        const ratio = finalHeight / viewportHeight;
        let newState: DrawerState;
        if (ratio < 0.15) newState = 'collapsed';
        else if (ratio < 0.65) newState = 'half';
        else newState = 'full';

        setDragHeight(null);
        onDrawerStateChange(newState);
      };

      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    },
    [onDrawerStateChange],
  );

  useEffect(() => {
    if (synthesis && drawerState === 'collapsed') {
      onDrawerStateChange('half');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synthesis]);

  const isVisible = synthesis || isSynthesizing;
  if (!isVisible) return null;

  return (
    <div
      ref={drawerRef}
      className="synthesis-drawer absolute"
      style={{
        bottom: 0,
        left: 0,
        right: 0,
        height: getHeight(),
        background: 'var(--paper)',
        borderTop: '2px solid var(--seat-arb)',
        boxShadow: '0 -8px 32px oklch(0.18 0.01 60 / 0.06)',
        transition: isDragging ? 'none' : 'height 240ms ease',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 5,
      }}
    >
      <div
        className="flex shrink-0 items-center"
        style={{
          height: COLLAPSED_HEIGHT,
          padding: '0 24px',
          gap: 14,
          background: 'var(--seat-arb-wash)',
          borderBottom: drawerState !== 'collapsed' ? '1px solid var(--rule)' : 'none',
          cursor: 'ns-resize',
          userSelect: 'none',
        }}
        onMouseDown={handleDragStart}
        onClick={cycleState}
      >
        <Icon name="grip" size={14} />
        <ArbiterSeal size={20} />
        <span
          className="serif-i"
          style={{ fontSize: 16, color: 'var(--ink)' }}
        >
          Synthesis
        </span>
        <span
          className="mono"
          style={{
            fontSize: 10,
            color: 'var(--ink-mute)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          drafted by {arbiter.short}
        </span>
        <span style={{ flex: 1 }} />
        <StatusPill kind={isSynthesizing ? 'synth' : 'done'}>
          {isSynthesizing ? 'Synthesizing' : 'Complete'}
        </StatusPill>
        <Icon
          name={drawerState === 'full' ? 'caret-down' : 'caret-up'}
          size={13}
        />
      </div>

      {drawerState !== 'collapsed' && (
        <div
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {isSynthesizing && (
            <div
              className="mx-auto"
              style={{ padding: '32px 48px', maxWidth: 760 }}
            >
              <div className="micro" style={{ marginBottom: 14 }}>
                <span
                  className="dot"
                  style={{ background: 'var(--synth)' }}
                />
                {' '}Synthesizing
              </div>
              <div
                className="read"
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {synthesisStreamText}
                <span className="cursor" />
              </div>
            </div>
          )}

          {!isSynthesizing && synthesis && (
            <SynthesisView synthesis={synthesis} arbiter={arbiter} topic={topic} />
          )}
        </div>
      )}
    </div>
  );
}
