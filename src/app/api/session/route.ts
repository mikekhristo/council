import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { DEFAULT_PROVIDERS } from '@/lib/providers/config';
import { createSessionSchema } from '@/lib/utils/validation';
import type { ProviderConfig, Session } from '@/lib/types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parseResult = createSessionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.issues },
        { status: 400 },
      );
    }

    const input = parseResult.data;

    // Validate that all requested providers exist
    const providerConfigs: Record<string, ProviderConfig> = {};
    for (const providerId of input.providers) {
      const config = DEFAULT_PROVIDERS[providerId];
      if (!config) {
        return NextResponse.json(
          { error: `Unknown provider: ${providerId}` },
          { status: 400 },
        );
      }
      providerConfigs[providerId] = config;
    }

    const now = new Date();
    const id = nanoid();

    const session: Session = {
      id,
      topic: input.topic,
      systemPrompt: input.systemPrompt,
      providers: input.providers,
      providerConfigs,
      maxRounds: input.maxRounds,
      enableConsensusDetection: input.enableConsensusDetection,
      consensusThreshold: input.consensusThreshold,
      arbiterId: input.arbiterId || undefined,
      attachments: [],
      status: 'configuring',
      rounds: [],
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(schema.sessions).values({
      id: session.id,
      topic: session.topic,
      systemPrompt: session.systemPrompt ?? null,
      providers: session.providers,
      providerConfigs: session.providerConfigs,
      maxRounds: session.maxRounds,
      enableConsensusDetection: session.enableConsensusDetection,
      consensusThreshold: session.consensusThreshold ?? null,
      arbiterId: session.arbiterId ?? null,
      status: session.status,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get('limit'));
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, MAX_LIMIT)
        : DEFAULT_LIMIT;

    const allSessions = await db
      .select()
      .from(schema.sessions)
      .orderBy(desc(schema.sessions.createdAt))
      .limit(limit);

    const sessions = allSessions.map((row) => ({
      id: row.id,
      topic: row.topic,
      systemPrompt: row.systemPrompt,
      providers: row.providers,
      providerConfigs: row.providerConfigs,
      maxRounds: row.maxRounds,
      enableConsensusDetection: row.enableConsensusDetection,
      consensusThreshold: row.consensusThreshold,
      arbiterId: row.arbiterId,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return NextResponse.json(sessions);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
