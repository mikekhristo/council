'use client';

import type { ProviderConfig, SynthesisResult, ProviderId } from '@/lib/types';
import { DEFAULT_PROVIDERS } from '@/lib/providers/config';
import { MarkdownRenderer } from '@/components/shared/markdown-renderer';
import { CopyMarkdownButton } from './copy-button';

interface SynthesisViewProps {
  synthesis: SynthesisResult;
  arbiter: ProviderConfig;
  topic?: string;
}

function ProviderTag({ id }: { id: ProviderId }) {
  const provider = DEFAULT_PROVIDERS[id];
  if (!provider) return null;
  const seatColor = `var(--seat-${provider.seat})`;
  const seatWash = `var(--seat-${provider.seat}-wash)`;
  return (
    <span
      className="tag"
      style={{ color: seatColor, background: seatWash }}
    >
      <span
        className="dot"
        style={{ background: seatColor, width: 5, height: 5 }}
      />
      {provider.short}
    </span>
  );
}

function SectionHead({ label }: { label: string }) {
  return (
    <div className="flex items-center" style={{ gap: 12, marginBottom: 14 }}>
      <span className="serif-i" style={{ fontSize: 18, color: 'var(--ink)' }}>
        {label}
      </span>
      <div
        style={{ flex: 1, height: 1, background: 'var(--rule)' }}
      />
    </div>
  );
}

export function SynthesisView({ synthesis, arbiter, topic }: SynthesisViewProps) {
  return (
    <div
      className="mx-auto"
      style={{ padding: '36px 48px 64px', maxWidth: 820 }}
    >
      <div
        className="flex items-start justify-between"
        style={{ gap: 24, marginBottom: 12 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="micro" style={{ marginBottom: 12 }}>
            Folio · Synthesis
          </div>
          <h2
            className="serif"
            style={{
              fontSize: 30,
              lineHeight: 1.2,
              margin: 0,
              fontWeight: 400,
              letterSpacing: '-0.012em',
            }}
          >
            Proceedings of the Council.
          </h2>
          <div
            className="serif-i"
            style={{ fontSize: 14, color: 'var(--ink-mute)', marginTop: 6 }}
          >
            Drafted by {arbiter.short}, arbiter ·{' '}
            {synthesis.metadata.totalRounds} rounds ·{' '}
            {synthesis.metadata.participatingProviders.length} members
          </div>
        </div>
        <div style={{ flexShrink: 0, paddingTop: 4 }}>
          <CopyMarkdownButton
            synthesis={synthesis}
            arbiter={arbiter}
            topic={topic}
          />
        </div>
      </div>

      <div className="rule-h" style={{ margin: '28px 0' }} />

      <SectionHead label="Summary" />
      <div className="card" style={{ padding: '24px 28px', marginBottom: 32 }}>
        <div className="read">
          <MarkdownRenderer content={synthesis.summary} />
        </div>
      </div>

      {synthesis.consensusPoints.length > 0 && (
        <>
          <SectionHead label={`Consensus (${synthesis.consensusPoints.length})`} />
          <div
            className="flex flex-col"
            style={{
              gap: 1,
              background: 'var(--rule)',
              marginBottom: 32,
              border: '1px solid var(--rule)',
            }}
          >
            {synthesis.consensusPoints.map((c, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--paper)',
                  padding: '18px 24px',
                }}
              >
                <div className="flex" style={{ gap: 18, alignItems: 'flex-start' }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-faint)',
                      letterSpacing: '0.1em',
                      minWidth: 20,
                      paddingTop: 4,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p
                      className="serif"
                      style={{
                        fontSize: 16,
                        lineHeight: 1.55,
                        margin: 0,
                        color: 'var(--ink)',
                      }}
                    >
                      {c.point}
                    </p>
                    {c.evidence && (
                      <p
                        className="serif-i"
                        style={{
                          fontSize: 14,
                          lineHeight: 1.55,
                          color: 'var(--ink-mute)',
                          margin: '8px 0 0 0',
                        }}
                      >
                        {c.evidence}
                      </p>
                    )}
                    <div
                      className="flex flex-wrap items-center"
                      style={{ gap: 8, marginTop: 12 }}
                    >
                      <span className="micro">Agreed by</span>
                      {c.supportedBy.map((id) => (
                        <ProviderTag key={id} id={id} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {synthesis.dissentPoints.length > 0 && (
        <>
          <SectionHead label={`Dissent (${synthesis.dissentPoints.length})`} />
          <div
            className="flex flex-col"
            style={{
              gap: 1,
              background: 'var(--rule)',
              marginBottom: 32,
              border: '1px solid var(--rule)',
            }}
          >
            {synthesis.dissentPoints.map((d, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--paper)',
                  padding: '18px 24px',
                }}
              >
                <div className="flex" style={{ gap: 18, alignItems: 'flex-start' }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-faint)',
                      letterSpacing: '0.1em',
                      minWidth: 20,
                      paddingTop: 4,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p
                      className="serif"
                      style={{
                        fontSize: 16,
                        lineHeight: 1.55,
                        margin: 0,
                        color: 'var(--ink)',
                      }}
                    >
                      {d.point}
                    </p>
                    {d.evidence && (
                      <p
                        className="serif-i"
                        style={{
                          fontSize: 14,
                          lineHeight: 1.55,
                          color: 'var(--ink-mute)',
                          margin: '8px 0 0 0',
                        }}
                      >
                        {d.evidence}
                      </p>
                    )}
                    <div
                      className="flex flex-wrap"
                      style={{ gap: 16, marginTop: 12 }}
                    >
                      {d.supportedBy.length > 0 && (
                        <div
                          className="flex flex-wrap items-center"
                          style={{ gap: 8 }}
                        >
                          <span
                            className="micro"
                            style={{ color: 'var(--done)' }}
                          >
                            For
                          </span>
                          {d.supportedBy.map((id) => (
                            <ProviderTag key={id} id={id} />
                          ))}
                        </div>
                      )}
                      {d.opposedBy && d.opposedBy.length > 0 && (
                        <div
                          className="flex flex-wrap items-center"
                          style={{ gap: 8 }}
                        >
                          <span
                            className="micro"
                            style={{ color: 'var(--err)' }}
                          >
                            Against
                          </span>
                          {d.opposedBy.map((id) => (
                            <ProviderTag key={id} id={id} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {synthesis.keyInsights.length > 0 && (
        <>
          <SectionHead label={`Key insights (${synthesis.keyInsights.length})`} />
          <ol
            style={{
              listStyle: 'none',
              padding: 0,
              margin: '0 0 32px 0',
              border: '1px solid var(--rule)',
            }}
          >
            {synthesis.keyInsights.map((it, i) => (
              <li
                key={i}
                className="flex"
                style={{
                  gap: 18,
                  alignItems: 'flex-start',
                  padding: '16px 24px',
                  background: 'var(--paper)',
                  borderBottom:
                    i < synthesis.keyInsights.length - 1
                      ? '1px solid var(--rule)'
                      : 'none',
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--accent-ink)',
                    letterSpacing: '0.1em',
                    minWidth: 24,
                    paddingTop: 3,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="serif"
                  style={{
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: 'var(--ink)',
                  }}
                >
                  {it}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="rule-h" />
      <div
        className="flex flex-wrap items-center justify-between"
        style={{ padding: '16px 0', gap: 12 }}
      >
        <span className="micro">
          {synthesis.metadata.totalRounds} rounds ·{' '}
          {synthesis.metadata.participatingProviders.length} members ·{' '}
          {synthesis.metadata.totalTokensUsed.toLocaleString()} tokens ·{' '}
          {(synthesis.metadata.totalLatencyMs / 1000).toFixed(1)}s elapsed
        </span>
        <span
          className="serif-i"
          style={{ fontSize: 13, color: 'var(--ink-faint)' }}
        >
          ⸻ fin ⸻
        </span>
      </div>
    </div>
  );
}
