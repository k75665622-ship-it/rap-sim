import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  useGameStore,
  blendedFame,
  isSongReleased,
  type StudioSessionResult,
  type MixResult,
} from '../../store/gameStore';
import { Card, Button, Badge } from '../ui/Card';
import { WorkInProgress } from '../ui/WorkInProgress';
import { FeaturePicker, FeatureRequestRow } from '../studio/FeatureShop';
import { cn } from '@/utils/cn';
import { crewBonuses } from '../../sim/roles';
import { MIN_PROJECT_TRACKS, PROJECT_TRACK_RULE, projectTypeLabel } from '../../sim/albums';
import { PLATFORM_LIST, PLATFORM_IDS } from '../../data/platforms';
import { platformWeights, platformReach, marketingPush } from '../../sim/streaming';
import { compact } from '@/utils/format';
import type { Genre, SongMood, VocalSettings, Song } from '../../types/game';
import {
  sessionEnergy,
  energyShortfallMessage,
  energyLabel,
  energyColor,
} from '../../sim/energy';
import {
  MOODS,
  VOCAL_LABELS,
  VOCAL_DEFAULTS,
  bpmBandFor,
  bpmFit,
  analyzeLyrics,
  getProducerOptions,
  getProducerBeats,
  getSelfProducedBeats,
  producerFee,
  producerPriceBand,
  describeProducerTier,
  describeScore,
  describeSplit,
  describeChemistry,
  describeDimension,
  describeCommercial,
  describeCritical,
  gradeLabel,
  scoreStudioSession,
  EFFORT_OPTIONS,
  type ProducerOption,
  type BeatOption,
} from '../../sim/studio';
import { GHOSTWRITERS, ghostwrite, ghostwriterById } from '../../sim/ghostwriter';
import {
  GEAR_SLOTS,
  RENTAL_ROOMS,
  gearProgress,
  gearToMaxCost,
  nextGearTier,
  roomById,
  roomLockReason,
  roomProductionBonus,
  roomSummary,
  type GearSlotId,
} from '../../sim/room';
import { StudioVault } from './StudioVault';
import { FeaturesPanel } from '../studio/FeaturesPanel';
import { GENRE_LIST, GENRE_BY_ID, FAMILY_LABEL, type GenreFamily } from '../../data/genres';
import { RemixDialog } from './RemixDialog';
import { Segmented } from '../ui/kit';
import { StudioHome } from '../studio/StudioHome';
import { BeatsPanel } from '../studio/BeatsPanel';
import { BuildingPanel } from '../studio/BuildingPanel';
import { buildingTier, gearBonus as ownedRoomBonus } from '../../sim/room';
import type { OwnedBeat } from '../../sim/beats';

/**
 * Remixing, from the room where records get made.
 *
 * The remix dialog already existed on a released song's own page, which is
 * where you would go if you already knew you wanted one. This is the other
 * direction: you are in the studio, you want something to work on, and the
 * records you already put out are the raw material. It is the same dialog —
 * one implementation, two doors, so the two can never disagree.
 */
function RemixPanel() {
  const songs = useGameStore((s) => s.songs);
  const [target, setTarget] = useState<Song | null>(null);

  const released = useMemo(
    () => songs.filter(isSongReleased).slice().reverse(),
    [songs],
  );

  if (released.length === 0) {
    return (
      <Card>
        <h3 className="font-bold text-white text-sm mb-2">Nothing to remix yet</h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          A remix is a new reading of something the world already knows. Put a
          record out first — then bring it back in here and take it apart.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 leading-relaxed">
        Rework something you have already released. The original keeps its own
        streams and its own chart history; the remix is a separate record that
        inherits the audience.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {released.map((s) => (
          <Card key={s.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-white text-sm truncate">{s.title}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {s.releaseDate ? `Out ${s.releaseDate}` : 'Released'} ·{' '}
                  {compact(s.totalStreams ?? 0)} streams
                </div>
                {s.featureArtistNames?.length ? (
                  <div className="mt-1">
                    <Badge color="purple">ft. {s.featureArtistNames.join(', ')}</Badge>
                  </div>
                ) : null}
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-black text-yellow-400 leading-none">
                  {Math.round(s.quality)}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Rated</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-800">
              <Button size="sm" variant="secondary" onClick={() => setTarget(s)}>
                🔁 Remix this
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {target ? <RemixDialog song={target} onClose={() => setTarget(null)} /> : null}
    </div>
  );
}

type Tab = 'lyrics' | 'beat' | 'vocals' | 'features' | 'mix';

const TABS: { id: Tab; label: string; emoji: string; hint: string }[] = [
  { id: 'lyrics', label: 'Lyrics', emoji: '📝', hint: 'Write it or hire it' },
  { id: 'beat', label: 'Sound', emoji: '🎛️', hint: 'Genre, tempo, producer' },
  { id: 'vocals', label: 'Vocals', emoji: '🎙️', hint: 'How you perform it' },
  { id: 'features', label: 'Features', emoji: '🤝', hint: 'Guests on the record' },
  { id: 'mix', label: 'Mix & book', emoji: '🎚️', hint: 'Final polish, then record' },
];

/** A labelled range slider, used for every vocal setting. */
function Slider({
  label, value, onChange, low, high, note,
}: {
  label: string; value: number; onChange: (v: number) => void;
  low: string; high: string; note: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-bold text-white uppercase tracking-wider">{label}</span>
        <span className="text-xs text-gray-500">
          {value < 34 ? low : value > 66 ? high : 'Balanced'}
        </span>
      </div>
      <input
        type="range" min="0" max="100" value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-yellow-500"
      />
      <p className="text-xs text-gray-600 mt-0.5">{note}</p>
    </div>
  );
}

/**
 * One negotiation, rendered by whatever state it is in.
 *
 * The whole point of this system is that the four outcomes FEEL different —
 * a fee you can pay, a yes you did not earn, a no with a reason, and silence.
 * So each state gets its own colour and its own verbs rather than a generic
 * "pending" row.
 */
/**
 * A qualitative bar. Deliberately shows no number — the point of the studio
 * read is that the player gets language, not a figure to optimise against.
 */
function ReadBar({ label, score, read }: { label: string; score: number; read: string }) {
  const pct = Math.max(3, Math.min(100, score));
  const color = score >= 74 ? 'bg-green-400' : score >= 50 ? 'bg-yellow-400' : 'bg-red-400';
  const text = score >= 74 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-bold text-white uppercase tracking-wider">{label}</span>
        <span className={`text-xs font-bold ${text}`}>{gradeLabel(score)}</span>
      </div>
      <div className="bg-gray-800 rounded-full h-1.5 mb-1">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-500 leading-snug">{read}</p>
    </div>
  );
}

/** One song in the catalog, with the actions its master status allows. */
function MasterCard({
  song, onMix, onRelease, onScrap,
}: {
  song: Song;
  onMix: (songId: string) => void;
  onRelease: (songId: string) => void;
  onScrap: (songId: string) => void;
}) {
  const isReleased = song.masterStatus === undefined || song.masterStatus === 'released';
  const isRecorded = song.masterStatus === 'recorded';
  const isMastered = song.masterStatus === 'mastered';

  return (
    <div className="bg-gray-800 rounded-xl p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <div className="text-white text-sm font-medium truncate">"{song.title}"</div>
          <div className="text-xs text-gray-500 truncate">
            {song.genre.replace('_', '-')}
            {song.bpm ? ` · ${song.bpm} BPM` : ''}
            {song.producerName ? ` · prod. ${song.producerName}` : ' · self-produced'}
          </div>
        </div>
        <Badge color={isReleased ? 'green' : isMastered ? 'blue' : 'orange'}>
          {isReleased ? 'Released' : isMastered ? 'Mastered' : 'Recorded'}
        </Badge>
      </div>

      {song.beatName && <div className="text-xs text-gray-600 mb-1">Beat: {song.beatName}</div>}

      {song.featureArtistNames && song.featureArtistNames.length > 0 && (
        <div className="text-xs text-purple-400 mb-1">ft. {song.featureArtistNames.join(', ')}</div>
      )}

      {!isReleased && (
        <p className="text-xs text-gray-400 leading-snug mb-2">
          {isRecorded
            ? 'Tracked but unmixed. It will sound rough until a producer finishes it.'
            : 'Mixed and mastered. Ready to go out.'}
        </p>
      )}

      {isReleased ? (
        <div className="grid grid-cols-2 gap-1 text-xs">
          <span className="text-gray-500">Weekly: <span className="text-white">{song.weeklyStreams.toLocaleString()}</span></span>
          <span className="text-gray-500">Total: <span className="text-white">{song.totalStreams.toLocaleString()}</span></span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mt-2">
          {isRecorded && (
            <Button size="sm" variant="secondary" onClick={() => onMix(song.id)}>
              🎚️ Send to Mix
            </Button>
          )}
          {isMastered && (
            <Button size="sm" variant="gold" onClick={() => onRelease(song.id)}>
              🚀 Release
            </Button>
          )}
          <Button size="sm" variant="danger" onClick={() => onScrap(song.id)}>
            Scrap
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * The room: what you own, and what you can hire.
 *
 * Two halves of one decision, on one screen, because they are the same question
 * asked twice — "what am I recording through?" A player who owns a good studio
 * should be able to see, in the rental column, that renting has stopped being
 * worth it; a player with nothing should be able to see that a $180 room is
 * within reach this week.
 *
 * Every price and every bonus comes from `sim/room.ts`. Nothing here does the
 * arithmetic — if this file and the store disagreed about what a room is worth,
 * the session button would promise one record and the store would make another.
 */
function RoomPanel({
  levels, money, onBuy, roomId, onPickRoom,
}: {
  levels: Record<string, number> | undefined;
  money: number;
  onBuy: (slotId: GearSlotId) => void;
  roomId: string | null;
  onPickRoom: (id: string | null) => void;
}) {
  const fame = useGameStore(s => (s.player ? blendedFame(s.player) : 0));
  const progress = gearProgress(levels);
  const toMax = gearToMaxCost(levels);
  const effective = roomProductionBonus(levels, roomId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
      {/* ── WHAT YOU OWN ─────────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-lg font-black text-white">Your studio</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Bought once, yours for every session after. Each slot is one purchase, and a
                better rung replaces the one below it — you own one microphone.
              </p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className="text-2xl font-black text-yellow-400">+{progress.bonus}</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500">production</div>
            </div>
          </div>

          {/* Progress, as a bar of slots rather than a percentage — five things
              you either have or you do not. */}
          <div className="flex gap-1 mt-3">
            {GEAR_SLOTS.map(slot => (
              <div
                key={slot.id}
                className={`h-1.5 flex-1 rounded-full ${levels?.[slot.id] ? 'bg-yellow-500' : 'bg-gray-800'}`}
              />
            ))}
          </div>
          <p className="text-gray-600 text-xs mt-2">
            {progress.owned} of {progress.slots} slots kitted
            {toMax > 0 && <> · ${toMax.toLocaleString()} to finish the room</>}
          </p>
        </Card>

        {GEAR_SLOTS.map(slot => {
          const level = levels?.[slot.id] ?? 0;
          const next = nextGearTier(slot.id, level);
          const owned = level ? slot.tiers.find(t => t.level === level) : undefined;
          const cap = buildingTier(levels).gearCap;
          const locked = next ? next.level > cap : false;
          const short = next ? money < next.price : false;
          return (
            <Card key={slot.id}>
              <div className="flex items-start gap-4">
                <div className="text-3xl leading-none mt-0.5">{slot.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-bold text-white">{slot.name}</h3>
                    {owned
                      ? <Badge color="yellow">{owned.name} · +{owned.bonus}</Badge>
                      : <Badge>Nothing owned</Badge>}
                  </div>
                  <p className="text-gray-500 text-xs mt-1">{slot.what}</p>

                  {next ? (
                    <div className="mt-3 rounded-xl bg-gray-800/60 border border-gray-800 p-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="text-sm text-white font-semibold">
                            {next.name}
                            <span className="text-yellow-400 font-black ml-2">
                              +{next.bonus}
                              {owned && <span className="text-gray-500 font-normal"> (from +{owned.bonus})</span>}
                            </span>
                          </div>
                          <p className="text-gray-500 text-xs mt-0.5">{next.blurb}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={short || locked ? 'secondary' : 'gold'}
                          disabled={short || locked}
                          onClick={() => onBuy(slot.id)}
                        >
                          {locked ? '🔒 Bigger room needed' : short ? `$${next.price.toLocaleString()}` : `Buy · $${next.price.toLocaleString()}`}
                        </Button>
                      </div>
                      {locked && (
                        <p className="text-orange-300/80 text-xs mt-2">
                          Your {buildingTier(levels).name.toLowerCase()} can't take this. Upgrade the building above.
                        </p>
                      )}
                      {!locked && short && (
                        <p className="text-red-400/80 text-xs mt-2">
                          ${(next.price - money).toLocaleString()} short.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-green-400 text-xs mt-2 font-semibold">
                      ✓ This slot is finished. Nothing better is sold.
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── WHAT YOU CAN HIRE ────────────────────────────────────────── */}
      <div className="space-y-4">
        <Card glow>
          <h2 className="text-sm font-black text-white uppercase tracking-wider mb-1">
            Recording through
          </h2>
          <p className="text-xs text-gray-400">{roomSummary(levels, roomId)}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-yellow-400">+{effective.bonus}</span>
            <span className="text-xs text-gray-500">production points</span>
          </div>
          {/* Gear and a rental do not stack, and the player has to be told why:
              a hired room is somebody else's gear, not an addition to yours. */}
          {effective.fromRoom > 0 && effective.fromGear > 0 && (
            <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
              Your own studio is worth +{effective.fromGear} and the hire is worth
              +{effective.fromRoom}. They do not add — you record through the better of
              the two, which is {effective.source === 'rental' ? 'the room you hired' : 'your own room'}.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-black text-white uppercase tracking-wider mb-3">
            Hire a room
          </h2>
          <div className="space-y-2">
            {/* The player's own studio is always an option, and always first —
                it is the free one and the one they built. */}
            <button
              onClick={() => onPickRoom(null)}
              className={`w-full text-left rounded-xl border p-3 transition-colors ${
                roomId === null
                  ? 'border-yellow-500/60 bg-yellow-500/10'
                  : 'border-gray-800 bg-gray-900 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">🏠 Your own room</span>
                <span className="text-xs text-gray-400">
                  {progress.bonus > 0 ? `+${progress.bonus}` : 'no bonus'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Free. Every session.</p>
            </button>

            {RENTAL_ROOMS.map(room => {
              const lock = roomLockReason(room, fame);
              const picked = roomId === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => onPickRoom(picked ? null : room.id)}
                  disabled={!!lock}
                  className={`w-full text-left rounded-xl border p-3 transition-colors ${
                    lock
                      ? 'border-gray-800 bg-gray-900 opacity-50 cursor-not-allowed'
                      : picked
                        ? 'border-yellow-500/60 bg-yellow-500/10'
                        : 'border-gray-800 bg-gray-900 hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white">
                      {room.emoji} {room.name}
                    </span>
                    <span className="text-xs text-yellow-400 font-black shrink-0">+{room.bonus}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">{room.blurb}</p>
                  <p className="text-[11px] mt-1 font-semibold text-gray-400">
                    ${room.price.toLocaleString()} <span className="font-normal text-gray-600">per session</span>
                  </p>
                  {lock && <p className="text-[11px] text-red-400/80 mt-1">{lock}</p>}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-600 mt-3 leading-relaxed">
            A hire is charged with the session, not stored — it is a booking, and it is over
            when the take is.
          </p>
        </Card>
      </div>
    </div>
  );
}

export function StudioScreen() {
  const player = useGameStore(s => s.player);
  const songs = useGameStore(s => s.songs);
  const npcs = useGameStore(s => s.npcs);
  const featureRequests = useGameStore(s => s.featureRequests);
  const createStudioSong = useGameStore(s => s.createStudioSong);
  const mixMasterSong = useGameStore(s => s.mixMasterSong);
  const releaseMaster = useGameStore(s => s.releaseMaster);
  const scrapMaster = useGameStore(s => s.scrapMaster);
  const sendFeatureRequest = useGameStore(s => s.sendFeatureRequest);
  const counterFeatureOffer = useGameStore(s => s.counterFeatureOffer);
  const payFeatureFee = useGameStore(s => s.payFeatureFee);
  const declineFeatureTerms = useGameStore(s => s.declineFeatureTerms);
  const addFeatureVerse = useGameStore(s => s.addFeatureVerse);
  const pendingFeatureNpcId = useGameStore(s => s.pendingFeatureNpcId);
  const setPendingFeatureNpc = useGameStore(s => s.setPendingFeatureNpc);
  const crew = useGameStore(s => s.crew);
  const studio = useGameStore(s => s.studio);
  const buyGear = useGameStore(s => s.buyGear);
  const money = useGameStore(s => s.player?.career.money ?? 0);
  const setScreen = useGameStore(s => s.setScreen);

  const [tab, setTab] = useState<Tab>('lyrics');
  // Three jobs live in this room: cutting a single, assembling a body of work
  // out of the singles you already have, and going back to something you
  // recorded and never put out.
  const [mode, setMode] = useState<'home' | 'single' | 'beats' | 'album' | 'room' | 'vault' | 'remix' | 'guest'>(() => (useGameStore.getState().consumeStudioMode() as 'guest' | null) ?? 'home');
  const featureDue = useGameStore((s) => s.inboundRequests.filter((r) => r.status === 'agreed').length + s.featureRequests.filter((r) => r.status === 'verse_ready').length);
  const [beatsView, setBeatsView] = useState<'library' | 'store' | 'order'>('library');
  /** A beat from the player's own library, when the session is cut over one. */
  const [libBeatId, setLibBeatId] = useState<string | null>(null);
  const beatsState = useGameStore(s => s.beats);
  /**
   * The room this session is being tracked in, when it is not the player's own.
   *
   * Held here rather than in the world because a rental is a booking, not an
   * asset — it is over when the take is, and it is paid for at the moment the
   * session is ordered.
   */
  const [roomId, setRoomId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState<Genre>(player?.genre ?? 'hip_hop');
  const [bpm, setBpm] = useState(95);
  const [mood, setMood] = useState<SongMood>('defiant');
  const [lyrics, setLyrics] = useState('');
  // A hired pen, when the player is not writing it themselves. The fee is
  // folded into the session cost, so hiring is decided here and paid at record.
  const [ghostwriterId, setGhostwriterId] = useState<string | null>(null);
  const [ghostTake, setGhostTake] = useState(0);
  const [vocals, setVocals] = useState<VocalSettings>({ ...VOCAL_DEFAULTS });
  const [effort, setEffort] = useState<1 | 2 | 3>(2);
  const [producerId, setProducerId] = useState<string | null>(null);
  const [beatId, setBeatId] = useState<string>('');
  // Features are negotiated AFTER a record exists, so the Features tab works
  // on a chosen master rather than on the draft being written.
  const [shopSongId, setShopSongId] = useState<string | null>(null);
  const [producerSearch, setProducerSearch] = useState('');
  // The roster holds thousands of producers, so only a window is shown. Which
  // window matters: sorted by skill you only ever see the most expensive names
  // in the world, which is how a newcomer ends up believing a session costs
  // $16,000. Cheapest-first is the honest default.
  const [producerSort, setProducerSort] = useState<'cheap' | 'best'>('cheap');
  const [featureSearch, setFeatureSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [featureNotice, setFeatureNotice] = useState<string | null>(null);
  /**
   * A thing that WENT RIGHT, kept apart from `error`.
   *
   * Buying gear is a five-figure decision and the screen has to confirm it
   * happened — an unacknowledged purchase looks exactly like a broken button.
   */
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<StudioSessionResult | null>(null);
  const [mixDialog, setMixDialog] = useState<string | null>(null);
  const [mixResult, setMixResult] = useState<MixResult | null>(null);
  const [releaseDialog, setReleaseDialog] = useState<string | null>(null);
  const [marketing, setMarketing] = useState(0);
  // Which platforms the record is delivered to. Everything, until the player
  // says otherwise — skipping a platform is a real decision, not a default.
  const [releasePlatforms, setReleasePlatforms] = useState<string[]>([...PLATFORM_IDS]);

  /**
   * The player arrived here from an artist's profile having pressed "Request a
   * feature". Honour the hand-off exactly once: open the Features tab with
   * that name already in the filter, then clear it. Without the clear, every
   * later visit to the Studio would silently re-filter the roster.
   */
  useEffect(() => {
    if (!pendingFeatureNpcId) return;
    const npc = npcs.find(n => n.id === pendingFeatureNpcId);
    setMode('single');
    setTab('features');
    setFeatureSearch(npc?.name ?? '');
    setPendingFeatureNpc(null);
  }, [pendingFeatureNpcId, npcs, setPendingFeatureNpc]);

  // ── Derived data ───────────────────────────────────────────────────────
  // The producer list is a full sort over every producer on the roster, so it
  // is memoised against `npcs` rather than recomputed on every slider drag.
  const producers = useMemo<ProducerOption[]>(() => getProducerOptions(npcs), [npcs]);

  const selectedProducer = useMemo(
    () => producers.find(p => p.id === producerId) ?? null,
    [producers, producerId],
  );

  const beats = useMemo<BeatOption[]>(
    () => (selectedProducer
      ? getProducerBeats(selectedProducer.id, selectedProducer.skill)
      : getSelfProducedBeats()),
    [selectedProducer],
  );

  const selectedBeat = beats.find(b => b.id === beatId) ?? beats[0];

  // The library beat, if one is chosen — already paid for, and it names its maker.
  const libBeat = useMemo(
    () => (libBeatId ? (beatsState?.library ?? []).find(b => b.id === libBeatId && !b.usedOnSongId) ?? null : null),
    [libBeatId, beatsState],
  );
  const libSkill = libBeat
    ? ((crew ?? []).find(c => c.npcId === libBeat.producerId)?.skill
      ?? producers.find(p => p.id === libBeat.producerId)?.skill
      ?? libBeat.quality)
    : null;
  const readyBeats = useMemo(
    () => (beatsState?.library ?? []).filter(b => !b.usedOnSongId).slice().sort((a, b) => b.quality - a.quality),
    [beatsState],
  );

  // The artist pool for the feature picker now lives in the shared
  // `FeaturePicker`, because the Vault needed the same list and a second copy
  // is how the two screens drifted apart in the first place.

  const filteredProducers = useMemo(() => {
    const q = producerSearch.trim().toLowerCase();
    const list = q
      ? producers.filter(p => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q))
      : producers;
    // `producers` arrives sorted best-first from getProducerOptions().
    const sorted = producerSort === 'cheap' ? [...list].reverse() : list;
    return sorted.slice(0, 40);
  }, [producers, producerSearch, producerSort]);

  const lyricAnalysis = useMemo(() => analyzeLyrics(lyrics), [lyrics]);

  // Live read. `scoreStudioSession` is deterministic — it contains no
  // randomness — so this preview is exactly what recording will produce.
  // That is deliberate: the read should be honest, not a teaser.
  //
  // A record is tracked SOLO. Anyone else ends up on it through negotiation,
  // which is why no features are passed here.
  //
  // An empty session is not a bad song, it is no song, so it gets its own
  // prompt rather than being scored as though the player had tried and failed.
  const isBlankSession = !lyrics.trim() && !title.trim();

  const preview = useMemo(() => {
    if (!player) return null;
    return scoreStudioSession({
      stats: player.stats,
      lyrics,
      genre,
      bpm,
      mood,
      vocals,
      producerSkill: libBeat ? libSkill : selectedProducer ? selectedProducer.skill : null,
      beatQuality: libBeat ? libBeat.quality : selectedBeat?.quality ?? 50,
      features: [],
      effort,
      // Same number the store will use when it records the master. The preview
      // is a promise about the record, so it has to be computed the same way.
      crewProductionBonus: crewBonuses(crew).productionBonus,
      // The room. Taken from the same `roomProductionBonus` the store calls, so
      // a rented room that beats the player's own gear replaces it here exactly
      // as it will on the master — and a preview that forgot the room would
      // under-promise the record by the price of the booking.
      studioBonus: roomProductionBonus(studio?.levels, roomId).bonus,
    });
  }, [player, lyrics, genre, bpm, mood, vocals, selectedProducer, selectedBeat, effort, crew, studio, roomId, libBeat, libSkill]);

  // ── What the payroll does to this session ─────────────────────────────
  // The same fold the store will use when it records the master. An engineer
  // shortens the booking and a producer on the payroll waives their fee, so
  // the preview has to show the session the player will actually get — a
  // preview computed from the raw table would promise a cost the store then
  // contradicts.
  const crewFx = useMemo(() => crewBonuses(crew), [crew]);
  const inHouseProducer = useMemo(
    () => (crew ?? []).find(c => c.role === 'producer'),
    [crew],
  );
  const usingInHouseProducer = !!(
    selectedProducer && inHouseProducer && selectedProducer.id === inHouseProducer.npcId
  );

  const studioTime = Math.round(EFFORT_OPTIONS.find(e => e.id === effort)!.cost * crewFx.sessionCost);
  const sessionLength = Math.max(
    1,
    Math.round(EFFORT_OPTIONS.find(e => e.id === effort)!.days * crewFx.sessionSpeed),
  );
  const producerCost = !libBeat && selectedProducer && !usingInHouseProducer
    ? producerFee(selectedProducer.skill)
    : 0;
  const ghostwriterCost = ghostwriterId ? (ghostwriterById(ghostwriterId)?.fee ?? 0) : 0;
  // The room, when one was hired for this session. Added here for exactly the
  // same reason as the producer's fee: the button has to promise the price the
  // store will actually charge, or the player is billed for something the
  // screen never showed them.
  const selectedRoom = roomById(roomId);
  const roomFee = selectedRoom?.price ?? 0;
  const totalCost = studioTime + producerCost + ghostwriterCost + roomFee;
  const canAfford = (player?.career.money ?? 0) >= totalCost;
  // ── Feature negotiation view data ──────────────────────────────────────
  // Only your own unreleased material can be shopped around.
  const shopEligible = useMemo(
    () => songs.filter(s => s.masterStatus !== undefined && s.masterStatus !== 'released').slice().reverse(),
    [songs],
  );
  const shopSong = useMemo(
    () => shopEligible.find(s => s.id === shopSongId) ?? shopEligible[0] ?? null,
    [shopEligible, shopSongId],
  );
  const requestsForSong = useMemo(
    () => (shopSong ? featureRequests.filter(r => r.songId === shopSong.id) : []),
    [featureRequests, shopSong],
  );
  const requestedIds = useMemo(
    () => new Set(requestsForSong.map(r => r.npcId)),
    [requestsForSong],
  );
  const activeRequests = useMemo(
    () => featureRequests.filter(
      r => r.status === 'sent' || r.status === 'terms' || r.status === 'verse_ready',
    ),
    [featureRequests],
  );

  const masters = useMemo(
    () => songs.filter(s => s.masterStatus !== undefined).slice().reverse(),
    [songs],
  );

  // Only masters the player can actually act on. An archived master is still
  // unmixed, but it is not "waiting" for anything — counting it made the
  // header nag about a record the vault had already put away.
  const unmixedCount = masters.filter(
    s => s.masterStatus === 'recorded' && !s.archivedAt,
  ).length;

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleRecord = useCallback(() => {
    if (!title.trim()) {
      setError('Give the track a title before you record it.');
      setTab('lyrics');
      return;
    }
    if (!lyrics.trim()) {
      setError('There are no lyrics on the page. Write something, even a rough verse.');
      setTab('lyrics');
      return;
    }
    if (!canAfford) {
      setError(
        `This session costs $${totalCost.toLocaleString()} and you have ` +
        `$${Math.floor(player?.career.money ?? 0).toLocaleString()}. ` +
        `Drop to a cheaper effort level or pick a cheaper producer.`,
      );
      return;
    }
    if ((player?.energy ?? 0) < sessionEnergy(effort)) {
      setError(energyShortfallMessage(sessionEnergy(effort), player?.energy ?? 0));
      return;
    }
    setError(null);

    const res = createStudioSong({
      title: title.trim(),
      genre,
      bpm,
      mood,
      lyrics,
      vocals,
      effort,
      producerId: selectedProducer?.id ?? null,
      beatId: selectedBeat?.id ?? '',
      ghostwriterId,
      // The booking travels with the session and is charged at the same moment,
      // so the record is stamped with the room it was actually cut in.
      roomId,
      libraryBeatId: libBeat?.id ?? null,
    });

    if (!res) {
      setError('The session did not go through. Check your funds and your energy.');
      return;
    }

    setResult(res);
    // The beat is on this record now.
    setLibBeatId(null);
    // Clear the sheet for the next one but keep the session settings, so
    // recording a second song does not mean redoing the whole setup.
    setTitle('');
    setLyrics('');
    setTab('lyrics');
  }, [
    title, lyrics, canAfford, totalCost, player, createStudioSong,
    genre, bpm, mood, vocals, effort, selectedProducer, selectedBeat, roomId, libBeat,
  ]);

  /** Take a beat from the library into a new session, set up to fit it. */
  const pickLibraryBeat = useCallback((b: OwnedBeat) => {
    setLibBeatId(b.id);
    setGenre(b.genre);
    setBpm(b.bpm);
    setMood(b.mood);
    setProducerId(null);
    setBeatId('');
    if (b.forTitle) setTitle(t => t || b.forTitle!);
    setMode('single');
    setTab('beat');
    setNotice(`"${b.name}" is loaded. Genre, tempo and mood are set to match it.`);
  }, []);

  // ── Feature negotiation handlers ───────────────────────────────────────
  const handleShop = useCallback((npcId: string, npcName: string) => {
    if (!shopSong) {
      setError('Record something first — there is nothing to send out.');
      return;
    }
    // The store is the only thing that decides whether a send is allowed, and
    // it says why when it refuses. Re-checking energy here first would mean two
    // places could disagree about the same rule.
    const res = sendFeatureRequest(shopSong.id, npcId);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setError(null);
    setFeatureNotice(res.message || `Sent "${shopSong.title}" to ${npcName}.`);
  }, [shopSong, sendFeatureRequest]);

  const handleCounter = useCallback((requestId: string, offer: number) => {
    const res = counterFeatureOffer(requestId, offer);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setError(null);
    setFeatureNotice(res.message);
  }, [counterFeatureOffer]);

  const handlePay = useCallback((requestId: string, fee: number) => {
    const ok = payFeatureFee(requestId);
    if (!ok) {
      setError(`You need $${fee.toLocaleString()} to cover that.`);
      return;
    }
    setError(null);
    setFeatureNotice('Paid. The verse is in — cut it into the record.');
  }, [payFeatureFee]);

  const handleAddVerse = useCallback((requestId: string) => {
    const ok = addFeatureVerse(requestId);
    if (!ok) {
      setError('That verse could not be cut in. It may already be on the record.');
      return;
    }
    setError(null);
    setFeatureNotice('The verse is on the record. The read has been updated.');
  }, [addFeatureVerse]);

  const confirmMix = useCallback((pid: string) => {
    if (!mixDialog) return;
    const res = mixMasterSong(mixDialog, pid);
    setMixDialog(null);
    if (!res) {
      setError('That mix session could not go ahead — check your funds.');
      return;
    }
    setMixResult(res);
  }, [mixDialog, mixMasterSong]);

  const confirmRelease = useCallback(() => {
    if (!releaseDialog) return;
    // An explicit list is only stored when the player actually skipped
    // something. Delivering everywhere is the default and stays `undefined`,
    // which is also what every record already in the world carries.
    const ids = releasePlatforms.length === PLATFORM_LIST.length ? undefined : releasePlatforms;
    releaseMaster(releaseDialog, marketing, ids);
    setReleaseDialog(null);
  }, [releaseDialog, releaseMaster, marketing, releasePlatforms]);

  // How much of the world's listening the chosen delivery list actually
  // reaches. Computed from the engine's own platform weights rather than a
  // hand-written table, so the number in the dialog is the number the release
  // will earn against. Must sit above the early return — hooks cannot be
  // conditional.
  const releaseReach = useMemo(() => {
    if (!player || !releaseDialog) return 1;
    const song = songs.find(s => s.id === releaseDialog);
    if (!song) return 1;
    const weights = platformWeights(
      {
        quality: song.quality,
        genre: song.genre,
        homeCountry: player.country,
        artistPopularity: blendedFame(player),
        fanbase: player.career.fanbase,
        marketing: marketingPush(marketing),
        videoViews: 0,
        isNpc: false,
        weeksOut: 0,
      },
      0,
    );
    return platformReach(releasePlatforms, weights);
  }, [player, songs, releaseDialog, releasePlatforms, marketing]);

  if (!player) return null;

  const bpmBand = bpmBandFor(bpm);
  const bpmFitness = bpmFit(bpm, genre);
  const mixSong = mixDialog ? songs.find(s => s.id === mixDialog) : null;
  const releaseSong = releaseDialog ? songs.find(s => s.id === releaseDialog) : null;

  const tierNow = buildingTier(studio?.levels);
  const readyCount = readyBeats.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold text-ink leading-tight">Studio</h1>
          <div className="text-[13px] text-ink2 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{tierNow.emoji} {tierNow.name}</span>
            <span className="text-ink3">·</span>
            <span className="text-amber">+{ownedRoomBonus(studio?.levels)} production</span>
            {unmixedCount > 0 && <><span className="text-ink3">·</span><button onClick={() => setMode('vault')} className="text-orange-300 hover:underline">{unmixedCount} master{unmixedCount > 1 ? 's' : ''} to mix</button></>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" onClick={() => setScreen('create_video')}>📹 Shoot a video</Button>
          <Button onClick={() => setMode('single')}>🎙️ New song</Button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <Segmented
          value={mode}
          onChange={(m) => setMode(m)}
          options={[
            { id: 'home', label: 'Home' },
            { id: 'single', label: 'Record' },
            { id: 'beats', label: 'Beats', badge: readyCount ? String(readyCount) : undefined },
            { id: 'vault', label: 'Masters', badge: unmixedCount ? String(unmixedCount) : undefined },
            { id: 'guest', label: 'Features', badge: featureDue ? String(featureDue) : undefined },
            { id: 'album', label: 'Projects' },
            { id: 'room', label: 'My studio' },
            { id: 'remix', label: 'Remix' },
          ]}
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-[12px] px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-[12px] px-4 py-3 text-sm text-green-300 flex items-center justify-between gap-4">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-green-500/70 hover:text-green-300 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {mode === 'home' ? (
        <StudioHome
          go={(to) => {
            if (to === 'order') { setBeatsView('order'); setMode('beats'); return; }
            if (to === 'beats') setBeatsView('library');
            setMode(to);
          }}
          onUseBeat={pickLibraryBeat}
        />
      ) : mode === 'beats' ? (
        <BeatsPanel key={beatsView} initialView={beatsView} onUseBeat={pickLibraryBeat} />
      ) : mode === 'album' ? (
        <ProjectBuilder />
      ) : mode === 'room' ? (
        <div className="space-y-6">
        <BuildingPanel onFlash={(r) => { if (r.ok) { setNotice(r.message); setError(null); } else { setError(r.message); } }} />
        <RoomPanel
          levels={studio?.levels}
          money={money}
          onBuy={slotId => {
            const res = buyGear(slotId);
            // Refusals are shown, never swallowed — a five-figure purchase that
            // silently does nothing is the worst button in the game.
            setError(res.ok ? null : res.message);
            if (res.ok) setNotice(res.message);
          }}
          roomId={roomId}
          onPickRoom={setRoomId}
        />
        </div>
      ) : mode === 'vault' ? (
        <StudioVault onRelease={setReleaseDialog} onMix={setMixDialog} />
      ) : mode === 'remix' ? (
        <RemixPanel />
      ) : mode === 'guest' ? (
        <FeaturesPanel />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 pb-24 lg:pb-0">
        {/* ── EDITOR ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* On a phone the live read sits on top, where you can see it. */}
          {preview && (
            <div className="lg:hidden rounded-[16px] border border-line bg-card p-4 flex items-center gap-4" style={{ background: 'linear-gradient(120deg, rgba(245,179,1,0.10), transparent 70%)' }}>
              <div className="relative w-16 h-16 shrink-0">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90"><circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" /><circle cx="18" cy="18" r="15.5" fill="none" stroke={isBlankSession ? '#3A3D48' : preview.quality >= 74 ? '#2ECC71' : preview.quality >= 50 ? '#F5B301' : '#FF5C5C'} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${isBlankSession ? 0 : Math.round(preview.quality) * 0.974} 100`} /></svg>
                <div className="absolute inset-0 flex items-center justify-center text-[18px] font-black text-ink">{isBlankSession ? '–' : Math.round(preview.quality)}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-wider text-ink3">Live read</div>
                <div className="text-[14px] font-semibold text-ink leading-snug">{isBlankSession ? 'Write something to get a read' : describeScore(preview.quality)}</div>
                <div className="text-[11px] text-ink3 mt-0.5">${totalCost.toLocaleString()} · {sessionLength}d · ⚡{sessionEnergy(effort)}</div>
              </div>
            </div>
          )}
          {/* Sticky on a phone: the price and the button, always in reach. */}
          {error && <div className="lg:hidden fixed bottom-[64px] inset-x-3 z-40 rounded-[12px] bg-fall/90 text-white text-[12px] px-3 py-2 shadow-lg" onClick={() => setError(null)}>{error}</div>}
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-[#0A0B10]/95 backdrop-blur px-4 py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-ink truncate">{title.trim() || 'Untitled'} · <span className={cn(isBlankSession ? 'text-ink3' : preview && preview.quality >= 74 ? 'text-rise' : preview && preview.quality >= 50 ? 'text-amber' : 'text-fall')}>{isBlankSession || !preview ? '—' : `${Math.round(preview.quality)}`}</span></div>
              <div className="text-[11px] text-ink3">${totalCost.toLocaleString()} · {sessionLength} day{sessionLength === 1 ? '' : 's'} · ⚡{sessionEnergy(effort)}</div>
            </div>
            {tab !== 'mix' && <button onClick={() => setTab(TABS[Math.min(TABS.length - 1, TABS.findIndex((x) => x.id === tab) + 1)].id)} className="h-10 px-3 rounded-[10px] border border-line text-[13px] text-ink2">Next →</button>}
            <button onClick={handleRecord} disabled={!canAfford} className="h-10 px-4 rounded-[10px] bg-amber text-black text-[13px] font-bold disabled:opacity-40">Book</button>
          </div>
          <Card>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Track Title</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition-colors"
                placeholder="What are you calling this one?"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            {/* ── The record sheet: what this record is, at a glance ── */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                {GENRE_BY_ID[genre]?.emoji} {GENRE_BY_ID[genre]?.label ?? genre}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-800 text-gray-300">{bpm} BPM</span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-800 text-gray-300 capitalize">{mood}</span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-800 text-gray-300">
                {libBeat ? `Beat: ${libBeat.name} · prod. ${libBeat.producerName}` : selectedProducer ? `Prod. ${selectedProducer.name}` : 'Self-produced'}
              </span>
            </div>

            {/* ── The steps ── */}
            <div className="flex gap-1.5 mb-5 overflow-x-auto -mx-1 px-1 snap-x">
              {TABS.map((t, i) => {
                const active = tab === t.id;
                const done = TABS.findIndex(x => x.id === tab) > i;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`group text-left rounded-xl px-2.5 py-2 border transition-all shrink-0 min-w-[118px] flex-1 snap-start ${
                      active
                        ? 'bg-yellow-500/15 border-yellow-500/70'
                        : done
                          ? 'bg-gray-900 border-green-500/30 hover:border-green-500/60'
                          : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                        active ? 'bg-yellow-500 text-black' : done ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {done ? '✓' : i + 1}
                      </span>
                      <span className={`text-xs font-bold truncate ${active ? 'text-yellow-300' : 'text-gray-300'}`}>
                        {t.emoji} {t.label}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 truncate pl-5">{t.hint}</div>
                  </button>
                );
              })}
            </div>

            {/* ── LYRICS ── */}
            {tab === 'lyrics' && (
              <div className="space-y-3">
                <textarea
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition-colors font-mono text-sm leading-relaxed"
                  rows={14}
                  placeholder={'[Verse]\nWrite your bars here...\n\n[Hook]\n...'}
                  value={lyrics}
                  onChange={e => { setLyrics(e.target.value); setGhostwriterId(null); }}
                />
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-gray-500">{lyricAnalysis.words} words</span>
                  <span className="text-gray-500">{lyricAnalysis.lines} lines</span>
                  {lyricAnalysis.words > 0 && (
                    <span className="text-gray-500">
                      {Math.round(lyricAnalysis.uniqueRatio * 100)}% unique words
                    </span>
                  )}
                  {ghostwriterId && (
                    <span className="text-purple-300">
                      ✍️ {ghostwriterById(ghostwriterId)?.name} wrote this
                    </span>
                  )}
                  <span className="text-gray-400 italic ml-auto">{lyricAnalysis.note}</span>
                </div>

                {/* ── Hire a pen ─────────────────────────────────────────── */}
                <div className="border-t border-gray-800 pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
                    <label className="text-xs text-gray-400 uppercase tracking-wider shrink-0">
                      ✍️ Ghostwriter
                    </label>
                    <span className="text-xs text-gray-600">
                      Their sheet is theirs — your lyricism does not cap it
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {GHOSTWRITERS.map(w => {
                      const affordable = player.career.money >= w.fee;
                      const picked = ghostwriterId === w.id;
                      return (
                        <button
                          key={w.id}
                          onClick={() => {
                            setGhostwriterId(w.id);
                            setGhostTake(t => t + 1);
                            setLyrics(ghostwrite({
                              writerId: w.id,
                              mood,
                              genre,
                              title: title || 'Untitled',
                              take: ghostTake + 1,
                            }));
                          }}
                          disabled={!affordable}
                          className={`text-left p-2.5 rounded-xl transition-all ${
                            picked
                              ? 'bg-purple-500/20 border border-purple-400'
                              : affordable
                                ? 'bg-gray-800 border border-gray-700 hover:border-purple-500/60'
                                : 'bg-gray-800/50 border border-gray-800 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-white truncate">{w.name}</span>
                            <span className={`text-xs shrink-0 ${affordable ? 'text-yellow-500' : 'text-red-400'}`}>
                              ${w.fee.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 leading-tight mt-1">{w.blurb}</div>
                          <div className="text-[11px] text-purple-300/80 leading-tight mt-1">{w.pitch}</div>
                        </button>
                      );
                    })}
                  </div>
                  {ghostwriterId && (
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-600">
                        Written by {ghostwriterById(ghostwriterId)?.name}. Read it, change it, or
                        leave it — it is on the record either way.
                      </p>
                      <button
                        onClick={() => {
                          setGhostTake(t => t + 1);
                          setLyrics(ghostwrite({
                            writerId: ghostwriterId,
                            mood,
                            genre,
                            title: title || 'Untitled',
                            take: ghostTake + 1,
                          }));
                        }}
                        className="text-xs text-purple-300 hover:text-purple-200 shrink-0 ml-2"
                      >
                        ↻ Another take
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── BEAT ── */}
            {tab === 'beat' && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="text-xs text-gray-400 uppercase tracking-wider">Genre</label>
                    <span className="text-[11px] text-gray-500">{GENRE_BY_ID[genre]?.blurb}</span>
                  </div>
                  <div className="space-y-3">
                    {(['rap', 'sung', 'groove', 'live'] as GenreFamily[]).map(fam => (
                      <div key={fam}>
                        <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">{FAMILY_LABEL[fam]}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {GENRE_LIST.filter(g => g.family === fam).map(g => (
                            <button
                              key={g.id}
                              onClick={() => { setGenre(g.id); setBpm(g.bpm); }}
                              title={g.blurb}
                              className={`px-3 py-1.5 rounded-full text-xs transition-all flex items-center gap-1.5 ${
                                genre === g.id
                                  ? 'bg-yellow-500 text-black font-bold shadow shadow-yellow-500/30'
                                  : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-yellow-500/50'
                              }`}
                            >
                              <span>{g.emoji}</span>{g.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <label className="text-xs text-gray-400 uppercase tracking-wider">Tempo</label>
                    <span className="text-xs text-white font-bold">{bpm} BPM · {bpmBand.label}</span>
                  </div>
                  <input
                    type="range" min="60" max="180" value={bpm}
                    onChange={e => setBpm(Number(e.target.value))}
                    className="w-full accent-yellow-500"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                    <span>60</span><span>180</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {bpmBand.note}{' '}
                    {bpmFitness < 0.8
                      ? <span className="text-orange-400">This tempo fights the genre.</span>
                      : <span className="text-green-400">Sits right for {genre.replace('_', '-')}.</span>}
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Mood</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {MOODS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setMood(m.id)}
                        className={`p-3 rounded-xl text-left transition-all ${
                          mood === m.id
                            ? 'bg-yellow-500/20 border border-yellow-500 text-white'
                            : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <div className="text-sm">{m.emoji} <span className="text-xs font-bold">{m.label}</span></div>
                        <div className="text-[11px] text-gray-500 leading-snug mt-1">{m.blurb}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs text-gray-400 uppercase tracking-wider">Your beats</label>
                    <button onClick={() => { setBeatsView('store'); setMode('beats'); }} className="text-[11px] text-yellow-400 hover:text-yellow-300">Beat store →</button>
                  </div>
                  {readyBeats.length === 0 ? (
                    <p className="text-xs text-gray-500 mb-1">No beats in your library. Your producer or engineer sends them weekly, or buy one in the store.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {readyBeats.slice(0, 6).map(b => (
                        <button
                          key={b.id}
                          onClick={() => (libBeatId === b.id ? setLibBeatId(null) : pickLibraryBeat(b))}
                          className={`p-2.5 rounded-xl text-left transition-all ${
                            libBeatId === b.id ? 'bg-yellow-500/20 border border-yellow-500' : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white truncate">🎵 {b.name}</span>
                            <span className="text-xs text-yellow-500 shrink-0">{b.quality}</span>
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">{b.producerName} · {b.bpm} BPM · {b.license === 'inhouse' ? 'your team' : b.license}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {libBeat && (
                    <p className="text-xs text-green-400 mt-2">Cutting over "{libBeat.name}" — already paid for, no producer fee. Tap it again to pick a producer instead.</p>
                  )}
                </div>

                {!libBeat && (<>
                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Producer</label>
                  <button
                    onClick={() => { setProducerId(null); setBeatId(''); }}
                    className={`w-full text-left p-3 rounded-xl mb-2 transition-all ${
                      producerId === null
                        ? 'bg-yellow-500/20 border border-yellow-500'
                        : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-bold text-white">🎹 Produce it yourself</div>
                    <div className="text-xs text-gray-500">Free, but your own beats cap how good this can sound.</div>
                  </button>

                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 text-sm mb-2"
                    placeholder="Search producers by name or country..."
                    value={producerSearch}
                    onChange={e => setProducerSearch(e.target.value)}
                  />

                  <div className="flex gap-1 mb-2">
                    {([
                      ['cheap', '💸 Cheapest first'],
                      ['best', '🏆 Best first'],
                    ] as const).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setProducerSort(id)}
                        className={`flex-1 text-xs px-2 py-1.5 rounded-lg transition-all ${
                          producerSort === id
                            ? 'bg-yellow-500/20 border border-yellow-500 text-white'
                            : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                    {filteredProducers.map(p => {
                      const fee = producerFee(p.skill);
                      const affordable = player.career.money >= fee + studioTime;
                      return (
                        <button
                          key={p.id}
                          onClick={() => { setProducerId(p.id); setBeatId(''); }}
                          disabled={!affordable}
                          className={`w-full text-left p-2.5 rounded-xl transition-all ${
                            producerId === p.id
                              ? 'bg-yellow-500/20 border border-yellow-500'
                              : affordable
                              ? 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                              : 'bg-gray-800/50 border border-gray-800 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-white font-medium truncate">{p.name}</span>
                            <span className={`text-xs shrink-0 ${affordable ? 'text-yellow-500' : 'text-red-400'}`}>
                              ${fee.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            <span className="text-gray-400">{producerPriceBand(p.skill)}</span> · {p.country} · {p.tier}
                          </div>
                        </button>
                      );
                    })}
                    {filteredProducers.length === 0 && (
                      <p className="text-xs text-gray-600 text-center py-3">No producers match that.</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    {producerSort === 'cheap'
                      ? 'Showing the most affordable sessions on the board. Search a name to find anyone specific.'
                      : 'Showing the best in the world — and what they cost.'}
                  </p>
                </div>

                {selectedProducer && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">
                      Beat from {selectedProducer.name}
                    </label>
                    <p className="text-xs text-gray-500 mb-2">{describeProducerTier(selectedProducer.skill)}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {beats.map(b => (
                        <button
                          key={b.id}
                          onClick={() => setBeatId(b.id)}
                          className={`p-2.5 rounded-xl text-left transition-all ${
                            selectedBeat?.id === b.id
                              ? 'bg-yellow-500/20 border border-yellow-500'
                              : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <div className="text-xs font-bold text-white truncate">🎵 {b.name}</div>
                          <div className="text-xs text-gray-500">{gradeLabel(b.quality)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                </>)}
              </div>
            )}

            {/* ── VOCALS ── */}
            {tab === 'vocals' && (
              <div className="space-y-5">
                <p className="text-xs text-gray-500">
                  How you actually performed in the booth. These do not create talent — they decide
                  how much of yours made it onto the record.
                </p>
                {(Object.keys(VOCAL_LABELS) as (keyof VocalSettings)[]).map(key => (
                  <Slider
                    key={key}
                    label={VOCAL_LABELS[key].label}
                    value={vocals[key]}
                    onChange={v => setVocals(prev => ({ ...prev, [key]: v }))}
                    low={VOCAL_LABELS[key].low}
                    high={VOCAL_LABELS[key].high}
                    note={VOCAL_LABELS[key].note}
                  />
                ))}
                <Button variant="ghost" size="sm" onClick={() => setVocals({ ...VOCAL_DEFAULTS })}>
                  Reset to defaults
                </Button>
              </div>
            )}

            {/* ── FEATURES ── */}
            {tab === 'features' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Nobody bolts onto a record at the click of a button. You send the track to their
                  DMs, they sit with it, and days later something comes back — a price, a yes, or
                  silence. A manager with real weight gets you answers you would not get alone.
                </p>

                {shopEligible.length === 0 ? (
                  <div className="bg-gray-800/60 rounded-xl p-4">
                    <div className="text-sm text-white font-medium mb-1">Nothing to send out yet</div>
                    <p className="text-xs text-gray-400">
                      Record a track first. Once it exists as a master you can shop it around —
                      that is how a feature actually happens.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Which record are we shopping? */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
                        The record
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {shopEligible.map(s => (
                          <button
                            key={s.id}
                            onClick={() => setShopSongId(s.id)}
                            className={`px-3 py-2 rounded-xl text-xs text-left transition-all ${
                              shopSong?.id === s.id
                                ? 'bg-yellow-500 text-black font-bold'
                                : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600'
                            }`}
                          >
                            <div className="font-medium">{s.title}</div>
                            <div className={shopSong?.id === s.id ? 'text-black/60' : 'text-gray-600'}>
                              Quality {Math.round(s.quality)} · {gradeLabel(s.quality)} · {s.masterStatus}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {shopSong && (
                      <>
                        {/* ── Open negotiations on this record ── */}
                        {requestsForSong.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs text-gray-400 uppercase tracking-wider">
                              Negotiations
                            </div>
                            {requestsForSong.map(r => (
                              <FeatureRequestRow
                                key={r.id}
                                request={r}
                                money={player?.career.money ?? 0}
                                energy={player?.energy ?? 0}
                                onPay={handlePay}
                                onDecline={declineFeatureTerms}
                                onAdd={handleAddVerse}
                                onCounter={handleCounter}
                              />
                            ))}
                          </div>
                        )}

                        {/* ── The picker ──
                            Shared with the Vault, so the same button cannot
                            mean two different things in two places. */}
                        <FeaturePicker
                          song={shopSong}
                          npcs={npcs}
                          playerFame={player ? player.career.localFame : 0}
                          playerCountry={player?.country ?? ''}
                          sentIds={requestedIds}
                          onSend={handleShop}
                          presetSearch={featureSearch}
                        />
                      </>
                    )}
                  </>
                )}

                {/* Anything open across the whole catalogue, so nothing is missed. */}
                {activeRequests.length > 0 && (
                  <div className="border-t border-gray-800 pt-4 space-y-2">
                    <div className="text-xs text-gray-400 uppercase tracking-wider">
                      Open across your catalogue
                    </div>
                    {activeRequests.map(r => (
                      <FeatureRequestRow
                        key={r.id}
                        request={r}
                        money={player?.career.money ?? 0}
                        energy={player?.energy ?? 0}
                        onPay={handlePay}
                        onDecline={declineFeatureTerms}
                        onAdd={handleAddVerse}
                        onCounter={handleCounter}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── FINAL MIX ── */}
            {tab === 'mix' && preview && (
              <div className="space-y-5">
                <div className="bg-gray-800/60 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">The read</div>
                  {isBlankSession ? (
                    <>
                      <p className="text-white font-bold text-lg leading-snug">Nothing to read yet.</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Put something on the Lyrics tab and this page will tell you how it is landing.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-3">
                        <span className={`text-4xl font-black ${
                          preview.quality >= 74 ? 'text-green-400' : preview.quality >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>{Math.round(preview.quality)}</span>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider">Overall quality</div>
                          <div className="text-xs text-gray-500">out of 100</div>
                        </div>
                      </div>
                      <p className="text-white font-bold text-lg leading-snug mt-3">{describeScore(preview.quality)}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {describeSplit(preview.commercialPotential, preview.criticalPotential)}
                      </p>
                    </>
                  )}
                </div>

                {!isBlankSession && (
                  <div className="space-y-4">
                    <ReadBar
                      label="Production"
                      score={preview.productionQuality}
                      read={describeDimension('production', preview.productionQuality)}
                    />
                    <ReadBar
                      label="Vocals"
                      score={preview.vocalPerformance}
                      read={describeDimension('vocals', preview.vocalPerformance)}
                    />
                    <ReadBar
                      label="Lyrics"
                      score={preview.lyricsQuality}
                      read={describeDimension('lyrics', preview.lyricsQuality)}
                    />
                    <ReadBar
                      label="Chemistry"
                      score={preview.chemistry}
                      read={describeDimension('chemistry', preview.chemistry)}
                    />
                  </div>
                )}

                {!isBlankSession && (
                  <>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Commercial</div>
                    <p className="text-xs text-gray-300">{describeCommercial(preview.commercialPotential)}</p>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Critical</div>
                    <p className="text-xs text-gray-300">{describeCritical(preview.criticalPotential)}</p>
                  </div>
                </div>

                {selectedProducer ? (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-blue-200">
                    This is the <strong>unmixed</strong> read. {selectedProducer.name} can still lift
                    the production in a mix session after you track it.
                  </div>
                ) : (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-3 py-2 text-xs text-orange-200">
                    You are producing this yourself. Without a producer the production stays capped
                    at what you can do alone — hire someone to mix it if you want more.
                  </div>
                )}
                  </>
                )}
              </div>
            )}

            {/* ── Back / Next ── */}
            {(() => {
              const i = TABS.findIndex(x => x.id === tab);
              const prev = TABS[i - 1];
              const next = TABS[i + 1];
              return (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
                  {prev ? (
                    <button onClick={() => setTab(prev.id)} className="text-xs font-semibold text-gray-400 hover:text-white">
                      ← {prev.label}
                    </button>
                  ) : <span />}
                  {next ? (
                    <Button variant="secondary" size="sm" onClick={() => setTab(next.id)}>
                      Next: {next.label} →
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-500">Last step — book the session below ↓</span>
                  )}
                </div>
              );
            })()}
          </Card>

          {/* Session footer */}
          <Card>
            <div className="space-y-3">
              {/* Where this is being tracked, right where the price is. The
                  player should never have to leave the session to find out
                  which room they are about to pay for. */}
              <button
                onClick={() => setMode('room')}
                className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-xl p-3 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Recording through</div>
                    <div className="text-sm text-white truncate">
                      {selectedRoom
                        ? `${selectedRoom.emoji} ${selectedRoom.name}`
                        : roomSummary(studio?.levels, null)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-yellow-400 font-black">
                      +{roomProductionBonus(studio?.levels, roomId).bonus}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">change</div>
                  </div>
                </div>
              </button>
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Session Effort</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  {EFFORT_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setEffort(opt.id)}
                      className={`p-3 rounded-xl text-left transition-all flex items-center gap-3 sm:block ${
                        effort === opt.id
                          ? 'bg-yellow-500/20 border border-yellow-500 text-white'
                          : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-2xl sm:text-lg sm:mb-1 shrink-0">{opt.emoji}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm sm:text-xs font-bold">{opt.label}</div>
                        <div className="text-xs text-gray-500 leading-tight">{opt.desc}</div>
                      </div>
                      <div className="text-xs text-yellow-500 sm:mt-1 shrink-0">
                        ${Math.round(opt.cost * crewFx.sessionCost)} · {Math.max(1, Math.round(opt.days * crewFx.sessionSpeed))}d
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">
                    Studio time ({sessionLength}d)
                  </span>
                  <span className="text-white">${studioTime.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">
                    {libBeat ? `Beat — ${libBeat.name} (yours)` : <>Producer{selectedProducer ? ` — ${selectedProducer.name}` : ' (none)'}</>}
                    {usingInHouseProducer && (
                      <span className="text-green-400"> · on your payroll, no fee</span>
                    )}
                  </span>
                  <span className="text-white">${producerCost.toLocaleString()}</span>
                </div>
                {ghostwriterCost > 0 && (
                  <div className="flex justify-between mb-1">
                    <span className="text-purple-300">
                      Ghostwriter — {ghostwriterById(ghostwriterId!)?.name}
                    </span>
                    <span className="text-white">${ghostwriterCost.toLocaleString()}</span>
                  </div>
                )}
                {/* The room, only when one is hired — the player's own studio
                    costs nothing per session and a $0 line would read as a
                    charge that failed to appear. */}
                {roomFee > 0 && (
                  <div className="flex justify-between mb-1">
                    <span className="text-yellow-300">
                      {selectedRoom!.emoji} {selectedRoom!.name}
                      <span className="text-gray-500"> · hired for this session</span>
                    </span>
                    <span className="text-white">${roomFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-700">
                  <span className="text-white font-bold">Total</span>
                  <span className={canAfford ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                    ${totalCost.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-gray-500 text-xs">Balance after</span>
                  <span className="text-gray-400 text-xs">
                    ${Math.floor(player.career.money - totalCost).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-2 mt-2 border-t border-gray-700">
                  <span className="text-gray-400 text-xs">Energy this session</span>
                  <span className={cn(
                    'text-xs font-bold',
                    player.energy >= sessionEnergy(effort) ? 'text-white' : 'text-red-400',
                  )}>
                    ⚡ {sessionEnergy(effort)} · {Math.floor(player.energy)} left
                  </span>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {featureNotice && (
                <div className="bg-green-500/10 border border-green-500/40 rounded-xl px-4 py-3 text-green-300 text-sm">
                  {featureNotice}
                </div>
              )}

              <Button variant="gold" className="w-full justify-center" onClick={handleRecord}>
                🎙️ Book {sessionLength} Day{sessionLength === 1 ? '' : 's'}
              </Button>
              <p className="text-xs text-gray-600 text-center">
                The room is paid for and the energy is spent now. The master lands when the {sessionLength} day{sessionLength === 1 ? '' : 's'} are done.
              </p>
            </div>
          </Card>

          {/* Record result — a BOOKING, not a finished record */}
          {result && (
            <Card glass glow>
              <div className="py-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">
                      {result.inProgress ? 'Session booked' : 'Session complete'}
                    </div>
                    <h3 className="text-lg font-black text-white">
                      {result.inProgress
                        ? `"${result.title}" is in the booth`
                        : `"${result.title}" is recorded`}
                    </h3>
                  </div>
                  <Badge color={
                    result.inProgress
                      ? 'blue'
                      : result.scores.quality >= 74 ? 'green' : result.scores.quality >= 50 ? 'yellow' : 'red'
                  }>
                    {result.inProgress ? `${result.daysSpent}d` : result.grade}
                  </Badge>
                </div>

                {result.inProgress ? (
                  <>
                    <p className="text-gray-300 mt-2 text-sm">
                      {result.daysSpent} day{result.daysSpent > 1 ? 's' : ''} in the room for
                      ${result.cost.toLocaleString()}, paid, with the energy already spent. The master
                      lands on {result.readyOn} — until then you are free to do something else.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      The read in the editor is a prediction, not a result. You will know what you have
                      when the days are done.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-300 mt-2 text-sm">{result.read}</p>
                    <p className="text-xs text-gray-500 mt-1">{result.splitRead}</p>
                    {result.featureNames.length > 0 && (
                      <p className="text-xs text-purple-400 mt-1">
                        {describeChemistry(result.scores.chemistry)}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-3">
                      Tracked over {result.daysSpent} day{result.daysSpent > 1 ? 's' : ''} for ${result.cost.toLocaleString()}.
                      {result.producerName
                        ? ` It is unmixed — send it to ${result.producerName} or another producer to finish it.`
                        : ' It is unmixed and you produced it yourself.'}
                    </p>
                  </>
                )}
                <div className="flex gap-2 mt-3">
                  {!result.inProgress && (
                    <Button variant="secondary" size="sm" onClick={() => setTab('mix')}>
                      See the read
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* ── SIDEBAR ────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* What the artist is in the middle of. A session is days in a room,
              so the days have to be visible from the room. */}
          <WorkInProgress always />

          {/* Energy — the studio is the most expensive thing you do. */}
          <Card>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Energy</span>
              <span className={cn(
                'font-bold',
                player.energy >= 55 ? 'text-green-400'
                  : player.energy >= 30 ? 'text-yellow-400'
                    : 'text-red-400',
              )}>
                {energyLabel(player.energy, player.maxEnergy)}
              </span>
            </div>
            <div className="bg-gray-800 rounded-full h-1.5">
              <div
                className={cn('h-1.5 rounded-full transition-all', energyColor(player.energy, player.maxEnergy))}
                style={{ width: `${Math.max(0, Math.min(100, player.energy))}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-600 mt-2">
              Every session, show and shift spends it. It only comes back when time passes —
              sim a day, a week, a month.
            </p>
          </Card>

          {preview && (
            <Card>
              <h3 className="font-bold text-white text-sm mb-2">Where it stands</h3>
              {isBlankSession ? (
                <>
                  <p className="text-sm text-gray-400 leading-snug mb-3">
                    Nothing written yet. Start on the Lyrics tab — everything else here reacts to
                    what you put on the page.
                  </p>
                  <p className="text-xs text-gray-600">
                    {selectedProducer ? `Producing with ${selectedProducer.name}.` : 'Producing it yourself.'}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-2xl font-black ${
                      preview.quality >= 74 ? 'text-green-400' : preview.quality >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{Math.round(preview.quality)}</span>
                    <span className="text-xs text-gray-500">/ 100 overall quality</span>
                  </div>
                  <p className="text-sm text-white leading-snug mb-3">{describeScore(preview.quality)}</p>
                  <div className="space-y-1 text-xs">
                    {[
                      { label: 'Production', v: preview.productionQuality },
                      { label: 'Vocals', v: preview.vocalPerformance },
                      { label: 'Lyrics', v: preview.lyricsQuality },
                      { label: 'Chemistry', v: preview.chemistry },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-gray-500">{row.label}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-gray-600 font-mono">{Math.round(row.v)}</span>
                          <span className={`font-bold ${
                            row.v >= 74 ? 'text-green-400' : row.v >= 50 ? 'text-yellow-400' : 'text-red-400'
                          }`}>{gradeLabel(row.v)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-3">
                    {selectedProducer ? `Producing with ${selectedProducer.name}.` : 'Producing it yourself.'}
                  </p>
                </>
              )}
            </Card>
          )}

          <Card>
            <h3 className="font-bold text-white text-sm mb-3">Your Craft Stats</h3>
            <div className="space-y-2">
              {[
                { label: 'Lyricism', value: player.stats.lyricism },
                { label: 'Flow', value: player.stats.flow },
                { label: 'Songwriting', value: player.stats.songwriting },
                { label: 'Delivery', value: player.stats.delivery },
                { label: 'Beat Selection', value: player.stats.beatSelection },
                { label: 'Production', value: player.stats.productionKnowledge },
              ].map(stat => (
                <div key={stat.label} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400 w-24">{stat.label}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-1">
                    <div className="h-1 rounded-full bg-yellow-500" style={{ width: `${stat.value}%` }} />
                  </div>
                  <span className="text-white w-6 text-right">{Math.round(stat.value)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Train these in the Training room. They decide how good your records can be.
            </p>
          </Card>

          <Card>
            <h3 className="font-bold text-white text-sm mb-3">Your Catalog ({masters.length})</h3>
            {masters.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-4">Nothing recorded yet</p>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto">
                {masters.map(song => (
                  <MasterCard
                    key={song.id}
                    song={song}
                    onMix={id => { setMixDialog(id); setProducerSearch(''); }}
                    onRelease={id => {
                      setReleaseDialog(id);
                      setMarketing(0);
                      setReleasePlatforms([...PLATFORM_IDS]);
                    }}
                    onScrap={scrapMaster}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
      )}

      {/* ── MIX DIALOG ─────────────────────────────────────────────────── */}
      {mixDialog && mixSong && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <Card className="max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <h3 className="font-black text-white text-lg mb-1">Send "{mixSong.title}" to mix</h3>
            <p className="text-xs text-gray-500 mb-3">
              A producer will balance, edit and master the record. A cheap one tidies up what you
              tracked; a serious one re-arranges it and replaces sounds outright, so their skill
              sets how good the finished record can be — not just how close it gets to the rough.
            </p>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 text-sm mb-2"
              placeholder="Search producers..."
              value={producerSearch}
              onChange={e => setProducerSearch(e.target.value)}
            />
            <div className="flex gap-1 mb-2">
              {([
                ['cheap', '💸 Cheapest first'],
                ['best', '🏆 Best first'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setProducerSort(id)}
                  className={`flex-1 text-xs px-2 py-1.5 rounded-lg transition-all ${
                    producerSort === id
                      ? 'bg-yellow-500/20 border border-yellow-500 text-white'
                      : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1 mb-3">
              {filteredProducers.map(p => {
                const cost = Math.round(producerFee(p.skill) * 0.55);
                const affordable = player.career.money >= cost;
                return (
                  <button
                    key={p.id}
                    onClick={() => confirmMix(p.id)}
                    disabled={!affordable}
                    className={`w-full text-left p-2.5 rounded-xl transition-all ${
                      affordable
                        ? 'bg-gray-800 border border-gray-700 hover:border-yellow-500'
                        : 'bg-gray-800/50 border border-gray-800 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white font-medium truncate">{p.name}</span>
                      <span className={`text-xs shrink-0 ${affordable ? 'text-yellow-500' : 'text-red-400'}`}>
                        ${cost.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      <span className="text-gray-400">{producerPriceBand(p.skill)}</span> · {describeProducerTier(p.skill)}
                    </div>
                  </button>
                );
              })}
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => setMixDialog(null)}>
              Cancel
            </Button>
          </Card>
        </div>
      )}

      {/* ── MIX RESULT ─────────────────────────────────────────────────── */}
      {mixResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <div className="text-center py-2">
              <div className="text-3xl mb-2">{mixResult.ok === false ? '🚫' : '🎚️'}</div>
              <h3 className="font-black text-white text-lg">
                {mixResult.ok === false ? 'Not this one' : 'Mix booked'}
              </h3>
              <p className="text-gray-300 text-sm mt-2">{mixResult.read}</p>
              {mixResult.ok !== false && (
                <div className="bg-gray-800 rounded-xl p-3 mt-3 text-xs text-left">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Production</span>
                    <span className="text-green-400 font-bold">+{mixResult.productionGain}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Engineer</span>
                    <span className="text-white">{mixResult.producerName}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Cost</span>
                    <span className="text-white">${mixResult.cost.toLocaleString()} · {mixResult.daysSpent}d</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Back on</span>
                    <span className="text-white">{mixResult.readyOn}</span>
                  </div>
                  <p className="text-gray-500 mt-2">
                    The record goes on reading as a rough until the days are done. The energy is
                    already spent, so the time is yours.
                  </p>
                </div>
              )}
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => setMixResult(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── RELEASE DIALOG ─────────────────────────────────────────────── */}
      {releaseDialog && releaseSong && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="max-w-lg w-full my-8">
            <h3 className="font-black text-white text-lg mb-1">Release "{releaseSong.title}"</h3>
            <p className="text-xs text-gray-500 mb-4">
              Once it is out you cannot take it back. Pick where it goes, and set a budget if you
              want to push it.
            </p>

            {/* ── WHERE IT GOES ──────────────────────────────────────────── */}
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs text-gray-400 uppercase tracking-wider">Where it goes</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setReleasePlatforms([...PLATFORM_IDS])}
                  className="text-[11px] text-gray-400 hover:text-white transition-colors"
                >
                  Select all
                </button>
                <span className="text-gray-700 text-[11px]">·</span>
                <button
                  onClick={() => setReleasePlatforms([])}
                  className="text-[11px] text-gray-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {PLATFORM_LIST.map(p => {
                const on = releasePlatforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() =>
                      setReleasePlatforms(prev =>
                        prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id],
                      )
                    }
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-colors ${
                      on
                        ? 'border-yellow-500/50 bg-yellow-500/10'
                        : 'border-gray-700 bg-gray-800/40 hover:border-gray-600'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black shrink-0"
                      style={{ background: `${p.accent}22`, color: on ? p.accent : '#6b7280' }}
                    >
                      {p.mark}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[12px] font-semibold truncate ${on ? 'text-white' : 'text-gray-500'}`}>
                        {p.name}
                      </span>
                      <span className="block text-[10px] text-gray-600 truncate">
                        ${p.rate.toFixed(4)}/{p.purchaseBased ? 'dl' : 'stream'}
                      </span>
                    </span>
                    <span className={`text-[11px] shrink-0 ${on ? 'text-yellow-400' : 'text-gray-700'}`}>
                      {on ? '✓' : '—'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* The reach read is computed from the same platform weights the
                engine uses, so it is the real number and not a guess. */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 px-3 py-2.5 mb-4">
              {releasePlatforms.length === 0 ? (
                <span className="text-[12px] text-red-400">
                  Nowhere selected. A record has to go somewhere.
                </span>
              ) : (
                <>
                  <div className="flex items-center justify-between text-[12px] mb-1.5">
                    <span className="text-gray-400">Audience reached</span>
                    <span className="text-white font-semibold num">
                      {Math.round(releaseReach * 100)}% of world listening
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-yellow-500 transition-all"
                      style={{ width: `${Math.max(2, Math.round(releaseReach * 100))}%` }}
                    />
                  </div>
                  {releasePlatforms.length < PLATFORM_LIST.length && (
                    <p className="text-[11px] text-gray-500 mt-1.5">
                      Skipping{' '}
                      {PLATFORM_LIST.filter(p => !releasePlatforms.includes(p.id))
                        .map(p => p.name)
                        .join(', ')}
                      . Fewer platforms is a smaller release, not a bigger one.
                    </p>
                  )}
                </>
              )}
            </div>

            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
              Marketing Budget: ${marketing.toLocaleString()}
            </label>
            <input
              type="range" min="0" max="5000" step="100"
              value={marketing}
              onChange={e => setMarketing(Number(e.target.value))}
              className="w-full accent-yellow-500 mb-1"
            />
            <div className="flex justify-between text-xs text-gray-600 mb-3">
              <span>$0 (no push)</span>
              <span>$5,000 (big push)</span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-gray-400">You can afford</span>
              <span className={player.career.money >= marketing ? 'text-green-400' : 'text-red-400'}>
                ${Math.floor(player.career.money).toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="gold"
                className="flex-1 justify-center"
                onClick={confirmRelease}
                disabled={player.career.money < marketing || releasePlatforms.length === 0}
              >
                🚀 Release
              </Button>
              <Button variant="ghost" onClick={() => setReleaseDialog(null)}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── PROJECT BUILDER ───────────────────────────────────────────────────────
//
// An album in this game is not a new object the UI invents. It is a bundle of
// records that already exist, and its chart units are derived live from those
// records' own streaming state (see `buildAlbumChart`). So the builder's job is
// only to decide *which* records belong together — and to be honest about the
// two rules that matter: a song cannot be on two projects, and a project of two
// songs is an EP, not an album.

// The track rules live in `sim/albums.ts` and are shared with the store, so the
// number on the format button and the number the store enforces are the same
// number. These used to be local constants here, which is how a UI ends up
// offering a 3-track album the store then refuses.
const EP_MIN = MIN_PROJECT_TRACKS.ep;
const ALBUM_MIN = MIN_PROJECT_TRACKS.album;
const MIXTAPE_MIN = MIN_PROJECT_TRACKS.mixtape;

function ProjectBuilder() {
  const player = useGameStore(s => s.player);
  const songs = useGameStore(s => s.songs);
  const albums = useGameStore(s => s.albums);
  const globalAlbums = useGameStore(s => s.globalAlbums);
  const createAlbum = useGameStore(s => s.createAlbum);
  const createDeluxe = useGameStore(s => s.createDeluxe);
  const createMixtape = useGameStore(s => s.createMixtape);
  const openSong = useGameStore(s => s.openSong);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<'album' | 'ep' | 'mixtape'>('ep');
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Deluxe editions are a different shape of job — you are not choosing tracks
  // for a new project, you are reopening one you already put out. So they get
  // their own panel and their own state rather than being squeezed into the
  // format selector above.
  const [deluxeParent, setDeluxeParent] = useState<string | null>(null);
  const [deluxeExtra, setDeluxeExtra] = useState<string[]>([]);
  const [deluxeError, setDeluxeError] = useState<string | null>(null);
  const [deluxeNotice, setDeluxeNotice] = useState<string | null>(null);

  // A track already on one of the player's projects is spoken for.
  const usedIds = useMemo(() => {
    const used = new Set<string>();
    for (const a of albums) for (const id of a.songs) used.add(id);
    return used;
  }, [albums]);

  // Everything of yours that is not already spoken for — including masters
  // still in the vault. An unreleased track put on a project comes out with
  // it, which is how a finished-but-unreleased song gets heard at all.
  const available = useMemo(
    () =>
      songs
        .filter(s => !usedIds.has(s.id))
        .sort((a, b) => {
          // Live records first, then the vault, each by what it is doing.
          const ar = isSongReleased(a) ? 0 : 1;
          const br = isSongReleased(b) ? 0 : 1;
          if (ar !== br) return ar - br;
          return (b.weeklyStreams ?? 0) - (a.weeklyStreams ?? 0);
        }),
    [songs, usedIds],
  );

  const pickedSongs = useMemo(
    () => available.filter(s => picked.includes(s.id)),
    [available, picked],
  );

  const combinedWeek = pickedSongs.reduce((sum, s) => sum + (s.weeklyStreams ?? 0), 0);
  const combinedLifetime = pickedSongs.reduce((sum, s) => sum + (s.totalStreams ?? 0), 0);

  const myProjects = useMemo(
    () => albums.filter(a => (a.ownerId ?? player?.id) === player?.id),
    [albums, player],
  );

  const chartPositionOf = useCallback(
    (albumId: string) => globalAlbums?.find(r => r.itemId === albumId)?.position ?? 0,
    [globalAlbums],
  );

  // An album needs five tracks, a mixtape four, an EP two. Rather than
  // refusing the click, the type follows the count — the player is told the
  // rule once, in place, instead of being blocked by it.
  const suggestedType: 'album' | 'ep' | 'mixtape' =
    picked.length >= ALBUM_MIN ? 'album' : picked.length >= MIXTAPE_MIN ? 'mixtape' : 'ep';

  const handleCreate = useCallback(() => {
    setNotice(null);
    // A mixtape has its own store action — the loose format has different
    // commercial weight, and routing it through `createAlbum` would lose that.
    const res =
      type === 'mixtape'
        ? createMixtape({ title, songIds: picked })
        : createAlbum({ title, songIds: picked, type });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setNotice(`"${title.trim()}" is out — it charts from this week.`);
    setTitle('');
    setPicked([]);
    setType('ep');
  }, [createAlbum, createMixtape, title, picked, type]);

  // ── Deluxe: which projects can be reopened, and what can go on them ──────
  const deluxeCandidates = useMemo(
    () => myProjects.filter((a) => a.type !== 'deluxe'),
    [myProjects],
  );

  const parent = deluxeCandidates.find((a) => a.id === deluxeParent) ?? null;

  /** Anything of yours not already on a project — out or not, since extras come out with it. */
  const deluxePool = useMemo(
    () => songs.filter((s) => !usedIds.has(s.id)),
    [songs, usedIds],
  );

  const handleDeluxe = useCallback(() => {
    setDeluxeNotice(null);
    if (!parent) {
      setDeluxeError('Pick the project you are reopening.');
      return;
    }
    const res = createDeluxe(parent.id, deluxeExtra);
    if (!res.ok) {
      setDeluxeError(res.error);
      return;
    }
    setDeluxeError(null);
    setDeluxeNotice(
      `"${parent.title}" is back out as a deluxe edition with ${deluxeExtra.length} extra track${deluxeExtra.length === 1 ? '' : 's'}.`,
    );
    setDeluxeParent(null);
    setDeluxeExtra([]);
  }, [createDeluxe, parent, deluxeExtra]);

  if (!player) return null;

  const canCreate =
    title.trim().length > 0 &&
    picked.length >= MIN_PROJECT_TRACKS[type];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <h2 className="text-white font-black mb-1">Build a project</h2>
          <p className="text-xs text-gray-500 mb-4">
            Put your records onto one album or EP. Its chart units come from the tracks
            themselves, so a project is exactly as big as the songs on it. Unreleased masters
            are welcome here — anything not out yet comes out with the project.
          </p>

          <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
            Project title
          </label>
          <input
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition-colors mb-4"
            placeholder="What is the body of work called?"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
            Format
          </label>
          <div className="flex gap-2 mb-4">
            {([
              ['ep', `EP · ${EP_MIN}+ tracks`],
              ['mixtape', `Mixtape · ${MIXTAPE_MIN}+ tracks`],
              ['album', `Album · ${ALBUM_MIN}+ tracks`],
            ] as const).map(([id, label]) => {
              const blocked = picked.length < MIN_PROJECT_TRACKS[id];
              return (
                <button
                  key={id}
                  onClick={() => setType(id)}
                  disabled={blocked}
                  title={blocked ? PROJECT_TRACK_RULE[id] : undefined}
                  className={`flex-1 px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
                    type === id
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-300'
                      : blocked
                        ? 'border-gray-800 bg-gray-800/40 text-gray-700 cursor-not-allowed'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider">
              Tracks ({picked.length} selected)
            </label>
            {available.length > 0 && (
              <button
                onClick={() =>
                  setPicked(
                    picked.length === available.length ? [] : available.map(s => s.id),
                  )
                }
                className="text-[11px] text-gray-400 hover:text-white transition-colors"
              >
                {picked.length === available.length ? 'Clear all' : 'Select all'}
              </button>
            )}
          </div>

          {available.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-6 text-center">
              <p className="text-sm text-gray-400">Nothing available to put on a project.</p>
              <p className="text-xs text-gray-600 mt-1">
                Record a few masters first — or everything you have is already on one of your
                projects.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {available.map(s => {
                const on = picked.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() =>
                      setPicked(prev => (prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]))
                    }
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-colors ${
                      on
                        ? 'border-yellow-500/50 bg-yellow-500/10'
                        : 'border-gray-800 bg-gray-800/40 hover:border-gray-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-[5px] border flex items-center justify-center text-[10px] shrink-0 ${
                        on ? 'border-yellow-500 bg-yellow-500 text-black' : 'border-gray-600'
                      }`}
                    >
                      {on ? '✓' : ''}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm truncate ${on ? 'text-white' : 'text-gray-300'}`}>
                        {s.title}
                      </span>
                      <span className="block text-[11px] text-gray-600">
                        {isSongReleased(s)
                          ? `${s.releaseDate} · ${s.genre.replace('_', ' ')}`
                          : `unreleased · comes out with this · ${s.genre.replace('_', ' ')}`}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-xs text-gray-300 num">
                        {isSongReleased(s) ? compact(s.weeklyStreams ?? 0) : '—'}
                      </span>
                      <span className="block text-[10px] text-gray-600">
                        {isSongReleased(s) ? 'this week' : 'not out'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
          {notice && (
            <div className="mt-3 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-300">
              {notice}
            </div>
          )}

          <Button
            variant="gold"
            className="w-full justify-center mt-4"
            onClick={handleCreate}
            disabled={!canCreate}
          >
            💿 Release the {projectTypeLabel(type)}
          </Button>
        </Card>
      </div>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <Card>
          <h3 className="text-white font-bold text-sm mb-3">This project</h3>
          <div className="space-y-2 text-xs">
            <Row label="Format" value={projectTypeLabel(type)} />
            <Row label="Tracks" value={String(picked.length)} />
            {pickedSongs.some(s => !isSongReleased(s)) && (
              <Row
                label="Out with this"
                value={`${pickedSongs.filter(s => !isSongReleased(s)).length} unreleased`}
              />
            )}
            <Row
              label="Needs"
              value={
                picked.length >= MIN_PROJECT_TRACKS[type]
                  ? 'Enough to release'
                  : `${MIN_PROJECT_TRACKS[type] - picked.length} more to release`
              }
            />
            <Row label="Streams this week" value={compact(combinedWeek)} />
            <Row label="Lifetime streams" value={compact(combinedLifetime)} />
          </div>

          {picked.length > 0 && picked.length < ALBUM_MIN && (
            <p className="text-[11px] text-gray-500 mt-3">
              {PROJECT_TRACK_RULE.album} A mixtape takes {MIXTAPE_MIN} and a different chart.
            </p>
          )}
          {suggestedType !== type && (
            <p className="text-[11px] text-gray-500 mt-3">
              With {picked.length} tracks this would naturally be{' '}
              {suggestedType === 'album' ? 'an album' : suggestedType === 'mixtape' ? 'a mixtape' : 'an EP'}.
            </p>
          )}
        </Card>

        <Card>
          <h3 className="text-white font-bold text-sm mb-3">Your projects</h3>
          {myProjects.length === 0 ? (
            <p className="text-xs text-gray-500">
              Nothing yet. The first one is the hardest.
            </p>
          ) : (
            <div className="space-y-2">
              {myProjects.map(a => {
                const pos = chartPositionOf(a.id);
                return (
                  <div key={a.id} className="rounded-xl border border-gray-800 bg-gray-900/40 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white truncate flex-1">{a.title}</span>
                      {pos > 0 && (
                        <span className="text-[10px] font-bold text-yellow-400 shrink-0 num">
                          #{pos}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-600 mt-0.5">
                      {(a.type ?? 'album').toUpperCase()} · {a.songs.length} tracks · {a.releaseDate}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {a.songs.slice(0, 4).map(id => {
                        const s = songs.find(x => x.id === id);
                        if (!s) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => openSong(id)}
                            className="text-[10px] text-gray-400 hover:text-yellow-400 transition-colors truncate max-w-[110px]"
                          >
                            {s.title}
                          </button>
                        );
                      })}
                      {a.songs.length > 4 && (
                        <span className="text-[10px] text-gray-600">
                          +{a.songs.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Deluxe edition ────────────────────────────────────────────────
            A different job from building a project: you are not choosing
            tracks for something new, you are reopening something the world has
            already heard and adding to it. That is why it gets its own panel —
            the parent record is the decision, not the track list. */}
        <Card>
          <h3 className="text-white font-bold text-sm mb-1">Reopen as a deluxe</h3>
          <p className="text-xs text-gray-500 mb-3">
            Add tracks to a project you already put out. A deluxe merges its units into the
            original, so it lifts the record that is already on the chart instead of starting over.
          </p>

          {deluxeCandidates.length === 0 ? (
            <p className="text-xs text-gray-600">
              You need a released album, EP or mixtape first.
            </p>
          ) : (
            <>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
                Which project
              </label>
              <div className="space-y-1.5 mb-3">
                {deluxeCandidates.map(a => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setDeluxeParent(a.id === deluxeParent ? null : a.id);
                      setDeluxeExtra([]);
                      setDeluxeError(null);
                    }}
                    className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                      deluxeParent === a.id
                        ? 'border-yellow-500 bg-yellow-500/10'
                        : 'border-gray-800 bg-gray-900/40 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white truncate flex-1">{a.title}</span>
                      <span className="text-[10px] text-gray-500 shrink-0">
                        {projectTypeLabel(a.type ?? 'album')} · {a.songs.length} tracks
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {parent && (
                <>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
                    Extra tracks ({deluxeExtra.length} selected)
                  </label>
                  {deluxePool.length === 0 ? (
                    <p className="text-xs text-gray-600 mb-3">
                      Nothing left to add — every record you have is already on a project.
                    </p>
                  ) : (
                    <div className="max-h-44 overflow-y-auto space-y-1 mb-3 pr-1">
                      {deluxePool.map(s => {
                        const on = deluxeExtra.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() =>
                              setDeluxeExtra(prev =>
                                on ? prev.filter(x => x !== s.id) : [...prev, s.id],
                              )
                            }
                            className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left transition-colors ${
                              on ? 'bg-yellow-500/10 text-yellow-200' : 'text-gray-400 hover:bg-gray-800'
                            }`}
                          >
                            <span className="text-xs truncate">
                              {s.title}
                              {!isSongReleased(s) && (
                                <span className="text-[10px] text-orange-400/80"> · unreleased</span>
                              )}
                            </span>
                            <span className="text-[10px] text-gray-600 shrink-0 num">
                              {isSongReleased(s) ? compact(s.totalStreams ?? 0) : 'comes out with it'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {deluxeError && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 mb-3">
                      <p className="text-xs text-red-300">{deluxeError}</p>
                    </div>
                  )}
                  {deluxeNotice && (
                    <div className="rounded-xl bg-green-500/10 border border-green-500/30 px-3 py-2 mb-3">
                      <p className="text-xs text-green-300">{deluxeNotice}</p>
                    </div>
                  )}

                  <Button
                    variant="gold"
                    size="sm"
                    disabled={deluxeExtra.length < MIN_PROJECT_TRACKS.deluxe}
                    onClick={handleDeluxe}
                  >
                    {deluxeExtra.length < MIN_PROJECT_TRACKS.deluxe
                      ? PROJECT_TRACK_RULE.deluxe
                      : `💿 Release the deluxe (${deluxeExtra.length} extra)`}
                  </Button>
                </>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200 num">{value}</span>
    </div>
  );
}
