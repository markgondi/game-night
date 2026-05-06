// /api/bgg?user=USERNAME[&type=collection|plays|thing&id=...]
//
// Proxies BoardGameGeek XML API2:
//   - collection: user's owned games + personal ratings
//   - plays:      user's logged plays (paginated, we fetch all)
//   - thing:      detailed game info (categories, weight, image, BGG rating)
//
// Handles BGG quirks:
//   - HTTP 202 ("processing, retry") on collection requests — retries with backoff
//   - Plays paginated 100 at a time — fetches all pages
//   - Caches per-user responses ~30min in memory (survives warm function invocations)

import { XMLParser } from 'fast-xml-parser';

const cache = new Map();
const TTL_MS = 1000 * 60 * 30;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'value',
  parseAttributeValue: true,
  isArray: (name) => ['item', 'play', 'player', 'name', 'link', 'rank'].includes(name),
});

function cacheGet(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) { cache.delete(key); return null; }
  return e.data;
}
function cacheSet(key, data) {
  cache.set(key, { data, expires: Date.now() + TTL_MS });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Fetch BGG XML, retrying on 202 (their "still processing" code).
// Netlify functions time out at 10s (free) / 26s (Pro), so we do limited
// in-function retries and let the frontend handle longer waits if needed.
//
// Per BGG's policy (boardgamegeek.com/using_the_xml_api), API access requires
// an approved application's Bearer token, sent in the Authorization header.
// Token is loaded from env var BGG_TOKEN — set it in Netlify UI, never in code.
async function fetchBgg(url, { maxRetries = 3, baseDelay = 2500 } = {}) {
  const headers = { 'User-Agent': 'game-night-app/1.0' };
  if (process.env.BGG_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.BGG_TOKEN}`;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, { headers });

    // Token missing or rejected — surface clearly
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `BGG ${res.status}: token missing or rejected. ` +
        `Set BGG_TOKEN in Netlify → Site configuration → Environment variables. ` +
        `Get a token at boardgamegeek.com/applications.`
      );
    }

    // Explicit "queued" status — wait and retry within budget
    if (res.status === 202) {
      if (attempt >= maxRetries) {
        const err = new Error('BGG_QUEUED');
        err.code = 'QUEUED';
        throw err;
      }
      await sleep(baseDelay);
      continue;
    }

    if (!res.ok) {
      throw new Error(`BGG ${res.status}: ${res.statusText}`);
    }

    const text = await res.text();
    const parsed = parser.parse(text);

    // 200 OK but body says "still processing" — same situation
    const msg = parsed?.message?.value || (typeof parsed?.message === 'string' ? parsed.message : null);
    if (msg && /processed|try again|accepted/i.test(msg)) {
      if (attempt >= maxRetries) {
        const err = new Error('BGG_QUEUED');
        err.code = 'QUEUED';
        throw err;
      }
      await sleep(baseDelay);
      continue;
    }

    return parsed;
  }
  const err = new Error('BGG_QUEUED');
  err.code = 'QUEUED';
  throw err;
}

// Always return an array — BGG XML returns single items as objects.
const arr = (v) => v == null ? [] : Array.isArray(v) ? v : [v];

// -------- Collection (owned games + my rating) --------
async function getCollection(user) {
  const key = `coll:${user}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  // own=1 → only owned, stats=1 → include rating + bgg-average, excludesubtype filters expansions
  const url = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(user)}&own=1&stats=1&excludesubtype=boardgameexpansion`;
  const data = await fetchBgg(url);

  const items = arr(data?.items?.item).map((it) => {
    const stats = it.stats || {};
    const rating = stats.rating || {};
    return {
      id: String(it.objectid),
      name: typeof it.name === 'object' ? it.name.value : it.name,
      year: it.yearpublished,
      image: it.image || it.thumbnail || '',
      thumbnail: it.thumbnail || '',
      minPlayers: Number(stats.minplayers) || null,
      maxPlayers: Number(stats.maxplayers) || null,
      playingTime: Number(stats.playingtime) || null,
      myRating: rating.value === 'N/A' ? null : Number(rating.value) || null,
      bggRating: Number(rating?.average?.value) || null,
      myPlays: Number(it.numplays) || 0,
    };
  });

  cacheSet(key, items);
  return items;
}

// -------- Plays (full history, paginated) --------
async function getPlays(user) {
  const key = `plays:${user}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  let page = 1;
  let all = [];
  while (true) {
    const url = `https://boardgamegeek.com/xmlapi2/plays?username=${encodeURIComponent(user)}&page=${page}`;
    const data = await fetchBgg(url);
    const plays = arr(data?.plays?.play);
    if (plays.length === 0) break;

    for (const p of plays) {
      const players = arr(p?.players?.player).map(pl => ({
        name: pl.name || '',
        userid: pl.userid || null,
        score: pl.score || null,
        win: pl.win === 1 || pl.win === '1',
      }));
      all.push({
        id: String(p.id),
        date: p.date,
        gameId: String(p.item?.objectid),
        gameName: p.item?.name,
        quantity: Number(p.quantity) || 1,
        players,
      });
    }

    const total = Number(data?.plays?.total) || all.length;
    if (all.length >= total) break;
    page++;
    if (page > 50) break; // safety
  }

  cacheSet(key, all);
  return all;
}

// -------- Thing (rich game details, batched) --------
async function getThings(ids) {
  // Single cache key for the whole batch — BGG accepts comma-sep IDs
  const sortedIds = [...ids].sort().join(',');
  const key = `thing:${sortedIds}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  if (sortedIds.length === 0) return {};
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${sortedIds}&stats=1`;
  const data = await fetchBgg(url);

  const out = {};
  for (const it of arr(data?.items?.item)) {
    const id = String(it.id);
    const names = arr(it.name);
    const primaryName = names.find(n => n.type === 'primary')?.value || names[0]?.value;
    const links = arr(it.link);
    const categories = links.filter(l => l.type === 'boardgamecategory').map(l => l.value);
    const mechanics  = links.filter(l => l.type === 'boardgamemechanic').map(l => l.value);
    const stats = it.statistics?.ratings || {};

    out[id] = {
      name: primaryName,
      description: it.description,
      image: it.image,
      thumbnail: it.thumbnail,
      minPlayers: Number(it.minplayers?.value) || null,
      maxPlayers: Number(it.maxplayers?.value) || null,
      playingTime: Number(it.playingtime?.value) || null,
      categories,
      mechanics,
      weight: Number(stats.averageweight?.value) || null, // 1-5 BGG complexity
      bggRating: Number(stats.average?.value) || null,
      bggRatingCount: Number(stats.usersrated?.value) || null,
    };
  }
  cacheSet(key, out);
  return out;
}

// -------- Handler --------
export default async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'collection';
  const user = url.searchParams.get('user');
  const ids  = url.searchParams.get('ids');

  try {
    let body;
    if (type === 'collection') {
      if (!user) throw new Error('Missing ?user=');
      body = await getCollection(user);
    } else if (type === 'plays') {
      if (!user) throw new Error('Missing ?user=');
      body = await getPlays(user);
    } else if (type === 'thing') {
      if (!ids) throw new Error('Missing ?ids=');
      body = await getThings(ids.split(',').filter(Boolean));
    } else {
      throw new Error(`Unknown type: ${type}`);
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600',
      },
    });
  } catch (err) {
    // BGG is still preparing the collection — tell the client to retry
    if (err.code === 'QUEUED') {
      return new Response(JSON.stringify({ queued: true, message: 'BGG is preparing your collection — retrying…' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
