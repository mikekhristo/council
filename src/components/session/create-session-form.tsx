'use client';

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  ProviderId,
  FileAttachment,
  CreateSessionInput,
  ProviderConfig,
} from '@/lib/types';
import { DEFAULT_PROVIDERS } from '@/lib/providers/config';
import { SeatMark, ArbiterSeal } from '@/components/shared/seat-mark';
import { Icon } from '@/components/shared/icon';
import { FileUploader } from './file-uploader';

const SUGGESTED_TOPICS = [
  'Should a small public library replace its physical card catalogue with an AI-powered discovery tool, or preserve the catalogue as a parallel system?',
  'Is mandatory voting a net positive for democratic legitimacy in mid-sized democracies?',
  'Should our engineering org adopt monorepo, polyrepo, or a hybrid? Argue from first principles.',
];

interface CreateSessionFormProps {
  availability: Record<string, boolean>;
  envVars: Record<string, string>;
}

export function CreateSessionForm({
  availability,
  envVars,
}: CreateSessionFormProps) {
  const router = useRouter();
  const allProviders = Object.values(DEFAULT_PROVIDERS) as ProviderConfig[];

  const availableIds = allProviders
    .filter((p) => availability[p.id])
    .map((p) => p.id);

  const [topic, setTopic] = useState('');
  const [selected, setSelected] = useState<ProviderId[]>(availableIds);
  const [rounds, setRounds] = useState(3);
  const [consensus, setConsensus] = useState(true);
  const [arbiter, setArbiter] = useState<ProviderId | 'random'>('random');
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validProviders = selected.length >= 2;
  const validTopic = topic.trim().length > 0;
  const valid = validProviders && validTopic;

  function toggleProvider(id: ProviderId) {
    if (!availability[id]) return;
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      if (arbiter !== 'random' && !next.includes(arbiter)) setArbiter('random');
      return next;
    });
  }

  async function handleConvene() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const input: CreateSessionInput = {
        topic: topic.trim(),
        providers: selected,
        maxRounds: rounds,
        enableConsensusDetection: consensus,
        ...(arbiter !== 'random' ? { arbiterId: arbiter } : {}),
      };

      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, attachmentIds: files.map((f) => f.id) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to create session (${res.status})`);
      }

      const session = await res.json();
      router.push(`/session/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <>
      <Section
        numeral="I"
        title="Topic"
        note="Required · 1+ character"
      >
        <textarea
          className="field serif"
          rows={4}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="What should the council deliberate on?"
          style={{ fontSize: 19, lineHeight: 1.5, padding: '12px 0' }}
        />
        <div
          className="flex flex-wrap items-center"
          style={{ marginTop: 14, gap: 10 }}
        >
          <span className="micro" style={{ marginRight: 4 }}>
            Suggested
          </span>
          {SUGGESTED_TOPICS.map((s, i) => (
            <button
              key={i}
              type="button"
              className="btn btn-ghost"
              onClick={() => setTopic(s)}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                color: 'var(--ink-2)',
                borderColor: 'var(--rule)',
                maxWidth: 280,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'inline-block',
              }}
              title={s}
            >
              {s.length > 42 ? s.slice(0, 42) + '…' : s}
            </button>
          ))}
        </div>
      </Section>

      <Section
        numeral="II"
        title="Council members"
        note={
          validProviders ? (
            `${selected.length} selected · min 2`
          ) : (
            <span style={{ color: 'var(--accent-ink)' }}>
              Select at least two members
            </span>
          )
        }
      >
        <div className="flex flex-wrap" style={{ gap: 10 }}>
          {allProviders.map((p) => {
            const on = selected.includes(p.id);
            const configured = availability[p.id];
            return (
              <button
                key={p.id}
                type="button"
                className="chip"
                data-on={on}
                onClick={() => toggleProvider(p.id)}
                disabled={!configured}
                title={
                  configured
                    ? undefined
                    : `Set ${envVars[p.id] ?? p.id.toUpperCase() + '_API_KEY'} in .env.local`
                }
                style={{
                  color: `var(--seat-${p.seat})`,
                  opacity: configured ? 1 : 0.45,
                  cursor: configured ? 'pointer' : 'not-allowed',
                }}
              >
                <SeatMark provider={p} size={22} />
                <span
                  className="flex flex-col"
                  style={{ gap: 0, color: 'var(--ink)' }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    {p.short}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: configured ? 'var(--ink-mute)' : 'var(--err)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {configured ? p.name : 'missing API key'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        numeral="III"
        title="Rounds & consensus"
        note="1–5 rounds · consensus is recommended"
      >
        <div
          className="flex flex-wrap"
          style={{ gap: 32, alignItems: 'flex-end' }}
        >
          <div>
            <div className="micro" style={{ marginBottom: 8 }}>
              Rounds
            </div>
            <div
              className="inline-flex items-center"
              style={{ border: '1px solid var(--rule-strong)' }}
            >
              <button
                type="button"
                onClick={() => setRounds(Math.max(1, rounds - 1))}
                className="flex items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  border: 'none',
                  background: 'var(--paper)',
                  borderRight: '1px solid var(--rule)',
                  cursor: 'pointer',
                  color: 'var(--ink-2)',
                }}
              >
                <Icon name="minus" />
              </button>
              <span
                className="mono"
                style={{
                  width: 56,
                  textAlign: 'center',
                  fontSize: 20,
                  color: 'var(--ink)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {rounds}
              </span>
              <button
                type="button"
                onClick={() => setRounds(Math.min(5, rounds + 1))}
                className="flex items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  border: 'none',
                  background: 'var(--paper)',
                  borderLeft: '1px solid var(--rule)',
                  cursor: 'pointer',
                  color: 'var(--ink-2)',
                }}
              >
                <Icon name="plus" />
              </button>
            </div>
          </div>

          <div>
            <div className="micro" style={{ marginBottom: 8 }}>
              Consensus seeking
            </div>
            <button
              type="button"
              onClick={() => setConsensus(!consensus)}
              className="btn"
              style={{
                borderColor: consensus ? 'var(--ink)' : 'var(--rule-strong)',
                background: consensus ? 'var(--paper-2)' : 'var(--paper)',
                height: 36,
              }}
            >
              <span
                className="dot"
                style={{
                  background: consensus ? 'var(--done)' : 'var(--ink-faint)',
                }}
              />
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {consensus ? 'Enabled' : 'Disabled'}
              </span>
            </button>
          </div>
        </div>
      </Section>

      <Section
        numeral="IV"
        title="Arbiter"
        note="Synthesizes the final report"
      >
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          <ArbiterChoice
            on={arbiter === 'random'}
            onClick={() => setArbiter('random')}
            label="Random (default)"
            serif
          />
          {selected.map((id) => {
            const p = DEFAULT_PROVIDERS[id];
            if (!p) return null;
            const on = arbiter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setArbiter(id)}
                className="chip"
                data-on={on}
                style={{ color: `var(--seat-${p.seat})` }}
              >
                <SeatMark provider={p} size={20} role="arbiter" />
                <span style={{ color: 'var(--ink)', fontSize: 13 }}>
                  {p.short}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        numeral="V"
        title="Attachments"
        note="Optional · txt, md, pdf, docx, csv"
      >
        <FileUploader files={files} onFilesChange={setFiles} />
      </Section>

      {error && (
        <div
          style={{
            margin: '20px 0 0 88px',
            padding: '12px 16px',
            border: '1px solid var(--err)',
            background: 'oklch(0.94 0.04 25)',
            color: 'var(--err)',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginTop: 36 }}>
        <button
          type="button"
          className="btn btn-accent"
          onClick={handleConvene}
          disabled={!valid || submitting}
          style={{
            width: '100%',
            height: 52,
            fontSize: 14,
            justifyContent: 'center',
            letterSpacing: '0.04em',
          }}
        >
          {submitting ? (
            <>
              <span
                className="dot dot-live"
                style={{ background: 'currentColor' }}
              />
              <span
                className="mono"
                style={{
                  fontSize: 12,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Convening
              </span>
            </>
          ) : (
            <>
              <span
                className="serif"
                style={{ fontSize: 16, fontStyle: 'italic' }}
              >
                Convene Council
              </span>
              <Icon name="caret-right" size={14} />
            </>
          )}
        </button>
        <div
          className="flex justify-between"
          style={{ marginTop: 10 }}
        >
          <span className="micro">⏎ Convene · Esc Cancel</span>
          <span className="micro">
            {selected.length} members · {rounds} rounds · arbiter{' '}
            {arbiter === 'random' ? '—' : arbiter}
          </span>
        </div>
      </div>
    </>
  );
}

interface SectionProps {
  numeral: string;
  title: string;
  note?: ReactNode;
  children: ReactNode;
}

function Section({ numeral, title, note, children }: SectionProps) {
  return (
    <section
      style={{ padding: '32px 0', borderBottom: '1px solid var(--rule)' }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: '60px 1fr',
          gap: 28,
          alignItems: 'baseline',
        }}
      >
        <div
          className="serif-i"
          style={{
            fontSize: 24,
            color: 'var(--ink-faint)',
            lineHeight: 1,
          }}
        >
          {numeral}
        </div>
        <div>
          <div
            className="flex justify-between"
            style={{ alignItems: 'baseline', marginBottom: 16 }}
          >
            <h2
              className="serif"
              style={{
                fontSize: 20,
                margin: 0,
                fontWeight: 400,
                letterSpacing: '-0.005em',
              }}
            >
              {title}
            </h2>
            <span className="micro">{note}</span>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

interface ArbiterChoiceProps {
  on: boolean;
  onClick: () => void;
  label: string;
  serif?: boolean;
}

function ArbiterChoice({ on, onClick, label, serif }: ArbiterChoiceProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="chip"
      data-on={on}
      style={{ color: on ? 'var(--seat-arb)' : 'var(--ink-mute)' }}
    >
      <ArbiterSeal size={14} active={on} showGlyph={false} />
      <span
        style={{
          color: 'var(--ink)',
          fontSize: 13,
          fontStyle: serif ? 'italic' : 'normal',
          fontFamily: serif ? 'var(--serif)' : 'inherit',
        }}
      >
        {label}
      </span>
    </button>
  );
}
