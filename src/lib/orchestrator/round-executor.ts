import { streamText } from 'ai';
import { providerRegistry } from '../providers/registry';
import type { ProviderId, ProviderConfig } from '../types';

/**
 * Data collected from a single provider's response during a round.
 */
export interface ResponseData {
  providerId: ProviderId;
  modelId: string;
  content: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  status: 'completed' | 'error';
  error?: string;
}

/**
 * Execute a single round across all providers in parallel.
 *
 * Uses Promise.allSettled so that individual provider failures
 * do not abort the entire round.
 */
export async function executeRound(
  providerIds: ProviderId[],
  configs: Record<string, ProviderConfig>,
  systemPrompt: string,
  userPrompt: string,
  roundNumber: number,
  onChunk: (providerId: string, round: number, chunk: string) => void,
): Promise<ResponseData[]> {
  const promises = providerIds.map((providerId) =>
    executeForProvider(
      providerId,
      configs[providerId],
      systemPrompt,
      userPrompt,
      roundNumber,
      onChunk,
    ),
  );

  const results = await Promise.allSettled(promises);

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    // Promise rejection — should be rare since executeForProvider catches errors
    const error =
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason);
    return {
      providerId: providerIds[index],
      modelId: configs[providerIds[index]]?.modelId ?? 'unknown',
      content: '',
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: 0,
      status: 'error' as const,
      error,
    };
  });
}

/**
 * Execute a single provider call, streaming chunks via the callback.
 */
async function executeForProvider(
  providerId: ProviderId,
  config: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
  roundNumber: number,
  onChunk: (providerId: string, round: number, chunk: string) => void,
): Promise<ResponseData> {
  const startTime = Date.now();

  try {
    const model = providerRegistry.languageModel(
      config.modelId as Parameters<typeof providerRegistry.languageModel>[0],
    );

    const result = streamText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: config.maxTokens ?? 4096,
      temperature: config.temperature ?? 0.7,
    });

    let fullContent = '';

    for await (const chunk of result.textStream) {
      fullContent += chunk;
      onChunk(providerId, roundNumber, chunk);
    }

    const usage = await result.usage;
    const latencyMs = Date.now() - startTime;

    return {
      providerId,
      modelId: config.modelId,
      content: fullContent,
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      latencyMs,
      status: 'completed',
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const message =
      error instanceof Error ? error.message : String(error);

    return {
      providerId,
      modelId: config.modelId,
      content: '',
      promptTokens: 0,
      completionTokens: 0,
      latencyMs,
      status: 'error',
      error: message,
    };
  }
}
