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

Produce a structured synthesis with the following fields:

- **summary**: A 2-3 paragraph executive summary capturing the main arguments, evolution of positions, and overall conclusions. Write in flowing prose; you may use **bold** for emphasis. Avoid bullet lists in the summary — save those for the structured sections below.
- **consensusPoints**: Every meaningful point of agreement. For each, include the point itself, the providers who supported it (using exact provider IDs: anthropic, openai, google, xai), and brief supporting evidence.
- **dissentPoints**: Every meaningful disagreement. For each, the point, the providers on each side (supportedBy / opposedBy), and a brief summary of the competing arguments.
- **keyInsights**: The most valuable, non-obvious contributions from the deliberation. Each insight as a single complete sentence or two.

Guidelines:
- Include ALL meaningful points — do not summarize aggressively. Long deliberations deserve thorough syntheses.
- Be specific and concrete — quote when useful. Avoid vague generalizations.
- Provider IDs in supportedBy/opposedBy must be lowercase and exactly one of: anthropic, openai, google, xai.`;
}

/**
 * Build the system prompt for synthesis.
 */
export function buildSynthesisSystemPrompt(): string {
  return 'You are a precise, analytical synthesizer. You produce well-structured JSON output that faithfully captures the substance of multi-party deliberations. Be thorough and accurate.';
}
