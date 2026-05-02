import 'server-only';

// Each provider's required env var. Mirrors the Vercel AI SDK conventions.
export const PROVIDER_ENV_VARS: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
  xai: 'XAI_API_KEY',
};

export type ProviderAvailability = Record<string, boolean>;

export function getProviderAvailability(): ProviderAvailability {
  const out: ProviderAvailability = {};
  for (const [id, envVar] of Object.entries(PROVIDER_ENV_VARS)) {
    out[id] = Boolean(process.env[envVar]?.trim());
  }
  return out;
}
