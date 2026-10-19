// ─── ONLINE ACCOUNTS AND SYNC ──────────────────────────────────────────────
//
// When the game is served by its own server (server.cjs) — or the player
// points it at one — accounts can live online: log in on any device and your
// careers (with their journals) come with you. Everything still plays from
// the local database, so going offline changes nothing; changes sync when
// the server can be reached again. The newest copy of each career wins.
//
// AI keys never go to the server to be stored. If a browser can't call an AI
// provider directly, the server can pass a request through (used once, not
// kept).

import { kv } from '../store/kv';
import { readIndex, readSlotRaw, writeSlotRaw, onSlotChange, saveNamespace } from '../store/saves';
import { adoptCloudAccount, currentAccount, updateAccount, onAccountChange, type Account } from '../store/accounts';
import { setAIProxy } from '../sim/ai';

const SERVER_KEY = 'rl-server-url';

/** The server's address: set by the player, or the page's own origin when served over http(s). */
export function serverUrl(): string {
  const saved = (kv().get(SERVER_KEY) ?? '').trim().replace(/\/+$/, '');
  if (saved) return saved;
  if (typeof location !== 'undefined' && /^https?:$/.test(location.protocol)) return location.origin;
  return '';
}
export function setServerUrl(url: string): void {
  const v = url.trim().replace(/\/+$/, '');
  if (v) kv().set(SERVER_KEY, v); else kv().remove(SERVER_KEY);
  status = { ...status, server: null };
  notify();
}

export interface SyncStatus {
  /** null = not checked yet. */
  server: boolean | null;
  db?: string;
  syncing: boolean;
  lastSync?: string;
  lastError?: string;
  pending: number;
}
let status: SyncStatus = { server: null, syncing: false, pending: 0 };
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());
export function syncStatus(): SyncStatus { return status; }
export function onSyncChange(f: () => void): () => void { listeners.add(f); return () => listeners.delete(f); }

async function api<T>(path: string, init: RequestInit & { token?: string; timeout?: number } = {}): Promise<T> {
  const base = serverUrl();
  if (!base) throw new Error('No server');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), init.timeout ?? 15000);
  try {
    const headers: Record<string, string> = { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(init.token ? { authorization: `Bearer ${init.token}` } : {}) };
    const res = await fetch(base + path, { ...init, headers, signal: ctrl.signal });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw Object.assign(new Error(data.error || `Server error ${res.status}`), { status: res.status });
    return data;
  } finally {
    clearTimeout(t);
  }
}

/** Is there a game server to talk to? Cheap; cached until the address changes. */
export async function probeServer(force = false): Promise<boolean> {
  if (status.server !== null && !force) return status.server;
  if (!serverUrl()) { status = { ...status, server: false }; notify(); setAIProxy(null); return false; }
  try {
    const h = await api<{ ok: boolean; db: string }>('/api/health', { timeout: 3500 });
    status = { ...status, server: !!h.ok, db: h.db };
    setAIProxy(h.ok ? `${serverUrl()}/api/ai` : null);
  } catch {
    status = { ...status, server: false };
    setAIProxy(null);
  }
  notify();
  return status.server!;
}

type AuthResult = { ok: true; account: Account } | { ok: false; error: string };

async function auth(path: string, username: string, password: string): Promise<AuthResult> {
  try {
    const r = await api<{ token: string; user: { id: string; username: string } }>(path, { method: 'POST', body: JSON.stringify({ username, password }) });
    const account = adoptCloudAccount(r.user, r.token);
    void syncNow();
    return { ok: true, account };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? (e.message === 'No server' ? 'No game server is reachable.' : e.message) : 'Could not reach the server.' };
  }
}

export const cloudRegister = (u: string, p: string) => auth('/api/register', u, p);
export const cloudLogin = (u: string, p: string) => auth('/api/login', u, p);

export async function cloudLogout(): Promise<void> {
  const a = currentAccount();
  if (a?.kind !== 'cloud' || !a.cloud?.token) return;
  try { await api('/api/logout', { method: 'POST', token: a.cloud.token, timeout: 4000 }); } catch { /* offline: the token just expires */ }
}

// ─── SYNC ──────────────────────────────────────────────────────────────────

async function gzipB64(text: string): Promise<{ data: string; encoding: string }> {
  if (typeof CompressionStream === 'undefined') return { data: text, encoding: 'plain' };
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { data: btoa(bin), encoding: 'gzip-b64' };
}

async function gunzipB64(data: string, encoding: string): Promise<string> {
  if (encoding !== 'gzip-b64') return data;
  const bin = atob(data);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

/** Careers deleted here while offline, to delete on the server next sync. */
const TOMB_KEY = () => `${saveNamespace()}rl-deleted`;
function tombstones(): string[] { try { return JSON.parse(kv().get(TOMB_KEY()) ?? '[]') as string[]; } catch { return []; } }
function setTombstones(t: string[]): void { if (t.length) kv().set(TOMB_KEY(), JSON.stringify(t.slice(-100))); else kv().remove(TOMB_KEY()); }

const dirty = new Set<string>();
let running: Promise<{ pushed: number; pulled: number }> | null = null;

/** Two-way sync for the logged-in online account. Newest copy of each career wins. */
export function syncNow(): Promise<{ pushed: number; pulled: number }> {
  if (running) return running;
  running = (async () => {
    const a = currentAccount();
    const token = a?.kind === 'cloud' ? a.cloud?.token : undefined;
    if (!token) return { pushed: 0, pulled: 0 };
    status = { ...status, syncing: true, lastError: undefined };
    notify();
    let pushed = 0;
    let pulled = 0;
    try {
      if (!(await probeServer(true))) throw new Error('Offline — will sync when the server is back.');
      for (const id of tombstones()) { try { await api(`/api/saves/${encodeURIComponent(id)}`, { method: 'DELETE', token }); } catch { /* try next time */ } }
      setTombstones([]);
      const remote = (await api<{ saves: { id: string; label?: string; savedAt: string }[] }>('/api/saves', { token })).saves;
      const local = readIndex().slots;
      const rById = new Map(remote.map((r) => [r.id, r]));
      for (const l of local) {
        const r = rById.get(l.id);
        if (r && r.savedAt >= l.savedAt && !dirty.has(l.id)) continue;
        const json = readSlotRaw(l.id);
        if (!json) continue;
        const { data, encoding } = await gzipB64(json);
        await api(`/api/saves/${encodeURIComponent(l.id)}`, { method: 'PUT', token, timeout: 60000, body: JSON.stringify({ label: l.label, savedAt: l.savedAt, bytes: json.length, data, encoding }) });
        dirty.delete(l.id);
        pushed++;
      }
      const lById = new Map(local.map((l) => [l.id, l]));
      for (const r of remote) {
        const l = lById.get(r.id);
        if (l && l.savedAt >= r.savedAt) continue;
        const got = await api<{ data: string; encoding: string; savedAt: string; label?: string }>(`/api/saves/${encodeURIComponent(r.id)}`, { token, timeout: 60000 });
        const json = await gunzipB64(got.data, got.encoding);
        if (writeSlotRaw(r.id, json, got.savedAt, got.label)) pulled++;
      }
      const when = new Date().toISOString();
      updateAccount({ cloud: { ...a!.cloud!, lastSync: when } });
      status = { ...status, syncing: false, lastSync: when, pending: dirty.size };
    } catch (e) {
      const err = e as Error & { status?: number };
      status = { ...status, syncing: false, pending: dirty.size, lastError: err.status === 401 ? 'Your online session expired. Log in again to sync.' : err.message };
    }
    notify();
    return { pushed, pulled };
  })().finally(() => { running = null; });
  return running;
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** Keep the online copy fresh: shortly after saves, and every few minutes. */
export function startAutoSync(): () => void {
  const offSlot = onSlotChange((e) => {
    if (currentAccount()?.kind !== 'cloud' || e.ns !== saveNamespace()) return;
    if (e.type === 'remove') { setTombstones([...tombstones(), e.id]); dirty.delete(e.id); }
    else dirty.add(e.id);
    status = { ...status, pending: dirty.size };
    if (!timer) timer = setTimeout(() => { timer = null; void syncNow(); }, 90000);
  });
  const every = setInterval(() => { if (currentAccount()?.kind === 'cloud' && (dirty.size || !status.lastSync)) void syncNow(); }, 5 * 60000);
  const offAcct = onAccountChange(() => { dirty.clear(); status = { ...status, pending: 0, lastSync: currentAccount()?.cloud?.lastSync }; notify(); if (currentAccount()?.kind === 'cloud') void syncNow(); });
  const online = () => { if (currentAccount()?.kind === 'cloud') void syncNow(); };
  window.addEventListener('online', online);
  return () => { offSlot(); offAcct(); clearInterval(every); window.removeEventListener('online', online); };
}
