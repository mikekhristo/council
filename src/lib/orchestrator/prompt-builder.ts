import type { Round, FileAttachment } from '../types';

/**
 * Build the system prompt that frames the model as a council member.
 */
export function buildSystemPrompt(): string {
  return `You are a council member — an expert participating in a structured multi-party deliberation. Your role is to provide substantive, well-reasoned analysis on the topic presented.

Guidelines:
- Be thorough and specific. Cite concrete examples, data, or reasoning to support your points.
- Take clear positions. Do not hedge or equivocate. If you have a view, state it directly.
- Do not moralize or lecture. Focus on the substance of the question.
- Engage honestly with tradeoffs and counterarguments rather than pretending every option is equally valid.
- Structure your response clearly with distinct sections or points when appropriate.
- Be concise but complete. Say what needs to be said without padding.`;
}

/**
 * Build the user prompt for a given round.
 *
 * Round 1: Present the topic and any attachment context for independent analysis.
 * Round 2+: Include all prior responses so the model can react, refine, and rebut.
 */
export function buildRoundPrompt(
  topic: string,
  attachmentContext: string,
  priorRounds: Round[],
  currentRound: number,
): string {
  const parts: string[] = [];

  parts.push(`## Topic\n\n${topic}`);

  if (attachmentContext) {
    parts.push(`## Attached Context\n\n${attachmentContext}`);
  }

  if (currentRound === 1) {
    parts.push(
      '## Instructions\n\nProvide your independent analysis of the topic above. Be thorough, take clear positions, and support your reasoning with specifics.',
    );
  } else {
    // Include all prior round responses
    parts.push('## Prior Deliberation\n');

    for (const round of priorRounds) {
      parts.push(`### Round ${round.roundNumber}`);

      for (const response of round.responses) {
        if (response.status === 'completed' && response.content) {
          parts.push(
            `**${response.providerId}:**\n${response.content}\n`,
          );
        }
      }
    }

    parts.push(
      `## Instructions (Round ${currentRound})\n\nYou have now seen all other council members' responses from prior rounds. For this round:\n\n1. **React** to the other members' arguments — identify what you agree or disagree with and why.\n2. **Refine** your own position based on new information or strong arguments from others.\n3. **Rebut** any points you believe are flawed, with specific reasoning.\n4. **Synthesize** where possible — note areas of emerging consensus or irreconcilable differences.\n\nBe direct and substantive. Do not simply restate your prior position without engaging with others' arguments.`,
    );
  }

  return parts.join('\n\n');
}

/**
 * Build a context string from file attachments, including their extracted text.
 */
export function buildAttachmentContext(
  attachments: FileAttachment[],
): string {
  if (!attachments || attachments.length === 0) {
    return '';
  }

  const sections = attachments
    .filter((a) => a.extractedText)
    .map((a) => {
      const truncated =
        a.extractedText!.length > 50000
          ? a.extractedText!.slice(0, 50000) + '\n\n[... content truncated at 50,000 characters ...]'
          : a.extractedText!;

      return `### File: ${a.filename}\n\n${truncated}`;
    });

  if (sections.length === 0) {
    return '';
  }

  return sections.join('\n\n---\n\n');
}
