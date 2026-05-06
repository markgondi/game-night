// Voting session API.
// Endpoints (mounted under /api/sessions):
//   POST   /api/sessions                  → create. Body: { games, players, format }
//                                           Returns { sessionId, ownerKey, viewerUrl }
//   GET    /api/sessions/:id/meta         → public. Game list, players, format, who has voted (names only).
//   POST   /api/sessions/:id/vote         → public. Body: { playerId, picks: [gameId×3] }
//   GET    /api/sessions/:id/results      → owner-only (header: x-owner-key). All votes combined.
//   DELETE /api/sessions/:id              → owner-only. Permanent cleanup.
//
// Storage model (Netlify Blobs):
//   meta/<sessionId>            → { games, players, format, ownerKeyHash, createdAt, expiresAt, completedAt? }
//   votes/<sessionId>/<plyrId>  → { playerId, picks, submittedAt }
//                                 ← one blob per voter, no write contention.

import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

// Two stores keep concerns separate and keep listing efficient.
const META_STORE  = 'session-meta';
const VOTES_STORE = 'session-votes';

const SESSION_TTL_MS    = 7 * 24 * 60 * 60 * 1000;   // 7 days
const COMPLETED_TTL_MS  = 24 * 60 * 60 * 1000;       // 24h read-only after marked complete

// Short, human-friendly session IDs (4 chars from a non-ambiguous alphabet)
function generateSessionId() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/O/1/l/i confusion
  let id = '';
  const bytes = crypto.randomBytes(4);
  for (let i = 0; i < 4; i++) id += alphabet[bytes[i] % alphabet.length];
  return id;
}

// 32-char URL-safe owner key
function generateOwnerKey() {
  return crypto.randomBytes(24).toString('base64url');
}

// We store a SHA-256 hash of the owner key so even if the meta blob leaks,
// the actual key isn't exposed.
function hashOwnerKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Constant-time comparison to avoid timing attacks during owner auth
function safeEqual(a, b) {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function isExpired(meta) {
  if (!meta) return true;
  if (meta.completedAt && Date.now() > meta.completedAt + COMPLETED_TTL_MS) return true;
  if (Date.now() > meta.expiresAt) return true;
  return false;
}

// Light validation — keeps obviously bad payloads out of storage.
function validateCreatePayload(b) {
  if (!b || typeof b !== 'object') return 'Missing body';
  if (!Array.isArray(b.games)   || b.games.length === 0)    return 'games[] required';
  if (!Array.isArray(b.players) || b.players.length < 1)    return 'players[] required';
  if (b.players.length > 12)                                return 'Too many players (max 12)';
  if (b.games.length > 500)                                 return 'Too many games (max 500)';
  for (const p of b.players) {
    if (!p?.id || !p?.name) return 'Each player needs id + name';
  }
  for (const g of b.games) {
    if (!g?.id || !g?.name) return 'Each game needs id + name';
  }
  if (!b.format || typeof b.format !== 'object')            return 'format required';
  return null;
}

function validateVote(b, meta) {
  if (!b?.playerId)                              return 'playerId required';
  if (!Array.isArray(b.picks) || b.picks.length !== 3) return 'picks must be exactly 3 games';
  if (new Set(b.picks).size !== 3)               return 'picks must be 3 different games';
  // Each player must be in the session's player list
  if (!meta.players.some(p => p.id === b.playerId)) return 'Unknown playerId for this session';
  // All picks must be from the session's game list
  const validIds = new Set(meta.games.map(g => g.id));
  for (const id of b.picks) {
    if (!validIds.has(id)) return `Game "${id}" not in session`;
  }
  return null;
}

// Parse path: /api/sessions[/:id[/meta|vote|results]]
function parsePath(pathname) {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/');
  // ["api","sessions"] or ["api","sessions","abcd"] or ["api","sessions","abcd","action"]
  // (also supports being mounted at /.netlify/functions/sessions/...)
  const sessionsIdx = parts.indexOf('sessions');
  if (sessionsIdx === -1) return null;
  return {
    sessionId: parts[sessionsIdx + 1] || null,
    action:    parts[sessionsIdx + 2] || null,
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────────────────────────
export default async (req) => {
  try {
    const url = new URL(req.url);
    const route = parsePath(url.pathname);
    if (!route) return jsonResponse({ error: 'Bad route' }, 400);

    const meta  = getStore(META_STORE);
    const votes = getStore(VOTES_STORE);

    // ── POST /api/sessions ── create new session
    if (!route.sessionId && req.method === 'POST') {
      const body = await req.json().catch(() => null);
      const err = validateCreatePayload(body);
      if (err) return jsonResponse({ error: err }, 400);

      const sessionId = generateSessionId();
      const ownerKey  = generateOwnerKey();
      const now = Date.now();

      const record = {
        sessionId,
        games:    body.games,
        players:  body.players,
        format:   body.format,
        ownerKeyHash: hashOwnerKey(ownerKey),
        createdAt: now,
        expiresAt: now + SESSION_TTL_MS,
        completedAt: null,
      };

      await meta.setJSON(sessionId, record);

      const origin = url.origin;
      return jsonResponse({
        sessionId,
        ownerKey,
        viewerUrl: `${origin}/vote/${sessionId}`,
        ownerUrl:  `${origin}/?session=${sessionId}`,
      });
    }

    if (!route.sessionId) return jsonResponse({ error: 'Session ID required' }, 400);

    // Common: load meta for session-scoped routes
    const sessionMeta = await meta.get(route.sessionId, { type: 'json' });
    if (!sessionMeta) return jsonResponse({ error: 'Session not found' }, 404);
    if (isExpired(sessionMeta)) {
      // Lazy cleanup
      await meta.delete(route.sessionId).catch(() => {});
      return jsonResponse({ error: 'Session expired' }, 410);
    }

    // ── GET /api/sessions/:id/meta ── public (read-only, no votes leaked)
    if (route.action === 'meta' && req.method === 'GET') {
      const voteList = await votes.list({ prefix: `${route.sessionId}/` });
      const votedPlayerIds = voteList.blobs.map(b => b.key.split('/')[1]);
      // Strip secret + private fields
      const { ownerKeyHash, ...publicMeta } = sessionMeta;
      return jsonResponse({
        ...publicMeta,
        votedPlayerIds, // names of voters but NOT what they voted for
        readOnly: !!sessionMeta.completedAt,
      });
    }

    // ── POST /api/sessions/:id/vote ── public submit (idempotent)
    if (route.action === 'vote' && req.method === 'POST') {
      if (sessionMeta.completedAt) {
        return jsonResponse({ error: 'Voting closed for this session' }, 403);
      }
      const body = await req.json().catch(() => null);
      const err = validateVote(body, sessionMeta);
      if (err) return jsonResponse({ error: err }, 400);

      const voteRecord = {
        playerId: body.playerId,
        picks:    body.picks,
        submittedAt: Date.now(),
      };
      // Key includes session prefix so list() by prefix works for owner reads
      await votes.setJSON(`${route.sessionId}/${body.playerId}`, voteRecord);

      return jsonResponse({ ok: true, submittedAt: voteRecord.submittedAt });
    }

    // ── GET /api/sessions/:id/results ── owner-only
    if (route.action === 'results' && req.method === 'GET') {
      const provided = req.headers.get('x-owner-key');
      if (!provided || !safeEqual(hashOwnerKey(provided), sessionMeta.ownerKeyHash)) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      // Fetch all vote blobs for this session in parallel
      const list = await votes.list({ prefix: `${route.sessionId}/` });
      const allVotes = await Promise.all(
        list.blobs.map(b => votes.get(b.key, { type: 'json' }))
      );

      const { ownerKeyHash, ...publicMeta } = sessionMeta;
      return jsonResponse({
        ...publicMeta,
        votes: allVotes.filter(Boolean),
      });
    }

    // ── DELETE /api/sessions/:id ── owner-only cleanup
    if (!route.action && req.method === 'DELETE') {
      const provided = req.headers.get('x-owner-key');
      if (!provided || !safeEqual(hashOwnerKey(provided), sessionMeta.ownerKeyHash)) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      // Delete all vote blobs first, then the meta
      const list = await votes.list({ prefix: `${route.sessionId}/` });
      await Promise.all(list.blobs.map(b => votes.delete(b.key)));
      await meta.delete(route.sessionId);

      return jsonResponse({ ok: true });
    }

    // ── POST /api/sessions/:id/complete ── owner-only, marks readonly
    if (route.action === 'complete' && req.method === 'POST') {
      const provided = req.headers.get('x-owner-key');
      if (!provided || !safeEqual(hashOwnerKey(provided), sessionMeta.ownerKeyHash)) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }
      const updated = { ...sessionMeta, completedAt: Date.now() };
      await meta.setJSON(route.sessionId, updated);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Unknown route or method' }, 404);
  } catch (e) {
    return jsonResponse({ error: e.message || 'Server error' }, 500);
  }
};
