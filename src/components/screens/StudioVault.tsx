// ─── THE STUDIO VAULT ──────────────────────────────────────────────────────
// Everything you have recorded and not put out.
//
// The vault exists because recording used to be a one-way door: you cut a
// master, and the only things you could do with it were release it or scrap it.
// Real artists sit on records for months, come back to them, re-cut them, swap
// the beat, decide a hook is not good enough. None of that was possible, so the
// studio was a vending machine rather than a room.
//
// Two rules hold this page together:
//
//   1. Nothing here destroys anything. A re-record makes a NEW take and leaves
//      the old one alone; archiving takes a record out of the active list
//      without touching it. Only `scrapMaster` deletes, and it lives in the
//      editor where the player is looking at the thing they are killing.
//   2. Every action returns a reason. A button that does nothing when the money
//      or the energy is not there is worse than a button that is not there.

import { ListenButton } from '../studio/Listen';
import { ArrangeDialog } from '../studio/ArrangeDialog';
import { useMemo, useState } from 'react';
import { useGameStore, type StudioSessionPayload } from '../../store/gameStore';
import { Card, Button, Badge } from '../ui/Card';
import { FeaturePicker, FeatureRequestRow } from '../studio/FeatureShop';
import { cn } from '@/utils/cn';
import type { Song, SongMood } from '../../types/game';
import {
  EFFORT_OPTIONS,
  MOODS,
  VOCAL_DEFAULTS,
  bpmBandFor,
  getProducerBeats,
  getProducerOptions,
  getSelfProducedBeats,
  producerFee,
  producerPriceBand,
  describeScore,
  gradeLabel,
  sessionCost,
  sessionDays,
  type BeatOption,
  type ProducerOption,
} from '../../sim/studio';
import { sessionEnergy } from '../../sim/energy';
import { money } from '@/utils/format';
import { IconAlert, IconCheck } from '../icons';

// ─── HELPERS ──────────────────────────────────────────────────────────────

function isReleased(song: Song) {
  return song.masterStatus === undefined || song.masterStatus === 'released';
}

/** A vault master: yours, recorded, not out, not archived. */
function isActiveVault(song: Song) {
  return !isReleased(song) && !song.archivedAt;
}

function qualityTone(q: number) {
  return q >= 74 ? 'text-green-400' : q >= 50 ? 'text-yellow-400' : 'text-red-400';
}

/** How this record came to exist, in the player's words. */
function lineageLabel(song: Song): string | null {
  if (song.lineage === 'rerecord') return `Take ${song.takeNumber ?? 2}`;
  if (song.lineage === 'remix') return 'Remix';
  if (song.lineage === 'deluxe') return 'Deluxe cut';
  return null;
}

type Panel = 'title' | 'lyrics' | 'production' | 'rerecord' | 'note' | 'feature';

// ─── SCREEN ───────────────────────────────────────────────────────────────

export function StudioVault({
  onRelease,
  onMix,
  focusSongId,
}: {
  onRelease: (songId: string) => void;
  onMix: (songId: string) => void;
  /** Open this master's sheet straight away (from the album builder's Edit). */
  focusSongId?: string;
}) {
  const songs = useGameStore((s) => s.songs);
  const npcs = useGameStore((s) => s.npcs);

  const archiveSong = useGameStore((s) => s.archiveSong);
  const unarchiveSong = useGameStore((s) => s.unarchiveSong);
  const setReadyToRelease = useGameStore((s) => s.setReadyToRelease);
  const setVaultNote = useGameStore((s) => s.setVaultNote);
  const updateMasterLyrics = useGameStore((s) => s.updateMasterLyrics);
  const swapProduction = useGameStore((s) => s.swapProduction);
  const rerecordSong = useGameStore((s) => s.rerecordSong);
  const renameSong = useGameStore((s) => s.renameSong);
  const deleteSong = useGameStore((s) => s.deleteSong);

  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [open, setOpen] = useState<{ songId: string; panel: Panel } | null>(() => (focusSongId ? { songId: focusSongId, panel: 'lyrics' } : null));
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const active = useMemo(
    () => songs.filter(isActiveVault).slice().reverse(),
    [songs],
  );
  const archived = useMemo(
    () => songs.filter((s) => !isReleased(s) && !!s.archivedAt).slice().reverse(),
    [songs],
  );

  const readyCount = active.filter((s) => s.readyToRelease).length;
  const list = tab === 'active' ? active : archived;

  const toggle = (songId: string, panel: Panel) =>
    setOpen((cur) => (cur && cur.songId === songId && cur.panel === panel ? null : { songId, panel }));

  /** Run a vault action and surface its reason, whatever it was. */
  function run(fn: () => { ok: boolean; message: string }) {
    const out = fn();
    setNotice({ ok: out.ok, text: out.message });
    if (out.ok) setOpen(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">🎒 The Vault</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            {active.length === 0
              ? 'Nothing sitting in here yet.'
              : `${active.length} master${active.length === 1 ? '' : 's'} recorded and not out${
                  readyCount > 0 ? ` · ${readyCount} flagged ready` : ''
                }.`}
          </p>
        </div>
        <div className="flex gap-1 border-b border-gray-800 shrink-0">
          {(
            [
              ['active', `In the vault (${active.length})`],
              ['archived', `Archived (${archived.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 text-xs font-bold transition-colors border-b-2 -mb-px ${
                tab === id
                  ? 'border-yellow-500 text-yellow-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {notice ? (
        <div
          className={cn(
            'flex gap-2 items-start rounded-xl px-3 py-2 text-xs leading-relaxed',
            notice.ok ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300',
          )}
        >
          {notice.ok ? (
            <IconCheck size={14} className="mt-0.5 shrink-0" />
          ) : (
            <IconAlert size={14} className="mt-0.5 shrink-0" />
          )}
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)} className="text-gray-500 hover:text-white">
            ✕
          </button>
        </div>
      ) : null}

      {list.length === 0 ? (
        <Card>
          <div className="text-center py-10">
            <div className="text-4xl mb-3">{tab === 'active' ? '🎒' : '🗄️'}</div>
            <p className="text-gray-400 text-sm">
              {tab === 'active'
                ? 'The vault is empty.'
                : 'Nothing has been archived.'}
            </p>
            <p className="text-gray-600 text-xs mt-2 max-w-md mx-auto leading-relaxed">
              {tab === 'active'
                ? 'Track a record on the editor tab and it lands here — not in the world, just in your hands, until you decide it is finished.'
                : 'Archive a master and it leaves the active vault without being deleted. Its numbers stay on the record.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((song) => (
            <VaultRow
              key={song.id}
              song={song}
              npcs={npcs}
              openPanel={open && open.songId === song.id ? open.panel : null}
              onToggle={(panel) => toggle(song.id, panel)}
              onArchive={() => run(() => archiveSong(song.id))}
              onUnarchive={() => run(() => unarchiveSong(song.id))}
              onReady={(ready) => run(() => setReadyToRelease(song.id, ready))}
              onRelease={() => onRelease(song.id)}
              onMix={() => onMix(song.id)}
              onNote={(note) => run(() => setVaultNote(song.id, note))}
              onRename={(title) => run(() => renameSong(song.id, title))}
              onSaveLyrics={(lyrics) => run(() => updateMasterLyrics(song.id, lyrics))}
              onSwapProduction={(producerId, beatId) =>
                run(() => swapProduction(song.id, producerId, beatId))
              }
              onRerecord={(payload) => {
                const res = rerecordSong(song.id, payload);
                setNotice(
                  res
                    ? {
                        ok: true,
                        text:
                          `Take ${(song.takeNumber ?? 1) + 1} of "${song.title}" is booked in for ` +
                          `${res.daysSpent} day${res.daysSpent > 1 ? 's' : ''}. ` +
                          `It lands on ${res.readyOn} — the earlier take is untouched.`,
                      }
                    : { ok: false, text: 'That session did not go through. Check your funds and your energy.' },
                );
                if (res) setOpen(null);
              }}
              onDelete={() => run(() => deleteSong(song.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ONE MASTER ───────────────────────────────────────────────────────────

function VaultRow({
  song,
  npcs,
  openPanel,
  onToggle,
  onArchive,
  onUnarchive,
  onReady,
  onRelease,
  onMix,
  onNote,
  onRename,
  onSaveLyrics,
  onSwapProduction,
  onRerecord,
  onDelete,
}: {
  song: Song;
  npcs: ReturnType<typeof useGameStore.getState>['npcs'];
  openPanel: Panel | null;
  onToggle: (panel: Panel) => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onReady: (ready: boolean) => void;
  onRelease: () => void;
  onMix: () => void;
  onNote: (note: string) => void;
  onRename: (title: string) => void;
  onSaveLyrics: (lyrics: string) => void;
  onSwapProduction: (producerId: string | null, beatId: string) => void;
  onRerecord: (payload: StudioSessionPayload) => void;
  onDelete: () => void;
}) {
  const [arranging, setArranging] = useState(false);
  const isArchived = !!song.archivedAt;
  const setScreen = useGameStore((st) => st.setScreen);
  const selectSong = useGameStore((st) => st.selectSong);
  const videos = useGameStore((st) => st.videos);
  const heldVideos = useMemo(() => (videos ?? []).filter((v) => v.isPlayer && v.songId === song.id && !v.removed), [videos, song.id]);
  const isMixed = song.masterStatus === 'mastered';
  const lineage = lineageLabel(song);
  /** Delete asks twice. Everything else on this row can be walked back. */
  const [confirmDelete, setConfirmDelete] = useState(false);

  // How many conversations about this record are still live, so the button
  // that opens them can say so instead of hiding them behind a click.
  const featureRequests = useGameStore((s) => s.featureRequests);
  const openNegotiations = featureRequests.filter(
    (r) =>
      r.songId === song.id &&
      (r.status === 'sent' || r.status === 'terms' || r.status === 'verse_ready'),
  ).length;

  return (
    <Card>
      {/* ── Headline: what it is, how good it is ───────────────────────── */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold truncate">{song.title}</span>
            {/* A working title is not a decision. Retitling is free and
                reversible while nobody has heard the record; once it is out
                the name is in other people's catalogues and this disappears. */}
            {!isReleased(song) && !isArchived ? (
              <button
                onClick={() => onToggle('title')}
                title="Rename this record"
                className={cn(
                  'text-[11px] shrink-0 transition-colors',
                  openPanel === 'title' ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400',
                )}
              >
                ✏️
              </button>
            ) : null}
            {lineage ? <Badge color="purple">{lineage}</Badge> : null}
            <Badge color={isMixed ? 'blue' : 'orange'}>{isMixed ? 'Mixed' : 'Rough'}</Badge>
            {song.readyToRelease ? <Badge color="green">★ Ready</Badge> : null}
            {song.archivedAt ? <Badge color="gray">Archived</Badge> : null}
            {song.featureArtistNames?.length ? (
              <Badge color="purple">ft. {song.featureArtistNames.join(', ')}</Badge>
            ) : null}
          </div>

          <div className="text-xs text-gray-500 mt-1">
            {song.genre.replace(/_/g, '-')}
            {song.bpm ? ` · ${song.bpm} BPM` : ''}
            {song.mood ? ` · ${song.mood.replace(/_/g, ' ')}` : ''}
            {` · ${song.producerName ? `prod. ${song.producerName}` : 'self-produced'}`}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
            <span className={cn('font-black text-lg', qualityTone(song.quality))}>
              {Math.round(song.quality)}
              <span className="text-xs font-normal text-gray-500"> / 100</span>
            </span>
            <span className="text-gray-500">{gradeLabel(song.quality)}</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500">
              Prod <span className="text-gray-300 font-mono">{Math.round(song.productionQuality ?? 0)}</span>
              {' · '}Lyrics <span className="text-gray-300 font-mono">{Math.round(song.lyricsQuality ?? 0)}</span>
              {' · '}Vocals <span className="text-gray-300 font-mono">{Math.round(song.vocalPerformance ?? 0)}</span>
            </span>
            {song.recordingCost ? (
              <span className="text-gray-600">· {money(song.recordingCost)} spent</span>
            ) : null}
            {/* Where it was cut. A room is a purchase the player made, and a
                master that does not say which one it came out of makes the
                whole gear system invisible the moment the session ends. */}
            {song.roomName ? (
              <span className="text-gray-600">· tracked in {song.roomName}</span>
            ) : null}
          </div>

          <p className="text-xs text-gray-400 mt-2 leading-snug">{describeScore(song.quality)}</p>

          {song.vaultNote ? (
            <p className="text-xs text-yellow-200/70 mt-2 bg-yellow-500/5 rounded-lg px-2 py-1.5 leading-snug">
              📝 {song.vaultNote}
            </p>
          ) : null}
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-800">
        {isArchived ? (
          <Button size="sm" variant="secondary" onClick={onUnarchive}>
            ↩️ Return to vault
          </Button>
        ) : (
          <>
            <ListenButton song={song} />
            <Button size="sm" variant="secondary" onClick={() => setArranging(true)}>🎛️ Arrange</Button>
            {arranging && <ArrangeDialog songId={song.id} onClose={() => setArranging(false)} />}
            {isMixed ? (
              <Button size="sm" variant="gold" onClick={onRelease}>
                🚀 Release
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={onMix}>
                🎚️ Send to Mix
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => { selectSong(song.id); setScreen('create_video'); }}>
              {heldVideos.length ? '🎬 Another video' : '🎬 Make a video'}
            </Button>
            {heldVideos.length > 0 && <span className="self-center text-[11px] text-green-400">✓ {heldVideos.length} video{heldVideos.length > 1 ? 's' : ''} shot · goes up with the record, or later from Videos</span>}
            <Button
              size="sm"
              variant={song.readyToRelease ? 'secondary' : 'secondary'}
              onClick={() => onReady(!song.readyToRelease)}
            >
              {song.readyToRelease ? '★ Clear ready flag' : '☆ Mark ready'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onToggle('lyrics')}
              className={openPanel === 'lyrics' ? 'ring-1 ring-yellow-500' : ''}
            >
              📝 Rewrite lyrics
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onToggle('production')}
              className={openPanel === 'production' ? 'ring-1 ring-yellow-500' : ''}
            >
              🎛️ Swap production
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onToggle('rerecord')}
              className={openPanel === 'rerecord' ? 'ring-1 ring-yellow-500' : ''}
            >
              🎙️ Re-record
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onToggle('note')}
              className={openPanel === 'note' ? 'ring-1 ring-yellow-500' : ''}
            >
              🗒️ Note
            </Button>
            {/* Editing and deleting. A master that was never released is still
                yours to change or throw away — that is the whole point of a
                vault. Once it is out, both of these disappear, because neither
                is possible in real life. */}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onToggle('feature')}
              className={openPanel === 'feature' ? 'ring-1 ring-yellow-500' : ''}
            >
              🎤 Add a feature
              {openNegotiations > 0 ? ` (${openNegotiations})` : ''}
            </Button>
            <Button size="sm" variant="danger" onClick={onArchive}>
              📦 Archive
            </Button>
            {/* Deleting is the one action here that cannot be undone, so it
                asks first. Archive is the reversible version and stays one
                click away next to it. */}
            {confirmDelete ? (
              <>
                <Button size="sm" variant="danger" onClick={onDelete}>
                  ⚠️ Yes, delete "{song.title}" for good
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>
                  Keep it
                </Button>
              </>
            ) : (
              <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
                🗑️ Delete
              </Button>
            )}
          </>
        )}
      </div>

      {/* ── Panels ─────────────────────────────────────────────────────── */}
      {openPanel === 'title' ? (
        <TitlePanel song={song} onSave={onRename} />
      ) : null}
      {openPanel === 'lyrics' ? (
        <LyricsPanel song={song} onSave={onSaveLyrics} />
      ) : null}
      {openPanel === 'production' ? (
        <ProductionPanel song={song} npcs={npcs} onSwap={onSwapProduction} />
      ) : null}
      {openPanel === 'rerecord' ? (
        <RerecordPanel song={song} npcs={npcs} onSubmit={onRerecord} />
      ) : null}
      {openPanel === 'note' ? <NotePanel song={song} onSave={onNote} /> : null}
      {openPanel === 'feature' ? <FeaturePanel song={song} npcs={npcs} /> : null}
    </Card>
  );
}

// ─── PANELS ───────────────────────────────────────────────────────────────

function PanelShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl bg-gray-900/60 border border-gray-800 p-3">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">{title}</div>
      {children}
    </div>
  );
}

function LyricsPanel({ song, onSave }: { song: Song; onSave: (lyrics: string) => void }) {
  const [draft, setDraft] = useState(song.lyrics ?? '');
  const changed = draft !== (song.lyrics ?? '');

  return (
    <PanelShell title="Rewrite the sheet">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={8}
        placeholder="[Verse]&#10;..."
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs font-mono leading-relaxed focus:outline-none focus:border-yellow-500"
      />
      <div className="flex items-center gap-3 mt-2">
        <Button size="sm" variant="gold" disabled={!changed} onClick={() => onSave(draft)}>
          Save the rewrite
        </Button>
        <span className="text-xs text-gray-500">
          {changed
            ? 'The lyric read moves with the writing, and a mixed master drops back to rough.'
            : 'Nothing has changed yet.'}
        </span>
      </div>
    </PanelShell>
  );
}

/**
 * Rename the record.
 *
 * Free, instant and reversible while the record is still yours — a working
 * title is not a decision, and "Untitled 3" is what most records are called
 * for most of their life.
 */
function TitlePanel({ song, onSave }: { song: Song; onSave: (title: string) => void }) {
  const [draft, setDraft] = useState(song.title);
  const clean = draft.trim().replace(/\s+/g, ' ');
  const changed = clean !== song.title && clean.length > 0;

  const submit = () => {
    if (changed) onSave(draft);
  };

  return (
    <PanelShell title="Rename this record">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') setDraft(song.title);
        }}
        maxLength={60}
        placeholder="Untitled 3"
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
      />
      <div className="flex items-center gap-3 mt-2">
        <Button size="sm" variant="gold" disabled={!changed} onClick={submit}>
          Save the new title
        </Button>
        <span className="text-xs text-gray-500">
          {clean.length === 0
            ? 'A record needs a name.'
            : changed
              ? `${clean.length}/60 · the feature letters and DMs follow the new name.`
              : 'Nothing has changed yet.'}
        </span>
      </div>
    </PanelShell>
  );
}

/**
 * Put somebody on the record.
 *
 * This panel used to be the bug. It had its own version of the answer — a
 * single hidden dice roll — so asking a stranger for a verse could drop them
 * onto the record instantly, for nothing, with no conversation and no money.
 * It now runs the same negotiation as the Studio's Features tab: the track
 * goes to their DMs, they take days to answer, and what comes back is a yes,
 * a price, a no, or silence.
 *
 * A verse is a favour, not a purchase, so the picker is ordered by the two
 * things that actually decide it — how well they know you, and whether you are
 * worth being seen with. The refusal is explained when it comes, so a "no"
 * reads as a person saying no rather than a button that did not work.
 */
function FeaturePanel({
  song,
  npcs,
}: {
  song: Song;
  npcs: ReturnType<typeof useGameStore.getState>['npcs'];
}) {
  const player = useGameStore((s) => s.player);
  const featureRequests = useGameStore((s) => s.featureRequests);
  const sendFeatureRequest = useGameStore((s) => s.sendFeatureRequest);
  const counterFeatureOffer = useGameStore((s) => s.counterFeatureOffer);
  const payFeatureFee = useGameStore((s) => s.payFeatureFee);
  const declineFeatureTerms = useGameStore((s) => s.declineFeatureTerms);
  const addFeatureVerse = useGameStore((s) => s.addFeatureVerse);

  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const requests = useMemo(
    () => featureRequests.filter((r) => r.songId === song.id && r.status !== 'added'),
    [featureRequests, song.id],
  );
  const sentIds = useMemo(() => new Set(requests.map((r) => r.npcId)), [requests]);

  const open = requests.filter(
    (r) => r.status === 'sent' || r.status === 'terms' || r.status === 'verse_ready',
  );
  const closed = requests.filter((r) => r.status === 'declined' || r.status === 'ignored');

  const handleSend = (npcId: string, npcName: string) => {
    const res = sendFeatureRequest(song.id, npcId);
    setNotice({ ok: res.ok, text: res.message || `Sent to ${npcName}.` });
  };

  const handleCounter = (requestId: string, offer: number) => {
    const res = counterFeatureOffer(requestId, offer);
    setNotice({ ok: res.ok, text: res.message });
  };

  return (
    <PanelShell title={`Get somebody on "${song.title}"`}>
      <p className="text-[11px] text-gray-500 mb-3 leading-snug">
        Nobody bolts onto a record at the click of a button. You send the track to
        their DMs and you wait — days, sometimes weeks. A price is an opening, not
        a verdict: push back and see how far they come. Currently on this record:{' '}
        {song.featureArtistNames?.length ? song.featureArtistNames.join(', ') : 'nobody'}.
      </p>

      {notice ? (
        <div
          className={cn(
            'flex gap-2 items-start rounded-xl px-3 py-2 text-[11px] leading-relaxed mb-3',
            notice.ok ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300',
          )}
        >
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)} className="text-gray-500 hover:text-white">
            ✕
          </button>
        </div>
      ) : null}

      {open.length > 0 && (
        <div className="space-y-2 mb-4">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">
            On the table
          </div>
          {open.map((r) => (
            <FeatureRequestRow
              key={r.id}
              request={r}
              money={player?.career.money ?? 0}
              energy={player?.energy ?? 0}
              onPay={(id, fee) => {
                const ok = payFeatureFee(id);
                setNotice({
                  ok,
                  text: ok
                    ? `Paid $${fee.toLocaleString()}. The verse is in — cut it into the record.`
                    : `You need $${fee.toLocaleString()} to cover that.`,
                });
              }}
              onDecline={(id) => {
                declineFeatureTerms(id);
                setNotice({ ok: true, text: 'You passed on the fee. No hard feelings — this time.' });
              }}
              onAdd={(id) => {
                const ok = addFeatureVerse(id);
                setNotice({
                  ok,
                  text: ok
                    ? `The verse is on "${song.title}". The record has been rescored.`
                    : 'That verse could not be cut in — check your energy, or whether it is already on the record.',
                });
              }}
              onCounter={handleCounter}
            />
          ))}
        </div>
      )}

      <FeaturePicker
        song={song}
        npcs={npcs}
        playerFame={player ? player.career.localFame : 0}
        playerCountry={player?.country ?? ''}
        sentIds={sentIds}
        onSend={handleSend}
      />

      {closed.length > 0 && (
        <div className="mt-4 border-t border-gray-800 pt-3 space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">
            Already answered
          </div>
          {closed.map((r) => (
            <div key={r.id} className="text-[11px] text-gray-500 leading-snug">
              <span className="text-gray-400 font-semibold">{r.npcName}</span> — {r.reason}
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

function NotePanel({ song, onSave }: { song: Song; onSave: (note: string) => void }) {
  const [draft, setDraft] = useState(song.vaultNote ?? '');
  return (
    <PanelShell title="A note to yourself">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={280}
        placeholder="Needs a better second verse before this goes anywhere."
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-yellow-500"
      />
      <div className="flex items-center gap-3 mt-2">
        <Button size="sm" variant="gold" onClick={() => onSave(draft)}>
          Save note
        </Button>
        <span className="text-xs text-gray-500">{draft.length}/280</span>
      </div>
    </PanelShell>
  );
}

function ProductionPanel({
  song,
  npcs,
  onSwap,
}: {
  song: Song;
  npcs: ReturnType<typeof useGameStore.getState>['npcs'];
  onSwap: (producerId: string | null, beatId: string) => void;
}) {
  const producers = useMemo<ProducerOption[]>(() => getProducerOptions(npcs), [npcs]);
  const [producerId, setProducerId] = useState<string | null>(song.producerId ?? null);
  const [beatId, setBeatId] = useState<string>(song.beatId ?? '');
  const [search, setSearch] = useState('');

  const selected = producerId ? producers.find((p) => p.id === producerId) ?? null : null;
  const beats = useMemo<BeatOption[]>(
    () => (selected ? getProducerBeats(selected.id, selected.skill) : getSelfProducedBeats()),
    [selected],
  );
  const beat = beats.find((b) => b.id === beatId) ?? beats[0] ?? null;

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? producers.filter((p) => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q))
      : producers;
    // `producers` is best-first; cheapest-first is the honest default for a
    // player who does not yet know what a session should cost.
    return [...list].reverse().slice(0, 24);
  }, [producers, search]);

  const cost = 450 + (selected ? producerFee(selected.skill) : 0);

  return (
    <PanelShell title="Swap the producer and the beat">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search producers…"
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs mb-2 focus:outline-none focus:border-yellow-500"
      />
      <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
        <button
          onClick={() => {
            setProducerId(null);
            setBeatId('');
          }}
          className={cn(
            'w-full text-left px-3 py-2 rounded-lg text-xs transition-colors',
            producerId === null ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700',
          )}
        >
          <div className="font-bold">Self-produced</div>
          <div className={producerId === null ? 'text-black/60' : 'text-gray-500'}>
            Your own beats · no fee
          </div>
        </button>
        {shown.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setProducerId(p.id);
              setBeatId('');
            }}
            className={cn(
              'w-full text-left px-3 py-2 rounded-lg text-xs transition-colors',
              producerId === p.id ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700',
            )}
          >
            <div className="flex justify-between gap-2">
              <span className="font-bold truncate">{p.name}</span>
              <span className="shrink-0 num">{money(producerFee(p.skill))}</span>
            </div>
            <div className={producerId === p.id ? 'text-black/60' : 'text-gray-500'}>
              {producerPriceBand(p.skill)} · skill {p.skill} · {p.country}
            </div>
          </button>
        ))}
      </div>

      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Beat</div>
      <div className="space-y-1 mb-3">
        {beats.map((b) => (
          <button
            key={b.id}
            onClick={() => setBeatId(b.id)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex justify-between gap-2',
              beat?.id === b.id ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700',
            )}
          >
            <span className="font-bold truncate">🎵 {b.name}</span>
            <span className={cn('shrink-0 font-mono', beat?.id === b.id ? 'text-black/60' : 'text-gray-500')}>
              {Math.round(b.quality)}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" variant="gold" onClick={() => beat && onSwap(producerId, beat.id)}>
          Re-track for {money(cost)}
        </Button>
        <span className="text-xs text-gray-500">
          {sessionEnergy(2)} energy · drops the record back to a rough master
        </span>
      </div>
    </PanelShell>
  );
}

function RerecordPanel({
  song,
  npcs,
  onSubmit,
}: {
  song: Song;
  npcs: ReturnType<typeof useGameStore.getState>['npcs'];
  onSubmit: (payload: StudioSessionPayload) => void;
}) {
  const producers = useMemo<ProducerOption[]>(() => getProducerOptions(npcs), [npcs]);

  const [title, setTitle] = useState(`${song.title} (Take ${(song.takeNumber ?? 1) + 1})`);
  const [bpm, setBpm] = useState(song.bpm ?? 95);
  const [mood, setMood] = useState<SongMood>(song.mood ?? 'defiant');
  const [effort, setEffort] = useState<1 | 2 | 3>(2);
  const [producerId, setProducerId] = useState<string | null>(song.producerId ?? null);
  const [beatId, setBeatId] = useState<string>(song.beatId ?? '');
  const [lyrics, setLyrics] = useState(song.lyrics ?? '');
  const [search, setSearch] = useState('');

  const selected = producerId ? producers.find((p) => p.id === producerId) ?? null : null;
  const beats = useMemo<BeatOption[]>(
    () => (selected ? getProducerBeats(selected.id, selected.skill) : getSelfProducedBeats()),
    [selected],
  );
  const beat = beats.find((b) => b.id === beatId) ?? beats[0] ?? null;

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? producers.filter((p) => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q))
      : producers;
    return [...list].reverse().slice(0, 16);
  }, [producers, search]);

  const cost = sessionCost(effort) + (selected ? producerFee(selected.skill) : 0);

  const submit = () =>
    onSubmit({
      title: title.trim() || song.title,
      genre: song.genre,
      bpm,
      mood,
      lyrics,
      // Vocals carry over: you are re-cutting the take, not re-learning to sing.
      vocals: song.vocalSettings ?? { ...VOCAL_DEFAULTS },
      effort,
      producerId,
      beatId: beat?.id ?? '',
    });

  return (
    <PanelShell title="Cut another take">
      <p className="text-xs text-gray-500 mb-3 leading-relaxed">
        This is a whole new session, priced and scored like one. It lands beside the original —
        nothing is replaced until you say so.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <label className="text-xs">
          <span className="block text-gray-500 mb-1">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-yellow-500"
          />
        </label>
        <label className="text-xs">
          <span className="block text-gray-500 mb-1">
            Tempo — {bpm} BPM ({bpmBandFor(bpm).label})
          </span>
          <input
            type="range"
            min={60}
            max={180}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-full accent-yellow-500"
          />
        </label>
      </div>

      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Mood</div>
      <div className="flex flex-wrap gap-1 mb-3">
        {MOODS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMood(m.id)}
            className={cn(
              'px-2 py-1 rounded-lg text-[11px] transition-colors',
              mood === m.id ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
            )}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Effort</div>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {EFFORT_OPTIONS.map((e) => (
          <button
            key={e.id}
            onClick={() => setEffort(e.id)}
            className={cn(
              'text-left px-2 py-1.5 rounded-lg text-[11px] transition-colors',
              effort === e.id ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
            )}
          >
            <div className="font-bold">
              {e.emoji} {e.label}
            </div>
            <div className={effort === e.id ? 'text-black/60' : 'text-gray-600'}>
              {e.days}d · {money(e.cost)}
            </div>
          </button>
        ))}
      </div>

      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Producer</div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search producers…"
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5 text-white text-xs mb-1.5 focus:outline-none focus:border-yellow-500"
      />
      <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
        <button
          onClick={() => {
            setProducerId(null);
            setBeatId('');
          }}
          className={cn(
            'w-full text-left px-2.5 py-1.5 rounded-lg text-[11px]',
            producerId === null ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-800 text-gray-300 hover:bg-gray-700',
          )}
        >
          Self-produced
        </button>
        {shown.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setProducerId(p.id);
              setBeatId('');
            }}
            className={cn(
              'w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] flex justify-between gap-2',
              producerId === p.id ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-800 text-gray-300 hover:bg-gray-700',
            )}
          >
            <span className="truncate">{p.name}</span>
            <span className="shrink-0 num">{money(producerFee(p.skill))}</span>
          </button>
        ))}
      </div>

      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Beat</div>
      <div className="space-y-1 mb-3">
        {beats.map((b) => (
          <button
            key={b.id}
            onClick={() => setBeatId(b.id)}
            className={cn(
              'w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] flex justify-between gap-2',
              beat?.id === b.id ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-800 text-gray-300 hover:bg-gray-700',
            )}
          >
            <span className="truncate">🎵 {b.name}</span>
            <span className={cn('shrink-0 font-mono', beat?.id === b.id ? 'text-black/60' : 'text-gray-500')}>
              {Math.round(b.quality)}
            </span>
          </button>
        ))}
      </div>

      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Lyrics</div>
      <textarea
        value={lyrics}
        onChange={(e) => setLyrics(e.target.value)}
        rows={6}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs font-mono leading-relaxed mb-3 focus:outline-none focus:border-yellow-500"
      />

      <div className="flex items-center gap-3">
        <Button size="sm" variant="gold" onClick={submit}>
          Cut take {(song.takeNumber ?? 1) + 1} for {money(cost)}
        </Button>
        <span className="text-xs text-gray-500">
          {sessionEnergy(effort)} energy · {sessionDays(effort)} day
          {sessionDays(effort) === 1 ? '' : 's'}
        </span>
      </div>
    </PanelShell>
  );
}
