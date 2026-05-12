import { streamObject } from 'ai';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getProviderRegistry } from '../providers/registry';
import { buildSynthesisPrompt, buildSynthesisSystemPrompt } from './prompts';
import { getProviderConfig } from '../providers/config';
import type { Session, Round, SynthesisResult, ProviderId } from '../types';

// Schema enforced by streamObject — the provider's native structured
// output mode (Anthropic/OpenAI/Google) returns a value that matches
// this exactly, so we never need to parse JSON from prose or recover
// from truncated output the way the old streamText path did.
const SynthesisPointSchema = z.object({
  point: z.string(),
  supportedBy: z.array(z.string()),
  opposedBy: z.array(z.string()).optional(),
  evidence: z.string().optional().default(''),
});

const SynthesisSchema = z.object({
  summary: z.string(),
  consensusPoints: z.array(SynthesisPointSchema),
  dissentPoints: z.array(SynthesisPointSchema),
  keyInsights: z.array(z.string()),
});

/**
 * Run synthesis over a completed deliberation session.
 *
 * Streams partial summary text via the onChunk callback for the
 * drawer's live preview, then returns a validated SynthesisResult.
 *
 * If arbiterId is provided, that provider runs synthesis.
 * Otherwise, a random participating provider is chosen.
 */
export async function runSynthesis(
  session: Session,
  allRounds: Round[],
  onChunk: (chunk: string) => void,
  arbiterId?: ProviderId,
): Promise<SynthesisResult> {
  // Collect providers that actually produced successful responses
  const successfulProviders = new Set<string>();
  for (const round of allRounds) {
    for (const response of round.responses) {
      if (response.status === 'completed' && response.content) {
        successfulProviders.add(response.providerId);
      }
    }
  }

  let synthesizerId: ProviderId;

  if (arbiterId && successfulProviders.has(arbiterId)) {
    synthesizerId = arbiterId;
  } else if (arbiterId) {
    console.log(`[synthesis] Requested arbiter ${arbiterId} failed during deliberation, falling back`);
    const fallbacks = session.providers.filter((p) => successfulProviders.has(p));
    synthesizerId = fallbacks.length > 0
      ? fallbacks[Math.floor(Math.random() * fallbacks.length)]
      : session.providers[0];
  } else {
    const candidates = session.providers.filter((p) => successfulProviders.has(p));
    const pool = candidates.length > 0 ? candidates : session.providers;
    synthesizerId = pool[Math.floor(Math.random() * pool.length)];
  }

  const providerConfig = getProviderConfig(synthesizerId);
  const modelId = providerConfig?.modelId ?? `${synthesizerId}:unknown`;

  console.log(`[synthesis] Arbiter selected: ${synthesizerId} (model: ${modelId})`);

  const registry = getProviderRegistry();
  const model = registry.languageModel(modelId as Parameters<typeof registry.languageModel>[0]);
  const systemPrompt = buildSynthesisSystemPrompt();
  const userPrompt = buildSynthesisPrompt(session.topic, allRounds);

  let usage = { inputTokens: 0, outputTokens: 0 };
  let result: z.infer<typeof SynthesisSchema> = {
    summary: '',
    consensusPoints: [],
    dissentPoints: [],
    keyInsights: [],
  };

  try {
    const stream = streamObject({
      model,
      schema: SynthesisSchema,
      system: systemPrompt,
      prompt: userPrompt,
      // No maxOutputTokens — synthesis of a long deliberation can
      // easily exceed the old 4096 cap. Let the model run to natural
      // completion; the schema guarantees the shape is valid.
      temperature: 0.3,
    });

    // Stream the summary field as plain prose for the drawer's preview.
    // We send only newly-appended text so the UI's accumulator works
    // identically to the previous streamText path.
    let lastSummary = '';
    for await (const partial of stream.partialObjectStream) {
      if (typeof partial.summary === 'string' && partial.summary !== lastSummary) {
        const delta = partial.summary.slice(lastSummary.length);
        if (delta) onChunk(delta);
        lastSummary = partial.summary;
      }
    }

    result = await stream.object;
    const rawUsage = await stream.usage;
    usage = {
      inputTokens: rawUsage.inputTokens ?? 0,
      outputTokens: rawUsage.outputTokens ?? 0,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[synthesis] Stream failed for ${synthesizerId}: ${errMsg}`);
    result = {
      summary: `Synthesis failed (${synthesizerId}): ${errMsg}. The deliberation responses above contain the council members' analysis.`,
      consensusPoints: [],
      dissentPoints: [],
      keyInsights: [],
    };
  }

  // Calculate totals across all rounds
  let totalTokensUsed = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
  let totalLatencyMs = 0;
  const participatingProviders = new Set<string>();

  for (const round of allRounds) {
    for (const response of round.responses) {
      totalTokensUsed += response.promptTokens + response.completionTokens;
      totalLatencyMs += response.latencyMs;
      participatingProviders.add(response.providerId);
    }
  }

  return {
    id: nanoid(),
    sessionId: session.id,
    synthesizerId,
    summary: result.summary,
    consensusPoints: result.consensusPoints.map((p) => ({
      point: p.point,
      supportedBy: p.supportedBy,
      opposedBy: p.opposedBy,
      evidence: p.evidence ?? '',
    })),
    dissentPoints: result.dissentPoints.map((p) => ({
      point: p.point,
      supportedBy: p.supportedBy,
      opposedBy: p.opposedBy,
      evidence: p.evidence ?? '',
    })),
    keyInsights: result.keyInsights,
    metadata: {
      totalRounds: allRounds.length,
      participatingProviders: Array.from(participatingProviders),
      totalTokensUsed,
      totalLatencyMs,
    },
    createdAt: new Date(),
  };
}
