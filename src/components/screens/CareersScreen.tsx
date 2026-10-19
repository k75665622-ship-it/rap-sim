// ─── CAREERS ────────────────────────────────────────────────────────────────
//
// Every career saved in this browser, and the controls to move between them.
//
// This screen exists because the game used to have exactly one save and
// `newGame` deleted it. Starting a second career destroyed the first one, and
// there was no "switch back" to do — the file was already gone. Careers are
// separate slots now, and this is where you see them.
//
// The list is read from the save index, not from game state, so it stays
// correct even while a different career is open — and so opening one can never
// show a stale row for another.

import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button, Card, Badge } from '../ui/Card';
import { maxSlots, type SaveSlotMeta } from '../../store/saves';
import { money } from '@/utils/format';

export function CareersScreen({ standalone = false }: { standalone?: boolean } = {}) {
  const listSaves = useGameStore((s) => s.listSaves);
  const loadSlot = useGameStore((s) => s.loadSlot);
  const newCareer = useGameStore((s) => s.newCareer);
  const deleteSlot = useGameStore((s) => s.deleteSlot);
  const renameSlot = useGameStore((s) => s.renameSlot);
  const setScreen = useGameStore((s) => s.setScreen);
  const activeSlotId = useGameStore((s) => s.activeSlotId ?? null);
  const saveError = useGameStore((s) => s.saveError ?? null);

  const [slots, setSlots] = useState<SaveSlotMeta[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const refresh = useCallback(() => {
    setSlots(listSaves());
  }, [listSaves]);

  // Read on mount, and whenever the active slot changes — opening a career
  // rewrites its `savedAt`, so the order of the list genuinely changes.
  useEffect(() => { refresh(); }, [refresh, activeSlotId]);

  const totalBytes = slots.reduce((n, s) => n + s.bytes, 0);

  function handleOpen(slot: SaveSlotMeta) {
    if (slot.id === activeSlotId) {
      setScreen('dashboard');
      return;
    }
    if (loadSlot(slot.id)) setScreen('dashboard');
    else {
      // The payload vanished between the list being drawn and the click.
      refresh();
    }
  }

  function handleDelete(slot: SaveSlotMeta) {
    deleteSlot(slot.id);
    setConfirming(null);
    refresh();
  }

  function handleRename(slot: SaveSlotMeta) {
    renameSlot(slot.id, draftName);
    setEditing(null);
    refresh();
  }

  return (
    <div className={standalone ? 'min-h-screen bg-[#0A0B10] p-4 md:p-8' : ''}>
    <div className="space-y-4 max-w-4xl">
      {standalone && (
        <button
          onClick={() => setScreen('splash')}
          className="text-[12px] text-ink3 hover:text-ink transition-colors"
        >
          ← Back
        </button>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-ink">Careers</h1>
          <p className="text-[12px] text-ink3 mt-1 leading-relaxed">
            Each career is saved on its own. Starting a new one does not touch
            the others — you can keep {maxSlots()} going and move between them
            whenever you like.
          </p>
        </div>
        <Button
          variant="gold"
          size="sm"
          disabled={slots.length >= maxSlots()}
          onClick={() => { if (newCareer()) setScreen('create_artist'); }}
        >
          + New career
        </Button>
      </div>

      {saveError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2">
          <div className="text-[12px] font-semibold text-red-400">Saving problem</div>
          <div className="text-[11px] text-ink2 mt-0.5 leading-relaxed">{saveError}</div>
        </div>
      )}

      {slots.length === 0 ? (
        <Card>
          <p className="text-[12px] text-ink3">
            No careers saved yet. Start one and it will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {slots.map((slot) => {
            const isActive = slot.id === activeSlotId;
            return (
              <Card key={slot.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {editing === slot.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(slot);
                            if (e.key === 'Escape') setEditing(null);
                          }}
                          maxLength={40}
                          className="flex-1 bg-bg border border-line rounded-lg px-2 py-1 text-ink text-[13px] focus:outline-none focus:border-amber"
                        />
                        <Button size="sm" variant="gold" onClick={() => handleRename(slot)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-bold text-ink truncate">{slot.label}</span>
                        {isActive && <Badge color="yellow">playing now</Badge>}
                      </div>
                    )}

                    <div className="text-[11px] text-ink3 mt-1">
                      {slot.artistName}
                      {slot.gameDate ? ` · ${slot.gameDate}` : ''}
                      {slot.turns ? ` · ${slot.turns} turns` : ''}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-[11px] tabular-nums">
                      <span className="text-ink2">💰 <span className="text-ink font-semibold">{money(slot.money)}</span></span>
                      <span className="text-ink2">👥 <span className="text-ink font-semibold">{slot.fans.toLocaleString()}</span> fans</span>
                      <span className="text-ink2">🎵 <span className="text-ink font-semibold">{slot.songs}</span> songs</span>
                      <span className="text-ink3">{Math.round(slot.bytes / 1024)} kB</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant={isActive ? 'secondary' : 'gold'}
                      onClick={() => handleOpen(slot)}
                    >
                      {isActive ? 'Back to it' : 'Open'}
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditing(slot.id); setDraftName(slot.label); }}
                      >
                        Rename
                      </Button>
                      {confirming === slot.id ? (
                        <>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(slot)}>
                            ⚠️ Delete for good
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                            Keep
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setConfirming(slot.id)}>
                          🗑️
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {confirming === slot.id && (
                  <p className="text-[11px] text-red-400 mt-2 leading-relaxed">
                    This erases "{slot.label}" and everything in it — {slot.songs} songs,{' '}
                    {money(slot.money)} and {slot.fans.toLocaleString()} fans. It cannot be
                    undone.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {slots.length > 0 && (
        <p className="text-[11px] text-ink3">
          {slots.length} of {maxSlots()} careers · {Math.round(totalBytes / 1024)} kB used.
          {slots.length >= maxSlots() && ' Delete one to start another.'}
        </p>
      )}
    </div>
    </div>
  );
}
