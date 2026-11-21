// Shoots live in the browser's IndexedDB, not in the save file: a shoot is a few
// MB of frames. Each shoot holds 4 angles × ANGLE_SEC seconds of JPEG frames.
export interface ShootMeta { id: string; at: number; fps: number; w: number; h: number; angles: number; secPerAngle: number; bpm?: number; title?: string }
export interface Shoot { meta: ShootMeta; frames: Blob[][] }

const DB = 'ranklife-shoots';
const KEEP = 3;
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('shoots'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const tx = <T,>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
  open().then((db) => new Promise<T>((res, rej) => { const t = db.transaction('shoots', mode); const q = f(t.objectStore('shoots')); t.oncomplete = () => res(q.result); t.onerror = () => rej(t.error); }));

export async function saveShoot(s: Shoot): Promise<void> {
  await tx('readwrite', (st) => st.put(s, s.meta.id));
  const all = await listShoots();
  for (const m of all.slice(KEEP)) await tx('readwrite', (st) => st.delete(m.id));
}
export async function loadShoot(id: string): Promise<Shoot | null> {
  try { return ((await tx('readonly', (st) => st.get(id))) as Shoot) ?? null; } catch { return null; }
}
export async function listShoots(): Promise<ShootMeta[]> {
  try {
    const all = (await tx('readonly', (st) => st.getAll())) as Shoot[];
    return all.map((s) => s.meta).sort((a, b) => b.at - a.at);
  } catch { return []; }
}
export async function deleteShoot(id: string): Promise<void> { try { await tx('readwrite', (st) => st.delete(id)); } catch { /* gone */ } }
