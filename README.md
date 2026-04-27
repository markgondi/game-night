# Game Night

Mobile-first board game night app powered entirely by your BoardGameGeek collection.

## How it works

1. Connect your BGG account once
2. Your owned games sync into the library (with covers, complexity, ratings, play counts, categories)
3. Run a game night: nominate → veto → final pick → live scoring
4. Score history persists across sessions

There's no manual game library. BGG is the single source of truth — to add or remove games, do it on BoardGameGeek and resync.

## Features

- **BGG sync** pulls your owned collection automatically
- **Game-night flow**: 1–N nominators each pick 3 games, everyone gets a veto, last player picks the final
- **Score history** with per-game results
- **Player count filter** — only shows games that fit your group
- **Dynamic format** adapts to 1, 2, 3, 4+ players

## Setup

```bash
npm install
```

## Local development

You need both Vite and Netlify Functions running. Easiest:

```bash
npx netlify dev
```

This runs everything together at **http://localhost:8888**. The Netlify CLI auto-launches Vite (port 5173) and the BGG proxy function, with a redirect that wires `/api/bgg` to the function.

If you've never used Netlify CLI:

```bash
npm install -g netlify-cli
netlify login
```

## Deploy to Netlify

1. Push this folder to a GitHub repo
2. Go to [app.netlify.com](https://app.netlify.com), click "Add new site → Import existing project"
3. Pick your repo. Netlify auto-detects the config (publish dir: `dist`, functions: `netlify/functions`, build: `npm run build`)
4. Click Deploy. Live in ~60s.

## How BGG sync works

1. Tap **Sync BGG** in the header (or the prompt on the empty Library)
2. Type your BGG username (the one in your profile URL on boardgamegeek.com)
3. App calls `/api/bgg?type=collection&user=YOU` → fetches your owned games
4. Then `/api/bgg?type=thing&ids=...` for full details (cover, complexity, categories)

**Important caveats:**

- **Your BGG collection must be public.** Settings → Privacy on BGG.
- **No real authentication.** BGG's API has no login — anyone can read public collections by username.
- **First sync is slow** (~10–30s). BGG returns HTTP 202 ("come back later") on big collections. The proxy retries with backoff. After that it's instant for ~30 mins thanks to in-memory caching.
- **Disconnecting clears your library.** Resync to bring it back.

## Project structure

```
game-night-bgg/
├── netlify.toml              # Netlify config
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── main.jsx              # Entry, sets up localStorage shim
│   └── App.jsx               # Whole app (single-file React)
└── netlify/functions/
    └── bgg.js                # BGG XML API proxy + cache
```
