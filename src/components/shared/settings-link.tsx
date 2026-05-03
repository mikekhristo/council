'use client';

import Link from 'next/link';
import { Icon } from './icon';

export function SettingsLink() {
  return (
    <Link
      href="/settings"
      title="Settings"
      aria-label="Settings"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--rule)',
        padding: '6px 8px',
        color: 'var(--ink-mute)',
        textDecoration: 'none',
        transition: 'color 150ms ease, border-color 150ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--ink)';
        e.currentTarget.style.borderColor = 'var(--ink-2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--ink-mute)';
        e.currentTarget.style.borderColor = 'var(--rule)';
      }}
    >
      <Icon name="gear" size={13} />
    </Link>
  );
}
