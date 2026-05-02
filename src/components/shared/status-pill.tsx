import { ReactNode } from 'react';

export type StatusKind = 'idle' | 'live' | 'synth' | 'done' | 'err';

interface StatusPillProps {
  kind: StatusKind;
  children: ReactNode;
}

export function StatusPill({ kind, children }: StatusPillProps) {
  const cls =
    {
      idle: 'pill pill-idle',
      live: 'pill pill-live',
      synth: 'pill pill-synth',
      done: 'pill pill-done',
      err: 'pill pill-err',
    }[kind] || 'pill';

  const dot =
    kind === 'live' ? (
      <span className="dot dot-live" />
    ) : kind === 'synth' ? (
      <span className="dot" style={{ background: 'var(--synth)' }} />
    ) : kind === 'done' ? (
      <span className="dot" style={{ background: 'var(--done)' }} />
    ) : kind === 'err' ? (
      <span className="dot" style={{ background: 'var(--err)' }} />
    ) : null;

  return (
    <span className={cls}>
      {dot}
      <span>{children}</span>
    </span>
  );
}
