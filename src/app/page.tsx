import { CreateSessionForm } from '@/components/session/create-session-form';
import { SessionsRail } from '@/components/shared/sessions-rail';
import { TopBar } from '@/components/shared/top-bar';
import {
  getProviderAvailability,
  PROVIDER_ENV_VARS,
} from '@/lib/providers/availability';

export default function Home() {
  const availability = getProviderAvailability();
  const configuredCount = Object.values(availability).filter(Boolean).length;

  return (
    <div className="flex" style={{ minHeight: '100vh' }}>
      <SessionsRail />
      <main className="flex flex-1 flex-col" style={{ minWidth: 0 }}>
        <TopBar />
        <div
          className="flex flex-1 justify-center"
          style={{ padding: '40px 32px 80px' }}
        >
          <div style={{ width: '100%', maxWidth: 720 }}>
            <header style={{ marginBottom: 36 }}>
              <div className="micro" style={{ marginBottom: 14 }}>
                <span style={{ color: 'var(--ink-faint)' }}>Folio</span> ·{' '}
                <span>New Deliberation</span>
              </div>
              <h1
                className="serif"
                style={{
                  fontSize: 44,
                  lineHeight: 1.1,
                  margin: 0,
                  fontWeight: 400,
                  letterSpacing: '-0.015em',
                  color: 'var(--ink)',
                }}
              >
                Convene a council.
              </h1>
              <p
                className="serif-i"
                style={{
                  fontSize: 18,
                  lineHeight: 1.55,
                  margin: '12px 0 0 0',
                  color: 'var(--ink-mute)',
                  maxWidth: 540,
                }}
              >
                Pose a question. Two or more frontier models will deliberate in
                parallel across rounds, then a chosen arbiter will draft the
                report.
              </p>
            </header>
            <div className="rule-h" />
            {configuredCount === 0 ? (
              <NoKeysEmptyState />
            ) : (
              <CreateSessionForm
                availability={availability}
                envVars={PROVIDER_ENV_VARS}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function NoKeysEmptyState() {
  return (
    <section style={{ padding: '40px 0' }}>
      <div
        className="card"
        style={{ padding: '32px', textAlign: 'center' }}
      >
        <div className="micro" style={{ marginBottom: 14 }}>
          No API keys configured
        </div>
        <h2
          className="serif"
          style={{
            fontSize: 24,
            fontWeight: 400,
            margin: 0,
            color: 'var(--ink)',
          }}
        >
          The chamber is empty.
        </h2>
        <p
          className="serif-i"
          style={{
            fontSize: 16,
            color: 'var(--ink-mute)',
            margin: '12px auto 24px',
            maxWidth: 460,
          }}
        >
          Council is bring-your-own-key. Add at least two provider API keys
          to <code className="mono" style={{ fontStyle: 'normal' }}>.env.local</code> at
          the repo root, then restart the dev server.
        </p>
        <div
          className="card"
          style={{
            padding: '14px 18px',
            background: 'var(--paper-2)',
            textAlign: 'left',
            maxWidth: 460,
            margin: '0 auto',
          }}
        >
          <pre
            className="mono"
            style={{
              fontSize: 12,
              lineHeight: 1.7,
              margin: 0,
              color: 'var(--ink-2)',
              whiteSpace: 'pre-wrap',
            }}
          >
{`# .env.local
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=...
XAI_API_KEY=xai-...`}
          </pre>
        </div>
        <p
          className="micro"
          style={{ marginTop: 20, color: 'var(--ink-faint)' }}
        >
          Need keys? See README.md for provider links.
        </p>
      </div>
    </section>
  );
}
