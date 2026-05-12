'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Allowlist link schemes. Blocks javascript:, data:, vbscript:, and
// protocol-relative URLs (//evil.com) that would otherwise resolve
// against the current origin.
function isSafeUrl(href: string | undefined): boolean {
  if (!href) return true;
  const trimmed = href.trim();
  if (trimmed.startsWith('//')) return false;
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;
  return /^(https?:|mailto:)/i.test(trimmed);
}

/**
 * Markdown renderer powered by react-markdown + remark-gfm. Produces a
 * React tree (no dangerouslySetInnerHTML), so it's XSS-safe by default.
 * Unsafe link schemes are rewritten to '#'. Output is styled by the
 * `.md` rules in globals.css so it picks up the chamber typography.
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`md ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => (isSafeUrl(url) ? url : '#')}
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
