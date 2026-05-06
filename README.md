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

## BGG API token (required)

Per BoardGameGeek's API policy (effective July 2025), all XML API access requires an approved application's Bearer token.

**One-time setup:**

1. Go to [boardgamegeek.com/applications](https://boardgamegeek.com/applications) (logged in)
2. Click **Create application**, fill in your details (mark it "Non-commercial" if it's just for you and your friends)
3. Wait for approval — BGG says this can take up to a week
4. Once approved, click **Tokens** next to your application and create a token
5. Copy the token (UUID format like `e3f8c3ff-9926-4efc-863c-3b92acda4d32`)

**Add it to Netlify:**

1. Netlify dashboard → your site → **Site configuration** → **Environment variables**
2. Click **Add a variable**
3. Key: `BGG_TOKEN`
4. Value: paste your token
5. Save and trigger a redeploy (Deploys tab → Trigger deploy)

The token only lives on the server. It's never sent to the browser, never appears in the React code, never gets committed to GitHub.

**For local dev:** create a `.env` file in the project root with `BGG_TOKEN=your-token-here`. The `.gitignore` already excludes `.env` so you won't commit it by accident.

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
