import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const DB_PATH = process.env.COUNCIL_DB_PATH ?? 'council.db';

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');

// Idempotent boot-time schema. Mirrors src/lib/db/schema.ts.
// Keeping CREATE TABLE IF NOT EXISTS lets a fresh clone work without a
// separate migrate step. Add new columns / tables here when schema.ts grows.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    system_prompt TEXT,
    providers TEXT NOT NULL,
    provider_configs TEXT NOT NULL,
    max_rounds INTEGER NOT NULL DEFAULT 3,
    enable_consensus_detection INTEGER DEFAULT 0,
    consensus_threshold REAL,
    arbiter_id TEXT,
    status TEXT NOT NULL DEFAULT 'configuring',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rounds (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    round_number INTEGER NOT NULL,
    consensus_reached INTEGER DEFAULT 0,
    consensus_score REAL,
    started_at INTEGER NOT NULL,
    completed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL REFERENCES rounds(id),
    provider_id TEXT NOT NULL,
    model_id TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    extracted_text TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS syntheses (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    synthesizer_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    consensus_points TEXT NOT NULL,
    dissent_points TEXT NOT NULL,
    key_insights TEXT NOT NULL,
    metadata TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_rounds_session_id ON rounds(session_id);
  CREATE INDEX IF NOT EXISTS idx_responses_round_id ON responses(round_id);
  CREATE INDEX IF NOT EXISTS idx_attachments_session_id ON attachments(session_id);
  CREATE INDEX IF NOT EXISTS idx_syntheses_session_id ON syntheses(session_id);
`);

export const db = drizzle(sqlite, { schema });
