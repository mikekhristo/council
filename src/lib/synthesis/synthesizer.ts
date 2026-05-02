import { streamText } from 'ai';
import { nanoid } from 'nanoid';
import { providerRegistry } from '../providers/registry';
import { buildSynthesisPrompt, buildSynthesisSystemPrompt } from './prompts';
import { getProviderConfig } from '../providers/config';
import type { Session, Round, SynthesisResult, SynthesisPoint, ProviderId } from '../types';

/**
 * Run synthesis over a completed deliberation session.
 *
 * Streams the synthesis output via the onChunk callback, then parses
 * the full response into a SynthesisResult.
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
    // Requested arbiter failed during deliberation — fall back to a successful one
    console.log(`[synthesis] Requested arbiter ${arbiterId} failed during deliberation, falling back`);
    const fallbacks = session.providers.filter((p) => successfulProviders.has(p));
    synthesizerId = fallbacks.length > 0
      ? fallbacks[Math.floor(Math.random() * fallbacks.length)]
      : session.providers[0]; // last resort
  } else {
    // Randomly pick from successful providers
    const candidates = session.providers.filter((p) => successfulProviders.has(p));
    const pool = candidates.length > 0 ? candidates : session.providers;
    synthesizerId = pool[Math.floor(Math.random() * pool.length)];
  }

  const providerConfig = getProviderConfig(synthesizerId);
  const modelId = providerConfig?.modelId ?? `${synthesizerId}:unknown`;

  console.log(`[synthesis] Arbiter selected: ${synthesizerId} (model: ${modelId})`);

  const model = providerRegistry.languageModel(modelId as Parameters<typeof providerRegistry.languageModel>[0]);
  const systemPrompt = buildSynthesisSystemPrompt();
  const userPrompt = buildSynthesisPrompt(session.topic, allRounds);

  let fullContent = '';
  let usage = { inputTokens: 0, outputTokens: 0 };

  try {
    const result = streamText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 4096,
      temperature: 0.3,
    });

    for await (const chunk of result.textStream) {
      fullContent += chunk;
      onChunk(chunk);
    }

    const rawUsage = await result.usage;
    usage = { inputTokens: rawUsage.inputTokens ?? 0, outputTokens: rawUsage.outputTokens ?? 0 };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[synthesis] Stream failed for ${synthesizerId}: ${errMsg}`);
    // If we got partial content, use it. Otherwise set a fallback.
    if (!fullContent) {
      fullContent = JSON.stringify({
        summary: `Synthesis failed (${synthesizerId}): ${errMsg}. The deliberation responses above contain the council members' analysis.`,
        consensusPoints: [],
        dissentPoints: [],
        keyInsights: [],
      });
    }
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

  // Parse the synthesis JSON from the response
  const parsed = parseSynthesisResponse(fullContent);

  return {
    id: nanoid(),
    sessionId: session.id,
    synthesizerId,
    summary: parsed.summary,
    consensusPoints: parsed.consensusPoints,
    dissentPoints: parsed.dissentPoints,
    keyInsights: parsed.keyInsights,
    metadata: {
      totalRounds: allRounds.length,
      participatingProviders: Array.from(participatingProviders),
      totalTokensUsed,
      totalLatencyMs,
    },
    createdAt: new Date(),
  };
}

interface ParsedSynthesis {
  summary: string;
  consensusPoints: SynthesisPoint[];
  dissentPoints: SynthesisPoint[];
  keyInsights: string[];
}

/**
 * Parse the model's response to extract the structured synthesis JSON.
 * Falls back to treating the entire response as a summary if parsing fails.
 */
function parseSynthesisResponse(text: string): ParsedSynthesis {
  // Try to extract JSON from code blocks first
  const jsonBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = jsonBlockMatch ? jsonBlockMatch[1] : text;

  try {
    const parsed = JSON.parse(jsonStr.trim());

    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : text,
      consensusPoints: Array.isArray(parsed.consensusPoints)
        ? parsed.consensusPoints.map(normalizePoint)
        : [],
      dissentPoints: Array.isArray(parsed.dissentPoints)
        ? parsed.dissentPoints.map(normalizePoint)
        : [],
      keyInsights: Array.isArray(parsed.keyInsights)
        ? parsed.keyInsights.filter((i: unknown) => typeof i === 'string')
        : [],
    };
  } catch {
    // If JSON parsing fails, use the raw text as the summary
    return {
      summary: text,
      consensusPoints: [],
      dissentPoints: [],
      keyInsights: [],
    };
  }
}

function normalizePoint(raw: Record<string, unknown>): SynthesisPoint {
  return {
    point: typeof raw.point === 'string' ? raw.point : '',
    supportedBy: Array.isArray(raw.supportedBy) ? raw.supportedBy : [],
    opposedBy: Array.isArray(raw.opposedBy) ? raw.opposedBy : undefined,
    evidence: typeof raw.evidence === 'string' ? raw.evidence : '',
  };
}
