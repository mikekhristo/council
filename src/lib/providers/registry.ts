import 'server-only';
import {
  experimental_createProviderRegistry as createProviderRegistry,
} from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';
import { effectiveKey } from './key-store';

// Constructed fresh per call so that newly saved keys (via /api/settings
// or the Electron Settings window) take effect immediately without a
// server restart. The provider factories are cheap — no network IO,
// no caching of credentials beyond the closure.
export function getProviderRegistry() {
  return createProviderRegistry({
    anthropic: createAnthropic({ apiKey: effectiveKey('anthropic') ?? '' }),
    openai: createOpenAI({ apiKey: effectiveKey('openai') ?? '' }),
    google: createGoogleGenerativeAI({ apiKey: effectiveKey('google') ?? '' }),
    xai: createXai({ apiKey: effectiveKey('xai') ?? '' }),
  });
}
