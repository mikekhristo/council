import { ProviderConfig, ProviderId } from '../types';

export const DEFAULT_PROVIDERS: Record<string, ProviderConfig> = {
  anthropic: {
    id: 'anthropic',
    name: 'Claude Opus 4.6',
    short: 'Claude',
    house: 'Anthropic',
    seat: 1,
    modelId: 'anthropic:claude-opus-4-6',
    enabled: true,
    maxTokens: 4096,
    temperature: 0.7,
    iconUrl: '/providers/anthropic.svg',
  },
  openai: {
    id: 'openai',
    name: 'GPT-5.4',
    short: 'GPT',
    house: 'OpenAI',
    seat: 2,
    modelId: 'openai:gpt-5.4',
    enabled: true,
    maxTokens: 4096,
    temperature: 0.7,
    iconUrl: '/providers/openai.svg',
  },
  google: {
    id: 'google',
    name: 'Gemini 3.1 Pro',
    short: 'Gemini',
    house: 'Google',
    seat: 3,
    modelId: 'google:gemini-3.1-pro-preview',
    enabled: true,
    maxTokens: 4096,
    temperature: 0.7,
    iconUrl: '/providers/google.svg',
  },
  xai: {
    id: 'xai',
    name: 'Grok 4.1 Fast',
    short: 'Grok',
    house: 'xAI',
    seat: 4,
    modelId: 'xai:grok-4-1-fast-reasoning',
    enabled: true,
    maxTokens: 4096,
    temperature: 0.7,
    iconUrl: '/providers/xai.svg',
  },
};

export const SEAT_NUMERALS = ['I', 'II', 'III', 'IV'] as const;

export function seatNumeral(seat: 1 | 2 | 3 | 4): string {
  return SEAT_NUMERALS[seat - 1];
}

export function getEnabledProviders(): ProviderConfig[] {
  return Object.values(DEFAULT_PROVIDERS).filter((p) => p.enabled);
}

export function getProviderConfig(id: ProviderId): ProviderConfig | undefined {
  return DEFAULT_PROVIDERS[id];
}
