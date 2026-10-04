// ─── SAVE SLOTS ─────────────────────────────────────────────────────────────
//
// The game used to have exactly one save, at one fixed localStorage key, and
// `newGame` called `localStorage.removeItem` on it. So starting a second career
// destroyed the first one outright — there was no "switch back", because the
// file was already gone. That was a real data-loss bug, not a missing feature.
//
// The shape now:
//
//   rap_game_saves_v2        the index: the slot list, and which one is active
//   rap_game_save_v2:<id>    one career per key
//   rap_game_save_v1         the old single save, adopted into a slot on first run
//
// An index, rather than scanning localStorage for keys with the right prefix,
// because the careers screen has to show who each artist is and how far they
// got — and reading a megabyte of JSON per career to draw a list would be
// absurd.
//
// `repairIndex` is the important one. An index that disagrees with what is
// actually in storage is how a career becomes invisible while still occupying
// space: the slot list is the only thing the UI trusts, so a slot missing from
// it may as well not exist. Every read reconciles the two, in both directions.

import type { GameDate, GameState } from '../types/game';
import { formatGameDate } from '../sim/gameClock';

export const SAVE_INDEX_KEY = 'rap_game_saves_v2';
export const SLOT_PREFIX = 'rap_game_save_v2:';
/** The single-slot save this game shipped with before slots existed. */
export const LEGACY_KEY = 'rap_game_save_v1';
export const SAVE_VERSION = 2;

/**
 * How many careers to keep.
 *
 * localStorage is about 5MB for the whole origin and one career is a few
 * hundred kB, so this is a real ceiling rather than a stylistic one. The write
 * path reports quota failures instead of swallowing them, which is what makes
 * the ceiling safe to sit near.
 */
export const MAX_SLOTS = 8;

export interface SaveSlotMeta {
  id: string;
  /** What the player called this career. Free text, renameable. */
  label: string;
  artistName: string;
  /** Real-world ISO timestamp, for "started" and "last played". */
  createdAt: string;
  savedAt: string;
  /** In-game date, already formatted the way the game formats it. */
  gameDate: string;
  money: number;
  fans: number;
  songs: number;
  turns: number;
  bytes: number;
}

export interface SaveIndex {
  version: number;
  activeSlotId: string | null;
  slots: SaveSlotMeta[];
}

export type SaveWriteResult =
  | { ok: true; bytes: number }
  | { ok: false; error: string };

// ─── PLUMBING ───────────────────────────────────────────────────────────────

function storage(): Storage | null {
  try {
    // Private browsing and some embedded webviews throw on access rather than
    // returning null, so both paths are covered.
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function newSlotId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `slot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const emptyIndex = (): SaveIndex => ({ version: SAVE_VERSION, activeSlotId: null, slots: [] });

/**
 * Read the index, then make it agree with what is actually in storage.
 *
 * Two failure modes, and the repair handles both:
 *   · a slot listed in the index whose payload is gone (cleared by the browser
 *     under storage pressure) — drop the row, or the player sees a career that
 *     cannot be opened;
 *   · a payload in storage that the index does not mention (a crash between the
 *     two writes) — add it back, or the career becomes unreachable while still
 *     counting against the quota.
 */
export function readIndex(): SaveIndex {
  const ls = storage();
  if (!ls) return emptyIndex();

  let index = emptyIndex();
  const raw = ls.getItem(SAVE_INDEX_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as SaveIndex;
      if (parsed && Array.isArray(parsed.slots)) {
        index = {
          version: SAVE_VERSION,
          activeSlotId: parsed.activeSlotId ?? null,
          slots: parsed.slots.filter((s) => s && typeof s.id === 'string'),
        };
      }
    } catch {
      index = emptyIndex();
    }
  }

  return repairIndex(index, ls);
}

function repairIndex(index: SaveIndex, ls: Storage): SaveIndex {
  const present: SaveIndex['slots'] = [];
  for (const slot of index.slots) {
    const payload = ls.getItem(SLOT_PREFIX + slot.id);
    if (payload === null) continue;
    // Keep the stored size honest — it is shown to the player.
    present.push({ ...slot, bytes: payload.length });
  }

  // Payloads the index does not know about. Only worth a scan when the index is
  // short, because a full scan of localStorage is O(number of keys).
  const known = new Set(present.map((s) => s.id));
  for (let i = 0; i < ls.length; i++) {
    const key = ls.key(i);
    if (!key || !key.startsWith(SLOT_PREFIX)) continue;
    const id = key.slice(SLOT_PREFIX.length);
    if (known.has(id)) continue;
    const payload = ls.getItem(key);
    if (!payload) continue;
    const meta = metaFromPayload(id, payload);
    if (meta) present.push(meta);
  }

  present.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));

  const active =
    index.activeSlotId && present.some((s) => s.id === index.activeSlotId)
      ? index.activeSlotId
      : present[0]?.id ?? null;

  const repaired: SaveIndex = { version: SAVE_VERSION, activeSlotId: active, slots: present };
  // Only write when something actually changed, so a read does not itself
  // become a write on every page load.
  if (
    repaired.activeSlotId !== index.activeSlotId ||
    repaired.slots.length !== index.slots.length
  ) {
    writeIndex(repaired);
  }
  return repaired;
}

export function writeIndex(index: SaveIndex): void {
  const ls = storage();
  if (!ls) return;
  try {
    ls.setItem(SAVE_INDEX_KEY, JSON.stringify(index));
  } catch (e) {
    console.warn('Could not write the save index:', e);
  }
}

// ─── METADATA ───────────────────────────────────────────────────────────────

/** A human label for a payload, used when the player has not named the career. */
function defaultLabel(payload: Partial<GameState>): string {
  const name = payload.player?.artistName;
  return name ? name : 'Unnamed career';
}

/**
 * Describe a payload well enough to draw a row in the careers list, without
 * keeping the payload around.
 */
export function metaFromPayload(id: string, json: string): SaveSlotMeta | null {
  let payload: Partial<GameState>;
  try {
    payload = JSON.parse(json) as Partial<GameState>;
  } catch {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;

  const date = payload.gameDate as GameDate | undefined;
  let gameDate = '';
  try {
    if (date && typeof date.year === 'number') gameDate = formatGameDate(date);
  } catch {
    gameDate = '';
  }

  const career = payload.player?.career;
  return {
    id,
    label: defaultLabel(payload),
    artistName: payload.player?.artistName ?? '—',
    createdAt: payload.player?.createdAt ?? new Date().toISOString(),
    savedAt: new Date().toISOString(),
    gameDate,
    money: Math.round(career?.money ?? 0),
    fans: Math.round(career?.fanbase ?? 0),
    songs: Array.isArray(payload.songs) ? payload.songs.length : 0,
    turns: payload.turnCount ?? 0,
    bytes: json.length,
  };
}

// ─── SLOT IO ────────────────────────────────────────────────────────────────

export function readSlot(id: string): Partial<GameState> | null {
  const ls = storage();
  if (!ls) return null;
  const raw = ls.getItem(SLOT_PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<GameState>;
  } catch {
    return null;
  }
}

/**
 * Write one career into one slot and update the index.
 *
 * Returns the failure rather than swallowing it. A save that silently stops
 * working is the worst outcome available: the player keeps playing and loses
 * everything, and there is no signal until it is far too late to do anything
 * about it.
 */
export function writeSlot(id: string, payload: Partial<GameState>): SaveWriteResult {
  const ls = storage();
  if (!ls) return { ok: false, error: 'This browser will not let the game store anything.' };

  const json = JSON.stringify(payload);
  const key = SLOT_PREFIX + id;

  try {
    ls.setItem(key, json);
  } catch (e) {
    const quota =
      e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    return {
      ok: false,
      error: quota
        ? 'There is no room left to save. Delete a career you are not using, then save again.'
        : `The save did not write: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const index = readIndex();
  const meta = metaFromPayload(id, json);
  if (meta) {
    const existing = index.slots.find((s) => s.id === id);
    if (existing) {
      // Preserve the player's own label and the career's real start time —
      // both are facts about the career, not about this particular write.
      meta.label = existing.label;
      meta.createdAt = existing.createdAt;
    }
    index.slots = [meta, ...index.slots.filter((s) => s.id !== id)];
    index.activeSlotId = id;
    writeIndex(index);
  }
  return { ok: true, bytes: json.length };
}

export function removeSlot(id: string): void {
  const ls = storage();
  if (!ls) return;
  try {
    ls.removeItem(SLOT_PREFIX + id);
  } catch {
    /* nothing useful to do */
  }
  const index = readIndex();
  index.slots = index.slots.filter((s) => s.id !== id);
  if (index.activeSlotId === id) index.activeSlotId = index.slots[0]?.id ?? null;
  writeIndex(index);
}

export function renameSlot(id: string, label: string): void {
  const index = readIndex();
  const slot = index.slots.find((s) => s.id === id);
  if (!slot) return;
  slot.label = label.trim() || slot.artistName;
  writeIndex(index);
}

export function setActiveSlot(id: string | null): void {
  const index = readIndex();
  index.activeSlotId = id;
  writeIndex(index);
}

/**
 * Adopt the pre-slots single save into a slot, once.
 *
 * The old key is removed only after the copy has been read back and confirmed,
 * so an interrupted migration leaves the original in place rather than losing
 * the only copy of somebody's career.
 */
export function adoptLegacySave(): string | null {
  const ls = storage();
  if (!ls) return null;
  const legacy = ls.getItem(LEGACY_KEY);
  if (!legacy) return null;

  const id = newSlotId();
  const result = writeSlot(id, JSON.parse(legacy) as Partial<GameState>);
  if (!result.ok) return null;

  // Verify before deleting. Reading it back costs one parse and removes the
  // only way this could lose data.
  if (ls.getItem(SLOT_PREFIX + id) !== legacy) {
    ls.removeItem(SLOT_PREFIX + id);
    return null;
  }
  ls.removeItem(LEGACY_KEY);
  return id;
}
