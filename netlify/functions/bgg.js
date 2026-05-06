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

// Pull a string value from a BGG XML node that might be:
//   - a plain string ("Catan")
//   - an object with .value ({value: "Catan"})
//   - an array of either ([{value: "Catan", sortindex: 1}])
function strOf(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    if (!v.length) return '';
    return strOf(v[0]);
  }
  if (typeof v === 'object') {
    return v.value != null ? String(v.value) : '';
  }
  return String(v);
}

// Pull a numeric attribute that BGG sometimes wraps as { value: "3" }
function numOf(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'object' && v.value != null) {
    const n = Number(v.value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// BGG often returns protocol-relative URLs like //cf.geekdo-images.com/...
// Browsers handle these fine for inline <img>, but they fail in CSS
// background-image when the page is served over https. Force https.
function urlOf(v) {
  const s = strOf(v).trim();
  if (!s) return '';
  if (s.startsWith('//')) return `https:${s}`;
  if (s.startsWith('http://')) return `https://${s.slice(7)}`;
  return s;
}

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
    // Rating value can be "N/A" or a number string
    const rawMyRating = rating?.value;
    const myRating = (rawMyRating == null || rawMyRating === 'N/A') ? null : Number(rawMyRating);

    return {
      id: String(it.objectid),
      name: strOf(it.name),
      year: numOf(it.yearpublished),
      image: urlOf(it.image) || urlOf(it.thumbnail),
      thumbnail: urlOf(it.thumbnail),
      minPlayers: numOf(stats.minplayers),
      maxPlayers: numOf(stats.maxplayers),
      playingTime: numOf(stats.playingtime),
      myRating: Number.isFinite(myRating) ? myRating : null,
      bggRating: numOf(rating?.average),
      myPlays: numOf(it.numplays) || 0,
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
      description: strOf(it.description),
      image: urlOf(it.image),
      thumbnail: urlOf(it.thumbnail),
      minPlayers: numOf(it.minplayers),
      maxPlayers: numOf(it.maxplayers),
      playingTime: numOf(it.playingtime),
      categories,
      mechanics,
      weight: numOf(stats.averageweight), // 1-5 BGG complexity
      bggRating: numOf(stats.average),
      bggRatingCount: numOf(stats.usersrated),
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
