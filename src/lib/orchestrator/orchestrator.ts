import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import * as schema from '../db/schema';
import type { Session, Round, Response, SynthesisResult } from '../types';
import {
  buildSystemPrompt,
  buildRoundPrompt,
  buildAttachmentContext,
} from './prompt-builder';
import { executeRound, type ResponseData } from './round-executor';
import { detectConsensus } from './consensus-detector';
import { runSynthesis } from '../synthesis/synthesizer';

export interface DeliberationCallbacks {
  onRoundStart: (round: number) => void;
  onResponseChunk: (providerId: string, round: number, chunk: string) => void;
  onResponseComplete: (providerId: string, round: number, response: Response) => void;
  onRoundComplete: (
    roundNumber: number,
    consensusReached: boolean,
    consensusScore?: number,
  ) => void;
  onSynthesisStart: () => void;
  onSynthesisChunk: (chunk: string) => void;
  onComplete: (synthesis: SynthesisResult) => void;
  onError: (error: string) => void;
}

/**
 * Run a full multi-round deliberation for a session.
 *
 * For each round:
 * 1. Create round record in DB
 * 2. Build prompts (with prior rounds for round 2+)
 * 3. Execute round across all providers in parallel
 * 4. Save responses to DB
 * 5. Check consensus (if enabled)
 *
 * After all rounds, trigger synthesis.
 */
export async function runDeliberation(
  session: Session,
  callbacks: DeliberationCallbacks,
): Promise<void> {
  try {
    // Update session status to deliberating
    await db
      .update(schema.sessions)
      .set({ status: 'deliberating', updatedAt: new Date() })
      .where(eq(schema.sessions.id, session.id));

    const systemPrompt = session.systemPrompt || buildSystemPrompt();
    const attachmentContext = buildAttachmentContext(session.attachments);

    const completedRounds: Round[] = [];

    for (
      let roundNumber = 1;
      roundNumber <= session.maxRounds;
      roundNumber++
    ) {
      callbacks.onRoundStart(roundNumber);

      // Create round record
      const roundId = nanoid();
      const roundStartedAt = new Date();

      await db.insert(schema.rounds).values({
        id: roundId,
        sessionId: session.id,
        roundNumber,
        consensusReached: false,
        startedAt: roundStartedAt,
      });

      // Build prompt for this round
      const userPrompt = buildRoundPrompt(
        session.topic,
        attachmentContext,
        completedRounds,
        roundNumber,
      );

      // Execute round across all providers
      const responseData = await executeRound(
        session.providers,
        session.providerConfigs,
        systemPrompt,
        userPrompt,
        roundNumber,
        callbacks.onResponseChunk,
      );

      // Save responses to DB and build Round object
      const roundResponses: Response[] = [];

      for (const data of responseData) {
        const responseId = nanoid();
        const now = new Date();

        await db.insert(schema.responses).values({
          id: responseId,
          roundId,
          providerId: data.providerId,
          modelId: data.modelId,
          content: data.content,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          latencyMs: data.latencyMs,
          status: data.status,
          error: data.error ?? null,
          createdAt: now,
        });

        roundResponses.push({
          id: responseId,
          roundId,
          providerId: data.providerId,
          modelId: data.modelId,
          content: data.content,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          latencyMs: data.latencyMs,
          status: data.status,
          error: data.error,
          createdAt: now,
        });

        callbacks.onResponseComplete(data.providerId, roundNumber, roundResponses[roundResponses.length - 1]);
      }

      // Check consensus if enabled
      let consensusReached = false;
      let consensusScore: number | undefined;

      if (session.enableConsensusDetection) {
        const consensus = await detectConsensus(responseData);
        consensusScore = consensus.score;
        consensusReached =
          consensusScore >= (session.consensusThreshold ?? 0.8);
      }

      // Update round record
      const roundCompletedAt = new Date();
      await db
        .update(schema.rounds)
        .set({
          consensusReached,
          consensusScore: consensusScore ?? null,
          completedAt: roundCompletedAt,
        })
        .where(eq(schema.rounds.id, roundId));

      const completedRound: Round = {
        id: roundId,
        sessionId: session.id,
        roundNumber,
        responses: roundResponses,
        consensusReached,
        consensusScore,
        startedAt: roundStartedAt,
        completedAt: roundCompletedAt,
      };

      completedRounds.push(completedRound);

      callbacks.onRoundComplete(roundNumber, consensusReached, consensusScore);

      // If consensus reached, stop deliberating early
      if (consensusReached) {
        break;
      }
    }

    // Run synthesis
    await db
      .update(schema.sessions)
      .set({ status: 'synthesizing', updatedAt: new Date() })
      .where(eq(schema.sessions.id, session.id));

    callbacks.onSynthesisStart();

    const synthesisResult = await runSynthesis(
      session,
      completedRounds,
      callbacks.onSynthesisChunk,
      session.arbiterId,
    );

    // Save synthesis to DB
    await db.insert(schema.syntheses).values({
      id: synthesisResult.id,
      sessionId: session.id,
      synthesizerId: synthesisResult.synthesizerId,
      summary: synthesisResult.summary,
      consensusPoints: synthesisResult.consensusPoints,
      dissentPoints: synthesisResult.dissentPoints,
      keyInsights: synthesisResult.keyInsights,
      metadata: synthesisResult.metadata,
      createdAt: synthesisResult.createdAt,
    });

    // Update session status to completed
    await db
      .update(schema.sessions)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(schema.sessions.id, session.id));

    callbacks.onComplete(synthesisResult);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    // Update session status to error
    await db
      .update(schema.sessions)
      .set({ status: 'error', updatedAt: new Date() })
      .where(eq(schema.sessions.id, session.id));

    callbacks.onError(message);
  }
}
