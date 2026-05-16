// Voting session API.
//
// Phases (stored on meta.phase):
//   'nominate' → everyone except picker nominates picksPerPlayer games
//   'veto'     → eligible vetoers submit one veto each (or skip). Only when vetoMode === 'remote'.
//   'review'   → host is reviewing the final pool before committing
//   'complete' → session finished
//
// Endpoints (mounted under /api/sessions):
//   POST   /api/sessions                  → create. Body: { games, players, format }
//                                           Returns { sessionId, ownerKey, viewerUrl }
//   GET    /api/sessions/:id/meta         → public. Game list, players, format, phase, who's submitted.
//   POST   /api/sessions/:id/vote         → public. Body: { playerId, picks: [gameId×N] }
//                                           (Nomination — only during 'nominate' phase.)
//   POST   /api/sessions/:id/veto         → public. Body: { playerId, gameId|null }
//                                           (gameId=null means "skip my veto". Only during 'veto' phase.)
//   GET    /api/sessions/:id/results      → owner-only (header: x-owner-key). All votes+vetoes assembled.
//   POST   /api/sessions/:id/phase        → owner-only. Body: { phase: 'veto'|'review'|'nominate'|'complete' }
//                                           Transitions session phase.
//   POST   /api/sessions/:id/host-vote    → owner-only. Body: { playerId, picks }
//                                           Override — host submits on behalf of a player. Tagged byHost.
//   POST   /api/sessions/:id/host-veto    → owner-only. Body: { playerId, gameId|null }
//                                           Override — host vetoes on behalf of a player. Tagged byHost.
//   DELETE /api/sessions/:id              → owner-only. Permanent cleanup.
//
// Storage (Netlify Blobs):
//   session-meta/<sessionId>                   → { games, players, format, phase, ownerKeyHash, ... }
//   session-votes/<sessionId>/nom/<playerId>   → nomination submission for a player
//   session-votes/<sessionId>/veto/<playerId>  → veto submission for a player

import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const META_STORE  = 'session-meta';
const VOTES_STORE = 'session-votes';

const SESSION_TTL_MS    = 7 * 24 * 60 * 60 * 1000;
const COMPLETED_TTL_MS  = 24 * 60 * 60 * 1000;

// ── ID + auth helpers ────────────────────────────────────────────────────────
function generateSessionId() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(4);
  let id = '';
  for (let i = 0; i < 4; i++) id += alphabet[bytes[i] % alphabet.length];
  return id;
}

function generateOwnerKey() {
  return crypto.randomBytes(24).toString('base64url');
}

function hashOwnerKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

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

// ── Phase + expiry helpers ───────────────────────────────────────────────────
const VALID_PHASES = new Set(['nominate', 'veto', 'review', 'complete']);

function isExpired(meta) {
  if (!meta) return true;
  if (meta.completedAt && Date.now() > meta.completedAt + COMPLETED_TTL_MS) return true;
  if (Date.now() > meta.expiresAt) return true;
  return false;
}

function validateCreatePayload(b) {
  if (!b || typeof b !== 'object') return 'Missing body';
  if (!Array.isArray(b.games)   || b.games.length === 0)    return 'games[] required';
  if (!Array.isArray(b.players) || b.players.length < 2)    return 'At least 2 players required';
  if (b.players.length > 12)                                return 'Too many players (max 12)';
  if (b.games.length > 500)                                 return 'Too many games (max 500)';
  for (const p of b.players) {
    if (!p?.id || !p?.name) return 'Each player needs id + name';
  }
  for (const g of b.games) {
    if (!g?.id || !g?.name) return 'Each game needs id + name';
  }
  if (!b.format || typeof b.format !== 'object')            return 'format required';
  if (!b.format.pickerId)                                   return 'format.pickerId required';
  if (!b.players.some(p => p.id === b.format.pickerId))     return 'pickerId must be in players';

  const ppp = b.format.picksPerPlayer;
  if (ppp !== 2 && ppp !== 3) return 'format.picksPerPlayer must be 2 or 3';

  if (b.format.vetoMode !== 'remote' && b.format.vetoMode !== 'in-person') {
    return "format.vetoMode must be 'remote' or 'in-person'";
  }

  if (b.format.vetoerIds) {
    if (!Array.isArray(b.format.vetoerIds))                 return 'format.vetoerIds must be array';
    const ids = new Set(b.players.map(p => p.id));
    for (const vid of b.format.vetoerIds) {
      if (!ids.has(vid))                                    return `Unknown vetoer id ${vid}`;
      if (vid === b.format.pickerId)                        return 'Picker cannot be a vetoer';
    }
  }

  return null;
}

function validateNominate(b, meta) {
  if (!b?.playerId)                                          return 'playerId required';
  if (b.playerId === meta.format.pickerId)                   return 'The final picker does not nominate';
  if (!meta.players.some(p => p.id === b.playerId))          return 'Unknown playerId for this session';
  const expected = meta.format.picksPerPlayer || 3;
  if (!Array.isArray(b.picks) || b.picks.length !== expected) return `picks must be exactly ${expected} games`;
  if (new Set(b.picks).size !== expected)                    return 'picks must be distinct';
  const validIds = new Set(meta.games.map(g => g.id));
  for (const id of b.picks) {
    if (!validIds.has(id)) return `Game "${id}" not in session`;
  }
  return null;
}

function validateVeto(b, meta, poolIds) {
  if (!b?.playerId)                                          return 'playerId required';
  if (b.playerId === meta.format.pickerId)                   return 'The final picker does not veto';
  if (!meta.players.some(p => p.id === b.playerId))          return 'Unknown playerId for this session';
  const vetoers = new Set(
    meta.format.vetoerIds ||
    meta.players.filter(p => p.id !== meta.format.pickerId).map(p => p.id)
  );
  if (!vetoers.has(b.playerId))                              return 'You are not in the vetoer list';
  if (b.gameId !== null && b.gameId !== undefined) {
    if (typeof b.gameId !== 'string')                        return 'gameId must be a string or null';
    if (!poolIds.has(b.gameId))                              return 'gameId is not in the current pool';
  }
  return null;
}

function parsePath(pathname) {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/');
  const sessionsIdx = parts.indexOf('sessions');
  if (sessionsIdx === -1) return null;
  return {
    sessionId: parts[sessionsIdx + 1] || null,
    action:    parts[sessionsIdx + 2] || null,
  };
}

function isOwner(req, meta) {
  const provided = req.headers.get('x-owner-key');
  if (!provided) return false;
  return safeEqual(hashOwnerKey(provided), meta.ownerKeyHash);
}

async function loadAllNominations(votes, sessionId) {
  const list = await votes.list({ prefix: `${sessionId}/nom/` });
  const records = await Promise.all(
    list.blobs.map(b => votes.get(b.key, { type: 'json' }))
  );
  return records.filter(Boolean);
}

async function loadAllVetoes(votes, sessionId) {
  const list = await votes.list({ prefix: `${sessionId}/veto/` });
  const records = await Promise.all(
    list.blobs.map(b => votes.get(b.key, { type: 'json' }))
  );
  return records.filter(Boolean);
}

function assemblePool(nominations) {
  return [...new Set(nominations.flatMap(n => n.picks))];
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

    // ── POST /api/sessions ── create new session ────────────────────────────
    if (!route.sessionId && req.method === 'POST') {
      const body = await req.json().catch(() => null);
      const err = validateCreatePayload(body);
      if (err) return jsonResponse({ error: err }, 400);

      const sessionId = generateSessionId();
      const ownerKey  = generateOwnerKey();
      const now = Date.now();

      const defaultVetoerIds = body.players
        .filter(p => p.id !== body.format.pickerId)
        .map(p => p.id);

      const record = {
        sessionId,
        games:    body.games,
        players:  body.players,
        format: {
          picksPerPlayer: body.format.picksPerPlayer,
          vetoMode:       body.format.vetoMode,
          pickerId:       body.format.pickerId,
          vetoerIds:      body.format.vetoerIds || defaultVetoerIds,
        },
        phase: 'nominate',
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

    const sessionMeta = await meta.get(route.sessionId, { type: 'json' });
    if (!sessionMeta) return jsonResponse({ error: 'Session not found' }, 404);
    if (isExpired(sessionMeta)) {
      await meta.delete(route.sessionId).catch(() => {});
      return jsonResponse({ error: 'Session expired' }, 410);
    }

    // Old sessions (pre-phase-overhaul) won't have format.pickerId etc. We don't
    // attempt to upgrade them server-side — they'll fail validation and the
    // frontend can surface a clear "this session was created with an older
    // version, please make a new one" message.

    // ── GET /api/sessions/:id/meta ── public read ───────────────────────────
    if (route.action === 'meta' && req.method === 'GET') {
      const noms = await loadAllNominations(votes, route.sessionId);
      const vetoes = await loadAllVetoes(votes, route.sessionId);

      const nominatedPlayerIds = noms.map(n => n.playerId);
      const vetoedPlayerIds = vetoes.map(v => v.playerId);

      // Expose the pool only once nominations are over. Don't leak during nominate.
      let pool = null;
      if (sessionMeta.phase === 'veto' || sessionMeta.phase === 'review' || sessionMeta.phase === 'complete') {
        pool = assemblePool(noms);
      }

      const { ownerKeyHash, ...publicMeta } = sessionMeta;
      return jsonResponse({
        ...publicMeta,
        nominatedPlayerIds,
        vetoedPlayerIds,
        pool,
        readOnly: !!sessionMeta.completedAt,
      });
    }

    // ── POST /api/sessions/:id/vote ── public nomination submission ─────────
    if (route.action === 'vote' && req.method === 'POST') {
      if (sessionMeta.phase !== 'nominate') {
        return jsonResponse({ error: 'Nominations are closed for this session' }, 423);
      }
      const body = await req.json().catch(() => null);
      const err = validateNominate(body, sessionMeta);
      if (err) return jsonResponse({ error: err }, 400);

      const voteRecord = {
        playerId: body.playerId,
        picks:    body.picks,
        submittedAt: Date.now(),
        byHost: false,
      };
      await votes.setJSON(`${route.sessionId}/nom/${body.playerId}`, voteRecord);
      return jsonResponse({ ok: true, submittedAt: voteRecord.submittedAt });
    }

    // ── POST /api/sessions/:id/veto ── public veto submission ───────────────
    if (route.action === 'veto' && req.method === 'POST') {
      if (sessionMeta.phase !== 'veto') {
        return jsonResponse({ error: 'Veto phase is not open' }, 423);
      }
      if (sessionMeta.format.vetoMode !== 'remote') {
        return jsonResponse({ error: 'This session uses in-person vetoes' }, 423);
      }
      const noms = await loadAllNominations(votes, route.sessionId);
      const poolIds = new Set(assemblePool(noms));

      const body = await req.json().catch(() => null);
      const err = validateVeto(body, sessionMeta, poolIds);
      if (err) return jsonResponse({ error: err }, 400);

      const vetoRecord = {
        playerId:    body.playerId,
        gameId:      body.gameId ?? null,
        skipped:     body.gameId === null || body.gameId === undefined,
        submittedAt: Date.now(),
        byHost:      false,
      };
      await votes.setJSON(`${route.sessionId}/veto/${body.playerId}`, vetoRecord);
      return jsonResponse({ ok: true, submittedAt: vetoRecord.submittedAt });
    }

    // ── POST /api/sessions/:id/phase ── owner-only phase transition ────────
    if (route.action === 'phase' && req.method === 'POST') {
      if (!isOwner(req, sessionMeta)) return jsonResponse({ error: 'Forbidden' }, 403);
      const body = await req.json().catch(() => null);
      const newPhase = body?.phase;
      if (!VALID_PHASES.has(newPhase)) return jsonResponse({ error: 'Invalid phase' }, 400);

      const cur = sessionMeta.phase || 'nominate';
      const ok = (
        (cur === 'nominate' && newPhase === 'veto') ||
        (cur === 'nominate' && newPhase === 'review') ||  // skip veto when vetoMode === 'in-person'
        (cur === 'veto'     && newPhase === 'review') ||
        (cur === 'veto'     && newPhase === 'nominate') ||  // host can re-open if needed
        (cur === 'review'   && newPhase === 'veto') ||
        (cur === 'review'   && newPhase === 'complete')
      );
      if (!ok) return jsonResponse({ error: `Cannot transition ${cur} → ${newPhase}` }, 400);

      const updated = { ...sessionMeta, phase: newPhase };
      if (newPhase === 'complete') updated.completedAt = Date.now();
      await meta.setJSON(route.sessionId, updated);
      return jsonResponse({ ok: true, phase: newPhase });
    }

    // ── POST /api/sessions/:id/host-vote ── owner override (nominate on behalf)
    if (route.action === 'host-vote' && req.method === 'POST') {
      if (!isOwner(req, sessionMeta)) return jsonResponse({ error: 'Forbidden' }, 403);
      if (sessionMeta.phase !== 'nominate') {
        return jsonResponse({ error: 'Nominations are closed' }, 423);
      }
      const body = await req.json().catch(() => null);
      const err = validateNominate(body, sessionMeta);
      if (err) return jsonResponse({ error: err }, 400);
      const record = {
        playerId: body.playerId,
        picks: body.picks,
        submittedAt: Date.now(),
        byHost: true,
      };
      await votes.setJSON(`${route.sessionId}/nom/${body.playerId}`, record);
      return jsonResponse({ ok: true });
    }

    // ── POST /api/sessions/:id/host-veto ── owner override (veto on behalf) ─
    if (route.action === 'host-veto' && req.method === 'POST') {
      if (!isOwner(req, sessionMeta)) return jsonResponse({ error: 'Forbidden' }, 403);
      if (sessionMeta.phase !== 'veto') {
        return jsonResponse({ error: 'Veto phase is not open' }, 423);
      }
      const noms = await loadAllNominations(votes, route.sessionId);
      const poolIds = new Set(assemblePool(noms));
      const body = await req.json().catch(() => null);
      const err = validateVeto(body, sessionMeta, poolIds);
      if (err) return jsonResponse({ error: err }, 400);
      const record = {
        playerId: body.playerId,
        gameId:   body.gameId ?? null,
        skipped:  body.gameId === null || body.gameId === undefined,
        submittedAt: Date.now(),
        byHost: true,
      };
      await votes.setJSON(`${route.sessionId}/veto/${body.playerId}`, record);
      return jsonResponse({ ok: true });
    }

    // ── GET /api/sessions/:id/results ── owner-only full results ────────────
    if (route.action === 'results' && req.method === 'GET') {
      if (!isOwner(req, sessionMeta)) return jsonResponse({ error: 'Forbidden' }, 403);

      const noms = await loadAllNominations(votes, route.sessionId);
      const vetoes = await loadAllVetoes(votes, route.sessionId);
      const pool = assemblePool(noms);
      const vetoedGameIds = vetoes.filter(v => !v.skipped && v.gameId).map(v => v.gameId);
      const finalPool = pool.filter(gid => !vetoedGameIds.includes(gid));

      const { ownerKeyHash, ...publicMeta } = sessionMeta;
      return jsonResponse({
        ...publicMeta,
        nominations: noms,
        vetoes,
        pool,
        finalPool,
      });
    }

    // ── DELETE /api/sessions/:id ── owner cleanup ───────────────────────────
    if (!route.action && req.method === 'DELETE') {
      if (!isOwner(req, sessionMeta)) return jsonResponse({ error: 'Forbidden' }, 403);

      const list = await votes.list({ prefix: `${route.sessionId}/` });
      await Promise.all(list.blobs.map(b => votes.delete(b.key)));
      await meta.delete(route.sessionId);

      return jsonResponse({ ok: true });
    }

    // ── POST /api/sessions/:id/complete ── owner-only mark readonly ─────────
    if (route.action === 'complete' && req.method === 'POST') {
      if (!isOwner(req, sessionMeta)) return jsonResponse({ error: 'Forbidden' }, 403);
      const updated = { ...sessionMeta, phase: 'complete', completedAt: Date.now() };
      await meta.setJSON(route.sessionId, updated);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Unknown route or method' }, 404);
  } catch (e) {
    console.error('sessions function error:', e);
    return jsonResponse({ error: e.message || 'Server error' }, 500);
  }
};
