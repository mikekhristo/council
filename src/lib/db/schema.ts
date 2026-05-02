import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  topic: text('topic').notNull(),
  systemPrompt: text('system_prompt'),
  providers: text('providers', { mode: 'json' }).notNull().$type<string[]>(),
  providerConfigs: text('provider_configs', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  maxRounds: integer('max_rounds').notNull().default(3),
  enableConsensusDetection: integer('enable_consensus_detection', { mode: 'boolean' }).default(false),
  consensusThreshold: real('consensus_threshold'),
  arbiterId: text('arbiter_id'),
  status: text('status').notNull().default('configuring'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const rounds = sqliteTable('rounds', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  roundNumber: integer('round_number').notNull(),
  consensusReached: integer('consensus_reached', { mode: 'boolean' }).default(false),
  consensusScore: real('consensus_score'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export const responses = sqliteTable('responses', {
  id: text('id').primaryKey(),
  roundId: text('round_id').notNull().references(() => rounds.id),
  providerId: text('provider_id').notNull(),
  modelId: text('model_id').notNull(),
  content: text('content').notNull().default(''),
  promptTokens: integer('prompt_tokens').default(0),
  completionTokens: integer('completion_tokens').default(0),
  latencyMs: integer('latency_ms').default(0),
  status: text('status').notNull().default('pending'),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  storagePath: text('storage_path').notNull(),
  extractedText: text('extracted_text'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const syntheses = sqliteTable('syntheses', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  synthesizerId: text('synthesizer_id').notNull(),
  summary: text('summary').notNull(),
  consensusPoints: text('consensus_points', { mode: 'json' }).notNull().$type<unknown[]>(),
  dissentPoints: text('dissent_points', { mode: 'json' }).notNull().$type<unknown[]>(),
  keyInsights: text('key_insights', { mode: 'json' }).notNull().$type<string[]>(),
  metadata: text('metadata', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
