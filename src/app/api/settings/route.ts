import { NextResponse } from 'next/server';
import {
  publicView,
  saveKeys,
  configPath,
  type ProviderKeys,
} from '@/lib/providers/key-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reject any request whose Origin / Referer doesn't match the request host,
 * or that explicitly identifies as cross-site.
 *
 * Council's server is meant for local single-user use. Without this guard,
 * a malicious site you happen to visit could fetch http://127.0.0.1:3333/
 * api/settings with a form-encoded POST and read or set your API keys.
 */
function isSameOrigin(req: Request): boolean {
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site' && fetchSite !== 'none') {
    return false;
  }
  const host = req.headers.get('host');
  if (!host) return false;
  const origin = req.headers.get('origin');
  if (origin) {
    try {
      const u = new URL(origin);
      if (u.host !== host) return false;
    } catch {
      return false;
    }
  } else {
    // No Origin header — allow only if Referer matches host, or neither
    // is present (some non-browser clients omit both).
    const referer = req.headers.get('referer');
    if (referer) {
      try {
        const u = new URL(referer);
        if (u.host !== host) return false;
      } catch {
        return false;
      }
    }
  }
  return true;
}

export async function GET() {
  return NextResponse.json({
    ...publicView(),
    configPath: configPath(),
  });
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json(
      { error: 'Cross-origin request rejected' },
      { status: 403 },
    );
  }

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  const incoming = (body as { keys?: unknown }).keys;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return NextResponse.json({ error: 'Body.keys must be an object' }, { status: 400 });
  }

  // Coerce to plain string map. saveKeys() will allowlist provider IDs.
  const sanitized: ProviderKeys = {};
  for (const [k, v] of Object.entries(incoming as Record<string, unknown>)) {
    if (typeof v === 'string') sanitized[k] = v;
  }

  saveKeys(sanitized);

  return NextResponse.json({
    ...publicView(),
    configPath: configPath(),
  });
}
