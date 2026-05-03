import { SettingsForm } from '@/components/settings/settings-form';
import { SessionsRail } from '@/components/shared/sessions-rail';
import { TopBar } from '@/components/shared/top-bar';
import { publicView, configPath } from '@/lib/providers/key-store';
import { PROVIDER_ENV_VARS } from '@/lib/providers/availability';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const view = publicView();

  return (
    <div className="flex" style={{ minHeight: '100vh' }}>
      <SessionsRail />
      <main className="flex flex-1 flex-col" style={{ minWidth: 0 }}>
        <TopBar breadcrumb="Settings" />
        <div
          className="flex flex-1 justify-center"
          style={{ padding: '40px 32px 80px' }}
        >
          <div style={{ width: '100%', maxWidth: 720 }}>
            <header style={{ marginBottom: 36 }}>
              <div className="micro" style={{ marginBottom: 14 }}>
                <span style={{ color: 'var(--ink-faint)' }}>Folio</span> ·{' '}
                <span>Settings</span>
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
                Bring your own keys.
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
                API keys are stored on this machine only — Council never sends them anywhere except the provider you set them for.
              </p>
            </header>
            <div className="rule-h" />
            <SettingsForm
              initialView={view}
              envVars={PROVIDER_ENV_VARS}
              configPath={configPath()}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
