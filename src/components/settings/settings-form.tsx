'use client';

import { useState } from 'react';
import { DEFAULT_PROVIDERS } from '@/lib/providers/config';
import { SeatMark } from '@/components/shared/seat-mark';
import { Icon } from '@/components/shared/icon';

const PROVIDER_LINKS: Record<string, string> = {
  anthropic: 'https://console.anthropic.com/settings/keys',
  openai: 'https://platform.openai.com/api-keys',
  google: 'https://aistudio.google.com/apikey',
  xai: 'https://console.x.ai',
};

interface View {
  presence: Record<string, boolean>;
  masked: Record<string, string>;
}

interface SettingsFormProps {
  initialView: View;
  envVars: Record<string, string>;
  configPath: string;
}

export function SettingsForm({
  initialView,
  envVars,
  configPath,
}: SettingsFormProps) {
  const [view, setView] = useState<View>(initialView);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showing, setShowing] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const providers = Object.values(DEFAULT_PROVIDERS).sort(
    (a, b) => a.seat - b.seat,
  );

  function setDraft(id: string, v: string) {
    setDrafts((prev) => ({ ...prev, [id]: v }));
  }

  function flashToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);

    // Only submit fields the user actually edited
    const keys: Record<string, string> = {};
    for (const [id, v] of Object.entries(drafts)) {
      if (v !== undefined) keys[id] = v;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      const next = await res.json();
      setView({ presence: next.presence, masked: next.masked });
      setDrafts({});
      flashToast('Saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleClear(id: string) {
    if (!confirm(`Clear ${id} key?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: { [id]: '' } }),
      });
      if (!res.ok) throw new Error('Clear failed');
      const next = await res.json();
      setView({ presence: next.presence, masked: next.masked });
      setDrafts((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
      flashToast('Cleared');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clear failed');
    } finally {
      setSaving(false);
    }
  }

  const hasUnsaved = Object.values(drafts).some((v) => v.length > 0);

  return (
    <>
      <section
        style={{ padding: '32px 0', borderBottom: '1px solid var(--rule)' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr',
            gap: 28,
            alignItems: 'start',
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
            ✦
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
                Provider keys
              </h2>
              <span className="micro">Two or more required to deliberate</span>
            </div>

            <div className="flex flex-col" style={{ gap: 24 }}>
              {providers.map((p) => {
                const id = p.id;
                const isSet = view.presence[id];
                const masked = view.masked[id];
                const draft = drafts[id] ?? '';
                const showRaw = Boolean(showing[id]);

                return (
                  <div key={id}>
                    <div
                      className="flex items-center"
                      style={{ gap: 12, marginBottom: 8 }}
                    >
                      <SeatMark provider={p} size={22} />
                      <span
                        className="serif"
                        style={{
                          fontSize: 15,
                          fontWeight: 500,
                          color: 'var(--ink)',
                        }}
                      >
                        {p.short}
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          color: 'var(--ink-mute)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {envVars[id]}
                      </span>
                      <span style={{ flex: 1 }} />
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: isSet ? 'var(--done)' : 'var(--ink-faint)',
                        }}
                      >
                        {isSet ? 'set' : 'unset'}
                      </span>
                    </div>

                    <div
                      className="flex items-center"
                      style={{ gap: 8 }}
                    >
                      <input
                        type={showRaw ? 'text' : 'password'}
                        value={draft}
                        onChange={(e) => setDraft(id, e.target.value)}
                        placeholder={
                          isSet ? `${masked} (leave blank to keep)` : `${envVars[id]} value`
                        }
                        autoComplete="off"
                        spellCheck={false}
                        className="field"
                        style={{
                          flex: 1,
                          fontFamily: 'var(--mono)',
                          fontSize: 14,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowing((prev) => ({ ...prev, [id]: !prev[id] }))
                        }
                        className="btn-ghost"
                        title={showRaw ? 'Hide' : 'Show'}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--rule)',
                          padding: '6px 10px',
                          color: 'var(--ink-mute)',
                          fontSize: 11,
                          fontFamily: 'var(--mono)',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {showRaw ? 'Hide' : 'Show'}
                      </button>
                      {isSet && (
                        <button
                          type="button"
                          onClick={() => handleClear(id)}
                          className="btn-ghost"
                          title={`Clear ${p.short} key`}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--rule)',
                            padding: '6px 10px',
                            color: 'var(--err)',
                            fontSize: 11,
                            fontFamily: 'var(--mono)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <a
                      href={PROVIDER_LINKS[id]}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-block',
                        marginTop: 6,
                        fontSize: 11,
                        fontFamily: 'var(--mono)',
                        letterSpacing: '0.06em',
                        color: 'var(--ink-faint)',
                        textDecoration: 'none',
                        borderBottom: '1px solid var(--rule)',
                      }}
                    >
                      {PROVIDER_LINKS[id].replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

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
          onClick={handleSave}
          disabled={saving || !hasUnsaved}
          style={{
            width: '100%',
            height: 52,
            fontSize: 14,
            justifyContent: 'center',
            letterSpacing: '0.04em',
          }}
        >
          {saving ? (
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
                Saving
              </span>
            </>
          ) : (
            <>
              <span className="serif" style={{ fontSize: 16, fontStyle: 'italic' }}>
                {hasUnsaved ? 'Save keys' : 'No changes'}
              </span>
              {hasUnsaved && <Icon name="caret-right" size={14} />}
            </>
          )}
        </button>

        <div
          className="flex justify-between"
          style={{ marginTop: 10, alignItems: 'baseline' }}
        >
          <span className="micro">
            Stored at <span style={{ color: 'var(--ink-2)' }}>{configPath}</span>
          </span>
          {toast && (
            <span
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--done)',
              }}
            >
              ✓ {toast}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
