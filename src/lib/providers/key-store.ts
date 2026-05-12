import 'server-only';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PROVIDER_ENV_VARS } from './availability-vars';

// Single source of truth for BYOK API keys.
//
// Keys live in a per-user config file (chmod 600 on Unix). Environment
// variables are honored as a fallback so .env.local / CLI startup keeps
// working — but values written via /api/settings or the Electron
// Settings window take priority.
//
// Path layout (matches the npx CLI):
//   $XDG_CONFIG_HOME/council/config.json    (Linux + custom)
//   ~/.config/council/config.json           (everywhere else)
//
// File schema:
//   { "keys": { "anthropic": "sk-...", "openai": "...", ... } }

export type ProviderKeys = Partial<Record<string, string>>;

export interface KeysFileShape {
  keys: ProviderKeys;
}

function configDir(): string {
  if (process.env.COUNCIL_CONFIG_DIR) return process.env.COUNCIL_CONFIG_DIR;
  const xdg = process.env.XDG_CONFIG_HOME;
  return xdg
    ? path.join(xdg, 'council')
    : path.join(os.homedir(), '.config', 'council');
}

export function configPath(): string {
  return path.join(configDir(), 'config.json');
}

function ensureDir(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

function readFile(): KeysFileShape {
  try {
    const raw = fs.readFileSync(configPath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.keys && typeof parsed.keys === 'object') {
      return { keys: parsed.keys };
    }
  } catch {
    // Missing / unreadable / invalid JSON — start empty.
  }
  return { keys: {} };
}

function writeFile(data: KeysFileShape): void {
  ensureDir(configDir());
  const target = configPath();
  // Atomic write: write to temp file and rename so a crash mid-write
  // doesn't leave a corrupted config.
  const tmp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, target);
  // chmod again in case the file already existed with looser perms.
  try {
    fs.chmodSync(target, 0o600);
  } catch {
    // Windows or odd FS — perms are best-effort.
  }
}

/** Read raw keys from disk. Server-only — never return these to the browser. */
export function readKeys(): ProviderKeys {
  const file = readFile();
  return { ...file.keys };
}

/** Effective key for a provider — file value first, then env. */
export function effectiveKey(providerId: string): string | undefined {
  const fromFile = readKeys()[providerId]?.trim();
  if (fromFile) return fromFile;
  const envName = PROVIDER_ENV_VARS[providerId];
  return envName ? process.env[envName]?.trim() || undefined : undefined;
}

/** Allowlist + write a partial set of keys. Returns the new state. */
export function saveKeys(input: ProviderKeys): ProviderKeys {
  const current = readKeys();
  const allowed = new Set(Object.keys(PROVIDER_ENV_VARS));
  const next: ProviderKeys = { ...current };
  for (const [id, value] of Object.entries(input)) {
    if (!allowed.has(id)) continue;
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed === '') {
      // Empty string explicitly clears the key.
      delete next[id];
    } else {
      next[id] = trimmed;
    }
  }
  writeFile({ keys: next });
  return next;
}

/** Mask a single key value for display: first 6 + ellipsis + last 4. */
export function maskKey(value: string | undefined | null): string {
  if (!value) return '';
  if (value.length <= 12) return '…';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

/** Public-safe view: presence + masked values, never raw. */
export interface KeysView {
  presence: Record<string, boolean>;
  masked: Record<string, string>;
}

export function publicView(): KeysView {
  const presence: Record<string, boolean> = {};
  const masked: Record<string, string> = {};
  for (const id of Object.keys(PROVIDER_ENV_VARS)) {
    const k = effectiveKey(id);
    presence[id] = Boolean(k);
    masked[id] = k ? maskKey(k) : '';
  }
  return { presence, masked };
}
