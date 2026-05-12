'use client';

import { useState } from 'react';
import type { ProviderConfig, SynthesisResult } from '@/lib/types';
import { synthesisToMarkdown } from '@/lib/synthesis/markdown-export';

interface CopyMarkdownButtonProps {
  synthesis: SynthesisResult;
  arbiter: ProviderConfig;
  topic?: string;
}

export function CopyMarkdownButton({
  synthesis,
  arbiter,
  topic,
}: CopyMarkdownButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  async function handleCopy() {
    const md = synthesisToMarkdown(synthesis, arbiter, topic);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(md);
      } else {
        // Fallback for old browsers / non-secure contexts
        const textarea = document.createElement('textarea');
        textarea.value = md;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setState('copied');
      setTimeout(() => setState('idle'), 1800);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2400);
    }
  }

  function handleDownload() {
    const md = synthesisToMarkdown(synthesis, arbiter, topic);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `council-proceedings-${stamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const label =
    state === 'copied' ? '✓ Copied' : state === 'error' ? '✗ Failed' : 'Copy as Markdown';

  return (
    <div className="flex items-center" style={{ gap: 8 }}>
      <button
        type="button"
        onClick={handleCopy}
        className="btn"
        title="Copy the entire proceedings as Markdown to your clipboard"
        style={{
          padding: '6px 12px',
          fontSize: 12,
          fontFamily: 'var(--mono)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: state === 'copied' ? 'var(--done)' : state === 'error' ? 'var(--err)' : 'var(--ink-2)',
          borderColor: state === 'copied' ? 'var(--done)' : state === 'error' ? 'var(--err)' : 'var(--rule-strong)',
          background: 'var(--paper)',
          transition: 'all 150ms ease',
        }}
      >
        {label}
      </button>
      <button
        type="button"
        onClick={handleDownload}
        className="btn"
        title="Download proceedings as a .md file"
        style={{
          padding: '6px 12px',
          fontSize: 12,
          fontFamily: 'var(--mono)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ink-2)',
          borderColor: 'var(--rule-strong)',
          background: 'var(--paper)',
        }}
      >
        Download .md
      </button>
    </div>
  );
}
