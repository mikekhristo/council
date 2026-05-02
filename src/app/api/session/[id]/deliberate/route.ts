import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { runDeliberation } from '@/lib/orchestrator/orchestrator';
import type {
  Session,
  FileAttachment,
  SynthesisResult,
  SynthesisPoint,
} from '@/lib/types';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Send an SSE event to the stream controller.
 */
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

    // Load session from DB
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

    if (
      sessionRow.status === 'deliberating' ||
      sessionRow.status === 'synthesizing'
    ) {
      // Reset stuck sessions — allow retry
      await db
        .update(schema.sessions)
        .set({ status: 'configuring', updatedAt: new Date() })
        .where(eq(schema.sessions.id, id));
    }

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

    // Build session object
    const session: Session = {
      id: sessionRow.id,
      topic: sessionRow.topic,
      systemPrompt: sessionRow.systemPrompt ?? undefined,
      providers: sessionRow.providers,
      providerConfigs: sessionRow.providerConfigs as Session['providerConfigs'],
      maxRounds: sessionRow.maxRounds,
      enableConsensusDetection: sessionRow.enableConsensusDetection ?? false,
      consensusThreshold: sessionRow.consensusThreshold ?? undefined,
      arbiterId: sessionRow.arbiterId ?? undefined,
      attachments: attachmentList,
      status: 'configuring',
      rounds: [],
      createdAt: sessionRow.createdAt,
      updatedAt: sessionRow.updatedAt,
    };

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        runDeliberation(session, {
          onRoundStart(round) {
            sendEvent(controller, encoder, 'round-start', { roundNumber: round });
          },
          onResponseChunk(providerId, round, chunk) {
            sendEvent(controller, encoder, 'response-chunk', {
              providerId,
              roundNumber: round,
              chunk,
            });
          },
          onResponseComplete(providerId, round, response) {
            sendEvent(controller, encoder, 'response-complete', {
              providerId,
              roundNumber: round,
              response,
            });
          },
          onRoundComplete(roundNumber, consensusReached, consensusScore) {
            sendEvent(controller, encoder, 'round-complete', {
              roundNumber,
              consensusReached,
              consensusScore,
            });
          },
          onSynthesisStart() {
            sendEvent(controller, encoder, 'synthesis-start', {});
          },
          onSynthesisChunk(chunk) {
            sendEvent(controller, encoder, 'synthesis-chunk', { chunk });
          },
          onComplete(synthesis) {
            sendEvent(controller, encoder, 'synthesis-complete', {
              synthesis,
            });
            sendEvent(controller, encoder, 'deliberation-complete', {
              sessionId: id,
            });
            controller.close();
          },
          onError(message) {
            sendEvent(controller, encoder, 'error', { message });
            controller.close();
          },
        }).catch((err) => {
          const message =
            err instanceof Error ? err.message : String(err);
          sendEvent(controller, encoder, 'error', { message });
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
