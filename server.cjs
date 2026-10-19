// ─── RAP LIFE SERVER ───────────────────────────────────────────────────────
//
// Optional. The game runs entirely in the browser without it (local database,
// device accounts, offline play). Run this to add online accounts, so a
// player can log in anywhere and keep their careers and journals.
//
//   npm install && npm run build && npm start      (PORT defaults to 8080)
//
// Storage: Postgres when DATABASE_URL is set (recommended — Neon, Supabase,
// Render Postgres…), otherwise files under ./data-store (fine on your own
// machine; NOT on hosts with a throwaway disk, like Render's free tier).
//
// It also serves the built game from ./dist, and passes AI requests through
// to a fixed list of AI providers when a browser can't reach them directly.
// AI keys are forwarded, never logged and never stored.
//
// No framework, no dependencies except `pg` (only loaded with DATABASE_URL).

'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 8080;
const DIST = path.join(__dirname, 'dist');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data-store');
const MAX_BODY = 25 * 1024 * 1024; // a big career, gzipped, with room to spare
const TOKEN_DAYS = 90;
const VERSION = '7';

// ─── STORAGE ───────────────────────────────────────────────────────────────

function fileStore() {
  fs.mkdirSync(path.join(DATA_DIR, 'saves'), { recursive: true });
  const dbFile = path.join(DATA_DIR, 'db.json');
  let db = { users: {}, tokens: {} };
  try { db = JSON.parse(fs.readFileSync(dbFile, 'utf8')); } catch { /* new store */ }
  const persist = () => { fs.writeFileSync(dbFile + '.tmp', JSON.stringify(db)); fs.renameSync(dbFile + '.tmp', dbFile); };
  const saveDir = (uid) => path.join(DATA_DIR, 'saves', uid.replace(/[^a-zA-Z0-9_-]/g, ''));
  const saveFile = (uid, sid) => path.join(saveDir(uid), sid.replace(/[^a-zA-Z0-9_.-]/g, '_') + '.json');
  return {
    kind: 'file',
    async init() {},
    async createUser(u) { if (Object.values(db.users).some((x) => x.username === u.username)) return false; db.users[u.id] = u; persist(); return true; },
    async userByName(name) { return Object.values(db.users).find((x) => x.username === name) || null; },
    async userById(id) { return db.users[id] || null; },
    async addToken(hash, userId, expires) { db.tokens[hash] = { userId, expires }; persist(); },
    async tokenUser(hash) { const t = db.tokens[hash]; if (!t || t.expires < Date.now()) return null; return t.userId; },
    async dropToken(hash) { delete db.tokens[hash]; persist(); },
    async listSaves(uid) {
      const dir = saveDir(uid);
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => { try { const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); return { id: s.id, label: s.label, savedAt: s.savedAt, bytes: s.bytes }; } catch { return null; } }).filter(Boolean);
    },
    async getSave(uid, sid) { try { return JSON.parse(fs.readFileSync(saveFile(uid, sid), 'utf8')); } catch { return null; } },
    async putSave(uid, s) { fs.mkdirSync(saveDir(uid), { recursive: true }); const f = saveFile(uid, s.id); fs.writeFileSync(f + '.tmp', JSON.stringify(s)); fs.renameSync(f + '.tmp', f); },
    async deleteSave(uid, sid) { try { fs.unlinkSync(saveFile(uid, sid)); } catch { /* gone */ } },
  };
}

function pgStore(url) {
  const { Pool } = require('pg');
  const local = /localhost|127\.0\.0\.1/.test(url);
  const pool = new Pool({ connectionString: url, ssl: local || /sslmode=disable/.test(url) ? false : { rejectUnauthorized: false }, max: 5 });
  const q = (text, params) => pool.query(text, params);
  return {
    kind: 'postgres',
    async init() {
      await q(`create table if not exists rl_users (id text primary key, username text unique not null, pass text not null, created_at timestamptz not null default now())`);
      await q(`create table if not exists rl_tokens (hash text primary key, user_id text not null references rl_users(id) on delete cascade, expires_at timestamptz not null)`);
      await q(`create table if not exists rl_saves (user_id text not null references rl_users(id) on delete cascade, slot_id text not null, label text, saved_at text not null, bytes integer, encoding text not null, data text not null, updated_at timestamptz not null default now(), primary key (user_id, slot_id))`);
      await q(`delete from rl_tokens where expires_at < now()`);
    },
    async createUser(u) { try { await q('insert into rl_users (id, username, pass) values ($1, $2, $3)', [u.id, u.username, u.pass]); return true; } catch (e) { if (e.code === '23505') return false; throw e; } },
    async userByName(name) { const r = await q('select id, username, pass from rl_users where username = $1', [name]); return r.rows[0] || null; },
    async userById(id) { const r = await q('select id, username from rl_users where id = $1', [id]); return r.rows[0] || null; },
    async addToken(hash, userId, expires) { await q('insert into rl_tokens (hash, user_id, expires_at) values ($1, $2, to_timestamp($3 / 1000.0))', [hash, userId, expires]); },
    async tokenUser(hash) { const r = await q('select user_id from rl_tokens where hash = $1 and expires_at > now()', [hash]); return r.rows[0] ? r.rows[0].user_id : null; },
    async dropToken(hash) { await q('delete from rl_tokens where hash = $1', [hash]); },
    async listSaves(uid) { const r = await q('select slot_id as id, label, saved_at as "savedAt", bytes from rl_saves where user_id = $1 order by saved_at desc', [uid]); return r.rows; },
    async getSave(uid, sid) { const r = await q('select slot_id as id, label, saved_at as "savedAt", bytes, encoding, data from rl_saves where user_id = $1 and slot_id = $2', [uid, sid]); return r.rows[0] || null; },
    async putSave(uid, s) {
      await q(`insert into rl_saves (user_id, slot_id, label, saved_at, bytes, encoding, data, updated_at) values ($1, $2, $3, $4, $5, $6, $7, now())
               on conflict (user_id, slot_id) do update set label = excluded.label, saved_at = excluded.saved_at, bytes = excluded.bytes, encoding = excluded.encoding, data = excluded.data, updated_at = now()`,
        [uid, s.id, s.label || null, s.savedAt, s.bytes || null, s.encoding, s.data]);
    },
    async deleteSave(uid, sid) { await q('delete from rl_saves where user_id = $1 and slot_id = $2', [uid, sid]); },
  };
}

const store = process.env.DATABASE_URL ? pgStore(process.env.DATABASE_URL) : fileStore();

// ─── HELPERS ───────────────────────────────────────────────────────────────

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? rej(e) : res(k.toString('hex')))));
async function hashPass(pw) { const salt = crypto.randomBytes(16).toString('hex'); return `scrypt$${salt}$${await scrypt(pw, salt)}`; }
async function checkPass(pw, stored) {
  const [, salt, hash] = String(stored).split('$');
  if (!salt || !hash) return false;
  const got = Buffer.from(await scrypt(pw, salt), 'hex');
  const want = Buffer.from(hash, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
const normName = (u) => String(u || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_.-]/g, '').slice(0, 24);

function send(res, status, body, headers = {}) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors(), ...headers });
  res.end(json);
}
function cors() {
  // Bearer tokens, no cookies: any origin may call the API (the game can be
  // hosted somewhere else, e.g. GitHub Pages, and point at this server).
  return { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS', 'access-control-max-age': '86400', 'access-control-expose-headers': 'x-rl-proxy, retry-after' };
}

function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(Object.assign(new Error('Too large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(Object.assign(new Error('Bad JSON'), { status: 400 })); } });
    req.on('error', reject);
  });
}

// Simple fixed-window limits, per IP (or per user).
const buckets = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { n: 1, reset: now + windowMs }); return false; }
  b.n += 1;
  return b.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k); }, 60000).unref();
const ipOf = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

async function userOf(req) {
  const m = /^Bearer\s+(.+)$/.exec(req.headers.authorization || '');
  if (!m) return null;
  return store.tokenUser(sha(m[1]));
}

async function issueToken(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  await store.addToken(sha(token), userId, Date.now() + TOKEN_DAYS * 86400000);
  return token;
}

// ─── AI PASS-THROUGH ───────────────────────────────────────────────────────
// Only these hosts, only POST, only these headers. The key in the request is
// used for this one call and dropped.

const AI_HOSTS = new Set(['api.anthropic.com', 'api.openai.com', 'generativelanguage.googleapis.com', 'api.groq.com', 'api.x.ai', 'openrouter.ai', 'api.deepseek.com', 'api.mistral.ai']);
const AI_HEADERS = new Set(['authorization', 'x-api-key', 'anthropic-version', 'x-goog-api-key', 'content-type', 'x-title', 'http-referer']);

async function aiProxy(req, res) {
  if (limited(`ai|${ipOf(req)}`, 90, 60000)) return send(res, 429, { error: 'Too many AI requests. Slow down.' });
  const b = await readBody(req, 2 * 1024 * 1024);
  let target;
  try { target = new URL(String(b.target)); } catch { return send(res, 400, { error: 'Bad target' }); }
  if (target.protocol !== 'https:' || !AI_HOSTS.has(target.hostname) || target.port) return send(res, 403, { error: 'That host is not allowed' });
  const headers = {};
  for (const [k, v] of Object.entries(b.headers || {})) if (AI_HEADERS.has(k.toLowerCase()) && typeof v === 'string') headers[k.toLowerCase()] = v;
  // GET only to list models; everything else is a POST.
  const isGet = b.method === 'GET';
  if (isGet && !/\/models\/?$/.test(target.pathname)) return send(res, 403, { error: 'Only the model list can be fetched' });
  if (!isGet) headers['content-type'] = 'application/json';
  try {
    const r = await fetch(target, isGet ? { method: 'GET', headers, signal: AbortSignal.timeout(20000) } : { method: 'POST', headers, body: JSON.stringify(b.body || {}), signal: AbortSignal.timeout(30000) });
    const text = await r.text();
    const out = { 'content-type': r.headers.get('content-type') || 'application/json', 'x-rl-proxy': '1', ...cors() };
    const ra = r.headers.get('retry-after');
    if (ra) out['retry-after'] = ra;
    res.writeHead(r.status, out);
    res.end(text);
  } catch {
    send(res, 502, { error: 'Could not reach the AI provider' });
  }
}

// ─── API ───────────────────────────────────────────────────────────────────

async function handleApi(req, res, url) {
  const p = url.pathname;
  if (req.method === 'OPTIONS') { res.writeHead(204, cors()); return res.end(); }
  if (p === '/api/health') return send(res, 200, { ok: true, db: store.kind, version: VERSION });
  if (p === '/api/ai' && req.method === 'POST') return aiProxy(req, res);

  if ((p === '/api/register' || p === '/api/login') && req.method === 'POST') {
    if (limited(`auth|${ipOf(req)}`, 12, 60000)) return send(res, 429, { error: 'Too many attempts. Wait a minute.' });
    const b = await readBody(req, 10000);
    const username = normName(b.username);
    const password = String(b.password || '');
    if (username.length < 3) return send(res, 400, { error: 'Pick a username of at least 3 letters.' });
    if (password.length < 6) return send(res, 400, { error: 'Use a password of at least 6 characters.' });
    if (p === '/api/register') {
      const user = { id: crypto.randomUUID(), username, pass: await hashPass(password) };
      if (!(await store.createUser(user))) return send(res, 409, { error: 'That username is taken.' });
      return send(res, 200, { token: await issueToken(user.id), user: { id: user.id, username } });
    }
    const user = await store.userByName(username);
    if (!user || !(await checkPass(password, user.pass))) return send(res, 401, { error: 'Wrong username or password.' });
    return send(res, 200, { token: await issueToken(user.id), user: { id: user.id, username: user.username } });
  }

  const uid = await userOf(req);
  if (!uid) return send(res, 401, { error: 'Log in first.' });
  if (limited(`u|${uid}`, 240, 60000)) return send(res, 429, { error: 'Too many requests.' });

  if (p === '/api/logout' && req.method === 'POST') {
    const m = /^Bearer\s+(.+)$/.exec(req.headers.authorization || '');
    if (m) await store.dropToken(sha(m[1]));
    return send(res, 200, { ok: true });
  }
  if (p === '/api/me') { const u = await store.userById(uid); return send(res, 200, { user: u && { id: u.id, username: u.username } }); }
  if (p === '/api/saves' && req.method === 'GET') return send(res, 200, { saves: await store.listSaves(uid) });

  const m = /^\/api\/saves\/([A-Za-z0-9_.:-]{1,80})$/.exec(p);
  if (m) {
    const sid = m[1];
    if (req.method === 'GET') { const s = await store.getSave(uid, sid); return s ? send(res, 200, s) : send(res, 404, { error: 'No such career' }); }
    if (req.method === 'DELETE') { await store.deleteSave(uid, sid); return send(res, 200, { ok: true }); }
    if (req.method === 'PUT') {
      const b = await readBody(req);
      if (typeof b.data !== 'string' || typeof b.savedAt !== 'string') return send(res, 400, { error: 'Missing data' });
      const all = await store.listSaves(uid);
      if (!all.some((s) => s.id === sid) && all.length >= 40) return send(res, 400, { error: 'Forty careers is the limit online.' });
      await store.putSave(uid, { id: sid, label: String(b.label || '').slice(0, 80), savedAt: b.savedAt.slice(0, 40), bytes: Number(b.bytes) || b.data.length, encoding: b.encoding === 'gzip-b64' ? 'gzip-b64' : 'plain', data: b.data });
      return send(res, 200, { ok: true });
    }
  }
  return send(res, 404, { error: 'Not found' });
}

// ─── STATIC ────────────────────────────────────────────────────────────────

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(DIST, rel));
  if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    const target = !err && st.isFile() ? file : path.join(DIST, 'index.html');
    fs.readFile(target, (e, buf) => {
      if (e) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Build the game first: npm run build'); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(target)] || 'application/octet-stream', 'cache-control': target.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600' });
      res.end(buf);
    });
  });
}

// ─── GO ────────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else if (req.method === 'GET' || req.method === 'HEAD') serveStatic(req, res, url);
    else { res.writeHead(405); res.end(); }
  } catch (e) {
    if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'Server error' });
    if (!e.status) console.error(e);
  }
});

store.init().then(() => {
  server.listen(PORT, () => console.log(`RAP LIFE on http://localhost:${PORT} · storage: ${store.kind}${store.kind === 'file' ? ` (${DATA_DIR})` : ''}`));
}).catch((e) => { console.error('Could not open the database:', e.message); process.exit(1); });
