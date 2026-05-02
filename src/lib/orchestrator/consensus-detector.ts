import { generateText } from 'ai';
import { providerRegistry } from '../providers/registry';
import type { ResponseData } from './round-executor';

/**
 * Use a fast/cheap model to analyze responses for consensus.
 * Returns a score from 0.0 (complete disagreement) to 1.0 (full consensus)
 * along with reasoning.
 */
export async function detectConsensus(
  responses: ResponseData[],
): Promise<{ score: number; reasoning: string }> {
  const completedResponses = responses.filter(
    (r) => r.status === 'completed' && r.content,
  );

  if (completedResponses.length < 2) {
    return {
      score: 1.0,
      reasoning: 'Fewer than 2 responses to compare.',
    };
  }

  const responseSummary = completedResponses
    .map(
      (r) =>
        `**${r.providerId}:**\n${r.content.slice(0, 3000)}`,
    )
    .join('\n\n---\n\n');

  const prompt = `You are an impartial analyst. Below are responses from multiple AI council members on the same topic. Analyze how much they agree or disagree.

## Responses

${responseSummary}

## Task

Rate the level of consensus among the responses on a scale from 0.0 to 1.0:
- 0.0 = Complete disagreement on all major points
- 0.3 = Significant disagreement on key issues
- 0.5 = Mixed — agreement on some points, disagreement on others
- 0.7 = Broad agreement with minor differences
- 1.0 = Full consensus on all major points

Respond in EXACTLY this format (no other text):
SCORE: <number between 0.0 and 1.0>
REASONING: <one or two sentences explaining the score>`;

  try {
    // Use a fast, cheap model for consensus detection
    const model = providerRegistry.languageModel('openai:gpt-4o-mini');

    const result = await generateText({
      model,
      prompt,
      maxOutputTokens: 200,
      temperature: 0.1,
    });

    return parseConsensusResponse(result.text);
  } catch (error) {
    // If consensus detection fails, return a neutral score
    const message =
      error instanceof Error ? error.message : String(error);
    return {
      score: 0.5,
      reasoning: `Consensus detection failed: ${message}`,
    };
  }
}

/**
 * Parse the structured consensus response into a score and reasoning.
 */
function parseConsensusResponse(text: string): {
  score: number;
  reasoning: string;
} {
  const scoreMatch = text.match(/SCORE:\s*([\d.]+)/);
  const reasoningMatch = text.match(/REASONING:\s*([\s\S]+)/);

  let score = 0.5;
  if (scoreMatch) {
    const parsed = parseFloat(scoreMatch[1]);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      score = parsed;
    }
  }

  const reasoning = reasoningMatch
    ? reasoningMatch[1].trim()
    : 'Could not parse consensus reasoning.';

  return { score, reasoning };
}
