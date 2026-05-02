import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import type {
  Session,
  Round,
  Response,
  SynthesisResult,
  FileAttachment,
  SynthesisPoint,
} from '@/lib/types';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get the session
    const sessionRow = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, id))
      .get();

    if (!sessionRow) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 },
      );
    }

    // Get rounds
    const roundRows = await db
      .select()
      .from(schema.rounds)
      .where(eq(schema.rounds.sessionId, id));

    // Get responses for each round
    const rounds: Round[] = [];
    for (const roundRow of roundRows) {
      const responseRows = await db
        .select()
        .from(schema.responses)
        .where(eq(schema.responses.roundId, roundRow.id));

      const responses: Response[] = responseRows.map((r) => ({
        id: r.id,
        roundId: r.roundId,
        providerId: r.providerId,
        modelId: r.modelId,
        content: r.content,
        promptTokens: r.promptTokens ?? 0,
        completionTokens: r.completionTokens ?? 0,
        latencyMs: r.latencyMs ?? 0,
        status: r.status as Response['status'],
        error: r.error ?? undefined,
        createdAt: r.createdAt,
      }));

      rounds.push({
        id: roundRow.id,
        sessionId: roundRow.sessionId,
        roundNumber: roundRow.roundNumber,
        responses,
        consensusReached: roundRow.consensusReached ?? false,
        consensusScore: roundRow.consensusScore ?? undefined,
        startedAt: roundRow.startedAt,
        completedAt: roundRow.completedAt ?? undefined,
      });
    }

    // Sort rounds by number
    rounds.sort((a, b) => a.roundNumber - b.roundNumber);

    // Get attachments
    const attachmentRows = await db
      .select()
      .from(schema.attachments)
      .where(eq(schema.attachments.sessionId, id));

    const attachmentList: FileAttachment[] = attachmentRows.map((a) => ({
      id: a.id,
      filename: a.filename,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      storagePath: a.storagePath,
      extractedText: a.extractedText ?? undefined,
      createdAt: a.createdAt,
    }));

    // Get synthesis if it exists
    const synthesisRow = await db
      .select()
      .from(schema.syntheses)
      .where(eq(schema.syntheses.sessionId, id))
      .get();

    let synthesis: SynthesisResult | undefined;
    if (synthesisRow) {
      synthesis = {
        id: synthesisRow.id,
        sessionId: synthesisRow.sessionId,
        synthesizerId: synthesisRow.synthesizerId,
        summary: synthesisRow.summary,
        consensusPoints: synthesisRow.consensusPoints as SynthesisPoint[],
        dissentPoints: synthesisRow.dissentPoints as SynthesisPoint[],
        keyInsights: synthesisRow.keyInsights,
        metadata: synthesisRow.metadata as SynthesisResult['metadata'],
        createdAt: synthesisRow.createdAt,
      };
    }

    const session: Session = {
      id: sessionRow.id,
      topic: sessionRow.topic,
      systemPrompt: sessionRow.systemPrompt ?? undefined,
      providers: sessionRow.providers,
      providerConfigs: sessionRow.providerConfigs as Session['providerConfigs'],
      maxRounds: sessionRow.maxRounds,
      enableConsensusDetection: sessionRow.enableConsensusDetection ?? false,
      consensusThreshold: sessionRow.consensusThreshold ?? undefined,
      attachments: attachmentList,
      status: sessionRow.status as Session['status'],
      rounds,
      synthesis,
      createdAt: sessionRow.createdAt,
      updatedAt: sessionRow.updatedAt,
    };

    return NextResponse.json(session);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check session exists
    const sessionRow = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, id))
      .get();

    if (!sessionRow) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 },
      );
    }

    // Delete in order: responses -> rounds -> attachments -> syntheses -> session
    const roundRows = await db
      .select()
      .from(schema.rounds)
      .where(eq(schema.rounds.sessionId, id));

    for (const round of roundRows) {
      await db
        .delete(schema.responses)
        .where(eq(schema.responses.roundId, round.id));
    }

    await db.delete(schema.rounds).where(eq(schema.rounds.sessionId, id));
    await db
      .delete(schema.attachments)
      .where(eq(schema.attachments.sessionId, id));
    await db
      .delete(schema.syntheses)
      .where(eq(schema.syntheses.sessionId, id));
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));

    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
