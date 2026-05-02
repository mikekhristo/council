import type { Round } from '../types';

/**
 * Build the synthesis prompt that asks for structured analysis
 * of the full deliberation.
 */
export function buildSynthesisPrompt(
  topic: string,
  allRounds: Round[],
): string {
  const roundSections = allRounds.map((round) => {
    const responses = round.responses
      .filter((r) => r.status === 'completed' && r.content)
      .map((r) => `**${r.providerId}:**\n${r.content}`)
      .join('\n\n---\n\n');

    return `### Round ${round.roundNumber}\n\n${responses}`;
  });

  return `You are an expert synthesizer. A council of AI models has deliberated on the following topic across multiple rounds. Your job is to produce a comprehensive synthesis of the deliberation.

## Topic

${topic}

## Full Deliberation

${roundSections.join('\n\n---\n\n')}

## Your Task

Produce a structured synthesis in EXACTLY the following JSON format. Do not include any text outside the JSON block.

\`\`\`json
{
  "summary": "A 2-3 paragraph executive summary of the deliberation, capturing the main arguments, evolution of positions, and overall conclusions.",
  "consensusPoints": [
    {
      "point": "A specific point of agreement",
      "supportedBy": ["provider1", "provider2"],
      "evidence": "Brief evidence or quotes supporting this consensus"
    }
  ],
  "dissentPoints": [
    {
      "point": "A specific point of disagreement",
      "supportedBy": ["provider1"],
      "opposedBy": ["provider2"],
      "evidence": "Brief summary of the competing arguments"
    }
  ],
  "keyInsights": [
    "A notable insight, novel argument, or important nuance that emerged during deliberation",
    "Another key insight"
  ]
}
\`\`\`

Guidelines:
- Include ALL meaningful points of consensus, even partial ones.
- Include ALL meaningful points of dissent.
- Key insights should capture the most valuable, non-obvious contributions from the deliberation.
- Use the actual provider IDs (e.g., "anthropic", "openai", "google", "xai") in supportedBy/opposedBy arrays.
- Be specific and concrete — avoid vague generalizations.`;
}

/**
 * Build the system prompt for synthesis.
 */
export function buildSynthesisSystemPrompt(): string {
  return 'You are a precise, analytical synthesizer. You produce well-structured JSON output that faithfully captures the substance of multi-party deliberations. Be thorough and accurate.';
}
