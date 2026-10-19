# Setting up RAP LIFE

## Option A — just merge (no server needed)

Merging is enough to get everything except playing one account on several devices.

- Saves live in the browser's own database (IndexedDB): hundreds of MB instead of the old ~5 MB, and up to 30 careers.
- The login page offers **device accounts** (username, optional password), or **Just play** with no account. Everything works offline.
- Careers saved before this update move into the first account you open on that device. Nothing is lost.
- Each player adds their own AI key under **AI Brain** (Claude, OpenAI, Gemini, Groq, Grok, OpenRouter, DeepSeek, Mistral, a model on your own computer with Ollama, or any OpenAI-compatible server). With no key, the game uses its built-in writing.

Host it the way you do now (open `dist/index.html` after `npm run build`, or put `dist/` on any static host).

## Option B — online accounts (play on any device)

You need the small server in this repo (`server.cjs`) and a Postgres database. Free tiers are enough to start.

### 1. Make the database

Create a Postgres database on [Neon](https://neon.tech) or [Supabase](https://supabase.com) and copy its **connection string** (it starts with `postgres://` or `postgresql://`).

Render also offers Postgres, but its free database is deleted 30 days after creation, so only use it on a paid plan.

### 2. Put the server on Render

1. On [render.com](https://render.com): **New → Web Service**, then connect this GitHub repo.
2. Runtime: **Node**.
3. Build command: `npm ci && npm run build`
4. Start command: `npm start`
5. Environment variable: `DATABASE_URL` = the connection string from step 1.
6. Deploy, then open the address Render gives you. On the login page, **Online** is now available.

The server creates its tables on first start. On Render's free plan the server sleeps after about 15 minutes with no visitors, so the first visit after that takes about a minute while it wakes up. The game still opens and plays offline in the meantime, and syncs once the server is back.

Any Node host works the same way (Railway, Fly.io, a VPS): install, build, `npm start`, set `DATABASE_URL`. `PORT` is read from the environment and defaults to 8080.

### 3. If the game is hosted somewhere else

If the game itself is on another host (for example GitHub Pages), point it at the server on the login page: **Game server → change** → paste the server address.

### Running the server on your own computer

```
npm install
npm run build
npm start          # http://localhost:8080
```

Without `DATABASE_URL`, accounts and saves are kept as files in `./data-store`. That's fine on your own machine, but not on hosts that wipe the disk on every restart, such as Render's free plan.

## What the server stores, and what it doesn't

- **Stores:** usernames, scrypt-hashed passwords, login tokens (hashed, 90-day expiry), and compressed copies of each career. Each career includes its journal of memories.
- **Never stores:** AI keys. Keys stay in each player's browser, per account. If a browser can't reach an AI provider directly, the server passes that one request through to a fixed list of AI providers and keeps nothing.
- Login attempts and AI pass-through are rate-limited per IP address.
