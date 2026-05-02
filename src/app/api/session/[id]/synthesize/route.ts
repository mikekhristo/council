import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { runSynthesis } from '@/lib/synthesis/synthesizer';
import type {
  Session,
  Round,
  Response,
  FileAttachment,
  SynthesisPoint,
} from '@/lib/types';

type RouteParams = { params: Promise<{ id: string }> };

function sendEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: string,
  data: unknown,
): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(encoder.encode(payload));
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Load session
    const sessionRow = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, id))
      .get();

    if (!sessionRow) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Load rounds with responses
    const roundRows = await db
      .select()
      .from(schema.rounds)
      .where(eq(schema.rounds.sessionId, id));

    if (roundRows.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No rounds found. Run deliberation first.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const allRounds: Round[] = [];
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

      allRounds.push({
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

    allRounds.sort((a, b) => a.roundNumber - b.roundNumber);

    // Load attachments
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
      rounds: allRounds,
      createdAt: sessionRow.createdAt,
      updatedAt: sessionRow.updatedAt,
    };

    // Delete existing synthesis if re-running
    await db
      .delete(schema.syntheses)
      .where(eq(schema.syntheses.sessionId, id));

    // Update status
    await db
      .update(schema.sessions)
      .set({ status: 'synthesizing', updatedAt: new Date() })
      .where(eq(schema.sessions.id, id));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        sendEvent(controller, encoder, 'synthesis-start', {});

        runSynthesis(session, allRounds, (chunk) => {
          sendEvent(controller, encoder, 'synthesis-chunk', { chunk });
        })
          .then(async (synthesisResult) => {
            // Save to DB
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

            await db
              .update(schema.sessions)
              .set({ status: 'completed', updatedAt: new Date() })
              .where(eq(schema.sessions.id, id));

            sendEvent(controller, encoder, 'synthesis-complete', {
              synthesis: synthesisResult,
            });
            controller.close();
          })
          .catch(async (err) => {
            const message =
              err instanceof Error ? err.message : String(err);

            await db
              .update(schema.sessions)
              .set({ status: 'error', updatedAt: new Date() })
              .where(eq(schema.sessions.id, id));

            sendEvent(controller, encoder, 'error', { error: message });
            controller.close();
          });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
