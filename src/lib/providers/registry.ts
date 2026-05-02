import { experimental_createProviderRegistry as createProviderRegistry } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { xai } from '@ai-sdk/xai';

export const providerRegistry = createProviderRegistry({
  anthropic,
  openai,
  google,
  xai,
});
