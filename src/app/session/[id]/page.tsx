import { DeliberationView } from '@/components/deliberation/deliberation-view';
import { notFound } from 'next/navigation';
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

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getSession(id: string): Promise<Session | null> {
  const sessionRow = db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, id))
    .get();

  if (!sessionRow) return null;

  const roundRows = db
    .select()
    .from(schema.rounds)
    .where(eq(schema.rounds.sessionId, id))
    .all();

  const rounds: Round[] = [];
  for (const roundRow of roundRows) {
    const responseRows = db
      .select()
      .from(schema.responses)
      .where(eq(schema.responses.roundId, roundRow.id))
      .all();

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

  rounds.sort((a, b) => a.roundNumber - b.roundNumber);

  const attachmentRows = db
    .select()
    .from(schema.attachments)
    .where(eq(schema.attachments.sessionId, id))
    .all();

  const attachmentList: FileAttachment[] = attachmentRows.map((a) => ({
    id: a.id,
    filename: a.filename,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    storagePath: a.storagePath,
    extractedText: a.extractedText ?? undefined,
    createdAt: a.createdAt,
  }));

  const synthesisRow = db
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

  return {
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
    status: sessionRow.status as Session['status'],
    rounds,
    synthesis,
    createdAt: sessionRow.createdAt,
    updatedAt: sessionRow.updatedAt,
  };
}

export default async function SessionPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession(id);

  if (!session) {
    notFound();
  }

  return <DeliberationView session={session} />;
}
