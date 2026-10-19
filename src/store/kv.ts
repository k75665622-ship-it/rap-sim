// ─── THE LOCAL DATABASE ────────────────────────────────────────────────────
//
// Saves used to live in localStorage, which a browser caps at about 5MB for
// the whole site — roughly six careers. They now live in IndexedDB, the
// browser's own database, which holds hundreds of megabytes and survives
// going offline.
//
// The game's save code is synchronous (an auto-save happens inside a tick),
// and IndexedDB is not. So this is a synchronous key-value facade: at boot
// everything is read from IndexedDB into memory; reads come from memory;
// writes go to memory immediately and to IndexedDB a moment later (and on
// page hide). If IndexedDB is unavailable (some private modes, tests), the
// facade falls back to localStorage exactly as before.

export interface KV {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
  /** 'indexeddb' or 'localstorage' or 'memory'. */
  kind: string;
}

function lsBackend(): KV | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const ls = localStorage;
    return {
      kind: 'localstorage',
      get: (k) => ls.getItem(k),
      set: (k, v) => ls.setItem(k, v),
      remove: (k) => ls.removeItem(k),
      keys: () => { const out: string[] = []; for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k) out.push(k); } return out; },
    };
  } catch {
    return null;
  }
}

function memoryBackend(): KV {
  const m = new Map<string, string>();
  return { kind: 'memory', get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v), remove: (k) => void m.delete(k), keys: () => [...m.keys()] };
}

let backend: KV | null = null;

/** The store every save read and write goes through. */
export function kv(): KV {
  if (!backend) backend = lsBackend() ?? memoryBackend();
  return backend;
}

// ─── INDEXEDDB ─────────────────────────────────────────────────────────────

const DB_NAME = 'raplife';
const STORE = 'kv';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readAll(db: IDBDatabase): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    const out = new Map<string, string>();
    const tx = db.transaction(STORE, 'readonly');
    const cur = tx.objectStore(STORE).openCursor();
    cur.onsuccess = () => {
      const c = cur.result;
      if (c) { if (typeof c.value === 'string') out.set(String(c.key), c.value); c.continue(); } else resolve(out);
    };
    cur.onerror = () => reject(cur.error);
  });
}

/** Keys that should stay in localStorage (tiny, needed before the database opens). */
const LOCAL_ONLY = /^(rl-ai-|rl-money-tab|rl-session-hint|rl-server)/;

/**
 * Open the database and switch the facade over to it. Moves anything saved in
 * localStorage before this version into the database (keeping the old copies
 * until the database confirms the write).
 */
export async function initKV(): Promise<string> {
  if (typeof indexedDB === 'undefined') return kv().kind;
  let db: IDBDatabase;
  try { db = await openDB(); } catch { return kv().kind; }
  let mem: Map<string, string>;
  try { mem = await readAll(db); } catch { return kv().kind; }

  const ls = lsBackend();
  const pending = new Map<string, string | null>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = (): Promise<void> => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!pending.size) return Promise.resolve();
    const batch = new Map(pending);
    pending.clear();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        const st = tx.objectStore(STORE);
        for (const [k, v] of batch) { if (v === null) st.delete(k); else st.put(v, k); }
        tx.oncomplete = () => resolve();
        tx.onerror = () => { console.warn('Database write failed', tx.error); resolve(); };
      } catch (e) { console.warn('Database write failed', e); resolve(); }
    });
  };
  const schedule = () => { if (!timer) timer = setTimeout(() => void flush(), 400); };

  // First run on the database: bring the localStorage saves across.
  if (ls) {
    for (const k of ls.keys()) {
      if (LOCAL_ONLY.test(k) || mem.has(k)) continue;
      if (!/^(rap_game_|rl-|a:)/.test(k)) continue;
      const v = ls.get(k);
      if (v !== null) { mem.set(k, v); pending.set(k, v); }
    }
    if (pending.size) {
      const moved = [...pending.keys()];
      await flush();
      // Confirmed in the database: free the localStorage space (keep tiny settings).
      for (const k of moved) { try { ls.remove(k); } catch { /* ignore */ } }
    }
  }

  backend = {
    kind: 'indexeddb',
    get: (k) => (LOCAL_ONLY.test(k) && ls ? ls.get(k) : mem.get(k) ?? null),
    set: (k, v) => { if (LOCAL_ONLY.test(k) && ls) { ls.set(k, v); return; } mem.set(k, v); pending.set(k, v); schedule(); },
    remove: (k) => { if (LOCAL_ONLY.test(k) && ls) { ls.remove(k); return; } mem.delete(k); pending.set(k, null); schedule(); },
    keys: () => [...mem.keys()],
  };

  if (typeof window !== 'undefined') {
    const hide = () => { void flush(); };
    window.addEventListener('pagehide', hide);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') hide(); });
  }
  // Ask the browser not to clear the game's data under storage pressure.
  try { await navigator.storage?.persist?.(); } catch { /* not supported */ }
  return 'indexeddb';
}

/** Rough size of everything stored, in bytes. */
export function kvBytes(prefix = ''): number {
  const b = kv();
  return b.keys().filter((k) => k.startsWith(prefix)).reduce((a, k) => a + (b.get(k)?.length ?? 0), 0);
}
