// ─── ACCOUNTS ──────────────────────────────────────────────────────────────
//
// Who is playing. Three kinds:
//   · local  — a username (and optional password) kept in this browser's
//              database. Works fully offline.
//   · cloud  — an account on the game's server (when the server is set up).
//              Careers sync so you can continue on another device; a copy is
//              kept locally so it still plays offline.
//   · guest  — "just play": a local account with no name or password.
//
// Each account has its own careers (a save namespace), its own memories and
// its own AI key. Passwords are never stored — only a salted PBKDF2 hash.

import { kv } from './kv';
import { setSaveNamespace, SAVE_INDEX_KEY, SLOT_PREFIX } from './saves';

export type AccountKind = 'local' | 'cloud' | 'guest';

export interface Account {
  id: string;
  kind: AccountKind;
  username: string;
  /** Shown in the corner. */
  display: string;
  createdAt: string;
  lastLogin: string;
  pass?: { salt: string; hash: string };
  cloud?: { userId: string; token: string; lastSync?: string };
}

const ACCOUNTS_KEY = 'rl-accounts';
const SESSION_KEY = 'rl-session';

function read(): Account[] {
  try { return JSON.parse(kv().get(ACCOUNTS_KEY) ?? '[]') as Account[]; } catch { return []; }
}
function write(list: Account[]): void {
  kv().set(ACCOUNTS_KEY, JSON.stringify(list));
}

export function listAccounts(): Account[] {
  return read().sort((a, b) => (a.lastLogin < b.lastLogin ? 1 : -1));
}

let current: Account | null = null;
const listeners = new Set<() => void>();
export function onAccountChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

export function currentAccount(): Account | null {
  return current;
}

function id(): string {
  const c = globalThis.crypto as Crypto | undefined;
  return c?.randomUUID ? c.randomUUID() : `acct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120_000, hash: 'SHA-256' }, key, 256);
  return b64(bits);
}

export function normalizeUsername(u: string): string {
  return u.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 24);
}

/** True if there are careers saved before accounts existed, waiting for an owner. */
export function hasUnclaimedSaves(): boolean {
  return kv().get(SAVE_INDEX_KEY) !== null || kv().keys().some((k) => k.startsWith(SLOT_PREFIX));
}

/** Move pre-account careers into this account (once). */
function claimLegacy(a: Account): number {
  const b = kv();
  const keys = b.keys().filter((k) => k === SAVE_INDEX_KEY || k.startsWith(SLOT_PREFIX));
  if (!keys.length) return 0;
  const prefix = `a:${a.id}:`;
  let moved = 0;
  for (const k of keys) {
    const v = b.get(k);
    if (v === null) continue;
    if (b.get(prefix + k) === null) { b.set(prefix + k, v); moved++; }
    b.remove(k);
  }
  return moved;
}

function activate(a: Account): Account {
  const list = read();
  a.lastLogin = new Date().toISOString();
  write([a, ...list.filter((x) => x.id !== a.id)]);
  current = a;
  claimLegacy(a);
  setSaveNamespace(a.id);
  kv().set(SESSION_KEY, a.id);
  listeners.forEach((f) => f());
  return a;
}

export async function createLocalAccount(username: string, password: string): Promise<{ ok: true; account: Account } | { ok: false; error: string }> {
  const u = normalizeUsername(username);
  if (u.length < 3) return { ok: false, error: 'Pick a username of at least 3 letters.' };
  if (read().some((a) => a.username === u && a.kind !== 'guest')) return { ok: false, error: 'That username is already on this device. Log in instead.' };
  const salt = id();
  const acct: Account = {
    id: id(), kind: 'local', username: u, display: username.trim().slice(0, 24) || u,
    createdAt: new Date().toISOString(), lastLogin: new Date().toISOString(),
    pass: password ? { salt, hash: await hashPassword(password, salt) } : undefined,
  };
  return { ok: true, account: activate(acct) };
}

export async function loginLocal(username: string, password: string): Promise<{ ok: true; account: Account } | { ok: false; error: string }> {
  const u = normalizeUsername(username);
  const a = read().find((x) => x.username === u && x.kind !== 'guest');
  if (!a) return { ok: false, error: 'No account with that name on this device.' };
  if (a.pass) {
    const h = await hashPassword(password, a.pass.salt);
    if (h !== a.pass.hash) return { ok: false, error: 'Wrong password.' };
  }
  return { ok: true, account: activate(a) };
}

/** Pick an account from the list (no password set, or already trusted on this device). */
export function switchTo(accountId: string): Account | null {
  const a = read().find((x) => x.id === accountId);
  return a ? activate(a) : null;
}

export function playAsGuest(): Account {
  const existing = read().find((a) => a.kind === 'guest');
  if (existing) return activate(existing);
  return activate({ id: id(), kind: 'guest', username: 'guest', display: 'Guest', createdAt: new Date().toISOString(), lastLogin: new Date().toISOString() });
}

/** A cloud login lands here: keep (or create) the local mirror of that account. */
export function adoptCloudAccount(user: { id: string; username: string }, token: string): Account {
  const list = read();
  const existing = list.find((a) => a.kind === 'cloud' && a.cloud?.userId === user.id);
  const acct: Account = existing
    ? { ...existing, cloud: { ...existing.cloud!, token } }
    : { id: `c-${user.id}`, kind: 'cloud', username: user.username, display: user.username, createdAt: new Date().toISOString(), lastLogin: new Date().toISOString(), cloud: { userId: user.id, token } };
  return activate(acct);
}

export function updateAccount(patch: Partial<Account>): void {
  if (!current) return;
  current = { ...current, ...patch };
  write([current, ...read().filter((x) => x.id !== current!.id)]);
  listeners.forEach((f) => f());
}

export function logout(): void {
  current = null;
  setSaveNamespace(null);
  kv().remove(SESSION_KEY);
  listeners.forEach((f) => f());
}

/** Delete an account and every career it holds on this device. */
export function deleteAccount(accountId: string): void {
  const b = kv();
  const prefix = `a:${accountId}:`;
  for (const k of b.keys()) if (k.startsWith(prefix)) b.remove(k);
  write(read().filter((a) => a.id !== accountId));
  if (current?.id === accountId) logout();
}

/** Resume the last session on this device, if there is one. */
export function restoreSession(): Account | null {
  const sid = kv().get(SESSION_KEY);
  const a = sid ? read().find((x) => x.id === sid) : undefined;
  if (!a) return null;
  current = a;
  claimLegacy(a);
  setSaveNamespace(a.id);
  return a;
}

/**
 * Move every career (and the AI settings) from one account to another on this
 * device. Used when a device or guest account goes online.
 */
export function moveCareers(fromId: string, toId: string): number {
  const b = kv();
  const from = `a:${fromId}:`;
  const to = `a:${toId}:`;
  let moved = 0;
  // The index is merged rather than overwritten, so careers already on the
  // target account stay listed.
  const idxFrom = b.get(from + SAVE_INDEX_KEY);
  const idxTo = b.get(to + SAVE_INDEX_KEY);
  for (const k of b.keys()) {
    if (!k.startsWith(from) || k === from + SAVE_INDEX_KEY) continue;
    const v = b.get(k);
    if (v === null) continue;
    const nk = to + k.slice(from.length);
    if (b.get(nk) === null) { b.set(nk, v); moved++; }
    b.remove(k);
  }
  if (idxFrom) {
    try {
      const a = JSON.parse(idxFrom) as { slots: { id: string }[]; activeSlotId: string | null };
      const t = idxTo ? (JSON.parse(idxTo) as typeof a) : { ...a, slots: [] };
      t.slots = [...a.slots.filter((x) => !t.slots.some((y) => y.id === x.id)), ...t.slots];
      t.activeSlotId = t.activeSlotId ?? a.activeSlotId;
      b.set(to + SAVE_INDEX_KEY, JSON.stringify(t));
    } catch { /* the index rebuilds itself from the slots */ }
    b.remove(from + SAVE_INDEX_KEY);
  }
  try {
    const ai = localStorage.getItem(`rl-ai-settings:${fromId}`);
    if (ai && !localStorage.getItem(`rl-ai-settings:${toId}`)) localStorage.setItem(`rl-ai-settings:${toId}`, ai);
  } catch { /* private mode */ }
  return moved;
}

/** Forget an online session on this device (careers stay, for when you log back in). */
export function dropCloudToken(): void {
  if (current?.kind === 'cloud' && current.cloud) updateAccount({ cloud: { ...current.cloud, token: '' } });
}

/** How many careers an account keeps on this device. */
export function careerCount(accountId: string): number {
  try {
    const idx = kv().get(`a:${accountId}:${SAVE_INDEX_KEY}`);
    return idx ? (JSON.parse(idx) as { slots: unknown[] }).slots.length : 0;
  } catch { return 0; }
}
