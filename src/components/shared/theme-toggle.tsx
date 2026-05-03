'use client';

import { useEffect, useState } from 'react';
import { Icon } from './icon';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'council:theme';

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  const attr = document.documentElement.dataset.theme;
  return attr === 'dark' ? 'dark' : 'light';
}

export function ThemeToggle() {
  // Initialize from the DOM (the no-flash script in layout.tsx already
  // set data-theme before hydration), so client + server agree.
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readTheme());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode etc.) — preference just
      // doesn't persist across reloads. Toggle still works for the session.
    }
  }

  // Render a placeholder until mounted to keep SSR + client identical.
  const isDark = mounted && theme === 'dark';
  const label = isDark ? 'Switch to paper theme' : 'Switch to night theme';

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="btn-ghost"
      style={{
        background: 'transparent',
        border: '1px solid var(--rule)',
        padding: '6px 8px',
        color: 'var(--ink-mute)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
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
      <Icon name={isDark ? 'sun' : 'moon'} size={13} />
    </button>
  );
}
