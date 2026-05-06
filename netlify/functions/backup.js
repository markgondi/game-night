// /api/backup/* — personal data backup using Netlify Blobs.
//
// The "code" is a memorable random word-based string the user remembers
// (e.g. "BLUE-WOLF-RIVER-87"). It's both the identifier AND the secret —
// anyone with the code can read or overwrite the data stored under it.
// This is intentionally trust-based; suitable for personal game data,
// not for anything sensitive.
//
// Routes (mounted under /api/backup):
//   GET  /api/backup/:code   → fetch the user's data, or 404 if none yet
//   POST /api/backup/:code   → save data. Body is JSON: { data: {...}, device?: string }
//   DELETE /api/backup/:code → wipe (rarely needed)
//
// Storage:
//   backups store, key = normalized code, value = { code, data, updatedAt, device }

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'backups';
// 90-day TTL — last access wins. We update updatedAt on read OR write.
// Anything not touched in 90 days is purged by a maintenance step (not yet built).
const STALE_AFTER_MS = 90 * 24 * 60 * 60 * 1000;

// Codes are case-insensitive and dashes are optional in user input —
// we normalize before storing or looking up.
function normalizeCode(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Reasonable bounds on what we'll accept. 12-24 alphanumeric chars covers
// the word-based format ("BLUEWOLFRIVER87") and short-random ("XK4P9MTQ2RFJA8VB").
function validCode(normalized) {
  return /^[A-Z0-9]{8,32}$/.test(normalized);
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

// Pull the code from the path: /api/backup/CODE
function parseCode(pathname) {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/');
  const idx = parts.indexOf('backup');
  if (idx === -1) return null;
  return parts[idx + 1] || null;
}

export default async (req) => {
  try {
    const url = new URL(req.url);
    const raw = parseCode(url.pathname);
    if (!raw) return jsonResponse({ error: 'Code required in URL' }, 400);

    const code = normalizeCode(raw);
    if (!validCode(code)) {
      return jsonResponse({ error: 'Code must be 8–32 alphanumeric characters' }, 400);
    }

    const store = getStore(STORE_NAME);

    // ── GET — restore ──────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const record = await store.get(code, { type: 'json' });
      if (!record) return jsonResponse({ error: 'No backup found for this code' }, 404);
      // Bump access time so active backups don't expire from disuse
      try {
        await store.setJSON(code, { ...record, accessedAt: Date.now() });
      } catch {} // non-fatal
      return jsonResponse(record);
    }

    // ── POST — save / overwrite ────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== 'object' || !body.data || typeof body.data !== 'object') {
        return jsonResponse({ error: 'Body must be { data: {...} }' }, 400);
      }

      // Reasonable size cap — your library + history shouldn't exceed ~500KB.
      // Stringify-and-measure here to reject oversized writes early.
      const serialized = JSON.stringify(body.data);
      if (serialized.length > 1024 * 1024) {
        return jsonResponse({ error: 'Backup too large (max 1MB)' }, 413);
      }

      const record = {
        code,
        data: body.data,
        device: typeof body.device === 'string' ? body.device.slice(0, 64) : null,
        updatedAt: Date.now(),
        accessedAt: Date.now(),
      };
      await store.setJSON(code, record);
      return jsonResponse({ ok: true, updatedAt: record.updatedAt });
    }

    // ── DELETE — wipe ──────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      await store.delete(code).catch(() => {});
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (e) {
    return jsonResponse({ error: e.message || 'Server error' }, 500);
  }
};
