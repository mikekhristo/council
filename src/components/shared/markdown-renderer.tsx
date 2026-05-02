'use client';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Lightweight markdown renderer.
 * Handles: bold, italic, inline code, code blocks, headers, lists, and links.
 * Output is hardened with escapeHtml + restricted regexes; rendered into a
 * `.md` container styled by globals.css.
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const html = renderMarkdown(content);

  return (
    <div
      className={`md ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function renderMarkdown(text: string): string {
  if (!text) return '';

  let html = escapeHtml(text);

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, text, href) => {
      const safe = isSafeUrl(href) ? href : '#';
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  );

  html = html.replace(/^---$/gm, '<hr />');

  html = html.replace(/\n\n/g, '</p><p>');

  if (!html.startsWith('<')) {
    html = `<p>${html}</p>`;
  }

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Allowlist link schemes — blocks javascript:, data:, vbscript: et al.
// Reject protocol-relative URLs (//evil.com) which would otherwise pass the '/' check.
function isSafeUrl(href: string): boolean {
  const trimmed = href.trim();
  if (trimmed.startsWith('//')) return false;
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;
  return /^(https?:|mailto:)/i.test(trimmed);
}
