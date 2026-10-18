import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { setAutoFreeze, current, isDraft } from 'immer';
import { v4 as uuidv4 } from 'uuid';
import type {
  GameState, GameScreen, Player, Song, NPC, DMMessage, SocialPost,
  ActiveContract, Show, Investment, Business,
  Certification, Interview, ChartEntry,
  WeeklyStatement, Background, Gender, Genre, ArtistStats, RelationshipStage,
  InterviewTone, GameDate, SongMood, VocalSettings,
  FeatureRequest, FeatureActionResult, JobListing,
  InboundRequest,
  Album, GlobalCertification, GameNotification, Subscription,
  Video, VideoComment, CrewMember, ManagementFeeKind, TurnReport, WorkItem,
  ShowType, Tour, TourLeg, ScheduledShow, ShowCostLine,
  ShowOffer, BookedGig, OfferTerms, OfferBilling, DeclineReason,
  BeefState,
  FeedRefreshResult, BeefActionResult,
  PostCareerRole, SampleClearance,
  PlayerLabel, LabelSignee, LabelPitch, LabelEvent, LabelTerms, LabelDealType,
  LabelStaffRole, LabelReleaseTier, Genre as LabelGenre,
} from '../types/game';
import {
  FOUNDING_COST,
  FOUNDING_MIN_FAME,
  PROSPECT_REFRESH_DAYS,
  PITCH_WINDOW_DAYS,
  DEMAND_WINDOW_DAYS,
  LABEL_COLORS,
  DEAL_INFO,
  RELEASE_TIERS,
  STAFF_INFO,
  RIVAL_LABELS,
  dropOptics,
  fameCap,
  isSignable,
  lawyerRead,
  marketingEfficiency,
  maybeRaiseDemand,
  maybeRivalOffer,
  money,
  monthKeyOf,
  monthlyFame,
  monthlyMood,
  moodWord,
  negotiateLabel,
  openingOffer,
  overheadFor,
  patienceFor,
  pickProspects,
  potentialEstimate,
  potentialOf,
  recoupShare,
  releaseFameBump,
  releaseQuality,
  reputationTarget,
  rosterLimit,
  scoreOffer,
  settlementCost,
  splitRevenue,
  staffSalary,
  staffSkill,
  startingReputation,
  threeSixtyMonthly,
  unit,
  wantsFor,
} from '../sim/label';
import { hashString } from '../sim/rng';
import { isSongReleased } from '../sim/release';
import {
  beefRung,
  decayedHeat,
  settleHeat,
  fizzleIfCold,
  availableResolutions,
  settleBeef,
  truceAccepted,
  FIZZLE_DAYS,
  RESOLUTION_LABEL,
  type ChosenResolution,
} from '../sim/beef';
import { worldBeefs } from '../data/rivalries';
import { fanGrowthFor, fanbaseReport, type FanbaseReport } from '../sim/fanbase';
import { videoShootDays } from '../sim/work';
import {
  adoptLegacySave,
  newSlotId,
  readIndex,
  readSlot,
  removeSlot,
  renameSlot as renameSaveSlot,
  setActiveSlot,
  writeSlot,
  MAX_SLOTS,
  type SaveSlotMeta,
} from './saves';
import {
  openTurnLedger,
  ledgerAdd,
  drainTurnLedger,
  buildTurnReport,
} from '../sim/ledger';
import {
  holdingsValue,
  money0,
  monthlyWithholding,
  pct0,
  propertyTax,
} from '../sim/tax';
import {
  applyTeamSeats,
  crewBonuses,
  crewWage,
  managerMonth,
  hireCheck,
  hireUpfrontCost,
  managerNetwork,
  npcSkill,
  roleSpec,
  severanceFor,
  stillGrowing,
  growthPerMonth,
  traitsFor,
  type TeamActionResult,
} from '../sim/roles';
import { INITIAL_NPCS, FAN_ACCOUNT_NPCS } from '../data/npcs';
import { buildRealArtists } from '../data/realArtists';
import { ghostwriterById } from '../sim/ghostwriter';
import { generateNPCs } from '../data/npcGenerator';
import { getBaseStats, applyBackground, getStartingCareer } from '../data/backgrounds';
import { getChartMarkets } from '../data/locations';
import { getUnitsForCertification } from '../sim/songQuality';
import {
  runStoryDirector,
  simulateNPCWorld,
} from '../sim/storyDirector';
import {
  tickNPCSongs,
  npcReleaseTick,
  pruneNPCSongs,
  createNPCSong,
  MAX_LIVE_NPC_SONGS,
} from '../sim/npcMusic';
import {
  npcArtistPosts,
  fanPosts,
  playerReleaseReactions,
  buildTrending,
} from '../sim/socialEngine';
import { showsDueThisTurn, runAwardShow } from '../sim/awards';
import { generateManagerOffers, generateLabelOffers, bestSongQuality } from '../sim/career';
import {
  newSongPlatformState,
  tickSongDay,
  songTotals,
  platformWeights,
  platformReach,
  popularityFactor,
  trajectory,
  DAILY_STREAM_SCALE,
  HISTORY_DAYS,
  PLATFORM_HISTORY_DAYS,
  marketingPush,
  type StreamActor,
  type StreamContext,
  type SongPlatformState,
} from '../sim/streaming';
import { PLATFORM_LIST, PLATFORM_BY_ID } from '../data/platforms';
import {
  buildInitialProjects,
  buildNewProject,
  MIN_PROJECT_TRACKS,
  PROJECT_TRACK_RULE,
} from '../sim/albums';
import type { Project } from '../sim/albums';
import { affinity } from '../sim/affinity';
import {
  findVenue,
  planShow,
  settleShow,
  checkCooldown,
  decayedFatigue,
  addFatigue,
  performanceScore,
  venueLockReason,
  slotRequirement,
  computeDemand,
  settleSoldShow,
  VENUE_CLASSES,
  SHOW_CITIES,
  venuesInCity,
  accessTier,
  type Venue,
  type ShowPlan,
  type ShowPlanInput,
  type ShowSettlement,
} from '../sim/shows';
import {
  inquire,
  inquiryReport,
  nightAt,
  isNightFree,
  INQUIRY_ENERGY,
  INQUIRY_ENERGY_WITH_TEAM,
  type InquiryResult,
} from '../sim/booking';
import {
  planTour,
  tourReport,
  type TourPlan,
  type TourStopRequest,
} from '../sim/tours';
import {
  buildOffer,
  negotiate,
  declineEffect,
  backOutTerms,
  moodOf,
  MOOD_INFO,
  traitsOf,
  whyInvited,
  exposureOf,
  relationshipFromNight,
  CANCEL_LABEL,
  BILLING_LABEL,
  type CounterResult,
  type Mood,
  type Traits,
} from '../sim/offers';
import {
  MIN_LEAD_DAYS,
  MAX_LEAD_DAYS,
  MAX_OPEN_SHOWS,
  MAX_POSTPONEMENTS,
  REMINDER_DAYS,
  MARKETING_TIERS,
  MOOD_LABEL,
  marketingMult,
  marketingCost,
  soldBy,
  salesMood,
  dueReminder,
  reminderTone,
  cancelTerms,
  postponeTerms,
  type CancelReason,
  type CancelTerms,
  type PostponeTerms,
} from '../sim/ticketing';
import {
  createVideo,
  tickVideoDay,
  streamLift,
  videoSeed,
  videoTitle,
  npcVideoChance,
  npcShootsVideo,
  npcConcept,
  npcStyle,
  npcDirectorName,
  shootQuality,
  buildInitialVideos,
  commentPage,
  repliesTo,
  playerComment,
  performanceOf,
  COMMENT_PAGE,
  type VideoContext,
  type CommentContext,
} from '../sim/video';
import {
  dateToSerial,
  chartWeekEnding,
  daysBetween,
  lastCompletedWeekSerial,
  formatGameDate as formatDateString,
  parseGameDate,
  serialToDate,
} from '../sim/gameClock';
import {
  buildSongChart,
  buildAlbumChart,
  extendRuns,
  detectMilestones,
  certLevelFor,
  type ChartActor,
} from '../sim/globalCharts';
import {
  generateDMReply,
  generatePostComment,
  generateSongReaction,
  generateRoyaltyFlavor,
  generateNPCChirpPost,
  generateHeadline,
} from '../ai/offlineProvider';
import { LUXURY_CATALOG } from '../data/luxuryItems';
import {
  scoreStudioSession,
  describeScore,
  gradeLabel,
  describeSplit,
  describeChemistry,
  producerFee,
  producerSkillOf,
  blendQuality,
  applyMoodPenalty,
  applyFeatureVerse,
  analyzeLyrics,
  getProducerBeats,
  getSelfProducedBeats,
  sessionCost,
  sessionDays,
  VOCAL_DEFAULTS,
  type StudioScores,
} from '../sim/studio';
import {
  GEAR_SLOTS,
  gearBonus,
  nextGearTier,
  roomById,
  roomProductionBonus,
  roomLockReason,
  type GearSlotId,
} from '../sim/room';
import {
  MAX_ENERGY,
  sessionEnergy,
  showEnergy,
  trainingEnergy,
  ENERGY_COSTS,
  energyShortfallMessage,
  restRecovery,
  restRefusal,
  elapsedRecovery,
} from '../sim/energy';
import {
  counterFeatureFee,
  decideFeatureResponse,
  featureDisposition,
  featureResponseDays,
  managerSkillOf,
  MAX_NEGOTIATION_ROUNDS,
  verseQualityFor,
  type FeatureCandidate,
} from '../sim/features';
import {
  decideInboundResponse,
  generateInboundAsk,
  inboundBudget,
  inboundFameGain,
  inboundMomentumGain,
  inboundOpeningOffer,
  inboundVerseQuality,
  managerReadOnInbound,
  type InboundCandidate,
} from '../sim/inbound';
import { cameoQuote, quoteCameos, type CameoQuote } from '../sim/cameo';
import { generateJobBoard, JOB_CATEGORY_LABEL } from '../data/jobs';

/**
 * How long before the same person is worth another deliberate evening.
 *
 * One constant, read by the action and by the screen that offers the button, so
 * the number the player is told is the number the rule uses.
 */
export const REACH_OUT_COOLDOWN_DAYS = 7;

/** Small local helper for picking a random item. */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── ENERGY / STANDING HELPERS ────────────────────────────────────────────

/**
 * The player's blended standing — the single number other artists actually
 * react to when a track lands in their DMs. Weighted toward home, because that
 * is where a career is real.
 */
export function blendedFame(player: Player): number {
  return (
    player.career.localFame * 0.5 +
    player.career.nationalFame * 0.32 +
    player.career.internationalFame * 0.18
  );
}

/** The manager the player is signed to, if any. */
function activeManager(contracts: ActiveContract[], npcs: NPC[]): NPC | undefined {
  const contract = contracts.find((c) => c.type === 'management' && c.active);
  if (!contract) return undefined;
  return npcs.find((n) => n.id === contract.npcId);
}

// ─── THE SOCIAL LAYER'S READ HELPERS ──────────────────────────────────────
// Module-level rather than actions, because they are READS. A read that goes
// through `set` is a write, and a read that re-rolls is a lie — these are pure
// functions of the saved state, so opening the screen twice gives one answer.

/** The records that are actually out. What the fanbase derivation reads. */
function releasedSongs(state: GameState): Song[] {
  return (raw(state.songs) as Song[]).filter(isReleased);
}

/**
 * The absolute game minute, which is the clock every social cooldown runs on.
 *
 * Not the wall clock. A refresh cooldown measured in real seconds would reset
 * when the tab is closed and would tick at whatever speed the player set the
 * game clock to; this one is the same clock the rest of the game moves on.
 */
function gameMinute(state: GameState): number {
  return dateToSerial(state.gameDate) * MINUTES_PER_DAY + (state.clockMinute ?? 0);
}

/** The fanbase, derived. See `sim/fanbase.ts` for what is and is not derived. */
export function fanbaseOf(state: GameState): FanbaseReport {
  const crew = crewBonuses(raw(state.crew) as CrewMember[]);
  const manager = activeManager(state.contracts, raw(state.npcs) as NPC[]);
  return fanbaseReport({
    player: state.player!,
    songs: releasedSongs(state),
    shows: raw(state.shows) as Show[],
    platformStats: state.platformStats,
    weeklyStatements: raw(state.weeklyStatements) as WeeklyStatement[],
    cityFame: raw(state.cityFame) as Record<string, number>,
    gameDate: state.gameDate,
    managerNet: manager ? managerNetwork(manager) : 0,
    fanMult: crew.fanMult,
  });
}

/**
 * How far the player's camp can carry a word — the crew's demand multiplier,
 * expressed as points out of a hundred.
 *
 * A `promoSales` of 1.0 (nobody working the room) is zero reach and 2.0 would
 * be a hundred. The beef engine wants a 0-100 figure and the payroll returns a
 * multiplier, so this is the one place the two are converted.
 */
function crewReachOf(state: GameState): number {
  const promoSales = crewBonuses(raw(state.crew) as CrewMember[]).promoSales;
  return Math.max(0, Math.min(100, (promoSales - 1) * 100));
}

/** The best record the player has out, which is the pen behind a beef move. */
function bestPenQuality(state: GameState): number {
  const songs = releasedSongs(state);
  let best = 0;
  for (const song of songs) if (song.quality > best) best = song.quality;
  return best;
}

/**
 * How many artists the player may tag today.
 *
 * Tagging is free and it is the one thing in the feed that could be turned into
 * a fame farm by clicking it two hundred times, so it has a cap. It is a
 * generous cap — this is not meant to be felt during normal play, only to stop
 * the exploit — and it resets on the GAME day, not on a timer.
 */
const TAGS_PER_DAY = 12;

/** Game minutes between feed pulls. Six hours: twice a day is the intended pace. */
const FEED_REFRESH_MINUTES = 360;

/**
 * How long until the feed can be pulled again, on the GAME clock.
 *
 * The button and `refreshFeed` both read this, so the number on the button and
 * the number the action enforces cannot drift apart. That is the same reason
 * `fanGrowthFor` lives in one place: two copies of a cooldown is two opinions
 * about when it is over.
 */
export function feedCooldown(state: GameState): { ready: boolean; waitMinutes: number } {
  if (state.feedRefreshedAt === undefined) return { ready: true, waitMinutes: 0 };
  const since = gameMinute(state) - state.feedRefreshedAt;
  if (since >= FEED_REFRESH_MINUTES) return { ready: true, waitMinutes: 0 };
  return { ready: false, waitMinutes: Math.ceil(FEED_REFRESH_MINUTES - since) };
}

/**
 * How many artists the player may still tag today.
 *
 * The quota resets on the game day rather than on a timer, so this reads the
 * stored serial. Exported for the same reason as `feedCooldown`: the screen has
 * to be able to say how many are left without keeping its own copy of the rule.
 */
export function tagsLeftToday(state: GameState): number {
  const today = dateToSerial(state.gameDate);
  const used = state.tagQuota && state.tagQuota.serial === today ? state.tagQuota.count : 0;
  return Math.max(0, TAGS_PER_DAY - used);
}

/** Has the game date reached (or passed) a "DD/MM/YYYY" marker? */
function dateReached(marker: string, date: GameDate): boolean {
  const [d, m, y] = marker.split('/').map(Number);
  if (!d || !m || !y) return false;
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date(date.year, date.month - 1, date.day).getTime();
  return now >= target;
}

/**
 * Charge energy, or refuse. Returns false when the player has not got the
 * legs for it — callers must treat that as a hard failure and change nothing
 * else about the state.
 *
 * `admin` marks the paperwork: releasing, shopping a track out, scheduling,
 * the evening it takes to actually reach somebody. A personal assistant takes
 * a cut off those and nothing off the work itself, and this is the ONLY place
 * energy is ever charged — which is why the discount lives here rather than at
 * fourteen call sites that would each have to remember it.
 */
/**
 * What an action will actually cost, after whoever is on the payroll.
 *
 * Split out from `spendEnergy` so the refusal messages can quote the real
 * number. A screen that says "that takes 8 energy" while the charge is 6 is a
 * screen that has started lying, and it is the kind of lie nobody reports.
 */
function effectiveEnergy(state: GameState, amount: number, opts?: { admin?: boolean }): number {
  return opts?.admin
    ? Math.max(1, Math.round(amount * crewBonuses(state.crew).adminEnergy))
    : amount;
}

function spendEnergy(state: GameState, amount: number, opts?: { admin?: boolean }): boolean {
  const p = state.player;
  if (!p) return false;
  const cost = effectiveEnergy(state, amount, opts);
  if (p.energy < cost) return false;
  p.energy = Math.max(0, p.energy - cost);
  return true;
}

/**
 * Is this song actually out in the world?
 *
 * Masters recorded through the studio sit in `state.songs` with
 * `masterStatus: 'recorded' | 'mixed' | 'mastered'` and must not earn streams
 * or appear on a chart until they are released. Legacy songs created before the
 * studio editor existed carry no `masterStatus` at all, and those are live —
 * hence the `undefined` check rather than a plain equality.
 */
function isReleased(song: Song): boolean {
  return isSongReleased(song);
}

/**
 * The same rule, re-exported.
 *
 * The definition lives in `sim/release.ts` now, because the engines need it and
 * a sim module cannot import the store without a cycle. It is re-exported from
 * here so the screens that already import it from this module keep working —
 * and so there is still exactly ONE copy of the test, which is the point.
 */
export { isSongReleased };

/** Only the songs that should compete for streams and chart positions. */
function liveSongs(songs: Song[]): Song[] {
  return songs.filter(isReleased);
}

/**
 * Put a vault master out as a track on a project.
 *
 * A project is not a new thing the game invents, but it IS the moment its
 * unreleased tracks come out. In real life the tracklist is settled before
 * anybody hears it, and finishing the album is how those songs arrive — so
 * bundling a finished-but-unreleased master into a project releases it.
 *
 * This is deliberately the small subset of `releaseMaster` that makes a record
 * live, and not the whole rollout. There is no separate marketing budget (the
 * project carries the push), no energy cost (the session is already paid for)
 * and no second release day, because it is not a second release.
 */
function releaseAsProjectTrack(state: GameState, song: Song): void {
  song.masterStatus = 'released';
  song.releaseDate = formatGameDate(state.gameDate);
  song.weeksOut = 0;
  song.marketingBudget = 0;
  // `undefined` means everywhere — a project is not a platform decision.
  song.platformIds = undefined;
  song.weeklyStreams = Math.max(50, Math.round(song.quality * 12));
}

/**
 * Nudge the player's momentum.
 *
 * Momentum is the industry's attention on you right now, and it is deliberately
 * the one stat with no way to grind it. It moves when something actually
 * happens and it bleeds when nothing does, so the number means something.
 *
 * A gain large enough to notice says so in the feed. Small routine gains stay
 * quiet — a running commentary on a slowly rising bar is noise, and the screens
 * that show momentum explain the sources instead.
 */
function addMomentum(state: GameState, amount: number, reason?: string): void {
  if (!state.player || amount === 0) return;
  const before = state.player.career.momentum;
  const after = Math.max(0, Math.min(100, before + amount));
  state.player.career.momentum = Math.round(after * 10) / 10;
  const delta = after - before;
  if (reason && delta >= 2) {
    state.lastEventLog.unshift(`🔥 Momentum +${delta.toFixed(1)} — ${reason}`);
    state.lastEventLog = state.lastEventLog.slice(0, 10);
  }
}

// ─── SAVE/LOAD HELPERS ────────────────────────────────────────────────────

// The save system now lives in `store/saves.ts` — multiple careers, an index,
// and a migration path for the single-slot save this game used to ship with.
// See that file for why `newGame` deleting the save was a data-loss bug rather
// than a missing feature.

// ─── CLOCK CONSTANTS ───────────────────────────────────────────────────────

const MINUTES_PER_DAY = 24 * 60;
/** Game minutes per real second at 1×. A full day is a couple of real minutes. */
export const GAME_MINUTES_PER_TICK = 10;
/** The clock ticks on a one-second interval, so this is also minutes/second. */
export const CLOCK_TICK_MS = 1000;
/** Most days a single tick may catch up on, after a backgrounded tab. */
const MAX_CLOCK_CATCHUP_DAYS = 2;

/**
 * Write a payload into the active slot and record the outcome on the state.
 *
 * Every write goes through here so a failure is never silent, and the slot is
 * always read off the state rather than assumed — the auto-save and a manual
 * save must not be able to disagree about which career they are writing to.
 *
 * Called from inside a `set()` producer, because it assigns.
 */
function saveToActiveSlot(state: GameState, payload: Partial<GameState>): void {
  if (!state.activeSlotId) {
    state.saveError =
      'This career is not attached to a save slot, so nothing is being written. ' +
      'Start a new career, or open one from the careers list.';
    return;
  }
  const result = writeSlot(state.activeSlotId, payload);
  state.saveError = result.ok ? null : result.error;
}

/** Load a slot's payload into state. Shared by `loadGame` and `loadSlot`. */
function applySlotPayload(state: GameState, saved: Partial<GameState>): void {
  Object.assign(state, { ...getInitialState(), ...saved, screen: 'dashboard' });

  // The roster is regenerated deterministically rather than saved — it is
  // far too large for localStorage. Re-apply only the relationships and
  // fame values the player actually changed.
  const roster = buildInitialNPCs();
  const deltas = saved.npcDeltas;
  if (deltas) {
    for (const npc of roster) {
      const d = deltas[npc.id];
      if (!d) continue;
      npc.relationshipScore = d.r;
      npc.relationshipStage = d.s;
      if (d.f !== undefined) npc.fame = d.f;
      // How much they have improved since the world was generated.
      if (d.b !== undefined) npc.skillBonus = d.b;
      if (d.m) npc.memoryLog = d.m;
      // Without this the cooldown resets on every reload, which turns "you
      // spoke to them yesterday" into a button you can hold down.
      if (d.t !== undefined) npc.lastReachOut = d.t;
    }
  }
  state.npcs = roster;

  // Saves written before the energy system existed have no `energy`
  // field. Fill it in rather than letting every action silently refuse.
  if (state.player) {
    if (typeof state.player.maxEnergy !== 'number') state.player.maxEnergy = MAX_ENERGY;
    if (typeof state.player.energy !== 'number') state.player.energy = state.player.maxEnergy;
  }
  // Saves written before the show rebuild have no city memory. An ABSENT key is
  // filled in by the `getInitialState()` spread above, but an explicit
  // `undefined` would ride in on `...saved` and crash the first booking with a
  // "cannot read property of undefined" a long way from here.
  if (!state.cityMarkets || typeof state.cityMarkets !== 'object') state.cityMarkets = {};
  // Same again for tours: a save written before tours existed has no key at
  // all, but an explicit `undefined` would ride in on `...saved` and the tick
  // would try to walk it on the very first day.
  if (!Array.isArray(state.tours)) state.tours = [];
  // Shows announced before this existed: absent key is filled by the initial
  // state, but an explicit `undefined` would crash the first tick.
  if (!Array.isArray(state.scheduledShows)) state.scheduledShows = [];
  if (!Array.isArray(state.showOffers)) state.showOffers = [];
  if (!Array.isArray(state.bookedGigs)) state.bookedGigs = [];
  // And the studio. A save written before the room existed has no key, and an
  // explicit `undefined` would ride in on `...saved` and crash the first
  // purchase with "cannot read levels of undefined".
  if (!state.studio || typeof state.studio !== 'object') state.studio = { levels: {} };
  if (!state.studio.levels || typeof state.studio.levels !== 'object') state.studio.levels = {};
  // And the beefs, for the same reason as `tours`: absent, explicitly
  // `undefined`, or a stale shape would all make the first `beefs.length` or
  // `beefs.find` throw somewhere far away from here.
  if (!Array.isArray(state.beefs)) state.beefs = [];
  if (!Array.isArray(state.sampleClearances)) state.sampleClearances = [];
  if (!Array.isArray(state.payolaCampaigns)) state.payolaCampaigns = [];
  if (!Array.isArray(state.scoutMissions)) state.scoutMissions = [];
  if (!Array.isArray(state.industryNotices)) state.industryNotices = [];
  if (!state.family || typeof state.family !== 'object') state.family = { children: 0, monthlyChildSupport: 0 };
  if (!state.legacy || typeof state.legacy !== 'object') state.legacy = { retired: false, legacyScore: 0, titles: [], comebackAttempts: 0 };
  // The label. Absent on older saves; and because the roster is regenerated
  // from its seed, the label's artists get their grown fame and their label
  // name back from the label's own records.
  if (!state.label || typeof state.label !== 'object') state.label = null;
  if (state.label) {
    const label = state.label;
    for (const k of ['roster', 'alumni', 'pitches', 'prospects', 'staff', 'history', 'events'] as const) {
      if (!Array.isArray(label[k])) (label as unknown as Record<string, unknown[]>)[k] = [];
    }
    const live = new Map(
      label.roster
        .filter((s) => s.status === 'active' || s.status === 'dispute' || s.status === 'expiring')
        .map((s) => [s.npcId, s]),
    );
    for (const npc of state.npcs) {
      const s = live.get(npc.id);
      if (!s) continue;
      npc.fame = s.fame;
      npc.team = { ...(npc.team ?? {}), label: label.name };
    }
  }
  // The feed cooldown and the tagging quota are optional, so a missing key is
  // fine — but a MALFORMED one is not. A quota without a serial would never
  // reset and would cap the player forever, which is exactly the kind of bug
  // that only shows up two weeks into a career.
  if (state.feedRefreshedAt !== undefined && typeof state.feedRefreshedAt !== 'number') {
    state.feedRefreshedAt = undefined;
  }
  if (
    state.tagQuota !== undefined &&
    (typeof state.tagQuota !== 'object' ||
      state.tagQuota === null ||
      typeof state.tagQuota.serial !== 'number' ||
      typeof state.tagQuota.count !== 'number')
  ) {
    state.tagQuota = undefined;
  }
  state.saveError = null;
}

/**
 * Only NPCs the player has actually interacted with need saving.
 *
 * The full roster is ~12,000 records and would blow past the ~5MB localStorage
 * ceiling on its own. Because `generateNPCs()` is seeded and deterministic, the
 * roster can be rebuilt identically on load — we just need to know what changed.
 */
type NPCDelta = {
  r: number;
  s: RelationshipStage;
  f?: number;
  b?: number;
  m?: string[];
  /** Day serial of the last deliberate reach-out, for the cooldown. */
  t?: number;
};

function collectNPCDeltas(npcs: NPC[]): Record<string, NPCDelta> {
  const deltas: Record<string, NPCDelta> = {};
  for (const npc of npcs) {
    const touched =
      npc.relationshipScore !== 0 ||
      npc.relationshipStage !== 'acquainted' ||
      npc.memoryLog.length > 0 ||
      (npc.skillBonus ?? 0) !== 0 ||
      npc.lastReachOut !== undefined;
    if (!touched) continue;
    deltas[npc.id] = {
      r: npc.relationshipScore,
      s: npc.relationshipStage,
      m: npc.memoryLog.slice(-20),
    };
    // Growth is carried separately from the roster, because the roster is
    // regenerated from its seed on every load — anything not written here is
    // gone the moment the tab closes.
    if (npc.skillBonus) deltas[npc.id].b = npc.skillBonus;
    if (npc.lastReachOut !== undefined) deltas[npc.id].t = npc.lastReachOut;
  }
  return deltas;
}

// ─── INITIAL STATE ────────────────────────────────────────────────────────

const INITIAL_GAME_DATE: GameDate = { day: 1, month: 1, year: 2024 };

function buildInitialNPCs(): NPC[] {
  // Three layers, in priority order:
  //   1. the real headliners, each with their manager expanded inline
  //   2. the small hand-written support cast for the player's own city
  //   3. the procedurally generated scene around them
  //
  // The big roster is generated, not persisted — it is stable across runs
  // because `generateNPCs` is seeded per country.
  const handWritten = [...buildRealArtists(), ...INITIAL_NPCS, ...FAN_ACCOUNT_NPCS];
  const all = [...handWritten, ...generateNPCs()];

  // Generated names can collide with a hand-written one ("Sarkodie Mensah" is
  // fine, a second "Drake" is not). First writer wins, and since the generated
  // pool is appended last, the curated roster always takes precedence.
  const seenNames = new Set<string>();
  const deduped: typeof all = [];
  for (const npc of all) {
    const key = npc.name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    deduped.push(npc);
  }

  const seated = deduped.map((npc) => ({
    ...npc,
    relationshipScore: 0,
    relationshipStage: 'acquainted' as RelationshipStage,
    memoryLog: [],
  }));

  // The four seats the scene never had — personal assistant, accountant,
  // trainer, vocal coach — are assigned here, after the roster has been built,
  // by a pure function of the id. They cannot come from the role draw: adding
  // them to `ROLE_WEIGHTS` would shift every subsequent draw in that country
  // and reshuffle the world's names, tiers and fame under a running save. See
  // `applyTeamSeats`.
  return applyTeamSeats(seated);
}

/**
 * Seed the world with an existing body of NPC music so the charts are already
 * a real competitive field on day one — the player is walking into a scene that
 * was already moving, not an empty room.
 */
function buildInitialNPCSongs(npcs: NPC[]): Song[] {
  const songs: Song[] = [];

  // The roster is thousands strong, but only the notable artists should
  // arrive with a back-catalogue. Take the most famous names so day-one
  // charts are full of believable records without seeding thousands of songs.
  //
  // Deliberately seeded BELOW the live-pool ceiling. The world's song pool used
  // to start already full, which left `npcReleaseTick` with no headroom and
  // meant no NPC ever released another record — the scene was frozen on day one.
  // Leaving roughly a quarter of the pool free is what lets the world move.
  const SEED_TARGET = Math.floor(MAX_LIVE_NPC_SONGS * 0.72);
  const artists = npcs
    .filter(n => n.role === 'artist' && n.fame >= 15)
    .sort((a, b) => b.fame - a.fame)
    .slice(0, 170);

  for (const npc of artists) {
    if (songs.length >= SEED_TARGET) break;
    // Established artists already have a few records out.
    const back = npc.fame >= 60 ? 3 : npc.fame >= 35 ? 2 : 1;
    for (let i = 0; i < back; i++) {
      if (songs.length >= SEED_TARGET) break;
      const song = createNPCSong(npc, INITIAL_GAME_DATE);
      // Age them so they sit at different points on the trajectory curve, and
      // so a few are already old enough to retire and free a slot later.
      const age = Math.floor(Math.random() * 40) + 1;
      song.weeksOut = age;
      const decay = Math.pow(0.9, Math.max(0, age - 2));
      song.weeklyStreams = Math.max(120, Math.round(song.weeklyStreams * decay));
      song.totalStreams = Math.round(song.weeklyStreams * (age + 2) * 0.8);
      song.peakWeeklyStreams = Math.round(song.weeklyStreams * 1.4);
      songs.push(song);
    }
  }

  return songs;
}

function getInitialState(): GameState {
  const npcs = buildInitialNPCs();
  const npcSongs = buildInitialNPCSongs(npcs);
  const start = dateToSerial(INITIAL_GAME_DATE);

  return {
    initialized: false,
    screen: 'splash',
    player: null,
    songs: [],
    albums: [],
    npcs,
    dmThreads: {},
    socialPosts: [],
    mailbox: [],
    contracts: [],
    crew: [],
    // Tax. These belong here as well as in the two save literals, and leaving
    // them out was a real bug: `newGame` is `Object.assign(state,
    // getInitialState())`, and `Object.assign` does not clear a key that the
    // source object does not mention. So a new career inherited the previous
    // one's tax year and year-to-date income — starting over after a big year
    // began you already owing the old year's bill.
    taxYear: undefined,
    taxMonth: undefined,
    taxYearIncome: 0,
    taxPaidThisYear: 0,
    taxPaidLifetime: 0,
    // Transient, but a new career must not open on the last one's popup.
    lastTurnReport: null,
    // Which save slot this career lives in. Set by `newGame`/`loadSlot`, and
    // declared here for the same reason the tax fields are: `newGame` is
    // `Object.assign(state, getInitialState())`, which does not clear a key
    // this object does not mention.
    activeSlotId: null,
    saveError: null,
    shows: [],
    // A new career has played nowhere, so no city remembers them. `newGame`
    // goes through `Object.assign`, which does NOT clear a key the source omits
    // — so this has to be here or a new career inherits the last one's cities.
    cityMarkets: {},
    // Same reason as `cityMarkets`: `Object.assign` never clears a key the
    // source omits, so a new career would otherwise inherit the last one's
    // booked dates and find itself on tour in a city it has never played.
    tours: [],
    scheduledShows: [],
    showOffers: [],
    bookedGigs: [],
    // Same trap as `tours`: without this a new artist would inherit the last
    // one's studio, starting a career with somebody else's gear already paid for.
    studio: { levels: {} },
    // Same trap again: `beefs` is a fresh array for a fresh career, and the
    // feed cooldown and the tagging quota are cleared rather than inherited.
    // The quota is the important one — `Object.assign` would carry the last
    // career's count over and a new artist would start the day already capped.
    beefs: [],
    feedRefreshedAt: undefined,
    tagQuota: undefined,
    investments: [],
    businesses: [],
    label: null,
    ownedAssets: [],
    awards: [],
    certifications: [],
    openThreads: [],
    interviews: [],
    headlines: [],
    charts: {},
    weeklyStatements: [],
    gameDate: { ...INITIAL_GAME_DATE },
    // The clock starts at 08:00 on day one and runs on its own from there.
    clockMinute: 8 * 60,
    clockPaused: false,
    clockSpeed: 1,
    turnCount: 0,
    selectedNPCId: null,
    lastEventLog: [],
    cityFame: {},
    sampleClearances: [],
    payolaCampaigns: [],
    scoutMissions: [],
    industryNotices: [],
    family: { children: 0, monthlyChildSupport: 0 },
    legacy: { retired: false, legacyScore: 0, titles: [], comebackAttempts: 0 },
    npcSongs,
    trending: [],
    featureRequests: [],
    inboundRequests: [],
    workItems: [],
    jobBoard: [],
    jobShifts: [],
    jobBoardTurn: -1,

    // ── Streaming, charts and video ───────────────────────────────────────
    // The cursor sits one day behind the start date, so the first day advanced
    // is the first day simulated and no day is ever counted twice.
    platformStats: {},
    streamCursor: start - 1,
    chartWeekCursor: 0,
    globalSongs: [],
    globalAlbums: [],
    chartRuns: {},
    chartMilestones: [],
    globalCerts: [],
    npcAlbums: buildInitialProjects(npcs, npcSongs),
    screenCountry: {},
    recentCountries: [],
    subscriptions: [],
    notifications: [],
    videos: buildInitialVideos({
      songs: npcSongs,
      npcs,
      nowSerial: start,
      nowDate: formatDateString({ ...INITIAL_GAME_DATE }),
    }),
    videoComments: {},
    videoReactions: {},
    commentReactions: {},
    watchHistory: [],

    // Navigation. Deliberately absent from the save snapshot — where you were
    // looking is not part of the world.
    selectedSongId: null,
    selectedVideoId: null,
    selectedArtistId: null,
    selectedPlatformId: PLATFORM_LIST[0].id,
    pendingFeatureNpcId: null,
  };
}

// ─── DATE HELPERS ─────────────────────────────────────────────────────────

function advanceDate(date: GameDate, days: number): GameDate {
  const d = new Date(date.year, date.month - 1, date.day);
  d.setDate(d.getDate() + days);
  return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
}

function calculateAge(dob: string, gameDate: GameDate): number {
  const birth = new Date(dob);
  const game = new Date(gameDate.year, gameDate.month - 1, gameDate.day);
  let age = game.getFullYear() - birth.getFullYear();
  const monthDiff = game.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && game.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

function formatGameDate(date: GameDate): string {
  return `${date.day.toString().padStart(2, '0')}/${date.month.toString().padStart(2, '0')}/${date.year}`;
}

// ─── CHART HELPERS ────────────────────────────────────────────────────────

// The territory-affinity model lives in `sim/affinity.ts` and is shared with the
// streaming engine, so the regional charts and the per-platform country splits
// can never disagree about how far an artist's records travel.

// ─── STREAMING ENGINE WIRING ──────────────────────────────────────────────

/**
 * An NPC's audience, derived from their fame. There is no stored fanbase for
 * NPCs — inventing one would be 12,000 more numbers in the save for no gain.
 */
function npcFanbase(fame: number): number {
  return Math.round(fame * fame * 220);
}

/** How hard a label is pushing an NPC act. Drives airplay, nothing else. */
function npcLabelBacking(npc: NPC | undefined): number {
  if (!npc) return 0.1;
  const hasLabel = !!npc.team?.label;
  const hasManager = !!npc.team?.managerName;
  return Math.min(1, (hasLabel ? 0.5 : 0.12) + (hasManager ? 0.2 : 0) + npc.fame / 260);
}

/** The same thing for the player, read off signed contracts. */
function playerLabelBacking(state: GameState): number {
  const label = state.contracts.some((c) => c.active && c.type === 'label');
  const dist = state.contracts.some((c) => c.active && c.type === 'distribution');
  const fame = state.player ? blendedFame(state.player) : 0;
  return Math.min(1, (label ? 0.6 : 0.05) + (dist ? 0.25 : 0) + fame / 300);
}

function contextForSong(opts: {
  song: Song;
  isPlayer: boolean;
  popularity: number;
  fanbase: number;
  genre: Genre;
  homeCountry: string;
  hasVideo: boolean;
}): StreamContext {
  return {
    quality: opts.song.quality,
    genre: opts.song.genre ?? opts.genre,
    homeCountry: opts.homeCountry,
    artistPopularity: opts.popularity,
    fanbase: opts.fanbase,
    marketing: marketingPush(opts.song.marketingBudget),
    videoViews: opts.hasVideo ? opts.song.videoViews ?? 0 : 0,
    isNpc: !opts.isPlayer,
    weeksOut: opts.song.weeksOut ?? 0,
  };
}

/**
 * Every song that can earn a stream this tick, with the context the engine
 * needs. Built once per turn — the per-day loop reuses it.
 */
function buildStreamActors(state: GameState, npcs: NPC[]): StreamActor[] {
  const npcById = new Map(npcs.map((n) => [n.id, n]));
  const actors: StreamActor[] = [];

  const player = state.player;
  const pPop = player ? blendedFame(player) : 0;
  const pFan = player ? player.career.fanbase : 0;

  for (const song of state.songs) {
    if (!isReleased(song)) continue;
    actors.push({
      songId: song.id,
      ctx: contextForSong({
        song,
        isPlayer: true,
        popularity: pPop,
        fanbase: pFan,
        genre: player?.genre ?? 'hip_hop',
        homeCountry: player?.country ?? 'Ghana',
        hasVideo: !!song.hasVideo,
      }),
      state: undefined as unknown as SongPlatformState,
      platforms: song.platformIds,
    });
  }

  for (const song of state.npcSongs) {
    const npc = song.ownerId ? npcById.get(song.ownerId) : undefined;
    if (!npc) continue;
    actors.push({
      songId: song.id,
      ctx: contextForSong({
        song,
        isPlayer: false,
        popularity: npc.fame,
        fanbase: npcFanbase(npc.fame),
        genre: npc.genre ?? 'hip_hop',
        homeCountry: song.ownerCountry ?? npc.country,
        hasVideo: !!song.hasVideo,
      }),
      state: undefined as unknown as SongPlatformState,
      platforms: song.platformIds,
    });
  }

  return actors;
}

/**
 * Give an existing catalogue record a plausible streaming history, so the world
 * already looks alive on day one instead of every chart starting empty.
 *
 * The history is rebuilt from the *same* trajectory curve the engine will keep
 * using, rather than from the legacy `totalStreams` / `weeklyStreams` scalars.
 * Those two models were an order of magnitude apart, and the mismatch was
 * visible on the first record anyone opened: a seventeen-week-old number one
 * read "3M streams · 2.8M this week", because the stored catalogue figure was
 * ~20K while the engine was running the record at peak.
 *
 * The age has to come from `weeksOut` too. Every seeded record carries the same
 * epoch release date, so `releaseDate` says nothing about how long it has been
 * out — and `tickSongDay` reads age as `serial - state.release`, which made
 * every catalogue song two days old and put it at the top of the curve.
 */
function seedStreamState(
  song: Song,
  ctx: StreamContext,
  nowSerial: number,
): SongPlatformState {
  const weeksOut = Math.max(0, song.weeksOut ?? 0);
  // Back-date the release so the curve knows how far into its life this record
  // already is.
  const release = Math.min(
    serialOfGameDate(song.releaseDate, nowSerial),
    nowSerial - weeksOut * 7,
  );
  const st = newSongPlatformState(song.id, release, weeksOut);
  const age = Math.max(0, nowSerial - release);
  const weights = platformWeights(ctx, age);
  const allowed = song.platformIds;
  const pop = popularityFactor(ctx) * DAILY_STREAM_SCALE;

  // Walk the record's whole life once. Every daily value it will ever show —
  // lifetime, this week, the monthly window — comes out of this one pass, so
  // there is nothing left for the two models to disagree about.
  const daily: number[] = [];
  for (let a = 0; a <= age; a++) daily.push(pop * trajectory(st.seed, a));

  let peak = 0;
  for (const p of PLATFORM_LIST) {
    const share = weights[p.id] ?? 0;
    const slice = st.byPlatform[p.id] ?? (st.byPlatform[p.id] = { t: 0, d: [] });
    // A record that was never delivered to a platform has no history there.
    if (share <= 0 || (allowed && !allowed.includes(p.id))) {
      slice.t = 0;
      slice.d = [];
      continue;
    }
    slice.t = Math.round(daily.reduce((s, v) => s + v, 0) * share);
    slice.d = daily.slice(-PLATFORM_HISTORY_DAYS).map((v) => Math.round(v * share));
    for (const v of slice.d) peak = Math.max(peak, v);
  }

  st.hist = daily.slice(-HISTORY_DAYS).map((v) => Math.round(v));
  st.peakDay = Math.max(peak, ...st.hist, 0);

  return st;
}

/** Local date parser — `serialOf` in gameClock needs the fallback spelled out. */
function serialOfGameDate(s: string | undefined, fallback: number): number {
  const parsed = parseGameDate(s);
  return parsed ? dateToSerial(parsed) : fallback;
}

/**
 * Channel subscribers for an artist. Deterministic, and it grows with fame the
 * way a real channel does — superlinearly, but far slower than streams.
 */
function channelSubscribers(fame: number, fanbase: number): number {
  return Math.round(Math.pow(Math.max(0, fame), 2.35) * 210 + Math.max(0, fanbase) * 0.1);
}

/** How big the record behind a video is, 0-100, blending quality and reach. */
function songPopularityOf(song: Song | undefined, lifetimeStreams: number): number {
  if (!song) return 30;
  const reach = Math.min(1, Math.log10(1 + Math.max(0, lifetimeStreams)) / 7.6);
  return Math.max(5, Math.min(100, song.quality * 0.58 + reach * 46));
}

/**
 * What the comment section needs to know about a video to write honest
 * comments. Reads the real numbers — a flop gets criticised, a smash gets jokes.
 */
function commentContextFor(state: GameState, video: Video): CommentContext {
  const player = state.player;
  const isPlayer = video.isPlayer;

  let popularity: number;
  let relationship = 0;
  if (isPlayer && player) {
    popularity = blendedFame(player);
  } else {
    const npc = (raw(state.npcs) as NPC[]).find(n => n.id === video.artistId);
    popularity = npc?.fame ?? 30;
    relationship = npc?.relationshipScore ?? 0;
  }

  const onChart = (state.globalSongs ?? []).some(r => r.itemId === video.songId);

  return {
    performance: performanceOf(video, popularity),
    artistPopularity: popularity,
    genre: video.artistGenre ?? 'hip_hop',
    isPlayer,
    songTitle: video.songTitle,
    artistName: video.artistName,
    relationship,
    onChart,
  };
}

interface VideoActor {
  video: Video;
  ctx: VideoContext;
  songId: string;
}

/**
 * Every video that can earn a view this tick, with the context the engine needs.
 * Built once per turn; the per-day loop reuses it and refreshes the numbers that
 * change as the days pass.
 */
function buildVideoActors(state: GameState, npcs: NPC[], videos: Video[]): VideoActor[] {
  const npcById = new Map(npcs.map((n) => [n.id, n]));
  const songById = new Map<string, Song>();
  for (const s of state.songs) songById.set(s.id, s);
  for (const s of state.npcSongs) songById.set(s.id, s);

  const player = state.player;
  const out: VideoActor[] = [];

  for (const video of videos) {
    if (video.removed) continue;
    const song = songById.get(video.songId);
    const st = state.platformStats?.[video.songId];
    const lifetimeStreams = st ? songTotals(st).lifetime : 0;

    let popularity: number;
    let subscribers: number;
    if (video.isPlayer && player) {
      popularity = blendedFame(player);
      subscribers = channelSubscribers(popularity, player.career.fanbase);
    } else {
      const npc = npcById.get(video.artistId);
      popularity = npc?.fame ?? 30;
      subscribers = channelSubscribers(popularity, npc ? npcFanbase(npc.fame) : 0);
    }

    out.push({
      video,
      songId: video.songId,
      ctx: {
        artistPopularity: popularity,
        songPopularity: songPopularityOf(song, lifetimeStreams),
        quality: video.quality,
        budget: video.budget,
        marketing: video.marketingBudget,
        subscribers,
        homeCountry: video.artistCountry,
        genre: video.artistGenre ?? song?.genre ?? 'hip_hop',
        songStreams: lifetimeStreams,
      },
    });
  }

  return out;
}

/**
 * Run the streaming AND video engines over every day that has not been
 * processed yet.
 *
 * This is the guarantee that a skipped month processes all thirty days, and that
 * no day is ever counted twice: the cursor only ever moves forward, and it moves
 * to the day the clock has just reached.
 *
 * The two engines share this one loop on purpose. A video's views are folded
 * back into its song's stream context *before* that same day's streams are
 * computed, so a viral visual lifts its record the same day it goes viral —
 * without a second cursor that could drift out of step with this one.
 */
function advanceStreamingDays(
  state: GameState,
  fromSerial: number,
  toSerial: number,
  npcs: NPC[],
  stats: Record<string, SongPlatformState>,
  videos: Video[],
): {
  revenue: number;
  perSong: Record<string, number>;
  revenueBySong: Record<string, number>;
  /** What the player's LABEL records earned, by song. Not the player's money. */
  labelRevenueBySong: Record<string, number>;
  viewsByVideo: Record<string, number>;
  viewsBySong: Record<string, number>;
} {
  const empty = {
    revenue: 0,
    perSong: {} as Record<string, number>,
    revenueBySong: {} as Record<string, number>,
    labelRevenueBySong: {} as Record<string, number>,
    viewsByVideo: {} as Record<string, number>,
    viewsBySong: {} as Record<string, number>,
  };
  if (toSerial < fromSerial) return empty;

  const actors = buildStreamActors(state, npcs);
  const videoActors = buildVideoActors(state, npcs, videos);
  const nowSerial = dateToSerial(state.gameDate);

  // Make sure every actor has a state record, seeding new ones from the
  // catalogue figures the song already carries.
  for (const actor of actors) {
    let st = stats[actor.songId];
    if (!st) {
      const song =
        state.songs.find((s) => s.id === actor.songId) ??
        state.npcSongs.find((s) => s.id === actor.songId);
      st = song
        ? seedStreamState(song, actor.ctx, nowSerial)
        : newSongPlatformState(actor.songId, nowSerial, 0);
      stats[actor.songId] = st;
    }
    // Second winds belong to the record, not to this derived state. The
    // streaming state is rebuilt from the seed on every load, so without this
    // a remix the player paid for would quietly disappear the next time the
    // page was opened.
    const owner =
      state.songs.find((s) => s.id === actor.songId) ??
      state.npcSongs.find((s) => s.id === actor.songId);
    if (owner?.revivals?.length) {
      st.revivals = owner.revivals.map((r) => ({ ...r }));
    }
    actor.state = st;
  }

  // Lifetime video views per song, which is what the stream engine reads.
  const videoViewsBySong: Record<string, number> = {};
  for (const va of videoActors) {
    videoViewsBySong[va.songId] = (videoViewsBySong[va.songId] ?? 0) + va.video.views;
  }
  const actorBySong = new Map(actors.map((a) => [a.songId, a]));
  const videoActorsBySong = new Map<string, VideoActor[]>();
  for (const va of videoActors) {
    const list = videoActorsBySong.get(va.songId) ?? [];
    list.push(va);
    videoActorsBySong.set(va.songId, list);
  }

  const perSong: Record<string, number> = {};
  const revenueBySong: Record<string, number> = {};
  const viewsByVideo: Record<string, number> = {};
  const viewsBySong: Record<string, number> = {};
  const playerSongIds = new Set(state.songs.map((s) => s.id));
  // Records released through the player's own label. They pay the LABEL's
  // account, never the player directly — see `labelTick`.
  const labelSongIds = new Set<string>();
  if (state.label) {
    for (const s of [...state.label.roster, ...state.label.alumni]) for (const id of s.releases) labelSongIds.add(id);
  }
  const labelRevenueBySong: Record<string, number> = {};
  let revenue = 0;

  for (let serial = fromSerial; serial <= toSerial; serial++) {
    // ── Videos first, so today's views can lift today's streams ──────────
    for (const va of videoActors) {
      const views = tickVideoDay(va.video, va.ctx, serial);
      if (views <= 0) continue;
      viewsByVideo[va.video.id] = (viewsByVideo[va.video.id] ?? 0) + views;
      viewsBySong[va.songId] = (viewsBySong[va.songId] ?? 0) + views;
      videoViewsBySong[va.songId] = (videoViewsBySong[va.songId] ?? 0) + views;
    }

    // Fold the new view totals back into the stream contexts. The lift is
    // capped and logarithmic, so streams and views cannot compound forever.
    for (const [songId, list] of videoActorsBySong) {
      const actor = actorBySong.get(songId);
      if (!actor) continue;
      actor.ctx.videoViews = videoViewsBySong[songId] ?? 0;
      let lift = 0;
      for (const va of list) lift += streamLift(va.video, va.ctx, serial);
      actor.ctx.marketing = Math.min(1, actor.ctx.marketing + Math.min(0.3, lift * 0.12));
    }

    // ── Then streams ────────────────────────────────────────────────────
    for (const actor of actors) {
      const tick = tickSongDay(actor, serial);
      if (tick.units > 0) {
        perSong[actor.songId] = (perSong[actor.songId] ?? 0) + tick.units;
      }
      // Only the player's records pay the player.
      if (tick.revenue > 0 && playerSongIds.has(actor.songId)) {
        revenue += tick.revenue;
        revenueBySong[actor.songId] = (revenueBySong[actor.songId] ?? 0) + tick.revenue;
      } else if (tick.revenue > 0 && labelSongIds.has(actor.songId)) {
        labelRevenueBySong[actor.songId] = (labelRevenueBySong[actor.songId] ?? 0) + tick.revenue;
      }
    }
  }

  return { revenue, perSong, revenueBySong, labelRevenueBySong, viewsByVideo, viewsBySong };
}

/**
 * NPC artists upload videos on their own.
 *
 * Driven from the *eligible songs*, not from a random sample of the roster.
 * Sampling 26 artists out of ~4,250 and hoping one of them has a record out
 * this month is why the platform used to sit still: the expected yield was
 * about a third of a video per week. Walking the live NPC catalogue instead
 * costs one pass over ~420 records and actually produces uploads.
 */
function npcVideoTick(state: GameState, npcs: NPC[], weekSerial: number): Video[] {
  const videos = state.videos ?? (state.videos = []);
  const already = new Set(videos.map((v) => v.songId));
  const npcById = new Map(npcs.map((n) => [n.id, n]));
  const nowSerial = dateToSerial(state.gameDate);
  const created: Video[] = [];

  /** At most this many new uploads per tick, so the platform stays readable. */
  const MAX_PER_TICK = 4;
  let made = 0;

  for (const song of state.npcSongs) {
    if (made >= MAX_PER_TICK) break;
    if (already.has(song.id)) continue;

    const npc = song.ownerId ? npcById.get(song.ownerId) : undefined;
    if (!npc || npc.role !== 'artist') continue;

    const weeksOut = song.weeksOut ?? 99;
    const chance = npcVideoChance(npc, weeksOut);
    if (chance <= 0) continue;
    if (!npcShootsVideo(npc.id, song.id, weekSerial, chance)) continue;

    const id = `vid-npc-${song.id}`;
    const seed = videoSeed(id);
    const budget = Math.round(2_000 + Math.pow(npc.fame / 100, 1.8) * 180_000);
    const quality = shootQuality({
      directorSkill: Math.min(100, 22 + npc.fame * 0.62),
      budget,
      songQuality: song.quality,
      seed,
    });

    const video = createVideo({
      id,
      songId: song.id,
      songTitle: song.title,
      title: videoTitle(song.title, seed, npc.genre),
      artistId: npc.id,
      artistName: npc.name,
      artistCountry: song.ownerCountry ?? npc.country,
      artistGenre: npc.genre,
      directorId: 'npc-director',
      directorName: npcDirectorName(seed),
      concept: npcConcept(seed),
      visualStyle: npcStyle(seed),
      quality,
      budget,
      marketingBudget: Math.round(budget * 0.25),
      uploadSerial: nowSerial,
      uploadDate: formatDateString(state.gameDate),
      isPlayer: false,
      songQuality: song.quality,
    });

    // The first day's views are earned by the video engine from here on; this
    // only gives the upload a plausible opening day so the channel is not
    // sitting at zero the moment it appears.
    const opening = Math.round(Math.pow(npc.fame / 100, 2) * 26_000 * (0.5 + quality / 200));
    video.views = opening;
    video.hist = [...new Array(29).fill(0), opening];
    video.peakDay = opening;
    video.likes = Math.round(opening * 0.05);
    video.dislikes = Math.round(opening * 0.004);
    video.commentCount = Math.round(opening * 0.0035);

    videos.unshift(video);
    song.hasVideo = true;
    already.add(song.id);
    created.push(video);
    made++;
  }

  if (videos.length > 700) {
    // Keep the platform bounded. Never drop the player's own uploads.
    const playerVideos = videos.filter((v) => v.isPlayer);
    const others = videos
      .filter((v) => !v.isPlayer)
      .sort((a, b) => b.views - a.views)
      .slice(0, Math.max(0, 700 - playerVideos.length));
    state.videos = [...playerVideos, ...others];
  }

  return created;
}


/** How many notifications the feed keeps. */
const MAX_NOTIFICATIONS = 120;

function pushNotification(
  state: GameState,
  n: {
    kind: GameNotification['kind'];
    title: string;
    body: string;
    artSeed: string;
    action?: GameNotification['action'];
  },
): void {
  if (!state.notifications) state.notifications = [];
  const serial = dateToSerial(state.gameDate);
  state.notifications.unshift({
    id: uuidv4(),
    kind: n.kind,
    title: n.title,
    body: n.body,
    artSeed: n.artSeed,
    daySerial: serial,
    // A minute of the day, derived from the notification's own id, so the feed
    // can say "3 hours ago" without the game tracking hours.
    minuteOfDay: 1 + (Math.abs(hashString(n.title + serial)) % 1439),
    read: false,
    action: n.action,
  });
  if (state.notifications.length > MAX_NOTIFICATIONS) {
    state.notifications.length = MAX_NOTIFICATIONS;
  }
}

/**
 * Write a feature request against a record.
 *
 * The ONE place a request is created, so a remix that asks somebody onto it days
 * later goes through exactly the same door as one the player sends by hand — and
 * so the "already waiting on them" rule cannot be true on one path and false on
 * the other.
 *
 * The caller owns the checks (is it your record, are they an artist, have you
 * asked them already) and the energy. This only writes the ask, dates it, and
 * puts it in their DMs.
 *
 * `onDate` is the day the ask goes out, which is NOT always today: a remix asks
 * its guest when the remix is finished, not when the session was booked.
 */
function openFeatureRequest(
  state: GameState,
  song: Song,
  npc: NPC,
  onDate?: GameDate,
): FeatureRequest {
  const when = onDate ?? state.gameDate;
  const days = featureResponseDays(npc as FeatureCandidate);

  const req: FeatureRequest = {
    id: uuidv4(),
    songId: song.id,
    songTitle: song.title,
    npcId: npc.id,
    npcName: npc.name,
    status: 'sent',
    sentDate: formatGameDate(when),
    dueDate: formatGameDate(advanceDate(when, days) as GameDate),
    fee: 0,
    freeVerse: false,
    reason: 'Sent. Now you wait — nothing happens fast in this business.',
  };
  state.featureRequests.push(req);

  // The ask lands in their DMs, so the player can see it sitting there.
  const thread = state.dmThreads[npc.id] ?? { npcId: npc.id, messages: [], unread: 0 };
  thread.messages.push({
    id: uuidv4(),
    npcId: npc.id,
    fromPlayer: true,
    content: `Yo — sending you "${song.title}". Would you jump on it?`,
    timestamp: new Date().toISOString(),
    attachedSongId: song.id,
    read: true,
  });
  state.dmThreads[npc.id] = thread;

  return req;
}

/**
 * Somebody has asked the PLAYER for a verse.
 *
 * The mirror of `openFeatureRequest`, and the one place an inbound ask is
 * created. Two things are deliberately settled here rather than at the UI:
 *
 *  · `ceiling` — the most they will ever pay — is computed once, from who they
 *    are and how much they want this record, and then it does not move. If it
 *    were recomputed per negotiation round the manager's read would be a
 *    different number every time the player looked, which is the opposite of
 *    what a read is for.
 *  · the opening offer, which is always under that ceiling.
 */
function openInboundAsk(
  state: GameState,
  npc: NPC,
  npcSong: Song,
  reason: string,
): InboundRequest {
  const playerFame = state.player ? blendedFame(state.player) : 0;
  const candidate = npc as unknown as InboundCandidate;
  const ceiling = inboundBudget(candidate, npcSong.quality, playerFame);
  const opening = inboundOpeningOffer(ceiling, candidate);

  const req: InboundRequest = {
    id: uuidv4(),
    npcSongId: npcSong.id,
    npcSongTitle: npcSong.title,
    songQuality: npcSong.quality,
    npcId: npc.id,
    npcName: npc.name,
    status: 'open',
    sentDate: formatGameDate(state.gameDate),
    openingOffer: opening,
    offer: opening,
    ceiling,
    reason,
    negotiationRound: 0,
  };
  state.inboundRequests.push(req);

  // It arrives as a DM, because that is what it is — somebody in your messages
  // asking for something.
  const thread = state.dmThreads[npc.id] ?? { npcId: npc.id, messages: [], unread: 0 };
  thread.messages.push({
    id: uuidv4(),
    npcId: npc.id,
    fromPlayer: false,
    content: reason,
    timestamp: new Date().toISOString(),
    attachedSongId: npcSong.id,
    read: false,
  });
  thread.unread += 1;
  state.dmThreads[npc.id] = thread;

  // And a letter, because the Mailbox is the screen of "things people have sent
  // you that want an answer", and this is exactly that.
  state.mailbox.unshift({
    id: uuidv4(),
    from: npc.id,
    fromName: npc.name,
    subject: `${npc.name} wants you on "${npcSong.title}"`,
    body:
      `${reason}\n\n` +
      `They are opening at $${opening.toLocaleString()} for a verse, and they keep their ` +
      `publishing. Nothing about that number is final — name yours and see.`,
    timestamp: new Date().toISOString(),
    read: false,
    type: 'feature_ask',
    inboundRequestId: req.id,
  });

  pushNotification(state, {
    kind: 'feature',
    title: `${npc.name} wants you on a record`,
    body: `They are offering $${opening.toLocaleString()} for a verse on "${npcSong.title}".`,
    artSeed: `npc|${npc.id}`,
    action: { type: 'inbound', id: req.id },
  });

  return req;
}

// ─── WORK IN PROGRESS: THE COMPLETION PATH ────────────────────────────────
//
// A job is ordered in one action and finished here, days later, when the tick
// notices the days are behind it. Everything the completion needs was decided
// and paid for at ORDER time — the money, the energy and the outcome — so this
// cannot re-derive a different answer from a world that has moved on. What it
// does is put the thing into the player's hands.
//
// The one number it must NOT take from the clock is the date: a 30-day sim
// that swallows a 6-day session must still date the master on day 6.

interface RecordWork {
  song: Song;
  growth: number;
  /**
   * Somebody to ask onto the record the moment it lands. Used by a remix whose
   * guest was invited when the session was booked — the ask cannot go out
   * before there is a record to send, and the energy for it was already spent.
   */
  inviteNpcId?: string;
}

interface MixWork {
  songId: string;
  producerId: string;
  producerName: string;
  productionQuality: number;
  quality: number;
  commercialPotential?: number;
  criticalPotential?: number;
  gain: number;
  read: string;
}

interface VideoWork {
  video: Video;
  songId: string;
  songTitle: string;
  releaseSerial: number;
  budget: number;
  marketing: number;
  quality: number;
  directorName: string;
  guestNames: string[];
}

/**
 * A verse the player owes somebody else.
 *
 * Writing for another artist is still writing, so it takes days like anything
 * else — and unlike a session in your own room, the clock started the moment
 * they paid. The fee is banked at AGREEMENT, not here: they pay for the verse,
 * then you deliver it, which is what the player asked for ("he pays me and I
 * send him the verse").
 */
interface VerseWork {
  requestId: string;
  npcId: string;
  npcName: string;
  songId: string;
  songTitle: string;
  /** What the verse will score, from the player's own craft. */
  verseQuality: number;
  fee: number;
}

function finishWork(state: GameState, item: WorkItem, log: string[]): void {
  // The day the work was actually done, not the day the tick noticed.
  const doneSerial = item.startedSerial + item.daysTotal;
  const doneDate = formatGameDate(serialToDate(doneSerial));
  const days = item.daysTotal;

  if (item.kind === 'record') {
    const w = item.payload as RecordWork;
    const song = w.song;
    song.recordingDate = doneDate;
    song.releaseDate = doneDate;
    state.songs.push(song);

    // A real session teaches you something, scaled by how hard you worked.
    const growth = w.growth;
    state.player!.stats.lyricism = Math.min(100, state.player!.stats.lyricism + growth * 0.5);
    state.player!.stats.songwriting = Math.min(100, state.player!.stats.songwriting + growth * 0.5);
    state.player!.stats.creativity = Math.min(100, state.player!.stats.creativity + growth * 0.3);
    state.player!.stats.consistency = Math.min(100, state.player!.stats.consistency + growth * 0.3);
    state.player!.stats.productionKnowledge = Math.min(100, state.player!.stats.productionKnowledge + growth * 0.25);

    addMomentum(state, 2);
    const read = describeScore(song.quality);
    log.push(
      `🎛️ "${song.title}" is finished — ${days} day${days > 1 ? 's' : ''} in the room. ${read}`,
    );

    // A guest who was invited when the session was booked is asked now, because
    // now there is a record to send them. The energy for the ask was spent at
    // booking time, so nothing here can fail for want of it.
    if (w.inviteNpcId) {
      const guest = state.npcs.find((n) => n.id === w.inviteNpcId);
      if (guest && guest.role === 'artist') {
        openFeatureRequest(state, song, guest, serialToDate(doneSerial));
        log.push(`📤 "${song.title}" is out of the room — the ask has gone to ${guest.name}.`);
      }
    }

    pushNotification(state, {
      kind: 'artist_release',
      title: `"${song.title}" is in the vault`,
      body: `${days} days in the studio and it is done. ${read} Mix it, then put it out.`,
      artSeed: `song|${song.id}`,
      action: { type: 'song', id: song.id },
    });
    return;
  }

  if (item.kind === 'mix') {
    const w = item.payload as MixWork;
    const song = state.songs.find((s) => s.id === w.songId);
    if (!song) return;

    song.productionQuality = w.productionQuality;
    song.productionCeiling = w.productionQuality;
    song.producerId = w.producerId;
    song.producerName = w.producerName;
    song.quality = w.quality;
    song.masterStatus = 'mastered';
    if (w.commercialPotential !== undefined) song.commercialPotential = w.commercialPotential;
    if (w.criticalPotential !== undefined) song.criticalPotential = w.criticalPotential;

    // Working with a producer builds the relationship.
    const npc = state.npcs.find((n) => n.id === w.producerId);
    if (npc) {
      npc.relationshipScore = Math.max(-100, Math.min(100, npc.relationshipScore + 4));
      npc.memoryLog = [
        ...npc.memoryLog.slice(-9),
        `[Studio] Mixed and mastered "${song.title}" for ${state.player!.artistName}.`,
      ];
    }
    state.player!.stats.productionKnowledge = Math.min(100, state.player!.stats.productionKnowledge + 0.6);

    log.push(
      `🎚️ ${w.producerName} mixed & mastered "${song.title}" — ${days} days, and it reads ${gradeLabel(song.quality)}.`,
    );
    pushNotification(state, {
      kind: 'artist_release',
      title: `"${song.title}" is mixed`,
      body: `${w.read} Ready to release.`,
      artSeed: `song|${song.id}`,
      action: { type: 'song', id: song.id },
    });
    return;
  }

  if (item.kind === 'video') {
    const w = item.payload as VideoWork;
    const song = state.songs.find((s) => s.id === w.songId);
    const video = w.video;

    // The shoot has to land before the video can go up. If the release date the
    // player picked is now in the past — because the shoot took longer than the
    // gap they left — it goes up the day the edit is done rather than being
    // dated before it existed.
    const uploadSerial = Math.max(w.releaseSerial, doneSerial);
    video.uploadSerial = uploadSerial;
    video.uploadDate = formatGameDate(serialToDate(uploadSerial));

    const forUnreleased = !!song && !isReleased(song);
    const live = !forUnreleased && uploadSerial <= doneSerial;
    video.status = live ? 'published' : 'draft';
    video.published = live;
    video.awaitingRelease = forUnreleased;
    if (!state.videos) state.videos = [];
    state.videos.unshift(video);

    // Only a video that is actually up lifts the record's streams.
    if (live && song) song.hasVideo = true;

    const guestLine = w.guestNames.length
      ? ` ${w.guestNames.join(' and ')} ${w.guestNames.length === 1 ? 'is' : 'are'} in it.`
      : '';
    state.headlines.unshift({
      id: uuidv4(),
      text: forUnreleased
        ? `${state.player!.artistName} Shoots Visuals for "${w.songTitle}"`
        : `${state.player!.artistName} Drops Visuals for "${w.songTitle}"`,
      fullStory: forUnreleased
        ? `A video for "${w.songTitle}" is shot, directed by ${w.directorName}, and is being held back until the record itself comes out. Production quality reads ${gradeLabel(w.quality)}. $${w.budget.toLocaleString()} on the shoot, $${w.marketing.toLocaleString()} on promotion.${guestLine}`
        : `The music video for "${w.songTitle}" is out, directed by ${w.directorName}. Production quality reads ${gradeLabel(w.quality)}. $${w.budget.toLocaleString()} on the shoot, $${w.marketing.toLocaleString()} on promotion.${guestLine}`,
      date: doneDate,
      relatedEntities: [state.player!.id, w.songId],
      priority: 4,
      category: 'general',
    });

    log.push(
      `🎬 The shoot for "${w.songTitle}" wrapped — ${days} day${days > 1 ? 's' : ''} on set with ${w.directorName}. ${forUnreleased ? 'It waits for the record.' : 'It is up.'}`,
    );
    pushNotification(state, {
      kind: 'artist_video',
      title: forUnreleased ? `"${video.title}" is in the vault` : `"${video.title}" is up`,
      body: forUnreleased
        ? `${w.directorName} directed it. It goes up the moment "${w.songTitle}" is released. Quality reads ${gradeLabel(w.quality)}.`
        : `${w.directorName} directed it. Quality reads ${gradeLabel(w.quality)}.`,
      artSeed: `video|${video.id}`,
      action: { type: 'video', id: video.id },
    });
    return;
  }

  if (item.kind === 'verse') {
    const w = item.payload as VerseWork;
    const npc = state.npcs.find((n) => n.id === w.npcId);
    const hostSong = state.npcSongs.find((s) => s.id === w.songId);
    const req = state.inboundRequests.find((r) => r.id === w.requestId);

    // The verse goes on THEIR record. That is the whole job — the player does
    // not get a copy, they get a credit on somebody else's song.
    if (hostSong) {
      hostSong.featuredArtists = [...(hostSong.featuredArtists ?? []), state.player!.id];
      hostSong.featureArtistNames = [...(hostSong.featureArtistNames ?? []), state.player!.artistName];
      // A guest verse lifts the record it lands on, and the lift is the verse's
      // own quality rather than a flat bonus — a lazy sixteen drags a good song
      // down and a great one carries a weak one.
      hostSong.quality = Math.round(
        Math.min(100, hostSong.quality + (w.verseQuality - 55) * 0.18),
      );
    }

    if (req) {
      req.status = 'delivered';
      req.agreedFee = w.fee;
    }

    if (npc) {
      npc.relationshipScore = Math.max(-100, Math.min(100, npc.relationshipScore + 6));
      npc.memoryLog = [
        ...npc.memoryLog.slice(-9),
        `[Feature] ${state.player!.artistName} sent a verse for "${w.songTitle}".`,
      ];
    }

    // Borrowing somebody else's audience moves fame more than momentum: the
    // people are already in the room, they just do not know your name yet.
    const fameGain = npc ? inboundFameGain(npc as unknown as InboundCandidate, blendedFame(state.player!)) : 1;
    state.player!.career.localFame = Math.min(100, state.player!.career.localFame + fameGain * 0.5);
    state.player!.career.nationalFame = Math.min(100, state.player!.career.nationalFame + fameGain * 0.3);
    state.player!.career.internationalFame = Math.min(100, state.player!.career.internationalFame + fameGain * 0.15);
    if (npc) addMomentum(state, inboundMomentumGain(npc as unknown as InboundCandidate), `a verse for ${npc.name}`);
    state.player!.stats.songwriting = Math.min(100, state.player!.stats.songwriting + 0.6);
    state.player!.stats.lyricism = Math.min(100, state.player!.stats.lyricism + 0.5);

    log.push(
      hostSong
        ? `✍️ The verse for ${w.npcName}'s "${w.songTitle}" is sent — ${days} day${days > 1 ? 's' : ''}, and it reads ${gradeLabel(w.verseQuality)}.`
        : `✍️ The verse for ${w.npcName}'s "${w.songTitle}" is written — ${days} day${days > 1 ? 's' : ''}, but the record is no longer in the world. The fee was already paid.`,
    );
    pushNotification(state, {
      kind: 'artist_release',
      title: hostSong ? `Your verse is on "${w.songTitle}"` : `"${w.songTitle}" is gone`,
      body: hostSong
        ? `${w.npcName}'s record is out with you on it. The verse reads ${gradeLabel(w.verseQuality)}.`
        : `You finished the verse for ${w.npcName}, but the record is no longer in circulation. You keep the fee.`,
      artSeed: `song|${w.songId}`,
      action: { type: 'song', id: w.songId },
    });
  }
}

/**
 * Publish the Global Top 100 and Top 200 for every game week the cursor has not
 * seen. Nothing moves mid-week: the chart is a snapshot of the seven days just
 * gone, and it is written to the save so re-opening the page changes nothing.
 *
 * The week published for is the most recent Saturday that has actually been
 * reached, never the Saturday of the week the clock is currently in — that one
 * is still in the future on six days out of seven.
 */
function publishGlobalCharts(state: GameState, npcs: NPC[]): void {
  const weekSerial = lastCompletedWeekSerial(state.gameDate);
  const cursor = state.chartWeekCursor ?? 0;
  if (weekSerial <= cursor) return;

  const stats = state.platformStats ?? {};
  const player = state.player;
  const npcById = new Map(npcs.map((n) => [n.id, n]));

  const songById: Record<string, Song> = {};
  for (const s of state.songs) songById[s.id] = s;
  for (const s of state.npcSongs) songById[s.id] = s;

  // ── Actors ─────────────────────────────────────────────────────────────
  const songActors: ChartActor[] = [];
  for (const song of state.songs) {
    const st = stats[song.id];
    if (!st || !player) continue;
    songActors.push({
      songId: song.id,
      title: song.title,
      artistId: player.id,
      artistName: player.artistName,
      artistCountry: player.country,
      artistPopularity: blendedFame(player),
      labelBacking: playerLabelBacking(state),
      isPlayer: true,
      state: st,
      mergeInto: song.originalSongId,
      videoViewsWeek: song.hasVideo
        ? Math.round(Math.min(song.videoViews ?? 0, (song.weeklyStreams ?? 0) * 0.35))
        : 0,
    });
  }
  for (const song of state.npcSongs) {
    const st = stats[song.id];
    const npc = song.ownerId ? npcById.get(song.ownerId) : undefined;
    if (!st || !npc) continue;
    songActors.push({
      songId: song.id,
      title: song.title,
      artistId: npc.id,
      artistName: npc.name,
      artistCountry: song.ownerCountry ?? npc.country,
      artistPopularity: npc.fame,
      labelBacking: npcLabelBacking(npc),
      isPlayer: false,
      state: st,
      mergeInto: song.originalSongId,
      videoViewsWeek: song.hasVideo
        ? Math.round(Math.min(song.videoViews ?? 0, (song.weeklyStreams ?? 0) * 0.35))
        : 0,
    });
  }

  // ── Songs ──────────────────────────────────────────────────────────────
  const prevSongs = state.globalSongs ?? [];
  const songs = buildSongChart({
    actors: songActors,
    previous: prevSongs,
    runs: state.chartRuns,
  });

  // ── Albums ─────────────────────────────────────────────────────────────
  const projects: Album[] = [...(state.npcAlbums ?? []), ...state.albums];
  const popularityOf = (artistId: string) =>
    artistId === player?.id ? blendedFame(player) : npcById.get(artistId)?.fame ?? 30;
  const labelBackingOf = (artistId: string) =>
    artistId === player?.id ? playerLabelBacking(state) : npcLabelBacking(npcById.get(artistId));

  const albums = buildAlbumChart({
    projects,
    songsById: songById,
    states: stats,
    previous: state.globalAlbums ?? [],
    runs: state.chartRuns,
    popularityOf,
    labelBackingOf,
    playerId: player?.id ?? '',
  });

  // ── Runs ───────────────────────────────────────────────────────────────
  const runs = state.chartRuns ?? {};
  state.chartRuns = extendRuns(runs, 'songs', songs.rows, weekSerial, songs.exited);
  state.chartRuns = extendRuns(state.chartRuns, 'albums', albums.rows, weekSerial, albums.exited);

  // ── Certifications, from real cumulative units ──────────────────────────
  const certs = state.globalCerts ?? (state.globalCerts = []);
  const certByItem = new Map<string, string>();
  for (const c of certs) certByItem.set(c.itemId, c.label);

  const dateStr = formatDateString(state.gameDate);
  const newCerts: GlobalCertification[] = [];

  const considerCert = (itemId: string, title: string, artistId: string, artistName: string, units: number) => {
    const level = certLevelFor(units);
    if (!level) return null;
    const existing = certs.find((c) => c.itemId === itemId);
    if (existing && existing.multiplier >= level.multiplier && existing.level === level.level) return null;
    const cert: GlobalCertification = {
      id: uuidv4(),
      itemId,
      itemTitle: title,
      artistId,
      artistName,
      level: level.level,
      multiplier: level.multiplier,
      units: Math.round(units),
      awardedDate: dateStr,
      label: level.label,
    };
    newCerts.push(cert);
    certByItem.set(itemId, level.label);
    return cert;
  };

  for (const song of state.songs) {
    const st = stats[song.id];
    if (!st || !player) continue;
    const totals = songTotals(st);
    const cert = considerCert(song.id, song.title, player.id, player.artistName, totals.lifetime);
    if (cert) {
      pushNotification(state, {
        kind: 'certification',
        title: `"${song.title}" is certified ${cert.label}`,
        body: `${totals.lifetime.toLocaleString()} lifetime units. That is not luck.`,
        artSeed: `song|${song.id}`,
        action: { type: 'song', id: song.id },
      });
    }
  }

  certs.unshift(...newCerts);
  if (certs.length > 400) certs.length = 400;

  // ── Milestones ─────────────────────────────────────────────────────────
  const already = state.chartMilestones ?? (state.chartMilestones = []);
  const songMiles = detectMilestones({
    chart: 'songs',
    rows: songs.rows,
    previous: prevSongs,
    biggestJump: songs.biggestJump,
    highestDebut: songs.highestDebut,
    already,
    date: dateStr,
    certOf: (id) => (certByItem.has(id) ? { label: certByItem.get(id)! } : null),
  });
  const albumMiles = detectMilestones({
    chart: 'albums',
    rows: albums.rows,
    previous: state.globalAlbums ?? [],
    biggestJump: albums.biggestJump,
    highestDebut: albums.highestDebut,
    already,
    date: dateStr,
  });

  const allMiles = [...songMiles, ...albumMiles];
  if (allMiles.length) {
    already.unshift(...allMiles);
    if (already.length > 300) already.length = 300;
    for (const m of allMiles) {
      if (m.artistId !== player?.id) continue;
      pushNotification(state, {
        kind: 'milestone',
        title: `"${m.itemTitle}" ${m.detail}`,
        body: `${m.chart === 'songs' ? 'BillBoard Global Top 100' : 'BillBoard Global Top 200'} · ${dateStr}`,
        artSeed: `${m.chart}|${m.itemId}`,
        action: { type: 'chart', id: m.chart },
      });
    }
  }

  // ── Notifications for the player's own movement ─────────────────────────
  if (player) {
    const prevById = new Map(prevSongs.map((r) => [r.itemId, r]));
    for (const row of songs.rows) {
      if (!row.isPlayer) continue;
      const before = prevById.get(row.itemId);

      if (row.movement === 'new') {
        pushNotification(state, {
          kind: 'chart_debut',
          title: `"${row.title}" debuts at #${row.position}`,
          body: `BillBoard Global Top 100 · ${row.metric.toLocaleString()} points this week.`,
          artSeed: `songs|${row.itemId}`,
          action: { type: 'chart', id: 'songs' },
        });
      } else if (row.movement === 'reentry') {
        pushNotification(state, {
          kind: 'chart_debut',
          title: `"${row.title}" re-enters at #${row.position}`,
          body: `It came back. ${row.weeks} weeks on the chart in total.`,
          artSeed: `songs|${row.itemId}`,
          action: { type: 'chart', id: 'songs' },
        });
      } else if (row.position === 1 && before?.position !== 1) {
        pushNotification(state, {
          kind: 'chart_number_one',
          title: `"${row.title}" is #1 on the Global Top 100`,
          body: `It took ${row.weeks} weeks to get here.`,
          artSeed: `songs|${row.itemId}`,
          action: { type: 'chart', id: 'songs' },
        });
      } else if (row.movement === 'up' && row.delta >= 5) {
        pushNotification(state, {
          kind: 'chart_move',
          title: `"${row.title}" climbs to #${row.position}`,
          body: `Up ${row.delta} places on the Global Top 100.`,
          artSeed: `songs|${row.itemId}`,
          action: { type: 'chart', id: 'songs' },
        });
      }
    }
    for (const row of songs.exited) {
      if (!row.isPlayer) continue;
      pushNotification(state, {
        kind: 'chart_exit',
        title: `"${row.title}" leaves the Global Top 100`,
        body: `It spent ${row.weeks} weeks on the chart and peaked at #${row.peak}.`,
        artSeed: `songs|${row.itemId}`,
        action: { type: 'chart', id: 'songs' },
      });
    }
  }

  // ── Commit ─────────────────────────────────────────────────────────────
  state.globalSongs = songs.rows;
  state.globalAlbums = albums.rows;
  state.chartWeekCursor = weekSerial;
}

/** How many positions each chart shows. */
export const CHART_SIZE = 10;

/**
 * Build real regional charts from BOTH player and NPC songs.
 * Each market weighs every song's weekly streams by how strong that artist is
 * in that territory, so a local act can top Ghana while a superstar leads the US.
 */
function updateCharts(
  charts: Record<string, ChartEntry[]>,
  songs: Song[],
  npcs: NPC[],
  player: Player | null
): Record<string, ChartEntry[]> {
  const countries = getChartMarkets();
  const updatedCharts: Record<string, ChartEntry[]> = {};
  const npcById = new Map(npcs.map(n => [n.id, n]));

  // Previous positions, so we can show movement and weeks-on-chart.
  const priorByMarket: Record<string, Record<string, ChartEntry>> = {};
  for (const market of countries) {
    priorByMarket[market] = {};
    for (const entry of charts[market] ?? []) {
      priorByMarket[market][entry.songId] = entry;
    }
  }

  for (const market of countries) {
    const prior = priorByMarket[market];
    // Carry the computed weight on the entry itself. An earlier version kept a
    // separate `order` Map and rebuilt it for every market, which meant walking
    // all songs twice per market (71 x 420 x 2) and allocating 71 Maps. Scored
    // entries sort on their own weight instead.
    const scored: Array<ChartEntry & { __weight: number }> = [];

    for (const song of songs) {
      if (song.weeklyStreams <= 0) continue;

      const isPlayerSong = !song.ownerId;
      let artistName: string;
      let artistId: string;
      let home: string;

      if (isPlayerSong) {
        if (!player) continue;
        artistName = player.artistName;
        artistId = player.id;
        home = player.country;
      } else {
        artistName = song.ownerName ?? 'Unknown';
        artistId = song.ownerId!;
        const npc = npcById.get(song.ownerId!);
        home = song.ownerCountry ?? npc?.country ?? '';
      }

      // Territory-weighted performance.
      let weighted = song.weeklyStreams * affinity(home, market);

      // Player fame acts as an additional amplifier in their own markets.
      if (isPlayerSong && player) {
        const fameFactor =
          market === player.country ? player.career.localFame :
          market === 'Africa' ? Math.max(player.career.localFame, player.career.nationalFame) :
          player.career.internationalFame;
        weighted *= 1 + fameFactor / 55;
      }

      if (weighted < 200) continue;

      const previous = prior[song.id];
      scored.push({
        songId: song.id,
        songTitle: song.title,
        artistId,
        artistName,
        position: 0,
        lastPosition: previous?.position ?? 0,
        weeksOnChart: (previous?.weeksOnChart ?? 0) + 1,
        country: market,
        peakPosition: previous?.peakPosition ?? 0,
        __weight: weighted,
      });
    }

    // Rank by weighted performance — this IS the chart.
    scored.sort((a, b) => b.__weight - a.__weight);

    const top = scored.slice(0, CHART_SIZE);
    top.forEach((entry, idx) => {
      entry.position = idx + 1;
      entry.peakPosition = entry.peakPosition === 0 ? entry.position : Math.min(entry.peakPosition, entry.position);
    });

    // Strip the internal ranking weight before the entry becomes chart state.
    updatedCharts[market] = top.map(({ __weight, ...entry }) => entry) as ChartEntry[];
  }

  return updatedCharts;
}

// ─── STORE ACTIONS ────────────────────────────────────────────────────────

interface GameActions {
  // Navigation
  setScreen: (screen: GameScreen) => void;
  selectNPC: (npcId: string | null) => void;
  /** Open the watch screen on a video. */
  openVideo: (videoId: string) => void;
  /** Open an artist page. Pass 'player' for the player's own page. */
  openArtist: (artistId: string) => void;
  /** Open a channel page, which is the video side of an artist. */
  openChannel: (artistId: string) => void;
  /** Switch the streaming screens to a platform. */
  openPlatform: (platformId: string) => void;
  /** Remember the last record a drawer showed, so a refresh restores it. */
  openSong: (songId: string) => void;
  /**
   * Send the player from an artist's profile to the Studio's Features tab with
   * that artist already filtered for. `null` clears the hand-off.
   */
  setPendingFeatureNpc: (npcId: string | null) => void;

  // Player Creation
  createPlayer: (data: {
    artistName: string;
    realName: string;
    dateOfBirth: string;
    gender: Gender;
    genre: Genre;
    continent: string;
    country: string;
    city: string;
    background: Background;
  }) => void;

  // Music
  /**
   * Shoot and publish a music video for a released record. Money is taken up
   * front and the shoot is refused outright if it cannot be afforded.
   */
  createMusicVideo: (payload: MusicVideoPayload) => MusicVideoResult;
  /**
   * What the guests on this record would want to appear in the video, priced
   * before anything is ordered.
   *
   * The dialog and the shoot both go through here, so the number the player
   * reads is the number that gets charged — there is no second, hidden price
   * on the other side of the button.
   */
  quoteCameos: (
    songId: string,
    npcIds: string[],
    budget: number,
  ) => { quotes: CameoQuote[]; total: number; qualityBonus: number };
  /** Take a video off the platform. Its views stay on the record. */
  deleteVideo: (videoId: string) => void;
  /** Pull the next page of comments into the save, so replies stay stable. */
  loadComments: (videoId: string) => void;
  /** Leave a comment, or reply to one. */
  postComment: (videoId: string, content: string, parentId?: string) => void;
  /** Remove one of the player's own comments. */
  deleteComment: (videoId: string, commentId: string) => void;
  /** Like or dislike a comment. One reaction, changeable. */
  reactToComment: (commentId: string, value: 1 | -1) => void;

  /** Record a full song through the studio editor. Leaves it as an unreleased master. */
  createStudioSong: (payload: StudioSessionPayload) => StudioSessionResult | null;
  /**
   * Buy the next rung of a piece of gear for the player's own studio.
   *
   * Levels REPLACE, so this is not "add a bonus" — it is one purchase that
   * makes the slot better than it was. Refuses out loud when the money is not
   * there, because a button that does nothing is worse than one that says why.
   */
  buyGear: (slotId: GearSlotId) => { ok: boolean; message: string };
  /** Hire a producer to mix and master a recorded song. Raises production quality. */
  mixMasterSong: (songId: string, producerId: string) => MixResult | null;
  /** Put a recorded master out into the world. */
  releaseMaster: (songId: string, marketingBudget: number, platformIds?: string[]) => void;
  /**
   * Bundle released masters into an album or EP.
   *
   * Returns a result rather than failing silently: the Studio renders the
   * reason, because a button that does nothing is worse than a button that
   * says why.
   */
  createAlbum: (data: {
    title: string;
    songIds: string[];
    type: 'album' | 'ep';
  }) => { ok: true; albumId: string } | { ok: false; error: string };
  /** Scrap a recorded master. Partial refund of the studio cost. */
  scrapMaster: (songId: string) => void;
  /**
   * Rewrite the lyric sheet on a recorded (unreleased) master. Rescores the
   * lyric read and drops a mixed master back to a rough one — new words mean
   * the mix has to be revisited.
   */
  updateMasterLyrics: (songId: string, lyrics: string) => VaultActionResult;

  // ── Studio Vault ───────────────────────────────────────────────────────
  /**
   * Archive a master: out of the active vault, still in the game. Archiving is
   * not deleting — only the player decides which of the two it is.
   */
  archiveSong: (songId: string) => VaultActionResult;
  unarchiveSong: (songId: string) => VaultActionResult;
  /**
   * Retitle a master that is still in the vault.
   *
   * A working title is not a decision. Records sit for months under "Untitled
   * 3" and get named the week they go out, and there is nothing in the world
   * that depends on the name of something nobody has heard — so this is free,
   * instant and reversible. Once a record is released the name is out there
   * and this refuses, because the charts, the streams and other people's
   * catalogues are all holding the old one.
   */
  renameSong: (songId: string, title: string) => VaultActionResult;
  /**
   * Throw a master away for good. Only masters that were never released can be
   * deleted: once a record is out it has streams, chart history and a place in
   * other people's catalogues, and "deleting" it would leave the world holding
   * a reference to something that is not there. Archived is the reversible
   * version of this, and the vault offers both.
   */
  deleteSong: (songId: string) => VaultActionResult;
  /** Flag a master as ready to go out. */
  setReadyToRelease: (songId: string, ready: boolean) => VaultActionResult;
  /** Leave a note on a vault master. */
  setVaultNote: (songId: string, note: string) => VaultActionResult;
  /**
   * Swap the producer and/or the beat on an unmixed master, then rescore it.
   * The record drops back to a rough master — new material has to be mixed.
   */
  swapProduction: (
    songId: string,
    producerId: string | null,
    beatId: string,
  ) => VaultActionResult;
  /**
   * A fresh take on a master you already have. Creates a NEW record linked to
   * the source; the original is left exactly as it was until the player decides
   * to archive or scrap it.
   */
  rerecordSong: (
    songId: string,
    payload: StudioSessionPayload,
  ) => StudioSessionResult | null;

  // ── Remixes of released records ────────────────────────────────────────
  /**
   * Rework a record that is already out. The remix is its own linked song —
   * both versions keep their own stats and chart runs — and releasing it gives
   * the original a real second wind.
   */
  createRemix: (data: RemixInput) => RemixResult;

  // ── Deluxe editions and mixtapes ───────────────────────────────────────
  /** Reopen a released project and add tracks as a deluxe edition. */
  createDeluxe: (
    albumId: string,
    songIds: string[],
  ) => { ok: true; albumId: string } | { ok: false; error: string };
  /** A mixtape: the loose format. Fewer rules, less commercial weight. */
  createMixtape: (data: {
    title: string;
    songIds: string[];
  }) => { ok: true; albumId: string } | { ok: false; error: string };

  /** Push a finished video to the platform. */
  publishVideo: (videoId: string) => VaultActionResult;

  // Features (negotiation)
  /** Send a track to an artist's DMs. The reply lands days later. */
  /**
   * Put a track in somebody's DMs and start a negotiation.
   *
   * Returns a reason either way. It used to return `null` for every refusal —
   * no money, no energy, already talking to them, already on the record — which
   * meant the button did nothing and said nothing, and the player had no way to
   * tell which of those it was.
   */
  sendFeatureRequest: (songId: string, npcId: string) => FeatureActionResult;
  /**
   * Push back on a price. The artist moves, holds, or walks — see
   * `counterFeatureFee` for the arithmetic. Capped at three rounds.
   */
  counterFeatureOffer: (requestId: string, offer: number) => FeatureActionResult;
  /** Accept the quoted fee. The verse becomes available to cut in. */
  payFeatureFee: (requestId: string) => boolean;
  /** Walk away from a negotiation. */
  declineFeatureTerms: (requestId: string) => void;
  /** Fold an agreed verse into the record. This is the button that matters. */
  addFeatureVerse: (requestId: string) => boolean;

  // ── Inbound: somebody wants YOU on their record ─────────────────────────
  //
  // The mirror of the block above, and the information runs the other way: the
  // artist knows what the verse is worth to them and the player does not, so
  // the manager's read is the only honest number in the room.
  /**
   * Get the manager's read on an ask: what they think of the record, what to
   * charge, and who the artist is. Free, instant, and snapshotted onto the
   * request so the number the player acted on is the number they can still see.
   */
  readInboundWithManager: (requestId: string) => FeatureActionResult;
  /**
   * Name a price. They take it, come up, or walk — see `decideInboundResponse`.
   * Capped at three rounds, same as the outbound haggle.
   */
  quoteInboundVerse: (requestId: string, quote: number) => FeatureActionResult;
  /** Take the number on the table. */
  acceptInboundOffer: (requestId: string) => FeatureActionResult;
  /** Say no. The artist is told, and the relationship takes it. */
  declineInboundRequest: (requestId: string) => FeatureActionResult;
  /**
   * Write and send the verse. Costs the days a verse takes, and the fee was
   * banked when the number was agreed — they pay, then you deliver.
   */
  sendInboundVerse: (requestId: string) => FeatureActionResult;

  // Jobs
  /** Roll the board for the current turn, if it has not been rolled already. */
  refreshJobBoard: () => void;
  /** Work a shift off the board. Pays out, spends energy and days. */
  workJob: (jobId: string) => { ok: boolean; message: string };

  // DMs
  sendDM: (npcId: string, message: string, attachedSongId?: string) => void;
  /**
   * Spend an evening on somebody, deliberately, to build a relationship.
   *
   * The relationship meter used to only move as a side effect of other
   * business — a DM whose text happened to contain the right word, a verse you
   * had already paid for, an offer you had already accepted. There was no way
   * to decide to get to know a person, which meant a player who wanted a
   * relationship had to wait for one to happen to them. This is that decision.
   *
   * Refuses when it would be a repeat of the same evening, and says how long to
   * wait — a disabled control with no reason is the same as a broken one.
   */
  reachOutToNpc: (npcId: string) => FeatureActionResult;
  markDMRead: (npcId: string) => void;

  // Social
  createPost: (platform: string, content: string, relatedSongId?: string) => void;
  likePost: (postId: string) => void;
  /**
   * Pull a new batch of posts.
   *
   * The feed used to change only when a week passed, which made a "refresh"
   * control either do nothing or be a lie. This generates posts from what is
   * true right now — the charts, the player's own releases, the beefs that are
   * running — stamps the GAME clock, and refuses out loud until the cooldown is
   * up rather than silently doing nothing.
   */
  refreshFeed: () => FeedRefreshResult;
  /**
   * Tag somebody in a post.
   *
   * Whether they answer is a function of the relationship, their fame and how
   * much attention they already get. Capped per game day, because tagging is
   * free and free things get clicked two hundred times.
   */
  tagArtist: (npcId: string, text: string) => FeatureActionResult;
  /**
   * Open a beef with somebody.
   *
   * Starts at rung zero: the argument exists and nothing has been said. From
   * there `beefMove` climbs the ladder, and a rung only opens once the beef is
   * hot enough to justify it — which is what stops this being one "go nuclear"
   * button.
   */
  startBeef: (npcId: string) => FeatureActionResult;
  /** Take a rung of a beef. Costs energy and money, and it can miss. */
  beefMove: (beefId: string, rungLevel: number) => BeefActionResult;
  /** End it — a truce, a concession or a knockout. */
  endBeef: (beefId: string, kind: ChosenResolution) => FeatureActionResult;

  // Shows
  /**
   * The estimate, without committing to anything.
   *
   * The screen calls this on every change of room or price, and it runs the
   * same engine `bookShow` does — so the range the player reads is the range
   * the night was actually planned against, not a second guess that can drift.
   */
  planShowAt: (venueId: string, price: number) => { ok: boolean; message: string; plan?: ShowPlan };
  /**
   * Ring the room and find out what its diary looks like.
   *
   * A venue is not a button. Somebody else's night is often already in it, and
   * finding out costs a phone call — which is exactly what a promoter is for.
   * What comes back covers a much longer stretch of the diary, for half the
   * energy, when somebody on the payroll does this for a living.
   */
  inquireVenue: (
    venueId: string,
    wantedSerial?: number,
  ) => { ok: boolean; message: string; result?: InquiryResult };
  /**
   * Play the show.
   *
   * Takes the ROOM, not a capacity. The old signature let the caller name the
   * capacity, and nothing validated it — which is how a Local Club ended up
   * holding 205,000 people.
   */
  bookShow: (venueId: string, type: ShowType, price: number) => FeatureActionResult;

  /**
   * Plan a run of dates without committing to anything.
   *
   * Runs the SAME engine `bookShow` does, leg by leg, over the same state — so
   * the money the player reads is the money the nights were planned against.
   * What it adds is routing: you cannot play Lagos on Tuesday and London on
   * Wednesday, and the gaps between dates are derived, not chosen.
   *
   * It also names the dates that could NOT be had, and why. A planner that only
   * ever says yes is not a planner.
   */
  planTourAt: (
    stops: TourStop[],
    startSerial?: number,
  ) => { ok: boolean; message: string; plan?: TourPlan };
  /**
   * Commit to the run.
   *
   * Charges the routing up front — the freight and the crew moving between
   * cities is real money that leaves before a single ticket — and locks the
   * nights, so no one-off can be booked on top of a date the tour already sold.
   */
  bookTour: (stops: TourStop[], startSerial?: number) => FeatureActionResult;
  /** Call the run off. Dates already played stay in the history. */
  cancelTour: (tourId: string) => FeatureActionResult;

  // Scheduled shows — announced, sold over weeks, played by the clock.
  showOfferContext: (id: string) => {
    mood: Mood; relationship: number; managerSkill: number; lawyerSkill: number;
    competing: number; traits: Traits; hostTier: 'local' | 'national' | 'international';
    hostFame: number; calendarBusy: boolean;
  } | null;
  counterShowOffer: (id: string, ask: OfferTerms) => { ok: boolean; message: string; outcome?: CounterResult['outcome'] };
  acceptShowOffer: (id: string) => FeatureActionResult;
  declineShowOffer: (id: string, reason: DeclineReason, soften: boolean) => FeatureActionResult;
  quoteDecline: (id: string, reason: DeclineReason, soften: boolean) => import('../sim/offers').DeclineResult | null;
  backOutOfGig: (gigId: string) => FeatureActionResult;
  scheduleShow: (venueId: string, type: ShowType, price: number, serial: number) => FeatureActionResult;
  repriceScheduledShow: (id: string, price: number) => FeatureActionResult;
  promoteScheduledShow: (id: string, tier: 'social' | 'radio' | 'blitz') => FeatureActionResult;
  quoteScheduledCancel: (id: string, reason: CancelReason) => CancelTerms | null;
  cancelScheduledShow: (id: string, reason: CancelReason) => FeatureActionResult;
  quoteScheduledPostpone: (id: string, newSerial: number) => PostponeTerms | null;
  postponeScheduledShow: (id: string, newSerial: number) => FeatureActionResult;

  // Investments
  buyInvestment: (type: Investment['type'], name: string, cost: number, riskLevel: Investment['riskLevel']) => void;
  sellInvestment: (investmentId: string) => void;

  // Businesses
  buyBusiness: (type: Business['type'], name: string, cost: number) => void;
  sellBusiness: (businessId: string) => void;
  // Industry & Life
  requestSampleClearance: (songId: string, sampleName: string, rightsHolder: string) => FeatureActionResult;
  approveSampleClearance: (clearanceId: string) => FeatureActionResult;
  launchPayola: (songId: string, city: string, country: string) => FeatureActionResult;
  completeScoutMission: (missionId: string) => FeatureActionResult;
  retireCareer: () => FeatureActionResult;
  attemptComeback: () => FeatureActionResult;
  choosePostCareerRole: (role: PostCareerRole) => FeatureActionResult;
  acceptChildSupport: (coParentName: string) => FeatureActionResult;
  // Your own record label
  foundLabel: (opts: { name: string; color: string; genreFocus: LabelGenre | 'any'; country?: string }) => FeatureActionResult;
  labelDeposit: (amount: number) => FeatureActionResult;
  labelWithdraw: (amount: number) => FeatureActionResult;
  refreshLabelProspects: () => FeatureActionResult;
  openLabelPitch: (npcId: string, dealType: LabelDealType) => FeatureActionResult;
  labelPitchContext: (pitchId: string) => {
    mood: Mood;
    legalSkill: number;
    lawyerNotes: string[];
    npc: NPC;
    potentialEstimate?: number;
    cap: number;
  } | null;
  counterLabelPitch: (pitchId: string, terms: LabelTerms) => { outcome: 'accepted' | 'countered' | 'refused' | 'walked' | 'error'; message: string };
  signLabelPitch: (pitchId: string) => FeatureActionResult;
  withdrawLabelPitch: (pitchId: string) => void;
  fundLabelRelease: (npcId: string, tier: LabelReleaseTier) => FeatureActionResult;
  promoteLabelSong: (songId: string, amount: number) => FeatureActionResult;
  answerLabelDemand: (npcId: string, answer: 'raise' | 'bonus' | 'refuse') => FeatureActionResult;
  answerRivalOffer: (npcId: string, answer: 'match' | 'sell' | 'refuse') => FeatureActionResult;
  settleLabelDispute: (npcId: string) => FeatureActionResult;
  dropLabelArtist: (npcId: string) => FeatureActionResult;
  labelStaffCandidates: (role: LabelStaffRole) => { npcId: string; name: string; skill: number; salary: number; country: string }[];
  hireLabelStaff: (role: LabelStaffRole, npcId: string) => FeatureActionResult;
  fireLabelStaff: (role: LabelStaffRole) => void;

  // Luxury
  buyLuxuryItem: (itemId: string) => void;

  // Mailbox
  readMail: (mailId: string) => void;
  acceptOffer: (mailId: string, kind?: 'commission' | 'retainer') => TeamActionResult;
  declineOffer: (mailId: string) => void;
  /**
   * Push back on an offer's terms. Each round moves the number in the player's
   * favour and costs them a little goodwill; there are only so many rounds
   * before the other side stops answering.
   */
  negotiateOffer: (mailId: string) => TeamActionResult;

  // ── The team ───────────────────────────────────────────────────────────
  /** Put somebody on the payroll. Returns the reason either way. */
  hireCrew: (npcId: string) => TeamActionResult;
  /** Let somebody go. Costs a month's severance and some goodwill. */
  fireCrew: (crewId: string) => TeamActionResult;
  /** End the management deal. Exclusive by nature — there is only ever one. */
  fireManager: () => TeamActionResult;

  // Interviews
  startInterview: (stationId: string) => void;
  answerQuestion: (interviewId: string, questionIdx: number, tone: InterviewTone) => void;
  completeInterview: (interviewId: string) => void;

  // Turn advancement
  /**
   * Move the game clock forward. `silent` suppresses the turn report — the
   * background clock uses it, because a receipt popping up for time the player
   * did not ask to pass is noise, not information.
   */
  advanceTurn: (unit: 'day' | 'week' | 'month', opts?: { silent?: boolean }) => void;
  /** Clear the report once the player has read it. */
  dismissTurnReport: () => void;

    // ── The running clock ──────────────────────────────────────────────────
    /** Move the clock forward by game minutes, rolling days over as it passes midnight. */
    advanceClock: (minutes: number) => void;
    /**
     * Sleep or rest for a given number of game minutes. Three hours restores
     * energy completely; anything shorter restores the same fraction of the
     * gap. Costs three game hours instead of a whole day, which is the trade.
     */
    rest: (minutes: number) => TeamActionResult;
    setClockPaused: (paused: boolean) => void;
  setClockSpeed: (speed: number) => void;

  // Save/Load
  saveGame: () => void;
  loadGame: () => boolean;
  newGame: () => void;

  // ── Careers on disk ─────────────────────────────────────────────────
  /** Every career in storage, newest first. */
  listSaves: () => SaveSlotMeta[];
  /** Open a career by slot id, leaving every other career untouched. */
  loadSlot: (slotId: string) => boolean;
  /** Start a fresh career in a slot of its own. False when the slots are full. */
  newCareer: () => boolean;
  /** Delete one career. If it was the active one, another is opened. */
  deleteSlot: (slotId: string) => boolean;
  /** Rename a career in the list. */
  renameSlot: (slotId: string, label: string) => void;

  // ── Streaming / charts / video (added 2026-09-28) ──────────────────────

  /** Remember which country a screen is looking at. Each platform keeps its own. */
  setScreenCountry: (screenKey: string, country: string) => void;
  /** Subscribe to an artist, or to their video channel. Persisted. */
  subscribe: (artistId: string, artistName: string, kind: Subscription['kind']) => void;
  unsubscribe: (artistId: string, kind: Subscription['kind']) => void;
  /** Feed a video into the watch history, which drives recommendations. */
  recordWatch: (videoId: string) => void;
  /** React to a video. One reaction per player, changeable, never stackable. */
  reactToVideo: (videoId: string, value: 1 | -1) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  // Stats update
  updatePlayerStat: (stat: keyof ArtistStats, amount: number) => void;
  /**
   * Move somebody's regard for you by a flat amount, with no cost and no rule.
   *
   * This is a direct setter, NOT a player action. It exists so a test can
   * arrange a world in a known state ("a producer who already rates you"), and
   * it used to be wired to a free "+5" button on the profile — which is why
   * relationships felt unobtainable in one direction and free in the other. The
   * deliberate way to build a relationship is `reachOutToNpc`: it costs energy,
   * has a cooldown, and can go badly.
   */
  updateNPCRelationship: (npcId: string, change: number) => void;
  resolveOpenThread: (threadId: string) => void;

  // Training
  trainStat: (stat: keyof ArtistStats, intensity: 1 | 2 | 3) => void;
}

// ─── MUSIC VIDEO TYPES ────────────────────────────────────────────────────

/** Everything the video studio hands over when a shoot is ordered. */
export interface MusicVideoPayload {
  songId: string;
  title: string;
  concept: string;
  visualStyle: string;
  /** Director id, or 'self' to shoot it yourself. */
  directorId: string;
  /** Production spend. */
  budget: number;
  /** Promotion spend on top of production. */
  marketingBudget: number;
  /** Game day serial the video goes up on. Must not be in the past. */
  releaseSerial: number;
  /**
   * Featured artists invited to appear in it, by npc id.
   *
   * They are already on the record, so the verse is settled — this is the
   * separate ask of standing in front of a camera for a day. What each of them
   * wants is decided by `cameoQuote` before the shoot is ordered, and the
   * dialog shows the number. A guest list that cannot be delivered refuses the
   * whole shoot rather than quietly dropping somebody.
   */
  cameos?: string[];
}

export interface MusicVideoResult {
  ok: boolean;
  message: string;
  videoId?: string;
}

/** A director the player can hire. Skill sets the ceiling on the shoot. */
export interface DirectorOption {
  id: string;
  name: string;
  skill: number;
  fee: number;
  style: string;
}

/** The house roster of directors. Original characters, not real people. */
export const VIDEO_DIRECTORS: DirectorOption[] = [
  { id: 'self', name: 'Shoot it yourself', skill: 34, fee: 0, style: 'whatever the phone catches' },
  { id: 'dir-1', name: 'Kofi Lens', skill: 52, fee: 2_500, style: 'street documentary' },
  { id: 'dir-2', name: 'Mara Vex', skill: 63, fee: 9_000, style: 'high-contrast noir' },
  { id: 'dir-3', name: 'Ike Blanks', skill: 71, fee: 24_000, style: 'cinematic wide' },
  { id: 'dir-4', name: 'Nadia Sol', skill: 80, fee: 62_000, style: 'dreamlike colour' },
  { id: 'dir-5', name: 'Theo Kane', skill: 89, fee: 165_000, style: 'one-take narrative' },
  { id: 'dir-6', name: 'Yuki Rae', skill: 95, fee: 420_000, style: 'full short film' },
];

export const VIDEO_CONCEPTS = [
  'performance in one location',
  'narrative short with a twist',
  'night drive and neon',
  'rooftop at golden hour',
  'studio session, raw',
  'dance-led visual',
  'vintage tape montage',
  'split-screen love story',
  'documentary behind the scenes',
  'animated interlude',
];

export const VIDEO_STYLES = [
  'grainy 16mm',
  'high-contrast monochrome',
  'saturated colour grade',
  'soft film emulation',
  'handheld documentary',
  'anamorphic widescreen',
  'minimal, single location',
  'cut-heavy montage',
];

/** Suggested production budgets, so the screen never invents a number. */
export const VIDEO_BUDGETS = [1_000, 5_000, 20_000, 75_000, 250_000, 800_000];

// ─── STUDIO SESSION TYPES ─────────────────────────────────────────────────

/** Everything the studio editor hands to the store when a session wraps. */
export interface StudioSessionPayload {
  title: string;
  genre: Genre;
  bpm: number;
  mood: SongMood;
  lyrics: string;
  vocals: VocalSettings;
  effort: 1 | 2 | 3;
  /** Producer NPC id, or null for self-produced. */
  producerId: string | null;
  /** The specific beat chosen from that producer's catalogue. */
  beatId: string;
  /**
   * A hired ghostwriter, when the player did not write the sheet themselves.
   * Their skill becomes the floor on `lyricsQuality` — see `ghostwriter.ts`.
   */
  ghostwriterId?: string | null;
  /**
   * Set when this session is another go at a master that already exists — see
   * `rerecordSong`. The take is stamped as it is BUILT, because it does not
   * reach `state.songs` until the days are done and by then the action that
   * ordered it has long returned.
   */
  lineageOf?: { songId: string; title: string; takeNumber: number };
  /**
   * A room hired for THIS session, from `RENTAL_ROOMS` in `sim/room.ts`.
   *
   * Charged at session time and not stored on the world, because it is not a
   * thing the player owns — it is a booking, and it is over when the take is.
   * Absent means the session was tracked on the player's own gear.
   */
  roomId?: string | null;
  // NOTE: no feature ids. A song is tracked solo and features are NEGOTIATED
  // afterwards (see `sendFeatureRequest` / `addFeatureVerse`). Being able to
  // bolt a name onto a record at the click of a button was the cheat.
}

/**
 * What comes back from a session.
 *
 * Note the scores are returned for the *editor summary* and for de-duping
 * across the app — the UI is expected to render them through `describeScore`,
 * not print them.
 */
export interface StudioSessionResult {
  songId: string;
  title: string;
  cost: number;
  daysSpent: number;
  scores: StudioScores;
  read: string;
  grade: string;
  splitRead: string;
  chemistryRead: string;
  producerName: string | null;
  featureNames: string[];
  /**
   * True when the session was BOOKED rather than finished. `daysSpent` is then
   * the length of the booking, and the master does not exist yet — it lands
   * when the last day is done. The editor says "in the booth" instead of
   * showing a score for a record nobody has heard yet.
   */
  inProgress?: boolean;
  /** The queued job, so the UI can point at it. */
  workId?: string;
  /** The day the booking finishes, as a game date string. */
  readyOn?: string;
}

/** What a mix session did to a record. */
export interface MixResult {
  /**
   * False when the mix was REFUSED — the record is already with a producer.
   * `read` carries the reason in that case, the way every other refusal in this
   * codebase does.
   */
  ok?: boolean;
  songId: string;
  producerName: string;
  producerSkill: number;
  cost: number;
  daysSpent: number;
  /** How much production quality moved. */
  productionGain: number;
  qualityBefore: number;
  qualityAfter: number;
  read: string;
  /** True when the mix was booked rather than finished — see `StudioSessionResult`. */
  inProgress?: boolean;
  workId?: string;
  readyOn?: string;
}

// ─── VAULT / REMIX RESULTS ────────────────────────────────────────────────

/**
 * Every vault action answers with a reason. A button that silently does nothing
 * is the one failure mode this codebase refuses to ship, so anything the player
 * can press returns whether it worked and, when it did not, why in their words.
 */
export interface VaultActionResult {
  ok: boolean;
  message: string;
  /** The rescored result, when the action changed the record's quality. */
  scores?: StudioScores;
  qualityBefore?: number;
  qualityAfter?: number;
}

/** What the player chose when reworking a released record. */
export interface RemixInput {
  originalSongId: string;
  /** Defaults to "<title> (Remix)" when left blank. */
  title?: string;
  producerId: string | null;
  beatId: string;
  /**
   * Re-written hook and verses. An empty string keeps the original sheet, which
   * is what a straight production remix is.
   */
  lyrics?: string;
  /**
   * Somebody to ask onto the remix, by npc id.
   *
   * A remix is a fresh record with its own room on it, and bringing a new voice
   * to a song everybody already knows is the most common reason to cut one. The
   * ask is the same ask as anywhere else — it goes through
   * `sendFeatureRequest`, so it costs a message, it takes days, and the answer
   * can be a price, a no, or silence. It is not a dropdown that puts somebody on
   * the record.
   */
  inviteNpcId?: string | null;
}

export interface RemixResult {
  ok: boolean;
  message: string;
  /** The new record. It lands in the vault, waiting to be released. */
  songId?: string;
}

// ─── TRAINING ─────────────────────────────────────────────────────────────

/** How long each intensity of training session takes, in days. */
export const TRAINING_DAYS: Record<1 | 2 | 3, number> = { 1: 2, 2: 5, 3: 10 };

/** Flat cash cost per session — studio time, coaches, equipment. */
export const TRAINING_COST: Record<1 | 2 | 3, number> = { 1: 400, 2: 2_500, 3: 9_000 };

/**
 * Gains shrink as a stat approaches its ceiling, so you cannot grind one
 * stat to 100 in a month. Returns the points actually earned.
 */
export function trainingGain(current: number, intensity: 1 | 2 | 3): number {
  const base = intensity === 1 ? 3 : intensity === 2 ? 7 : 14;
  // Falloff: full gains below 50, sharply reduced above 80.
  const headroom = current >= 95 ? 0
    : current >= 80 ? 0.25
    : current >= 65 ? 0.5
    : current >= 50 ? 0.75
    : 1;
  return Math.max(current >= 95 ? 0 : 1, Math.round(base * headroom));
}

export const COACHES: Record<string, { name: string; emoji: string; blurb: string }> = {
  lyricism: { name: 'Writing Coach', emoji: '✍️', blurb: 'Punchlines, structure, wordplay.' },
  flow: { name: 'Flow Drills', emoji: '🎯', blurb: 'Pocket, cadence, switching tempos.' },
  delivery: { name: 'Vocal Booth', emoji: '🎙️', blurb: 'Presence, diction, conviction on the mic.' },
  vocalAbility: { name: 'Vocal Coach', emoji: '🎵', blurb: 'Range, pitch, breath control.' },
  songwriting: { name: 'Songwriting Lab', emoji: '📝', blurb: 'Hooks, bridges, song structure.' },
  freestyle: { name: 'Cypher Sessions', emoji: '🔥', blurb: 'Off-the-dome, no preparation.' },
  stagePresence: { name: 'Stage Rehearsal', emoji: '🎭', blurb: 'Commanding a room.' },
  performance: { name: 'Live Run-Throughs', emoji: '🎤', blurb: 'Full-set stamina and polish.' },
  charisma: { name: 'Media Training', emoji: '✨', blurb: 'Interviews, cameras, personality.' },
  marketing: { name: 'Marketing Course', emoji: '📣', blurb: 'Rollouts, playlists, promo.' },
  networking: { name: 'Industry Events', emoji: '🤝', blurb: 'Working the room properly.' },
  businessKnowledge: { name: 'Business Seminars', emoji: '📊', blurb: 'Contracts, royalties, leverage.' },
  discipline: { name: 'Studio Routine', emoji: '⏰', blurb: 'Showing up, every single day.' },
  beatSelection: { name: 'Beat Digging', emoji: '🎧', blurb: 'Knowing which beat is THE beat.' },
  productionKnowledge: { name: 'Production Bootcamp', emoji: '🎛️', blurb: 'Mixing, tracking, arrangement.' },
  creativity: { name: 'Creative Exercises', emoji: '💡', blurb: 'Breaking your own patterns.' },
  originality: { name: 'Sound Exploration', emoji: '🌟', blurb: 'Finding a voice nobody can copy.' },
  consistency: { name: 'Release Calendar', emoji: '📅', blurb: 'Turning output into a habit.' },
};

// ─── PERFORMANCE: RAW ROSTER VIEW ─────────────────────────────────────────
/**
 * Return a plain (non-draft) view of the roster for READ-ONLY work.
 *
 * Inside a `set()` producer, `state.npcs` is an immer Proxy. Array methods over
 * a Proxy are dramatically slower than over a plain array — v8 cannot use its
 * fast paths, so every single element access goes through a trap. Measured on
 * this roster: one `filter().sort().slice()` costs **6.5 ms plain vs 48 ms
 * through the proxy** — a 7x penalty, paid several times per turn.
 *
 * `current()` unwraps the draft to the underlying plain object, so scans
 * (filtering artists, finding a manager, building a lookup map) run at full
 * speed. It is safe because the result is only ever read: any NPC that must
 * actually change is looked up on the real draft by id.
 */
/**
 * A plain, owned copy of a slice of state.
 *
 * `structuredClone` rather than a spread, because the engines mutate the day
 * arrays *inside* each platform slice — a shallow copy would still hand them
 * the draft's arrays. These are plain numbers and strings, so the clone is
 * cheap; it is the per-write proxy cost it avoids that was expensive.
 */
function clonePlain<T>(value: T): T {
  return structuredClone(value);
}

function raw<T>(value: T): T {
  // GUARD REQUIRED. immer 11 changed `current()` to THROW on a value that is
  // not a draft (`die(10)` — "Cannot use a proxy that has been revoked");
  // immer 10 simply returned it. This helper is called both inside producers,
  // where the value IS a draft, and outside them, where it is already plain —
  // notably `saveGame`, which reads `get()` and is not inside a producer. The
  // unguarded version made the Save button throw every single time, while the
  // auto-save inside `advanceTurn` kept working (it runs inside a producer),
  // which is exactly the kind of split that hides the bug.
  return isDraft(value) ? (current(value as never) as T) : value;
}

// ─── SHOWS: READING THE STATE INTO THE ENGINE ──────────────────────────────
//
// `sim/shows.ts` is pure and knows nothing about the store. These two are the
// only bridge: one reads the live state into the engine's input, the other
// hands back the manager's commission. The screen's preview and the booking
// itself both go through here, so the estimate the player acted on and the show
// that happened cannot drift apart.

/**
 * The manager's commission on the door.
 *
 * A retainer manager takes nothing off the takings — that is what the monthly
 * fee buys — so this returns 0 for them rather than their headline percentage.
 */
function managerCommissionPct(contracts: ActiveContract[]): number {
  const c = contracts.find((x) => x.type === 'management' && x.active);
  if (!c) return 0;
  if (c.terms?.feeKind === 'retainer') return 0;
  const pct = c.terms?.percentage ?? 0;
  // Stored as a percentage (15), not a fraction (0.15). Accept either, because
  // a mis-scaled commission is a silent 100x error in somebody's favour.
  return Math.max(0, Math.min(0.35, pct > 1 ? pct / 100 : pct));
}

// `slotRequirement` used to live here. It moved to `sim/shows.ts` when the tour
// planner arrived: a run of dates has to ask this of every leg before the player
// commits, and a store-private copy could not be reached from there.

/**
 * One city on a run, as the screen asks for it.
 *
 * Deliberately thin — a venue id and a price. Everything the show engine needs
 * is read off the live state, so the UI cannot pass a stale capacity or a
 * fatigue figure the engine would then disagree with.
 */
export interface TourStop {
  venueId: string;
  type: ShowType;
  price: number;
  /** The night the player wants. Omitted means "route it from the travel". */
  wantedSerial?: number;
}

/**
 * How long ago the newest thing the player put out came out.
 *
 * A tour in the weeks after a record draws better than the same tour in a dead
 * month, which is the whole reason an album and a run of dates belong together.
 * Albums carry an exact `releaseSerial`; songs only carry a date string, so
 * those are parsed and an unparseable one is skipped rather than counted as
 * "out today" — a bad date should not mint free buzz.
 */
function daysSinceLastRelease(state: GameState, nowSerial: number): number | null {
  let newest: number | null = null;
  const consider = (serial: number | null) => {
    if (serial === null || serial > nowSerial) return;
    if (newest === null || serial > newest) newest = serial;
  };

  for (const s of state.songs) {
    if (!isReleased(s)) continue;
    const d = parseGameDate(s.releaseDate);
    consider(d ? dateToSerial(d) : null);
  }
  for (const a of state.albums) {
    if (a.releaseSerial !== undefined) consider(a.releaseSerial);
    else {
      const d = parseGameDate(a.releaseDate);
      consider(d ? dateToSerial(d) : null);
    }
  }

  return newest === null ? null : nowSerial - newest;
}

/** Turn the screen's thin stops into everything the tour planner needs. */
function tourStopsFrom(state: GameState, stops: TourStop[]): TourStopRequest[] {
  const out: TourStopRequest[] = [];
  for (const s of stops) {
    const venue = findVenue(s.venueId);
    if (!venue) continue;
    const input = showInputFrom(state, venue, s.price);
    out.push({
      type: s.type,
      venue,
      price: s.price,
      wantedSerial: s.wantedSerial,
      lastShowSerial: state.cityMarkets[venue.city]?.lastShowSerial,
      base: {
        fame: input.fame,
        momentum: input.momentum,
        artistCountry: input.artistCountry,
        cityCountry: input.cityCountry,
        capacity: input.capacity,
        promo: input.promo,
        fatigue: input.fatigue,
        visualMult: input.visualMult,
        managerPct: input.managerPct,
        promoterPct: input.promoterPct,
        cutRelief: input.cutRelief,
        logisticsMult: input.logisticsMult,
        venueHireMult: input.venueHireMult,
      },
    });
  }
  return out;
}

/**
 * The stops whose room could not be resolved.
 *
 * `findVenue` only knows the cities in `SHOW_CITIES`, so a stop built for any
 * other city resolves to nothing — and `tourStopsFrom` drops it with a bare
 * `continue`. The player asks for six dates and gets three, with nothing said
 * about the other three. That is the silent no-op this codebase does not allow,
 * so both `planTourAt` and `bookTour` ask this question FIRST and refuse out
 * loud, before anything is planned or charged.
 */
function unresolvedStops(stops: TourStop[]): TourStop[] {
  return stops.filter((s) => !findVenue(s.venueId));
}

/** The skill of whoever is negotiating for the player in this role, 0 when nobody is. */
function playerNegotiatorSkill(state: GameState, role: 'manager' | 'lawyer'): number {
  const member = (raw(state.crew) as CrewMember[]).find((c) => c.role === role);
  let skill = member?.skill ?? 0;
  if (role === 'manager') {
    const signed = activeManager(raw(state.contracts) as ActiveContract[], raw(state.npcs) as NPC[]);
    if (signed) skill = Math.max(skill, managerSkillOf(signed) ?? 0);
  }
  return skill;
}

/** Whether the player already has something that night. One event per night. */
function playerBusyOn(state: GameState, serial: number): boolean {
  if (state.scheduledShows.some((s) => s.serial === serial)) return true;
  if (state.bookedGigs.some((g) => g.serial === serial)) return true;
  return state.tours.some(
    (t) => t.status !== 'cancelled' && t.legs.some((l) => l.playedSerial === undefined && l.serial === serial),
  );
}

/**
 * Who wants the player on a bill this turn.
 *
 * Returns at most one offer a turn (two on a month jump). Hosts are drawn from
 * the real roster, filtered by an ACCESS rule: you are only invited by people
 * near your own level, or by somebody further up who already likes you.
 */
function rollShowOffers(
  state: GameState,
  npcs: NPC[],
  nowSerial: number,
  days: number,
  hasManager: boolean,
  hasPromoter: boolean,
  songs: Song[],
): ShowOffer[] {
  const player = state.player;
  if (!player) return [];
  const open = state.showOffers.filter((o) => o.status === 'open');
  if (open.length >= 5) return [];

  const fame = blendedFame(player);
  let perDay = 0.08 + fame / 400 + (hasManager ? 0.05 : 0) + (hasPromoter ? 0.04 : 0);
  if (!hasManager) perDay *= 0.6;
  const chance = 1 - Math.pow(1 - perDay, Math.min(days, 14));
  const attempts = days >= 14 ? 2 : 1;
  const out: ShowOffer[] = [];

  const HOST_ROLES = ['promoter', 'venue_owner', 'dj', 'artist'];
  const hostsOpen = new Set(open.map((o) => o.hostId));
  const recentHit = songs.some((s) => (s.releaseDate ? true : false) && s.quality >= 70);

  for (let a = 0; a < attempts; a++) {
    if (Math.random() > chance) continue;
    if (open.length + out.length >= 5) break;

    // Sample the roster rather than sort it — 11k NPCs, one pass, cheap.
    let host: NPC | undefined;
    for (let tries = 0; tries < 60 && !host; tries++) {
      const n = npcs[Math.floor(Math.random() * npcs.length)];
      if (!n || !HOST_ROLES.includes(n.role) || hostsOpen.has(n.id)) continue;
      if (n.country !== player.country && Math.random() > 0.25) continue;
      if (n.role === 'artist') {
        if (n.fame < 8) continue;
        const gap = n.fame - fame;
        if (gap > 40) continue;
        if (gap > 20 && n.relationshipScore < 25) continue;
      }
      host = n;
    }
    if (!host) continue;

    // The room.
    const place =
      SHOW_CITIES.find((c) => c.city === host!.city && c.country === host!.country) ??
      pickFrom(SHOW_CITIES.filter((c) => c.country === player.country)) ??
      SHOW_CITIES[0];
    const venues = venuesInCity(place.city, place.country);
    const cap = host.role === 'artist' ? accessTier(host.fame) : accessTier(fame);
    const allowed = venues.filter((v) => VENUE_CLASSES[v.cls].tier <= cap && (host!.role === 'artist' || !venueLockReason(v, fame)));
    const venue = allowed[allowed.length - 1] ?? venues[0];

    // The night.
    let serial = -1;
    for (let t = 0; t < 12; t++) {
      const s = nowSerial + MIN_LEAD_DAYS[venue.cls] + 3 + Math.floor(Math.random() * 40);
      if (isNightFree(venue, s) && !playerBusyOn(state, s) && !state.showOffers.some((o) => o.status === 'open' && o.serial === s)) {
        serial = s;
        break;
      }
    }
    if (serial < 0) continue;

    const gap = host.fame - fame;
    const billing: OfferBilling =
      host.role === 'artist'
        ? gap >= 25 ? 'guest' : gap >= 8 ? 'support' : 'co_headliner'
        : host.role === 'dj' ? 'guest' : fame < 10 ? 'co_headliner' : 'headliner';
    const kind: ShowOffer['kind'] =
      host.role === 'artist' ? 'invite' : host.role === 'dj' ? 'club_night' : venue.cls === 'hall' || venue.cls === 'arena' ? 'festival' : 'headline';

    out.push(
      buildOffer({
        id: uuidv4(),
        host,
        venueId: venue.id,
        venueName: venue.name,
        city: venue.city,
        country: venue.country,
        capacity: venue.capacity,
        serial,
        nowSerial,
        playerFame: fame,
        relationship: host.relationshipScore,
        billing,
        kind,
        reason: whyInvited({
          relationship: host.relationshipScore,
          playerFame: fame,
          hostFame: host.fame,
          hasManager,
          hasPromoter,
          hit: recentHit,
          roll: Math.random(),
        }),
        hasManager,
        roll: Math.random(),
      }),
    );
    hostsOpen.add(host.id);
  }
  return out;
}

function pickFrom<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

/** Everything a night on somebody else's bill does to the world. */
function playBookedGig(
  state: GameState,
  gig: BookedGig,
  crew: ReturnType<typeof crewBonuses>,
  log: string[],
): void {
  const player = state.player!;
  const venue = findVenue(gig.venueId);
  const host = state.npcs.find((n) => n.id === gig.hostId);
  const hostFame = host?.fame ?? 30;

  // The host drew this crowd, not you — so the room is mostly full whatever
  // you do, and it is the host's name that sets how many.
  const hostFill = Math.min(1, Math.max(0.55, 0.62 + hostFame / 250) * (0.92 + Math.random() * 0.16));
  const audience = Math.round(gig.capacity * hostFill);

  const quality = performanceScore({
    stagePresence: player.stats.stagePresence,
    performance: player.stats.performance,
    charisma: player.stats.charisma,
    consistency: player.stats.consistency,
    stageBonus: crew.stageBonus,
    energyRatio: 1,
    fill: hostFill,
  });

  const merch = Math.round(audience * 2.2 * (gig.terms.merchSplit / 100));
  const reach = affinity(player.country, gig.country);
  const travel = gig.terms.travel
    ? 0
    : Math.round((gig.country === player.country ? 350 : 900 + (1 - reach) * 5200) * crew.logisticsMult);
  const gross = gig.terms.fee + merch;
  const managerCut = Math.round(gross * managerCommissionPct(raw(state.contracts) as ActiveContract[]));
  const net = gross - travel - managerCut;

  const costs: ShowCostLine[] = [];
  if (travel > 0) costs.push({ key: 'travel', label: 'Travel & hotel', amount: travel });
  if (managerCut > 0) costs.push({ key: 'manager', label: "Manager's commission", amount: managerCut, to: 'Manager' });

  const exposure = exposureOf(gig.terms.billing);
  const fameGained = Math.round(Math.min(8, (quality / 100) * 2.5 * exposure + Math.sqrt(audience) / 55));

  const before = player.career.money;
  player.career.money += net;
  player.career.totalEarnings += Math.max(0, net);
  player.career.localFame = Math.min(100, player.career.localFame + fameGained * 0.5);
  if (gig.capacity >= 2500) player.career.nationalFame = Math.min(100, player.career.nationalFame + fameGained * 0.25);
  if (gig.country !== player.country) player.career.internationalFame = Math.min(100, player.career.internationalFame + fameGained * 0.2);
  player.career.reputation = Math.min(100, Math.max(0, player.career.reputation + (quality >= 60 ? 1 : -1)));
  addMomentum(state, quality >= 70 ? 3 : 1);
  player.stats.stagePresence = Math.min(100, player.stats.stagePresence + 0.4);
  player.stats.performance = Math.min(100, player.stats.performance + 0.4);
  player.stats.charisma = Math.min(100, player.stats.charisma + 0.3);
  ledgerAdd('shows', player.career.money - before);

  // The city remembers this too.
  const market = state.cityMarkets[gig.city];
  state.cityMarkets[gig.city] = {
    city: gig.city,
    country: gig.country,
    fatigue: addFatigue(decayedFatigue(market, gig.serial), hostFill * 0.5),
    fatigueSerial: gig.serial,
    lastShowSerial: gig.serial,
    shows: (market?.shows ?? 0) + 1,
  };

  state.shows.push({
    id: uuidv4(),
    type: gig.kind === 'festival' ? 'festival' : 'local_club',
    city: gig.city,
    country: gig.country,
    date: formatGameDate(serialToDate(gig.serial)),
    ticketPrice: 0,
    capacity: gig.capacity,
    attendance: audience,
    performanceQuality: quality,
    moneyEarned: net,
    fameGained,
    completed: true,
    venueId: gig.venueId,
    venueName: gig.venueName,
    venueClass: venue?.cls,
    merch,
    costs,
    gross,
    avgTicket: 0,
    hostName: gig.hostName,
    billing: gig.terms.billing,
  });

  // The host's opinion of you.
  let relDelta = relationshipFromNight(quality, gig.terms.billing);
  let outshone = false;
  if (quality >= 88 && gig.archetype === 'status' && gig.terms.billing !== 'headliner') {
    relDelta = Math.min(relDelta, 3) - 5;
    outshone = true;
  }
  if (host) {
    host.relationshipScore = Math.max(-100, Math.min(100, host.relationshipScore + relDelta));
    host.memoryLog = [`You played their ${gig.city} bill (${quality}/100)`, ...(host.memoryLog ?? [])].slice(0, 10);
  }

  // A touch of the unexpected.
  let extra = '';
  const dice = Math.random();
  if (quality >= 70 && dice < 0.2) {
    extra = ` ${gig.hostName} pulled you back on stage for the finale.`;
    player.career.localFame = Math.min(100, player.career.localFame + 0.5);
  } else if (quality >= 70 && dice < 0.35) {
    extra = ' Somebody from the crowd filmed your set and it started to travel.';
    addMomentum(state, 2);
  } else if (quality < 40 && dice < 0.3) {
    extra = ' A clip of the set is doing the rounds for the wrong reasons.';
  }

  const feel = outshone
    ? ` You outshone the bill and their camp was not thrilled (${relDelta} relationship).`
    : ` ${relDelta >= 0 ? '+' : ''}${relDelta} with ${gig.hostName}.`;
  log.push(
    `🎤 ${gig.hostName}'s bill, ${gig.city} — ${audience.toLocaleString()} in the room, ` +
      `${net >= 0 ? '+' : '−'}$${Math.abs(net).toLocaleString()}, reviewed ${quality}/100.${extra}`,
  );
  state.mailbox.unshift({
    id: uuidv4(), from: 'booking_desk', fromName: 'Booking desk',
    subject: `🎤 Settlement: ${gig.hostName}'s bill, ${gig.city}`,
    body:
      `${BILLING_LABEL[gig.terms.billing]} · ${gig.terms.slotMins} min · ${audience.toLocaleString()} of ${gig.capacity.toLocaleString()} in the room.\n` +
      `Fee $${gig.terms.fee.toLocaleString()} + merch $${merch.toLocaleString()}` +
      `${travel ? ` − travel $${travel.toLocaleString()}` : ''}${managerCut ? ` − commission $${managerCut.toLocaleString()}` : ''}.\n` +
      `Net ${net >= 0 ? '+' : '−'}$${Math.abs(net).toLocaleString()}. Reviewed ${quality}/100.${extra}${feel}`,
    timestamp: new Date().toISOString(), read: false, type: 'general',
  });
}

/**
 * The crowd demand supports for a scheduled show RIGHT NOW.
 *
 * Re-read from the live state every tick, so a hit single that lands between
 * announcement and the night really does lift the on-sale, and a scandal really
 * does sink it. The hidden `luck` is the one thing fixed at announcement.
 */
export function liveShowTarget(state: GameState, show: ScheduledShow, venue: Venue): number {
  const input = showInputFrom(state, venue, show.price, show.serial);
  const promo = input.promo * marketingMult(show.marketingSpend, show.capacity, show.price);
  const d = computeDemand({ ...input, promo });
  return Math.min(venue.capacity, Math.max(0, d.draw * d.elasticity * d.saturation * show.luck));
}

const VENUE_CLASS_LABEL: Record<string, string> = {
  club: 'Club', theatre: 'Theatre', hall: 'Concert hall', arena: 'Arena', stadium: 'Stadium',
};

/**
 * Everything a played night does to the world, in ONE place.
 *
 * `bookShow` and the tour tick both need this, and the moment it exists twice
 * the two copies drift — which is how the old code ended up with two formulas
 * for the same event. So the settlement lives here, and the only thing the
 * callers differ on is whether the calendar moves.
 *
 * `advanceCalendar` is that difference. A single show is played NOW and eats
 * the rest of the day; a tour date arrives on the clock the tour was booked
 * against, so the day has already passed and must not be spent twice.
 */
function applyShowOutcome(
  state: GameState,
  opts: {
    venue: Venue;
    type: ShowType;
    price: number;
    night: ShowSettlement;
    performanceQuality: number;
    /** Energy actually spent, for the log line. */
    energy: number;
    nowSerial: number;
    controversyMult: number;
    advanceCalendar: boolean;
    /** Set when the night belongs to a tour, so history can group it. */
    tourId?: string;
    /**
     * Where the log line goes.
     *
     * `bookShow` wants it on `lastEventLog` immediately. The tick cannot use
     * that: it REPLACES `lastEventLog` wholesale at the end of the turn from
     * its own array, so a direct write from in here would be silently thrown
     * away — and a tour date that plays with no line in the feed is a night the
     * player never sees happen.
     */
    logSink?: string[];
  },
): { attendance: number; fameGained: number; daysOff: number } {
  const { venue, type, price, night } = opts;
  const attendance = night.tickets;
  const nowSerial = opts.nowSerial;
  const market = state.cityMarkets[venue.city];

  const fameGained = Math.round(
    Math.min(6, (opts.performanceQuality / 100) * 3 + Math.pow(Math.max(0, attendance), 0.55) / 60),
  );

  const show: Show = {
    id: uuidv4(),
    type,
    city: venue.city,
    country: venue.country,
    // Dated from the NIGHT, not the clock. The tick can jump thirty days in one
    // go, and a tour date settled at the far end of that jump was still played
    // on its own night — dating it "today" would put three shows on one date.
    date: formatGameDate(serialToDate(nowSerial)),
    ticketPrice: price,
    capacity: venue.capacity,
    attendance,
    performanceQuality: opts.performanceQuality,
    moneyEarned: night.net,
    fameGained,
    completed: true,
    venueId: venue.id,
    venueName: venue.name,
    venueClass: venue.cls,
    merch: night.merch,
    costs: night.costs,
    gross: night.gross,
    avgTicket: attendance > 0 ? Math.round(night.gross / attendance) : 0,
    tourId: opts.tourId,
  };

  state.shows.push(show);

  // ── The city remembers ────────────────────────────────────────────────
  // Decayed to now before adding to it, so a city that has been left alone for
  // two months is not still carrying the last show's weight.
  state.cityMarkets[venue.city] = {
    city: venue.city,
    country: venue.country,
    fatigue: addFatigue(decayedFatigue(market, nowSerial), night.fill),
    fatigueSerial: nowSerial,
    lastShowSerial: nowSerial,
    shows: (market?.shows ?? 0) + 1,
  };

  state.player!.career.money += night.net;
  state.player!.career.totalEarnings += Math.max(0, night.net);
  state.player!.career.localFame = Math.min(
    100,
    state.player!.career.localFame + fameGained * 0.5,
  );
  // A publicist does not make the bad night good — they make it cost less.
  // Standing lost is scaled; standing gained is not touched.
  const repDelta =
    opts.performanceQuality >= 60 ? Math.min(4, 1 + Math.round(attendance / 4000)) : -1;
  state.player!.career.reputation = Math.min(
    100,
    state.player!.career.reputation + (repDelta < 0 ? repDelta * opts.controversyMult : repDelta),
  );

  // Playing live is the oldest way there is to make people look at you, and a
  // good night is worth more than a bad one. The show logs its own line below,
  // so this gain stays silent.
  addMomentum(state, opts.performanceQuality >= 70 ? 4 : 2);

  // Stat growth from shows
  state.player!.stats.stagePresence = Math.min(100, state.player!.stats.stagePresence + 0.5);
  state.player!.stats.performance = Math.min(100, state.player!.stats.performance + 0.5);
  state.player!.stats.charisma = Math.min(100, state.player!.stats.charisma + 0.3);

  // Social post about show
  const showPost: SocialPost = {
    id: uuidv4(),
    platform: 'chirp',
    authorId: 'player',
    authorName: state.player!.artistName,
    content:
      opts.performanceQuality >= 70
        ? `Just rocked ${venue.city}! The crowd was INSANE 🔥 ${attendance.toLocaleString()} people. Thank you ${venue.city}!`
        : `Just finished my set in ${venue.city}. Building. 💪 More shows coming.`,
    likes: Math.floor(attendance * 0.1),
    shares: Math.floor(Math.random() * 20),
    comments: [],
    timestamp: new Date().toISOString(),
    isPlayerPost: true,
    trendingScore: opts.performanceQuality * 0.5,
  };
  state.socialPosts.unshift(showPost);

  state.headlines.unshift({
    id: uuidv4(),
    text: generateHeadline('show', state.player!.artistName, `${venue.city} show`),
    fullStory: `${state.player!.artistName} played ${venue.name} in ${venue.city} to ${attendance.toLocaleString()} of ${venue.capacity.toLocaleString()}. Performance quality: ${opts.performanceQuality}/100.`,
    date: formatGameDate(serialToDate(nowSerial)),
    relatedEntities: [state.player!.id],
    priority: opts.performanceQuality >= 70 ? 6 : 3,
    category: 'show',
  });

  // The date moves. A tour is two weeks of your life, not a free click.
  const daysOff = opts.advanceCalendar
    ? type === 'international_tour'
      ? 14
      : type === 'festival'
        ? 3
        : 1
    : 0;
  if (daysOff > 0) {
    state.gameDate = advanceDate(state.gameDate, daysOff) as typeof state.gameDate;
    state.turnCount += 1;
  }

  const tail =
    daysOff > 0
      ? `${opts.energy} energy, ${daysOff} day${daysOff > 1 ? 's' : ''}.`
      : // A tour date costs no energy of its own: the nights between dates are
        // what pays for it, and the tick has already given them back.
        'on the road.';
  const line =
    `${opts.tourId ? '🚌' : '🎭'} ${venue.name}, ${venue.city} — ` +
    `${attendance.toLocaleString()}/${venue.capacity.toLocaleString()} in, ` +
    `$${Math.abs(night.net).toLocaleString()} ${night.net >= 0 ? 'clear' : 'LOST'}. ${tail}`;
  if (opts.logSink) {
    opts.logSink.push(line);
  } else {
    state.lastEventLog.unshift(line);
    state.lastEventLog = state.lastEventLog.slice(0, 10);
  }

  return { attendance, fameGained, daysOff };
}

/** Everything the show engine needs, read off the live state. */
/**
 * Everything the show engine needs, read off the live state.
 *
 * `atSerial` is for the tour tick. A tour leg is planned and settled against
 * its OWN night, and a city's fatigue has to be measured against the night it
 * was caused on — otherwise a month-long jump would settle every leg with the
 * same "as of today" fatigue and the second date in a city would look like the
 * first. Defaults to now, which is what a single booking wants.
 */
function showInputFrom(
  state: GameState,
  venue: Venue,
  price: number,
  atSerial?: number,
): ShowPlanInput {
  const p = state.player!;
  const bonuses = crewBonuses(raw(state.crew) as CrewMember[]);
  return {
    venue,
    price,
    fame: blendedFame(p),
    momentum: p.career.momentum,
    artistCountry: p.country,
    cityCountry: venue.country,
    capacity: venue.capacity,
    promo: bonuses.promoSales,
    fatigue: decayedFatigue(state.cityMarkets[venue.city], atSerial ?? dateToSerial(state.gameDate)),
    visualMult: bonuses.visualMult,
    managerPct: managerCommissionPct(raw(state.contracts) as ActiveContract[]),
    promoterPct: bonuses.promoterCut,
    cutRelief: bonuses.cutRelief,
    logisticsMult: bonuses.logisticsMult,
    venueHireMult: bonuses.venueHireMult,
  };
}

// ─── STUDIO VAULT HELPERS ──────────────────────────────────────────────────

/** A master still sitting in the vault: recorded, not out, not archived. */
export function isVaultMaster(song: Song): boolean {
  return !isReleased(song) && !song.archivedAt;
}

/**
 * Rebuild the inputs a stored master was tracked with, so an edit can be scored
 * by the very same function a fresh session uses. Nothing here is random: the
 * same words and the same production always produce the same numbers, which is
 * what lets the vault show a score the player can trust before committing.
 */
function rescoreMaster(
  state: GameState,
  song: Song,
  overrides: {
    lyrics?: string;
    producerSkill?: number | null;
    beatQuality?: number;
    features?: Array<{ npc: NPC; relationship: number }>;
  } = {},
): StudioScores {
  const npcs = raw(state.npcs) as NPC[];
  const features =
    overrides.features ??
    (song.featuredArtists ?? [])
      .map((id) => npcs.find((n) => n.id === id))
      .filter((n): n is NPC => Boolean(n))
      .map((npc) => ({ npc, relationship: npc.relationshipScore ?? 0 }));

  const ghostwriter = song.ghostwriterId ? ghostwriterById(song.ghostwriterId) : undefined;

  return scoreStudioSession({
    stats: state.player!.stats,
    lyrics: overrides.lyrics ?? song.lyrics ?? '',
    genre: song.genre,
    bpm: song.bpm ?? 90,
    mood: song.mood ?? 'defiant',
    vocals: song.vocalSettings ?? { ...VOCAL_DEFAULTS },
    producerSkill:
      overrides.producerSkill !== undefined ? overrides.producerSkill : song.producerSkill ?? null,
    beatQuality: overrides.beatQuality ?? song.beatQuality ?? 50,
    features,
    effort: 2,
    ghostwriterSkill: ghostwriter ? ghostwriter.skill : null,
    // Re-recording happens in the same room as the first take, so the crew's
    // contribution has to be the same number both times — otherwise a
    // re-record would silently drop the engineer's work.
    crewProductionBonus: crewBonuses(raw(state.crew) as CrewMember[]).productionBonus,
    // The room the take was ACTUALLY made in, read off the record rather than
    // off the player's current studio. Buying a better mic today must not
    // re-track a master cut last month, and a room rented once is not a room
    // you still have. A master from before the room system carries no figure
    // and falls back to the player's own gear, which is what it was made on.
    studioBonus: song.studioBonus ?? roomProductionBonus(state.studio?.levels, null).bonus,
  });
}

/**
 * Write a fresh score set onto a master, keeping whatever the mix session had
 * already achieved.
 *
 * A mix is a finished artefact: rewriting the words does not un-mix the record,
 * so a master that has been through a mix session keeps its production figures
 * and only the dimensions the edit actually touched move. New material is the
 * exception — a new beat means the mix is gone, and `keepProduction` is false.
 */
function applyRescore(song: Song, fresh: StudioScores, keepProduction: boolean) {
  song.lyricsQuality = fresh.lyricsQuality;
  song.vocalPerformance = fresh.vocalPerformance;
  song.chemistry = fresh.chemistry;
  if (!keepProduction) {
    song.productionQuality = fresh.productionQuality;
    song.productionCeiling = fresh.productionCeiling;
  }
  song.commercialPotential = fresh.commercialPotential;
  song.criticalPotential = fresh.criticalPotential;
  // Re-blended from what is actually on the record now, through the same two
  // functions the record path uses, so the two can never drift apart.
  song.quality = applyMoodPenalty(
    blendQuality({
      lyricsQuality: song.lyricsQuality,
      productionQuality: song.productionQuality ?? 0,
      vocalPerformance: song.vocalPerformance,
      chemistry: song.chemistry,
    }),
    song.mood ?? 'defiant',
    song.genre,
  );
}

/** Total units a song has done in its last seven days, across every platform. */
function recentWeek(state: GameState, songId: string): number {
  const st = state.platformStats?.[songId];
  if (!st) return 0;
  let total = 0;
  for (const key of Object.keys(st.byPlatform)) {
    const slice = st.byPlatform[key];
    for (let i = Math.max(0, slice.d.length - 7); i < slice.d.length; i++) total += slice.d[i];
  }
  return total;
}

/** Lifetime units for a song, straight off its platform state. */
function lifetimeUnits(state: GameState, songId: string): number {
  const st = state.platformStats?.[songId];
  if (!st) return 0;
  let total = 0;
  for (const key of Object.keys(st.byPlatform)) total += st.byPlatform[key].t;
  return total;
}

/**
 * How much of a second wind a remix gives back to the record it reworks.
 *
 * Three things decide it, and they are the three the player can actually see:
 *
 *  - **How big the original is.** A remix multiplies a record; it does not
 *    replace it. A remix of something nobody heard multiplies a small number
 *    and stays small, which is why this is driven off real lifetime units and
 *    not off the original's `quality`.
 *  - **How well timed it is.** A remix lands best on a record that still has
 *    life in it — climbing, or just starting to come down. Dropping one on a
 *    song that is already dead is a footnote, and dropping one on a record in
 *    its first days wastes the move because the record is doing that work
 *    already.
 *  - **Who is on it.** A real feature brings their own audience with them.
 */
function revivalFor(
  state: GameState,
  original: Song,
  remix: Song,
): { power: number; width: number; reason: string } {
  const lifetime = lifetimeUnits(state, original.id);
  const week = recentWeek(state, original.id);
  const st = state.platformStats?.[original.id];
  const ageDays = st ? dateToSerial(state.gameDate) - st.release : 0;

  // A record nobody heard gives almost nothing back. 10M units is a real
  // record; a million is a local one.
  const size = Math.min(1, Math.log10(1 + lifetime) / 7.4);

  // Timing: peaks when the record is past its opening fortnight but still
  // moving. Both tails fade out.
  const traction = Math.min(1, Math.log10(1 + week) / 6.6);
  const freshness = ageDays < 14 ? ageDays / 14 : Math.max(0.15, 1 - (ageDays - 14) / 420);
  const timing = traction * freshness;

  // The feature's own pull. Capped hard — a cosign helps, it does not carry.
  let featureFactor = 0;
  for (const id of remix.featuredArtists ?? []) {
    const npc = (raw(state.npcs) as NPC[]).find((n) => n.id === id);
    if (npc) featureFactor = Math.max(featureFactor, Math.min(1, npc.fame / 90));
  }

  const power = 0.25 + size * 1.5 * timing + featureFactor * 0.55;
  const width = 9 + size * 10;

  const reason =
    power < 0.45
      ? 'the remix did not find much of an audience to build on'
      : featureFactor > 0.5
        ? 'a big feature put the record back in front of people'
        : 'the timing caught the record while it still had momentum';

  return { power: Math.min(3.2, power), width, reason };
}

/**
 * Plant a second wind on a record, at a given age in its own life.
 *
 * The record is the source of truth: `song.revivals` is what gets saved, and
 * the streaming engine copies it into whatever state it rebuilds on load. The
 * derived state is updated here too when it already exists, so the very next
 * tick sees the push without waiting for a rebuild.
 */
function plantRevival(
  state: GameState,
  songId: string,
  revival: { power: number; width: number; reason: string },
  atAge: number,
) {
  const song = state.songs.find((s) => s.id === songId) ?? state.npcSongs.find((s) => s.id === songId);
  const st = state.platformStats?.[songId];

  // Nothing to attach to. NOTE the guard is `&&`, not `!list`: a record being
  // given its FIRST second wind has no `revivals` array yet, and an early
  // return on that read as "the push silently did nothing" — which is exactly
  // what a remix of a fresh record looks like.
  if (!song && !st) return;

  // Idempotent on the day, so re-releasing or re-entering a project cannot
  // stack the same push twice.
  const existing = song?.revivals ?? st?.revivals ?? [];
  if (existing.some((r) => r.at === atAge)) return;

  const entry = { at: atAge, power: revival.power, width: revival.width, reason: revival.reason };
  if (song) {
    const own = song.revivals ?? (song.revivals = []);
    own.push(entry);
    // A record cannot carry an unbounded history of pushes.
    if (own.length > 6) own.shift();
  }
  if (st) {
    const derived = st.revivals ?? (st.revivals = []);
    if (!derived.some((r) => r.at === atAge)) derived.push({ ...entry });
    if (derived.length > 6) derived.shift();
  }
}

/**
 * Pick `count` random artists from the roster without sorting it.
 *
 * The obvious `filter(artist).sort(random).slice(n)` is O(n log n) over the
 * whole roster AND allocates a full copy of every artist — 4,254 objects just
 * to end up with 5. Reservoir sampling does it in a single O(n) pass with no
 * intermediate array, and because it only ever compares against a set of
 * `count` slots it does not care how large the roster grows.
 */
function pickRandomArtists(npcs: NPC[], count: number): NPC[] {
  const picked: NPC[] = [];
  let seen = 0;
  for (const npc of npcs) {
    if (npc.role !== 'artist') continue;
    seen++;
    if (picked.length < count) {
      picked.push(npc);
      continue;
    }
    // Replace a random incumbent with probability count/seen.
    const j = Math.floor(Math.random() * seen);
    if (j < count) picked[j] = npc;
  }
  return picked;
}

// ─── PERFORMANCE: DISABLE IMMER AUTO-FREEZE ──────────────────────────────
// Immer's `autoFreeze` deep-freezes the ENTIRE returned state tree after every
// `set()`. With ~12,000 NPCs (each with a nested `memoryLog` array) that is a
// full walk of the roster on every single action — measured at ~285 ms per
// turn on its own.
//
// Freezing is a development safety net that catches accidental mutation outside
// of a producer. This store only ever mutates inside `set()`, and every action
// already goes through immer's draft, so the net catches nothing here while
// costing real time. Turning it off is the documented remedy for large stores.
setAutoFreeze(false);

// ─── CREATE STORE ─────────────────────────────────────────────────────────

// ─── YOUR OWN LABEL: STORE HELPERS ─────────────────────────────────────────
//
// The engine is `sim/label.ts`. These are the bits that touch the game state:
// moving money in and out of the label's account, writing the mailbox and the
// feed, and the daily/monthly tick.

/** Everybody the label still has a live claim on. */
function labelSigneeIds(label: PlayerLabel): Set<string> {
  return new Set(
    label.roster
      .filter((s) => s.status === 'active' || s.status === 'dispute' || s.status === 'expiring')
      .map((s) => s.npcId),
  );
}

function labelEvent(label: PlayerLabel, serial: number, text: string, tone: LabelEvent['tone'] = 'neutral'): void {
  label.events.unshift({ serial, text, tone });
  if (label.events.length > 80) label.events.length = 80;
}

function labelMail(state: GameState, subject: string, body: string): void {
  const name = state.label?.name ?? 'Your label';
  state.mailbox.unshift({
    id: uuidv4(),
    from: 'label_office',
    fromName: `${name} — office`,
    subject,
    body,
    timestamp: new Date().toISOString(),
    read: false,
    type: 'general',
  });
}

function labelSpend(label: PlayerLabel, amount: number): void {
  label.cash -= amount;
  label.monthCosts += amount;
}

function labelEarn(label: PlayerLabel, amount: number): void {
  label.cash += amount;
  label.monthRevenue += amount;
}

/** A label's legal read: its own business-affairs hire, or the player's lawyer. */
function labelLegalSkill(state: GameState): number {
  const own = state.label ? staffSkill(state.label.staff, 'legal') : 0;
  return Math.max(own, playerNegotiatorSkill(state, 'lawyer') * 0.8);
}

/** Move a signee off the roster and into the alumni list. */
function retireSignee(state: GameState, label: PlayerLabel, s: LabelSignee, status: LabelSignee['status']): void {
  s.status = status;
  s.inStudio = undefined;
  s.requestSerial = undefined;
  s.demand = undefined;
  s.rivalOffer = undefined;
  label.roster = label.roster.filter((x) => x.npcId !== s.npcId);
  label.alumni.unshift(s);
  if (label.alumni.length > 30) label.alumni.length = 30;
  const npc = state.npcs.find((n) => n.id === s.npcId);
  if (npc?.team?.label === label.name) npc.team = { ...npc.team, label: undefined };
}

/** Write signee fame (and the label's name) back onto the live roster. */
function mirrorSigneesToRoster(state: GameState, rawNPCs: NPC[]): void {
  const label = state.label;
  if (!label || label.roster.length === 0) return;
  const byId = new Map(label.roster.map((s) => [s.npcId, s]));
  const arr = state.npcs;
  // Ids are read off the plain snapshot so the 11.6k-row scan never creates a
  // draft for somebody who is not on the label.
  for (let i = 0; i < rawNPCs.length; i++) {
    const s = byId.get(rawNPCs[i].id);
    if (!s) continue;
    const npc = arr[i];
    if (!npc || npc.id !== s.npcId) continue;
    npc.fame = Math.round(s.fame * 10) / 10;
    const live = s.status === 'active' || s.status === 'dispute' || s.status === 'expiring';
    if (live && npc.team?.label !== label.name) npc.team = { ...(npc.team ?? {}), label: label.name };
    rawNPCs[i].fame = npc.fame;
  }
}

/** Put a finished record out. */
function releaseLabelRecord(
  state: GameState,
  label: PlayerLabel,
  s: LabelSignee,
  npc: NPC,
  serial: number,
  rec: { tier: LabelReleaseTier; quality: number; marketing: number },
  log: string[],
): Song {
  const song = createNPCSong({ ...npc, fame: s.fame }, state.gameDate);
  song.quality = rec.quality;
  const eff = marketingEfficiency(staffSkill(label.staff, 'marketing'));
  const radio = staffSkill(label.staff, 'radio') * 20;
  song.marketingBudget = Math.round(rec.marketing * eff + radio);
  song.labelName = label.name;
  state.npcSongs.push(song);

  s.releases.push(song.id);
  s.releasesDelivered += 1;
  s.lastReleaseSerial = serial;
  s.requestSerial = undefined;
  s.inStudio = undefined;
  s.fame = Math.max(1, Math.min(100, s.fame + releaseFameBump(s, rec.quality, song.marketingBudget)));
  s.mood = Math.min(100, s.mood + 3);
  s.notes.unshift(`Released "${song.title}" (${RELEASE_TIERS[rec.tier].label.toLowerCase()}, quality ${rec.quality}).`);
  if (s.notes.length > 12) s.notes.length = 12;

  const verdict = rec.quality >= 75 ? 'The office thinks it is a hit.' : rec.quality >= 55 ? 'Solid record.' : 'Not their best. It happens.';
  labelEvent(label, serial, `${s.name} released "${song.title}" — quality ${rec.quality}. ${verdict}`, rec.quality >= 60 ? 'good' : 'neutral');
  log.push(`💿 ${label.name}: ${s.name} — "${song.title}" is out.`);
  pushNotification(state, {
    kind: 'business',
    title: `${label.name}: "${song.title}" is out`,
    body: `${s.name}'s new record is live on every platform.`,
    artSeed: `song|${song.id}`,
    action: { type: 'song', id: song.id },
  });
  if (state.player) {
    state.socialPosts.unshift({
      id: uuidv4(),
      platform: 'chirp',
      authorId: 'player',
      authorName: state.player.artistName,
      content: `New music from ${s.name} on ${label.name}. "${song.title}" out now. Go run it up. 💿`,
      likes: Math.round(40 + s.fame * 30),
      shares: Math.round(5 + s.fame * 4),
      comments: [],
      timestamp: new Date().toISOString(),
      relatedSongId: song.id,
      isPlayerPost: true,
      trendingScore: 10 + s.fame / 3,
      daySerial: serial,
    });
  }
  return song;
}

/**
 * The label's day (or days). Called once per turn from `advanceTurn`, after
 * the streaming engine has run, with what the label's records earned.
 */
function labelTick(
  state: GameState,
  rawNPCs: NPC[],
  labelRevenueBySong: Record<string, number>,
  serial: number,
  log: string[],
): void {
  const label = state.label;
  if (!label || !state.player) return;
  const playerFame = blendedFame(state.player);
  const npcById = new Map<string, NPC>();
  const wanted = new Set<string>([...label.roster.map((s) => s.npcId), ...label.pitches.map((p) => p.npcId)]);
  for (const n of rawNPCs) if (wanted.has(n.id)) npcById.set(n.id, n);
  const legal = labelLegalSkill(state);
  const arSkill = staffSkill(label.staff, 'ar');
  let rosterChanged = false;

  // ── 1. The money the records made ──────────────────────────────────────
  for (const s of [...label.roster, ...label.alumni]) {
    if (!s.releases.length) continue;
    // On a distribution deal the artist owns the masters: once they leave, the
    // fee stops. Every other deal leaves the masters with the label for good.
    const leftDistribution = s.terms.dealType === 'distribution' && !labelSigneeIds(label).has(s.npcId);
    if (leftDistribution) continue;
    let gross = 0;
    for (const id of s.releases) gross += labelRevenueBySong[id] ?? 0;
    if (gross <= 0) continue;
    const split = splitRevenue(s, gross);
    s.recoupBalance = Math.max(0, s.recoupBalance - split.recouped);
    s.grossEarned += gross;
    s.labelEarned += split.label;
    s.artistPaid += split.artist;
    s.monthGross += gross;
    labelEarn(label, split.label);
  }

  // ── 2. Records finishing in the studio ─────────────────────────────────
  for (const s of label.roster) {
    if (!s.inStudio || s.inStudio.until > serial) continue;
    const npc = npcById.get(s.npcId);
    if (!npc) { s.inStudio = undefined; continue; }
    releaseLabelRecord(state, label, s, npc, serial, s.inStudio, log);
    rosterChanged = true;
  }

  // ── 3. New music handed in; distribution acts release on their own ─────
  for (const s of label.roster) {
    if (s.status !== 'active' || s.inStudio) continue;
    const since = serial - (s.lastReleaseSerial ?? s.signedSerial);
    if (s.terms.dealType === 'distribution') {
      // They fund their own records and just hand you the finished master.
      if (since >= 85 + (hashString(s.npcId) % 30)) {
        const npc = npcById.get(s.npcId);
        if (!npc) continue;
        const quality = releaseQuality(s.fame, 'standard', 0, unit(`dq|${s.npcId}|${serial}`));
        releaseLabelRecord(state, label, s, npc, serial, { tier: 'standard', quality, marketing: s.terms.marketingCommit }, log);
        rosterChanged = true;
      }
      continue;
    }
    if (s.requestSerial === undefined && since >= 60 + (hashString(s.npcId) % 25)) {
      s.requestSerial = serial;
      labelEvent(label, serial, `${s.name} handed in new music and wants it out.`, 'neutral');
      labelMail(
        state,
        `🎧 ${s.name} turned in new music`,
        `${s.name} has a record ready and wants a release. Fund it from My Label → Roster.\n\nA quick single is cheap; a big rollout costs more but lands harder. Leave it too long and they will feel shelved.`,
      );
    }
  }

  // ── 4. Deadlines: demands, rival offers, pitches, contracts ────────────
  for (const s of [...label.roster]) {
    if (s.demand && serial - s.demand.openedSerial > DEMAND_WINDOW_DAYS) {
      // Ignored is answered.
      s.demand = undefined;
      s.mood = Math.max(0, s.mood - 15);
      s.loyalty = Math.max(0, s.loyalty - 10);
      labelEvent(label, serial, `${s.name}'s camp took the silence as a no.`, 'bad');
      if (s.mood < 25 && s.status === 'active') {
        s.status = 'dispute';
        labelEvent(label, serial, `${s.name} is refusing to record until this is fixed.`, 'bad');
        labelMail(state, `⚠️ ${s.name} is in dispute`, `${s.name}'s camp says they will not record another note for ${label.name} until the money is right. Settle it or let them go.`);
      }
    }
    if (s.rivalOffer && serial > s.rivalOffer.expiresSerial) {
      const offer = s.rivalOffer;
      s.rivalOffer = undefined;
      if (s.loyalty >= 70) {
        s.mood = Math.min(100, s.mood + 3);
        labelEvent(label, serial, `${s.name} turned down ${offer.labelName}. Loyal.`, 'good');
      } else {
        s.mood = Math.max(0, s.mood - 12);
        labelEvent(label, serial, `${s.name} wanted to talk about ${offer.labelName}'s offer and never heard back.`, 'bad');
        if (s.mood < 25 && s.status === 'active') s.status = 'dispute';
      }
    }
    if ((s.status === 'active' || s.status === 'dispute') && serial >= s.endsSerial) {
      s.status = 'expiring';
      const npc = npcById.get(s.npcId);
      if (npc) {
        const competing = s.fame >= 35 && unit(`renew|${s.npcId}|${serial}`) < 0.5;
        const wants = wantsFor(npc, s.terms.dealType, {
          labelRep: label.reputation,
          playerFame,
          relationship: npc.relationshipScore + (s.mood - 50) / 2 + (s.loyalty - 50) / 2,
          competing,
        });
        label.pitches.unshift({
          id: uuidv4(),
          npcId: s.npcId,
          name: s.name,
          openedSerial: serial,
          expiresSerial: serial + 21,
          terms: { ...s.terms, advance: 0 },
          wants,
          patience: patienceFor(npc) + (s.loyalty >= 60 ? 1 : 0),
          rounds: 0,
          status: 'open',
          competing: competing ? RIVAL_LABELS[hashString(`rc|${s.npcId}`) % RIVAL_LABELS.length] : undefined,
          renewal: true,
        });
      }
      labelEvent(label, serial, `${s.name}'s deal is up. Re-sign them in the next three weeks or they walk.`, 'neutral');
      labelMail(state, `📝 ${s.name}'s contract is up`, `${s.name}'s deal with ${label.name} has run its course. Open My Label → Deals to negotiate a renewal. If nothing is signed within 21 days they leave — and the records you released stay yours${s.terms.dealType === 'distribution' ? ', except on a distribution deal, where the masters go with them' : ''}.`);
    }
  }

  for (const p of label.pitches) {
    if (p.status !== 'open' || serial <= p.expiresSerial) continue;
    p.status = 'expired';
    p.lastReply = p.competing ? `They signed with ${p.competing} instead.` : 'They stopped waiting.';
    if (p.renewal) {
      const s = label.roster.find((x) => x.npcId === p.npcId);
      if (s) {
        retireSignee(state, label, s, 'left');
        labelEvent(label, serial, `${s.name} left ${label.name} when the deal ran out.`, 'bad');
        rosterChanged = true;
      }
    } else {
      labelEvent(label, serial, `${p.name} stopped waiting on your offer.`, 'neutral');
    }
  }
  if (label.pitches.length > 30) label.pitches = label.pitches.filter((p, i) => p.status === 'open' || i < 20);

  // ── 5. The scouting report, weekly ─────────────────────────────────────
  if (serial - label.prospectsSerial >= PROSPECT_REFRESH_DAYS) {
    label.prospects = pickProspects(rawNPCs, label, playerFame, arSkill, serial);
    label.prospectsSerial = serial;
  }

  // ── 6. Month end ───────────────────────────────────────────────────────
  const key = monthKeyOf(state.gameDate);
  if (key !== label.monthKey) {
    labelMonthEnd(state, label, npcById, serial, playerFame, legal, log);
    label.monthKey = key;
    rosterChanged = true;
  }

  if (rosterChanged) mirrorSigneesToRoster(state, rawNPCs);
}

function labelMonthEnd(
  state: GameState,
  label: PlayerLabel,
  npcById: Map<string, NPC>,
  serial: number,
  playerFame: number,
  legal: number,
  log: string[],
): void {
  // Running costs.
  const salaries = label.staff.reduce((a, s) => a + s.salary, 0);
  const overhead = overheadFor(label);
  labelSpend(label, salaries + overhead);

  const charting = new Set<string>();
  for (const row of state.globalSongs ?? []) charting.add(row.itemId);
  for (const list of Object.values(state.charts ?? {})) for (const e of list) charting.add(e.songId);
  const songById = new Map<string, Song>();
  for (const s of state.npcSongs) songById.set(s.id, s);

  let chartingTotal = 0;
  let releasesThisMonth = 0;
  let disputes = 0;
  const marketingSkill = staffSkill(label.staff, 'marketing');
  const lines: string[] = [];

  for (const s of [...label.roster]) {
    const npc = npcById.get(s.npcId);
    const monthArtistShare = s.monthGross * (s.terms.royalty / 100);

    // 360: a cut of the road and the brand deals.
    if (s.terms.dealType === 'three_sixty' && s.status === 'active') {
      const side = threeSixtyMonthly(s.fame);
      if (side > 0) { labelEarn(label, side); s.labelEarned += side; }
    }

    const charted = s.releases.filter((id) => charting.has(id)).length;
    chartingTotal += charted;
    const bestWeekly = Math.max(0, ...s.releases.map((id) => songById.get(id)?.weeklyStreams ?? 0));
    if (s.lastReleaseSerial !== undefined && serial - s.lastReleaseSerial <= 31) releasesThisMonth++;

    const before = s.fame;
    s.fame = monthlyFame(s, { serial, labelRep: label.reputation, chartingSongs: charted, bestWeekly });
    const mood = monthlyMood(npc, s, { serial, labelRep: label.reputation, labelBroke: label.cash < 0, marketingSkill, monthArtistShare });
    s.mood = mood.mood;
    s.loyalty = mood.loyalty;
    if (mood.notes.length) {
      s.notes.unshift(mood.notes[0]);
      if (s.notes.length > 12) s.notes.length = 12;
    }

    lines.push(
      `• ${s.name}: ${money(s.monthGross)} gross` +
        (s.recoupBalance > 0 ? `, ${money(s.recoupBalance)} still to recoup` : ', recouped') +
        ` · fame ${before.toFixed(0)}→${s.fame.toFixed(0)} · ${moodWord(s.mood).toLowerCase()}`,
    );
    s.monthGross = 0;

    if (s.status === 'dispute') {
      disputes++;
      // A dispute nobody settles ends in court, and courts are slow and expensive.
      if (unit(`court|${s.npcId}|${serial}`) < 0.25) {
        const fee = Math.round(settlementCost(s, legal) * 0.5);
        labelSpend(label, fee);
        retireSignee(state, label, s, 'left');
        labelEvent(label, serial, `${s.name} won their release in court. Legal fees: ${money(fee)}.`, 'bad');
        labelMail(state, `⚖️ ${s.name} is gone`, `${s.name}'s lawyers got them out of the contract. ${label.name} paid ${money(fee)} in legal fees. The records already released stay in your catalogue.`);
        log.push(`⚖️ ${s.name} left ${label.name} after a contract dispute.`);
        continue;
      }
    } else if (s.status === 'active') {
      if (s.mood < 15) {
        s.status = 'dispute';
        labelEvent(label, serial, `${s.name} has stopped returning the office's calls.`, 'bad');
      }
      const raise = maybeRaiseDemand(s, serial);
      if (raise) {
        s.demand = { kind: 'raise', openedSerial: serial, royalty: raise.royalty, bonus: raise.bonus, text: raise.text };
        labelEvent(label, serial, `${s.name} wants a better deal.`, 'neutral');
        labelMail(state, `💰 ${s.name} wants to renegotiate`, `${raise.text}\n\nAnswer from My Label → Roster within ${DEMAND_WINDOW_DAYS} days.`);
      }
      const monthlyTake = s.labelEarned / Math.max(1, (serial - s.signedSerial) / 30);
      const rival = maybeRivalOffer(s, serial, monthlyTake, legal);
      if (rival) {
        s.rivalOffer = { labelName: rival.labelName, royalty: rival.royalty, buyout: rival.buyout, openedSerial: serial, expiresSerial: serial + rival.window };
        s.lastRivalSerial = serial;
        labelEvent(label, serial, `${rival.labelName} is circling ${s.name}.`, 'bad');
        labelMail(
          state,
          `🦈 ${rival.labelName} wants ${s.name}`,
          `${rival.labelName} has offered ${s.name} ${rival.royalty}% and will pay ${label.name} ${money(rival.buyout)} to release them.\n\n` +
            `Match it, sell the contract, or refuse. ${s.loyalty >= 70 ? `${s.name} is loyal and has told them no for now — but they want to hear from you.` : `${s.name} is listening.`}`,
        );
      }
    }
  }

  // Reputation drifts toward what the label has actually done.
  const target = reputationTarget({
    playerFame,
    topSigneeFames: label.roster.map((s) => s.fame),
    chartingThisMonth: chartingTotal,
    disputes,
    radioSkill: staffSkill(label.staff, 'radio'),
    releasesThisMonth,
  });
  label.reputation = Math.round((label.reputation + (target - label.reputation) * 0.15) * 10) / 10;

  // Debt.
  if (label.cash < 0) {
    label.debtMonths += 1;
    labelEvent(label, serial, `The label is ${money(label.cash)} in the red (${label.debtMonths} month${label.debtMonths === 1 ? '' : 's'}).`, 'bad');
  } else {
    label.debtMonths = 0;
  }

  const profit = label.monthRevenue - label.monthCosts;
  label.history.push({ key: label.monthKey, revenue: Math.round(label.monthRevenue), costs: Math.round(label.monthCosts), profit: Math.round(profit) });
  if (label.history.length > 36) label.history = label.history.slice(-36);

  labelMail(
    state,
    `📊 ${label.name} — statement for ${label.monthKey}`,
    `Revenue ${money(label.monthRevenue)} · Costs ${money(label.monthCosts)} (staff ${money(salaries)}, office ${money(overhead)}) · ` +
      `${profit >= 0 ? 'Profit' : 'Loss'} ${money(Math.abs(profit))}\n` +
      `Cash in the bank: ${money(label.cash)} · Reputation ${label.reputation.toFixed(0)}/100\n\n` +
      (lines.length ? lines.join('\n') : 'No artists on the roster yet. Open My Label → Scouting.') +
      (label.cash < 0 ? `\n\n⚠️ The label is overdrawn. Nothing can be funded until you put money in, and the artists can tell.` : ''),
  );
  if (profit !== 0) log.push(`🏷️ ${label.name}: ${profit >= 0 ? '+' : '−'}${money(Math.abs(profit)).replace('−', '')} this month.`);
  label.monthRevenue = 0;
  label.monthCosts = 0;
}

export const useGameStore = create<GameState & GameActions>()(
  immer((set, get) => ({
    ...getInitialState(),

    // ─── NAVIGATION ─────────────────────────────────────────────────────
    setScreen: (screen) =>
      set((state) => {
        state.screen = screen;
      }),

    selectNPC: (npcId) =>
      set((state) => {
        state.selectedNPCId = npcId;
      }),

    openVideo: (videoId) =>
      set((state) => {
        state.selectedVideoId = videoId;
        state.screen = 'watch';
      }),

    openArtist: (artistId) =>
      set((state) => {
        state.selectedArtistId = artistId;
        state.screen = 'artist_page';
      }),

    openChannel: (artistId) =>
      set((state) => {
        state.selectedArtistId = artistId;
        state.screen = 'channel';
      }),

    openPlatform: (platformId) =>
      set((state) => {
        state.selectedPlatformId = platformId;
        state.screen = 'platform';
      }),

    openSong: (songId) =>
      set((state) => {
        state.selectedSongId = songId;
        // Setting the id without moving the screen made every song link in the
        // app a silent no-op. `selectedSongId` is read by SongScreen.
        state.screen = 'song';
      }),

    setPendingFeatureNpc: (npcId) =>
      set((state) => {
        state.pendingFeatureNpcId = npcId;
      }),

    // ─── PLAYER CREATION ────────────────────────────────────────────────
    createPlayer: (data) =>
      set((state) => {
        const baseStats = getBaseStats();
        const stats = applyBackground(baseStats, data.background);
        const career = getStartingCareer(data.background);

        const gameDate = { ...INITIAL_GAME_DATE };
        const age = calculateAge(data.dateOfBirth, gameDate);

        state.player = {
          id: uuidv4(),
          artistName: data.artistName,
          realName: data.realName,
          dateOfBirth: data.dateOfBirth,
          age,
          gender: data.gender,
          genre: data.genre,
          continent: data.continent,
          country: data.country,
          city: data.city,
          background: data.background,
          stats,
          career,
          energy: MAX_ENERGY,
          maxEnergy: MAX_ENERGY,
          createdAt: new Date().toISOString(),
        };

        state.gameDate = gameDate;
        state.initialized = true;
        state.screen = 'dashboard';
        state.cityFame[`${data.country}:${data.city}`] = career.localFame;

        // ─── THE WORLD WAS ALREADY RUNNING ───────────────────────────────
        // The player does not switch the industry on. Every record already in
        // the catalogue gets a month of real streaming history before the game
        // is handed over, so the platform pages, the charts and the video
        // counters are populated the moment it opens. Without this the whole
        // streaming layer read empty until the player simmed a day, which is
        // the opposite of a world that moves on its own.
        const startSerial = dateToSerial(gameDate);
        const rawRoster = raw(state.npcs) as NPC[];
        const seedStats = clonePlain<Record<string, SongPlatformState>>(
          raw(state.platformStats) ?? {},
        );
        const seedVideos = clonePlain<Video[]>(raw(state.videos) ?? []);
        advanceStreamingDays(state, startSerial - 29, startSerial, rawRoster, seedStats, seedVideos);
        state.platformStats = seedStats;
        state.videos = seedVideos as typeof state.videos;
        state.streamCursor = startSerial;

        // The engine is now the only source of streams, so read its numbers
        // back onto the records the charts and the pages actually read. This is
        // the same read-back `advanceTurn` does; skipping it here is how the
        // regional chart and the record page end up quoting two different
        // lifetimes for the same song.
        for (const song of state.npcSongs as Song[]) {
          const st = state.platformStats?.[song.id];
          if (!st) continue;
          const totals = songTotals(st);
          song.weeklyStreams = totals.week;
          song.totalStreams = totals.lifetime;
          song.peakWeeklyStreams = Math.max(song.peakWeeklyStreams ?? 0, totals.week);
        }

        // Build day-one charts from the NPC scene already in motion, so the
        // player walks into a living industry rather than an empty leaderboard.
        state.charts = updateCharts(
          {},
          [...liveSongs(state.songs), ...state.npcSongs] as Song[],
          state.npcs,
          state.player,
        ) as typeof state.charts;
        state.trending = buildTrending(state.charts as Record<string, ChartEntry[]>, state.player) as typeof state.trending;

        // ─── AND THE FIRST GLOBAL CHART ───────────────────────────────────
        // Published from that seeded month rather than from nothing, so the
        // BillBoard Global Top 100 and Top 200 have a real first week on the
        // board instead of an empty state the player has to sim past. Dated
        // with the Saturday that has actually passed, not the one still to
        // come — a chart published in the future is not a chart.
        publishGlobalCharts(state, rawRoster);

        // Seed the feed with the scene that is already talking.
        const seedPosts: SocialPost[] = [];
        const ghanaToday = state.charts['Ghana'] ?? [];
        seedPosts.push(...fanPosts(ghanaToday[0], undefined, raw(state.npcs) as NPC[], state.player, false) as SocialPost[]);
        for (const npc of pickRandomArtists(raw(state.npcs) as NPC[], 6)) {
          const own = (state.npcSongs as Song[]).filter(s => s.ownerId === npc.id);
          seedPosts.push(...npcArtistPosts(npc, own) as SocialPost[]);
        }
        if (seedPosts.length > 0) state.socialPosts.unshift(...seedPosts);

        // Welcome mail
        state.mailbox.push({
          id: uuidv4(),
          from: 'game_system',
          fromName: 'The Game',
          subject: `Welcome to the rap game, ${data.artistName}`,
          body: `Your journey begins in ${data.city}, ${data.country}. The grind is real. Make music, build relationships, stack money, and one day the world will know your name. Good luck.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'general',
        });

        // Initial Chirp post
        state.socialPosts.push({
          id: uuidv4(),
          platform: 'chirp',
          authorId: 'player',
          authorName: data.artistName,
          content: `New to the scene. Watch this space. 🎤 #${data.genre.replace('_', '')} #${data.country}`,
          likes: Math.floor(Math.random() * 30) + 5,
          shares: Math.floor(Math.random() * 5),
          comments: [],
          timestamp: new Date().toISOString(),
          isPlayerPost: true,
          trendingScore: 10,
        });
      }),

    // ─── THE ROOM ───────────────────────────────────────────────────────
    /**
     * Buy the next rung of one slot of the personal studio.
     *
     * Levels REPLACE rather than stack — you own one microphone — so the price
     * is the difference between where the slot is and where it is going, and
     * the bonus after the purchase is the new tier's, not the sum.
     *
     * Refuses in words for every way it can fail: no such slot, already at the
     * top, and not enough money. A silent no-op on a five-figure purchase is
     * the worst possible outcome, so there isn't one.
     */
    buyGear: (slotId) => {
      let result = { ok: false, message: 'Nothing was bought.' };
      set((state) => {
        if (!state.player) return;
        const slot = GEAR_SLOTS.find((s) => s.id === slotId);
        if (!slot) {
          result = { ok: false, message: 'There is no such piece of gear.' };
          return;
        }
        const have = state.studio?.levels?.[slotId] ?? 0;
        const next = nextGearTier(slotId, have);
        if (!next) {
          result = { ok: false, message: `Your ${slot.name.toLowerCase()} is already the best there is.` };
          return;
        }
        if (state.player.career.money < next.price) {
          result = {
            ok: false,
            message:
              `The ${next.name} is $${next.price.toLocaleString()}. ` +
              `You have $${Math.floor(state.player.career.money).toLocaleString()}.`,
          };
          return;
        }
        state.player.career.money -= next.price;
        // The migration guarantees `levels`, but a career made before this
        // existed can still arrive with the object and no inner map.
        if (!state.studio) state.studio = { levels: {} };
        if (!state.studio.levels) state.studio.levels = {};
        const before = gearBonus(state.studio.levels);
        state.studio.levels[slotId] = next.level;
        const after = gearBonus(state.studio.levels);
        state.lastEventLog.unshift(
          `🎛️ ${slot.emoji} ${next.name} is in the studio — $${next.price.toLocaleString()}. ` +
            `The room is now +${before} → +${after} production.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);
        result = { ok: true, message: `${next.name} bought for $${next.price.toLocaleString()}.` };
      });
      return result;
    },

    // ─── STUDIO SESSION ─────────────────────────────────────────────────
    createStudioSong: (payload) => {
      // `set()` cannot return a value, so the result is captured here and
      // handed back to the caller after the state has committed.
      let result: StudioSessionResult | null = null;

      set((state) => {
        if (!state.player) return;

        const title = payload.title.trim();
        if (!title) return;

        const npcs = raw(state.npcs) as NPC[];
        const producer = payload.producerId
          ? npcs.find(n => n.id === payload.producerId) ?? null
          : null;
        const producerSkill = producer ? producerSkillOf(producer) : null;

        // Resolve the chosen beat from that producer's catalogue. If the id no
        // longer matches (roster regenerated, producer changed) fall back to
        // their first beat rather than failing the session.
        const beatOptions = producer
          ? getProducerBeats(producer.id, producerSkill!)
          : getSelfProducedBeats();
        const beat = beatOptions.find(b => b.id === payload.beatId) ?? beatOptions[0];

        // A record is tracked solo. Anyone else on it is negotiated later.
        const features: Array<{ npc: NPC; relationship: number }> = [];

        // A hired pen, when the player used one. Their skill is the floor on
        // the lyrics — see `scoreStudioSession`.
        const ghostwriter = payload.ghostwriterId ? ghostwriterById(payload.ghostwriterId) : undefined;

        // Whoever is on the payroll is in the room. Read through the same
        // helper the editor preview uses, so the number on the button and the
        // number on the master can never disagree.
        const crewFx = crewBonuses(raw(state.crew) as CrewMember[]);
        const crewBooth = crewFx.productionBonus;

        // ── THE ROOM ────────────────────────────────────────────────────
        // Where this is being tracked: the player's own gear, or a room they
        // hired for the day. `roomProductionBonus` is the one place the two are
        // compared, and a rented room that beats the player's own studio does
        // NOT stack with it — it replaces it.
        //
        // The room is resolved and gated BEFORE the money is touched, so a
        // session that could never have happened is refused rather than billed.
        const room = roomById(payload.roomId);
        const roomFx = roomProductionBonus(state.studio?.levels, payload.roomId);
        if (room) {
          const lock = roomLockReason(room, blendedFame(state.player));
          if (lock) return;
        }

        // ── THE IN-HOUSE PRODUCER ──────────────────────────────────────
        // Two sides of the same seat, and both have to be real:
        //
        //   · their beats are YOURS. Booking them costs no producer fee at
        //     all, which is the thing the wage is actually buying.
        //   · but if you cut over somebody else's beat while they are on the
        //     payroll, they will take it badly — and it shows in what they
        //     put into the next session, not just in a line in the log.
        //
        // Self-produced beats are neither. That is your own work, not another
        // producer's, so nobody is slighted by it.
        const inHouse = (state.crew ?? []).find((c) => c.role === 'producer');
        const usedInHouse = !!(producer && inHouse && producer.id === inHouse.npcId);
        const cutOverSomeoneElse = !!(inHouse && producer && !usedInHouse);

        const scores = scoreStudioSession({
          stats: state.player.stats,
          lyrics: payload.lyrics,
          genre: payload.genre,
          bpm: payload.bpm,
          mood: payload.mood,
          vocals: payload.vocals,
          producerSkill,
          beatQuality: beat.quality,
          features,
          effort: payload.effort,
          ghostwriterSkill: ghostwriter ? ghostwriter.skill : null,
          crewProductionBonus: crewBooth,
          // The room. Same function the editor preview calls, so the number on
          // the button and the number on the master cannot disagree.
          studioBonus: roomFx.bonus,
        });

        // Session cost: studio time by effort, plus the producer's fee, plus
        // whatever the writer charged, plus the room if one was hired. The
        // effort table lives in sim/studio.ts so the editor, the vault's
        // re-record panel and this all agree.
        //
        // The engineer's session speed scales the studio time, because a
        // shorter session IS the saving — the room is billed by the day.
        const studioTime = Math.round(sessionCost(payload.effort) * crewFx.sessionCost);
        const fee = producerSkill === null ? 0 : usedInHouse ? 0 : producerFee(producerSkill);
        const roomFee = room?.price ?? 0;
        const cost = studioTime + fee + (ghostwriter?.fee ?? 0) + roomFee;

        // Backstop. The UI explains the shortfall; this prevents a bypass.
        if (state.player.career.money < cost) return;
        // A session is a physical day's work. Out of energy, no session.
        if (!spendEnergy(state, sessionEnergy(payload.effort))) return;

        const daysTotal = Math.max(1, Math.round(sessionDays(payload.effort) * crewFx.sessionSpeed));
        state.player.career.money -= cost;

        // The day the master is actually done. Derived here rather than read off
        // the clock at completion, so a 30-day sim that swallows this session
        // still dates the record on its own sixth day.
        const startSerial = dateToSerial(state.gameDate);
        const doneSerial = startSerial + daysTotal;
        const doneDate = formatGameDate(serialToDate(doneSerial));

        const song: Song = {
          id: uuidv4(),
          title,
          genre: payload.genre,
          quality: scores.quality,
          // A master has no release date yet — it is not out.
          releaseDate: doneDate,
          marketingBudget: 0,
          totalStreams: 0,
          weeklyStreams: 0,
          totalEarnings: 0,
          version: 'original',
          // A take of an existing master carries its lineage from the moment it
          // is built — it does not reach `state.songs` until the days are done,
          // and by then nobody is around to stamp it.
          originalSongId: payload.lineageOf?.songId,
          lineage: payload.lineageOf ? 'rerecord' : undefined,
          takeNumber: payload.lineageOf?.takeNumber,
          featuredArtists: features.map(f => f.npc.id),
          featureArtistNames: features.map(f => f.npc.name),
          chartPositions: {},
          certifications: [],
          hasVideo: false,
          videoViews: 0,

          // ── The session itself ──
          bpm: payload.bpm,
          mood: payload.mood,
          lyrics: payload.lyrics,
          lyricsQuality: scores.lyricsQuality,
          ghostwriterId: ghostwriter?.id,
          ghostwriterName: ghostwriter?.name,
          productionQuality: scores.productionQuality,
          productionCeiling: scores.productionCeiling,
          vocalPerformance: scores.vocalPerformance,
          chemistry: scores.chemistry,
          producerId: producer?.id,
          producerName: producer?.name,
          producerSkill: producerSkill ?? undefined,
          beatId: beat.id,
          beatName: beat.name,
          beatQuality: beat.quality,
          commercialPotential: scores.commercialPotential,
          criticalPotential: scores.criticalPotential,
          recordingCost: cost,
          masterStatus: 'recorded',
          recordingDate: doneDate,
          vocalSettings: { ...payload.vocals },
          // Where it was tracked. A rented room is stamped by name; the
          // player's own studio is stamped as their own, because "your studio"
          // is the answer the player is looking for and the slot levels that
          // made it good can change after the fact.
          roomId: room?.id,
          roomName: room
            ? room.name
            : roomFx.source === 'gear'
              ? 'Your own studio'
              : undefined,
          studioBonus: roomFx.bonus,
        };

        // ── THE SESSION IS BOOKED, NOT FINISHED ────────────────────────
        // The artist goes in the room, the room is paid for and the energy is
        // gone — and then the days have to actually pass. The master is built
        // here, because the performance happened and the score is whatever it
        // is, but it stays in the queue until the last day is behind it. That
        // is what lets the player go and do something else with the afternoon
        // they did not spend in the booth.
        addMomentum(state, 2);

        // Queue the job. Everything the completion needs travels with it: the
        // finished master and how much the session taught you.
        const workId = uuidv4();
        state.workItems.push({
          id: workId,
          kind: 'record',
          label: payload.lineageOf
            ? `Take ${payload.lineageOf.takeNumber} of "${payload.lineageOf.title}"`
            : `Recording "${title}"`,
          detail: `${daysTotal} day${daysTotal > 1 ? 's' : ''} in the room · $${cost.toLocaleString()}`,
          daysTotal,
          daysDone: 0,
          startedSerial: startSerial,
          payload: {
            song,
            growth: payload.effort === 1 ? 0.3 : payload.effort === 2 ? 0.6 : 1.0,
          } satisfies RecordWork,
        });

        const read = describeScore(scores.quality);
        // The line names the room, because WHERE the money went is the whole
        // point of hiring one — a session that quietly cost $9,500 more than
        // the last one has to say why.
        const where = room
          ? ` at ${room.name}`
          : roomFx.source === 'gear'
            ? ' in your own studio'
            : '';
        state.lastEventLog.unshift(
          `🎛️ Booked the room for "${title}"${where} — ${daysTotal} day${daysTotal > 1 ? 's' : ''}, $${cost.toLocaleString()}. The master lands when the days are done.`,
        );

        // ── WHAT THE PRODUCER MADE OF IT ───────────────────────────────
        // The exclusivity mechanic, settled where the decision was actually
        // made. A producer on the payroll who watches you book somebody else
        // is not annoyed in the prose — their morale drops, and morale is a
        // multiplier on everything they contribute from here.
        if (inHouse) {
          const member = (state.crew ?? []).find((c) => c.id === inHouse.id);
          if (member) {
            if (usedInHouse) {
              member.morale = Math.min(100, (member.morale ?? 70) + 6);
              state.lastEventLog.unshift(
                `🎛️ ${inHouse.npcName} was on the desk with you — their beat, no fee, and they are pleased about it.`,
              );
            } else if (cutOverSomeoneElse) {
              member.morale = Math.max(0, (member.morale ?? 70) - 22);
              state.lastEventLog.unshift(
                `🎛️ ${inHouse.npcName} watched you cut over another producer's beat. That is a slight, and it will show in the next session.`,
              );
            }
          }
        }

        state.lastEventLog = state.lastEventLog.slice(0, 10);

        result = {
          songId: song.id,
          title,
          cost,
          daysSpent: daysTotal,
          scores,
          read,
          grade: gradeLabel(scores.quality),
          splitRead: describeSplit(scores.commercialPotential, scores.criticalPotential),
          chemistryRead: describeChemistry(scores.chemistry),
          producerName: producer?.name ?? null,
          featureNames: features.map(f => f.npc.name),
          inProgress: true,
          workId,
          readyOn: doneDate,
        };
      });

      return result;
    },

    mixMasterSong: (songId, producerId) => {
      let result: MixResult | null = null;

      set((state) => {
        if (!state.player) return;
        if (state.legacy.retired) return;

        const song = state.songs.find(s => s.id === songId);
        // Only an unmixed master can be mixed. Re-mixing a finished record is
        // not a thing, and releasing already means it is out of your hands.
        if (!song || song.masterStatus !== 'recorded') return;

        // The record is still `recorded` while it is away being mixed — that is
        // the whole point of the booking — so without this the player could
        // book the same mix four times over, paying four times and having the
        // last one land. Say so rather than silently taking the money.
        if ((state.workItems ?? []).some(w => w.kind === 'mix' && (w.payload as MixWork).songId === songId)) {
          result = {
            ok: false,
            songId,
            producerName: '',
            producerSkill: 0,
            cost: 0,
            daysSpent: 0,
            productionGain: 0,
            qualityBefore: song.quality,
            qualityAfter: song.quality,
            read: `"${song.title}" is already with a producer. One mix at a time — wait for it to come back.`,
          };
          return;
        }

        const producer = (raw(state.npcs) as NPC[]).find(n => n.id === producerId);
        if (!producer) return;

        const skill = producerSkillOf(producer);
        // Mixing is charged separately from the beat, at a lower rate — you are
        // buying their ear, not a fresh instrumental.
        const cost = Math.round(producerFee(skill) * 0.55);
        if (state.player.career.money < cost) return;
        // A mix session is a day in someone else's room.
        if (!spendEnergy(state, ENERGY_COSTS.mixMaster)) return;

        const qualityBefore = song.quality;
        const productionBefore = song.productionQuality ?? 0;
        const ceilingBefore = song.productionCeiling ?? productionBefore;

        state.player.career.money -= cost;

        // What the mix can reach. This is the important part of the model:
        //
        // The recorded material sets a floor on ambition — you cannot mix a
        // rough self-produced loop into a masterpiece. But a genuinely good
        // producer does not merely polish what is there; they re-arrange,
        // replace sounds and re-track. So their skill raises the CEILING, not
        // just how much of a fixed gap they close. That is what makes hiring a
        // real producer the decision that matters.
        const skillCeiling = Math.round(skill * 0.95);
        const target = Math.max(ceilingBefore, skillCeiling);
        const closingRate = 0.45 + (skill / 100) * 0.55;   // 0.45 .. 1.0
        const productionAfter = Math.round(Math.max(
          productionBefore,
          Math.min(target, productionBefore + (target - productionBefore) * closingRate),
        ));

        // Nothing is written to the record here. The mix is BOOKED: the ear is
        // hired and the room is paid for, but the record goes on reading as a
        // rough until the days are behind it. That is what stops a mix being a
        // free upgrade you can stack three of in one afternoon. The numbers are
        // worked out once and travel with the job.
        const qualityAfter = applyMoodPenalty(
          blendQuality({
            lyricsQuality: song.lyricsQuality ?? 0,
            productionQuality: productionAfter,
            vocalPerformance: song.vocalPerformance ?? 0,
            chemistry: song.chemistry ?? 0,
          }),
          song.mood ?? 'defiant',
          song.genre,
        );

        // Potentials ride the quality movement. Scaling by the ratio keeps the
        // mood skew (a celebratory record stays commercial-leaning) without
        // re-deriving the whole session.
        const ratio = qualityBefore > 0 ? qualityAfter / qualityBefore : 1;
        const commercialAfter = song.commercialPotential === undefined
          ? undefined
          : Math.max(1, Math.min(100, Math.round(song.commercialPotential * ratio)));
        const criticalAfter = song.criticalPotential === undefined
          ? undefined
          : Math.max(1, Math.min(100, Math.round(song.criticalPotential * ratio)));

        const daysTotal = skill >= 80 ? 5 : skill >= 60 ? 3 : 2;
        const startSerial = dateToSerial(state.gameDate);

        const gain = productionAfter - productionBefore;
        const read = gain >= 25
          ? `${producer.name} rebuilt this from the ground up. It barely resembles the rough.`
          : gain >= 14
          ? `${producer.name} opened the record right up. It sounds like a different song.`
          : gain >= 7
          ? `${producer.name} cleaned it up properly. Noticeably bigger than the rough.`
          : gain >= 3
          ? `${producer.name} tightened what was there. Modest lift.`
          : `${producer.name} did what they could with the material. It was not going to become much more.`;

        const workId = uuidv4();
        state.workItems.push({
          id: workId,
          kind: 'mix',
          label: `Mixing "${song.title}"`,
          detail: `${producer.name} · ${daysTotal} day${daysTotal > 1 ? 's' : ''} · $${cost.toLocaleString()}`,
          daysTotal,
          daysDone: 0,
          startedSerial: startSerial,
          payload: {
            songId: song.id,
            producerId: producer.id,
            producerName: producer.name,
            productionQuality: productionAfter,
            quality: qualityAfter,
            commercialPotential: commercialAfter,
            criticalPotential: criticalAfter,
            gain,
            read,
          } satisfies MixWork,
        });

        state.lastEventLog.unshift(
          `🎚️ ${producer.name} took "${song.title}" away to mix — ${daysTotal} days, $${cost.toLocaleString()}.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        result = {
          ok: true,
          songId: song.id,
          producerName: producer.name,
          producerSkill: skill,
          cost,
          daysSpent: daysTotal,
          productionGain: gain,
          qualityBefore,
          qualityAfter,
          read,
          inProgress: true,
          workId,
          readyOn: formatGameDate(serialToDate(startSerial + daysTotal)),
        };
      });

      return result;
    },

    releaseMaster: (songId, marketingBudget, platformIds) =>
      set((state) => {
        if (!state.player) return;
        if (state.legacy.retired) return;

        const song = state.songs.find(s => s.id === songId);
        if (!song || song.masterStatus === 'released') return;

        // A record has to go somewhere. An empty delivery list is a mistake,
        // not a choice — refuse it rather than releasing to nobody.
        const delivered = platformIds?.filter((id) => PLATFORM_BY_ID[id]);
        if (platformIds && delivered && delivered.length === 0) return;

        if (state.player.career.money < marketingBudget) return;
        // Release day is a long day — uploads, press, rollout.
        if (!spendEnergy(state, ENERGY_COSTS.release, { admin: true })) return;

        state.player.career.money -= marketingBudget;
        song.marketingBudget = marketingBudget;
        song.masterStatus = 'released';
        song.releaseDate = formatGameDate(state.gameDate);
        song.weeksOut = 0;
        // `undefined` means everywhere, which is what an untouched release
        // dialog means. An explicit list is what the engine reads to decide
        // where this record can actually be heard.
        song.platformIds = delivered && delivered.length < PLATFORM_LIST.length
          ? [...delivered]
          : undefined;
        // A record enters the world with a first week of movement — and heat
        // opens doors. The same record arriving while people are already
        // watching you does a bigger first week than it would in a quiet month.
        // This is the first thing momentum is actually for.
        const releaseHeat = 1 + state.player.career.momentum / 200;
        song.weeklyStreams = Math.max(
          50,
          Math.round((song.quality * 12 + marketingBudget * 0.4) * releaseHeat),
        );

        // The first week is scaled by the share of the world the record was
        // actually delivered to. Otherwise a SoundCloud-only release would open
        // with the same first-week figure as a full global rollout.
        if (song.platformIds) {
          const weights = platformWeights(
            {
              quality: song.quality,
              genre: song.genre,
              homeCountry: state.player.country,
              artistPopularity: blendedFame(state.player),
              fanbase: state.player.career.fanbase,
              marketing: marketingPush(marketingBudget),
              videoViews: 0,
              isNpc: false,
              weeksOut: 0,
            },
            0,
          );
          song.weeklyStreams = Math.max(
            20,
            Math.round(song.weeklyStreams * platformReach(song.platformIds, weights)),
          );
        }

        // ── A REMIX IS A SECOND WIND, FOR BOTH RECORDS ───────────────────
        //
        // This is the whole reason an artist remixes a record instead of
        // leaving it alone, and it is deliberately NOT a guaranteed boost.
        //
        // Two things happen. The original gets pulled back onto playlists for a
        // window, and the remix opens with the audience the original already
        // built. Both are driven off the original's REAL units and its age, so
        // a remix of a song nobody heard does neither — it inherits a small
        // number and stays small, which is the honest outcome.
        if (song.lineage === 'remix' && song.originalSongId) {
          const original = state.songs.find((s) => s.id === song.originalSongId);
          const originalState = state.platformStats?.[song.originalSongId];
          if (original && originalState) {
            const nowSerial = dateToSerial(state.gameDate);
            const { power, width, reason } = revivalFor(state, original, song);

            // The original's second wind, planted at the age it is today.
            plantRevival(
              state,
              original.id,
              { power, width, reason },
              nowSerial - originalState.release,
            );

            // The remix's own opening. Its state does not exist yet — the
            // streaming engine creates it on the next tick — so the carry-over
            // is recorded on the record itself, which is also what gets saved.
            const carry = {
              at: 0,
              power: power * 0.8,
              width,
              reason: 'carried over from the original',
            };
            song.revivals = [...(song.revivals ?? []), carry];
            if (!state.platformStats) state.platformStats = {};
            if (!state.platformStats[song.id]) {
              const fresh = newSongPlatformState(song.id, nowSerial, 0);
              fresh.revivals = [{ ...carry }];
              state.platformStats[song.id] = fresh;
            }
          }
        }

        addMomentum(state, 5, 'you put a record out');

        const { post: releasePost } = playerReleaseReactions(song, state.player, raw(state.npcs) as NPC[]);
        state.socialPosts.unshift(releasePost as SocialPost);

        state.headlines.unshift({
          id: uuidv4(),
          text: generateHeadline('chart', state.player.artistName, `"${song.title}" is out now`),
          fullStory:
            `${state.player.artistName} just dropped "${song.title}", a new ${song.genre.replace('_', '-')} record` +
            `${song.producerName ? ` produced by ${song.producerName}` : ''}. The internet is reacting.`,
          date: formatGameDate(state.gameDate),
          relatedEntities: [state.player.id],
          priority: 5,
          category: 'chart',
        });

        state.lastEventLog.unshift(`🚀 "${song.title}" is out. Streams start next week.`);
        state.lastEventLog = state.lastEventLog.slice(0, 10);
      }),

    // ─── ALBUM / EP ASSEMBLY ────────────────────────────────────────────
    //
    // An album is not a new thing the game invents — it is a real bundle of
    // records that already exist. Its units are derived live from the tracks'
    // own streaming state (see `buildAlbumChart`), so putting a single on a
    // project genuinely carries its audience over, and a project of flops
    // charts like a project of flops.
    createAlbum: (data) => {
      let result: { ok: true; albumId: string } | { ok: false; error: string } = {
        ok: false,
        error: 'Something went wrong.',
      };

      set((state) => {
        if (!state.player) {
          result = { ok: false, error: 'No artist loaded.' };
          return;
        }

        const title = data.title.trim();
        if (!title) {
          result = { ok: false, error: 'Give the project a title.' };
          return;
        }
        if (data.songIds.length < MIN_PROJECT_TRACKS[data.type]) {
          result = { ok: false, error: PROJECT_TRACK_RULE[data.type] };
          return;
        }

        // Any of your own masters, released or still in the vault, and nothing
        // already on one of your projects. A song cannot be on two albums and
        // count twice.
        //
        // Unreleased tracks are allowed on purpose. In real life the tracklist
        // is decided before anybody hears it, and finishing the album is how
        // its songs come out — so putting one here is what releases it.
        const mine = new Map(state.songs.map((s) => [s.id, s]));
        const alreadyUsed = new Set<string>();
        for (const a of state.albums) {
          if ((a.ownerId ?? state.player.id) !== state.player.id) continue;
          for (const id of a.songs) alreadyUsed.add(id);
        }

        const tracks: Song[] = [];
        for (const id of data.songIds) {
          const song = mine.get(id);
          if (!song) {
            result = { ok: false, error: 'That track is not in your vault.' };
            return;
          }
          if (alreadyUsed.has(id)) {
            result = { ok: false, error: `"${song.title}" is already on one of your projects.` };
            return;
          }
          tracks.push(song as Song);
        }

        // Anything on this tracklist that was not out yet comes out with the
        // project. Done before the album record is written, so the album and
        // its tracks agree about what is live from the same instant.
        for (const t of tracks) {
          if (!isReleased(t)) releaseAsProjectTrack(state, t);
        }

        const index = state.albums.filter((a) => (a.ownerId ?? state.player!.id) === state.player!.id).length;
        const albumId = `alb_player_${state.player.id.slice(0, 8)}_${index}`;
        const serial = dateToSerial(state.gameDate);

        state.albums.push({
          id: albumId,
          title,
          songs: tracks.map((t) => t.id),
          releaseDate: formatGameDate(state.gameDate),
          totalStreams: 0,
          totalEarnings: 0,
          certifications: [],
          ownerId: state.player.id,
          ownerName: state.player.artistName,
          ownerCountry: state.player.country,
          type: data.type,
          coverSeed: hashString(`rl-cover|${state.player.id}|${index}`),
          releaseSerial: serial,
        } as typeof state.albums[number]);

        state.headlines.unshift({
          id: uuidv4(),
          text: generateHeadline('chart', state.player.artistName, `"${title}" is out now`),
          fullStory:
            `${state.player.artistName} has released ${title}, a ${data.type === 'album' ? 'full-length album' : 'EP'} ` +
            `of ${tracks.length} tracks. It is on the charts from this week.`,
          date: formatGameDate(state.gameDate),
          relatedEntities: [state.player.id],
          priority: 7,
          category: 'chart',
        });

        state.lastEventLog.unshift(
          `💿 "${title}" — ${tracks.length}-track ${data.type === 'album' ? 'album' : 'EP'} is out.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        result = { ok: true, albumId };
      });

      return result;
    },

    scrapMaster: (songId) =>
      set((state) => {
        if (!state.player) return;
        const idx = state.songs.findIndex(s => s.id === songId);
        if (idx === -1) return;
        const song = state.songs[idx];
        if (song.masterStatus === 'released') return; // you cannot un-release

        // Studio time is spent, but the beat can be reused — small refund.
        const refund = Math.round((song.recordingCost ?? 0) * 0.15);
        state.player.career.money += refund;
        state.songs.splice(idx, 1);

        state.lastEventLog.unshift(`🗑️ Scrapped "${song.title}". Recovered $${refund.toLocaleString()}.`);
        state.lastEventLog = state.lastEventLog.slice(0, 10);
      }),

    updateMasterLyrics: (songId, lyrics) => {
      let result: VaultActionResult = {
        ok: false,
        message: 'That master is not in the vault.',
      };
      set((state) => {
        const song = state.songs.find(s => s.id === songId);
        if (!song) return;
        if (isReleased(song)) {
          result = {
            ok: false,
            message: 'That record is out. Rewriting the sheet now would change a song people already know — cut a remix instead.',
          };
          return;
        }
        const before = song.quality;
        song.lyrics = lyrics;
        // Rewriting the sheet after tracking is a different thing to writing it
        // in the booth, but it still moves the lyric read.
        const analysis = analyzeLyrics(lyrics);
        const stats = state.player?.stats;
        if (stats) {
          const writerSkill =
            stats.lyricism * 0.42 + stats.songwriting * 0.36 +
            stats.creativity * 0.14 + stats.originality * 0.08;
          song.lyricsQuality = Math.max(1, Math.min(100, Math.round(
            writerSkill * (0.45 + analysis.depth / 100 * 0.55) + analysis.depth * 0.18,
          )));
          song.quality = applyMoodPenalty(
            blendQuality({
              lyricsQuality: song.lyricsQuality,
              productionQuality: song.productionQuality ?? 0,
              vocalPerformance: song.vocalPerformance ?? 0,
              chemistry: song.chemistry ?? 0,
            }),
            song.mood ?? 'defiant',
            song.genre,
          );
        }
        const after = song.quality;
        // New words invalidate a mix. The production did not change, but the
        // record it was mixed around did, so it goes back to a rough master.
        // `mixed` is the legacy value for the same state — a save written
        // before `mastered` existed still has to be handled.
        if (song.masterStatus === 'mastered' || song.masterStatus === 'mixed') {
          song.masterStatus = 'recorded';
        }
        song.readyToRelease = false;
        result = {
          ok: true,
          message:
            after === before
              ? `Rewritten. "${song.title}" still reads ${gradeLabel(after)}.`
              : `Rewritten. "${song.title}" went ${gradeLabel(before)} → ${gradeLabel(after)}.`,
          qualityBefore: before,
          qualityAfter: after,
        };
      });
      return result;
    },

    // ─── STUDIO VAULT ───────────────────────────────────────────────────
    //
    // The vault is every master that is yours and not out yet. Everything here
    // refuses a released record: once a song is in the world it is out of your
    // hands, and the way to change it is a remix (see `createRemix`).

    archiveSong: (songId) => {
      let result: VaultActionResult = { ok: false, message: 'That master is not in the vault.' };
      set((state) => {
        const song = state.songs.find((s) => s.id === songId);
        if (!song) return;
        if (isReleased(song)) {
          result = { ok: false, message: 'That record is already out. You cannot archive something the world already has.' };
          return;
        }
        if (song.archivedAt) {
          result = { ok: false, message: `"${song.title}" is already archived.` };
          return;
        }
        song.archivedAt = formatGameDate(state.gameDate);
        // An archived master is not waiting on anything any more.
        song.readyToRelease = false;
        result = { ok: true, message: `Archived "${song.title}". It is still here if you want it back.` };
        state.lastEventLog.unshift(`📦 Archived "${song.title}".`);
        state.lastEventLog = state.lastEventLog.slice(0, 10);
      });
      return result;
    },

    unarchiveSong: (songId) => {
      let result: VaultActionResult = { ok: false, message: 'That master is not archived.' };
      set((state) => {
        const song = state.songs.find((s) => s.id === songId);
        if (!song || !song.archivedAt) return;
        song.archivedAt = undefined;
        result = { ok: true, message: `"${song.title}" is back in the vault.` };
      });
      return result;
    },

    // ─── EDIT: RETITLE IT ───────────────────────────────────────────────
    //
    // This action replaced `addFeatureToSong`, which put a guest on a record
    // in a single click. That is what made the reported bug possible: the
    // player asked an artist for a verse and the verse simply appeared, with
    // no fee, no wait and no conversation, because the whole thing was one
    // hidden dice roll behind a button. Putting a feature on a record now goes
    // through `sendFeatureRequest` and comes back days later like everything
    // else in this business.
    renameSong: (songId, rawTitle) => {
      let result: VaultActionResult = { ok: false, message: 'That master is not in the vault.' };
      const title = rawTitle.trim().replace(/\s+/g, ' ');

      if (!title) {
        return { ok: false, message: 'A record needs a name. Type something first.' };
      }
      if (title.length > 60) {
        return { ok: false, message: 'That is a paragraph, not a title. Keep it under 60 characters.' };
      }

      set((state) => {
        const song = state.songs.find((s) => s.id === songId);
        if (!song) return;

        if (isReleased(song)) {
          result = {
            ok: false,
            message: `"${song.title}" is already out. The charts, the streams and other people's catalogues are all holding that name — renaming it now would be a lie.`,
          };
          return;
        }

        const before = song.title;
        if (before === title) {
          result = { ok: false, message: 'It is already called that.' };
          return;
        }

        song.title = title;

        // Anything that quoted the old name has to move with it, or the
        // vault, the feature letters and the DMs start describing a record
        // that no longer exists under that name.
        for (const req of state.featureRequests) {
          if (req.songId === songId) req.songTitle = title;
        }
        for (const thread of Object.values(state.dmThreads)) {
          for (const m of thread.messages) {
            if (m.attachedSongId === songId) m.attachedTitle = title;
          }
        }

        result = { ok: true, message: `"${before}" is now "${title}".` };
        state.lastEventLog.unshift(`✏️ Retitled "${before}" to "${title}".`);
        state.lastEventLog = state.lastEventLog.slice(0, 10);
      });

      return result;
    },


    // ─── DELETE ─────────────────────────────────────────────────────────
    deleteSong: (songId) => {
      let result: VaultActionResult = { ok: false, message: 'That master is not in the vault.' };
      const state = get();
      const song = state.songs.find((s) => s.id === songId);
      if (!song) return result;

      if (isReleased(song)) {
        return {
          ok: false,
          message: `"${song.title}" is out in the world. You cannot delete a record people have heard — archive it instead.`,
        };
      }

      const title = song.title;

      set((s) => {
        s.songs = s.songs.filter((x) => x.id !== songId);
        // Everything that pointed at the record has to go with it, or the world
        // is left holding a reference to something that no longer exists — and
        // the chart and streaming code both assume those ids resolve.
        if (s.platformStats) delete s.platformStats[songId];
        for (const album of s.albums) {
          album.songs = album.songs.filter((id) => id !== songId);
        }
        if (s.chartRuns) {
          delete s.chartRuns[`songs|${songId}`];
          delete s.chartRuns[`albums|${songId}`];
        }
        if (s.chartMilestones) {
          s.chartMilestones = s.chartMilestones.filter((m) => m.itemId !== songId);
        }
        if (s.videos) {
          s.videos = s.videos.filter((v) => v.songId !== songId);
        }
        s.lastEventLog.unshift(`🗑️ "${title}" was deleted off the hard drive.`);
        s.lastEventLog = s.lastEventLog.slice(0, 10);
      });

      result = { ok: true, message: `"${title}" is gone. Nothing of it is left.` };
      return result;
    },

    setReadyToRelease: (songId, ready) => {
      let result: VaultActionResult = { ok: false, message: 'That master is not in the vault.' };
      set((state) => {
        const song = state.songs.find((s) => s.id === songId);
        if (!song) return;
        if (isReleased(song)) {
          result = { ok: false, message: 'That record is already out.' };
          return;
        }
        if (song.archivedAt) {
          result = { ok: false, message: `"${song.title}" is archived. Bring it back first.` };
          return;
        }
        song.readyToRelease = ready;
        result = {
          ok: true,
          message: ready
            ? `"${song.title}" is marked ready to release.`
            : `"${song.title}" is back on the bench.`,
        };
      });
      return result;
    },

    setVaultNote: (songId, note) => {
      let result: VaultActionResult = { ok: false, message: 'That master is not in the vault.' };
      set((state) => {
        const song = state.songs.find((s) => s.id === songId);
        if (!song) return;
        song.vaultNote = note.slice(0, 280);
        result = { ok: true, message: 'Note saved.' };
      });
      return result;
    },

    swapProduction: (songId, producerId, beatId) => {
      let result: VaultActionResult = { ok: false, message: 'That master is not in the vault.' };
      set((state) => {
        if (!state.player) return;
        const song = state.songs.find((s) => s.id === songId);
        if (!song) return;
        if (isReleased(song)) {
          result = {
            ok: false,
            message: 'That record is already out — you cannot re-produce it. Cut a remix instead.',
          };
          return;
        }

        const npcs = raw(state.npcs) as NPC[];
        const producer = producerId ? npcs.find((n) => n.id === producerId) ?? null : null;
        const skill = producer ? producerSkillOf(producer) : null;
        const beats = producer ? getProducerBeats(producer.id, skill!) : getSelfProducedBeats();
        const beat = beats.find((b) => b.id === beatId) ?? beats[0];
        if (!beat) {
          result = { ok: false, message: 'That producer has no beats to pick from.' };
          return;
        }

        // Re-tracking is a session, not a free edit.
        const cost = 450 + (skill === null ? 0 : producerFee(skill));
        if (state.player.career.money < cost) {
          result = {
            ok: false,
            message: `That session costs $${cost.toLocaleString()} and you have $${Math.floor(state.player.career.money).toLocaleString()}.`,
          };
          return;
        }
        if (!spendEnergy(state, ENERGY_COSTS.recordStandard)) {
          result = { ok: false, message: 'You do not have the energy to get back in the booth today.' };
          return;
        }

        const qualityBefore = song.quality;
        state.player.career.money -= cost;

        // New material means the old mix is gone: rescore from scratch and drop
        // the record back to a rough master so it has to be mixed again.
        const fresh = rescoreMaster(state, song, { producerSkill: skill, beatQuality: beat.quality });
        applyRescore(song, fresh, false);
        song.producerId = producer?.id;
        song.producerName = producer?.name;
        song.producerSkill = skill ?? undefined;
        song.beatId = beat.id;
        song.beatName = beat.name;
        song.beatQuality = beat.quality;
        song.recordingCost = (song.recordingCost ?? 0) + cost;
        song.masterStatus = 'recorded';
        song.readyToRelease = false;

        result = {
          ok: true,
          message: `Re-tracked "${song.title}" with ${producer?.name ?? 'your own beat'}. It is a rough master again — it needs a mix.`,
          scores: fresh,
          qualityBefore,
          qualityAfter: song.quality,
        };
        state.lastEventLog.unshift(`🎛️ Re-tracked "${song.title}".`);
        state.lastEventLog = state.lastEventLog.slice(0, 10);
      });
      return result;
    },

    rerecordSong: (songId, payload) => {
      const before = get();
      const source = before.songs.find((s) => s.id === songId);
      if (!source || isReleased(source)) return null;

      // A fresh take is a whole new session, priced and scored like one. The
      // lineage travels WITH the booking rather than being patched on
      // afterwards: the take does not exist as a record until the days are
      // done, so there is nothing to look up when the session lands.
      return get().createStudioSong({
        ...payload,
        lineageOf: {
          songId: source.id,
          title: source.title,
          takeNumber: (source.takeNumber ?? 1) + 1,
        },
      });
    },

    // ─── REMIXES OF RELEASED RECORDS ────────────────────────────────────
    //
    // A remix is a new reading of a record that is already out, not a version of
    // an unreleased master. It is its own song with its own streaming state and
    // its own chart run; the link back to the original is only how the two
    // explain each other.
    //
    // The remix does NOT get a guaranteed boost. It goes out through the same
    // release path as anything else, and the only thing the original does for it
    // is decide how much of an audience there is to build on — which is why a
    // remix of a song nobody heard stays small.
    createRemix: (data) => {
      let result: RemixResult = { ok: false, message: 'That record is not out yet.' };
      set((state) => {
        if (!state.player) return;

        const original = state.songs.find((s) => s.id === data.originalSongId);
        if (!original) {
          result = { ok: false, message: 'That record no longer exists.' };
          return;
        }
        if (!isReleased(original)) {
          result = {
            ok: false,
            message: 'You can only remix a record that is already out. Re-record an unreleased master instead.',
          };
          return;
        }

        const npcs = raw(state.npcs) as NPC[];
        const producer = data.producerId
          ? npcs.find((n) => n.id === data.producerId) ?? null
          : null;
        const skill = producer ? producerSkillOf(producer) : null;
        const beats = producer ? getProducerBeats(producer.id, skill!) : getSelfProducedBeats();
        const beat = beats.find((b) => b.id === data.beatId) ?? beats[0];
        if (!beat) {
          result = { ok: false, message: 'That producer has no beats to pick from.' };
          return;
        }

        const cost = 700 + (skill === null ? 0 : producerFee(skill));
        if (state.player.career.money < cost) {
          result = {
            ok: false,
            message: `A remix session costs $${cost.toLocaleString()} and you have $${Math.floor(state.player.career.money).toLocaleString()}.`,
          };
          return;
        }
        if (!spendEnergy(state, ENERGY_COSTS.recordStandard)) {
          result = { ok: false, message: 'You do not have the energy to cut a remix today.' };
          return;
        }

        // Somebody was invited onto it. The ASK costs its own energy and takes
        // its own days, so it is paid for here rather than when the remix lands
        // — otherwise a player with no energy left at the end of the session
        // would quietly lose the guest they asked for.
        const invite = data.inviteNpcId
          ? (raw(state.npcs) as NPC[]).find((n) => n.id === data.inviteNpcId) ?? null
          : null;
        if (invite) {
          if (invite.role !== 'artist') {
            result = {
              ok: false,
              message: `${invite.name} is not an artist. You want a verse off them, not a meeting.`,
            };
            return;
          }
          if (!spendEnergy(state, ENERGY_COSTS.shopFeature, { admin: true })) {
            const need = effectiveEnergy(state, ENERGY_COSTS.shopFeature, { admin: true });
            result = {
              ok: false,
              message: `Asking ${invite.name} onto it takes ${need} energy and you are at ${Math.floor(state.player.energy)}. ${energyShortfallMessage(need, state.player.energy)}`,
            };
            return;
          }
        }

        const lyrics = data.lyrics && data.lyrics.trim() ? data.lyrics : original.lyrics ?? '';
        const title = data.title?.trim() || `${original.title} (Remix)`;

        // A remix is a session, so it takes the days a session takes.
        const daysTotal = Math.max(1, Math.round(sessionDays(2) * crewBonuses(raw(state.crew) as CrewMember[]).sessionSpeed));
        const startSerial = dateToSerial(state.gameDate);

        // Scored through the same session function as anything else, so a remix
        // is a real record and not a special case.
        const scores = rescoreMaster(state, original, {
          lyrics,
          producerSkill: skill,
          beatQuality: beat.quality,
        });

        state.player.career.money -= cost;

        const song: Song = {
          id: uuidv4(),
          title,
          genre: original.genre,
          quality: scores.quality,
          releaseDate: formatGameDate(state.gameDate),
          marketingBudget: 0,
          totalStreams: 0,
          weeklyStreams: 0,
          totalEarnings: 0,
          version: 'remix',
          // The link. Both records point at each other through this id, which is
          // what the record page reads to show "Remix of …" and "Original".
          originalSongId: original.id,
          lineage: 'remix',
          featuredArtists: [...(original.featuredArtists ?? [])],
          featureArtistNames: [...(original.featureArtistNames ?? [])],
          chartPositions: {},
          certifications: [],
          hasVideo: false,
          videoViews: 0,

          bpm: original.bpm ?? 90,
          mood: original.mood ?? 'defiant',
          lyrics,
          lyricsQuality: scores.lyricsQuality,
          ghostwriterId: original.ghostwriterId,
          ghostwriterName: original.ghostwriterName,
          productionQuality: scores.productionQuality,
          productionCeiling: scores.productionCeiling,
          vocalPerformance: scores.vocalPerformance,
          chemistry: scores.chemistry,
          producerId: producer?.id,
          producerName: producer?.name,
          producerSkill: skill ?? undefined,
          beatId: beat.id,
          beatName: beat.name,
          beatQuality: beat.quality,
          commercialPotential: scores.commercialPotential,
          criticalPotential: scores.criticalPotential,
          recordingCost: cost,
          // A remix still has to be mixed and released like anything else.
          masterStatus: 'recorded',
          recordingDate: formatGameDate(serialToDate(startSerial + daysTotal)),
          vocalSettings: { ...(original.vocalSettings ?? VOCAL_DEFAULTS) },
        };

        // A remix is a session like any other, so it takes the days it takes.
        // The guest ask travels with the booking: there is no record to send
        // until the remix is finished, and the energy for the ask is spent
        // below, at booking time, so nothing can fail for want of it later.
        const workId = uuidv4();
        state.workItems.push({
          id: workId,
          kind: 'record',
          label: `Remixing "${original.title}"`,
          detail: `${daysTotal} day${daysTotal > 1 ? 's' : ''} in the room · $${cost.toLocaleString()}`,
          daysTotal,
          daysDone: 0,
          startedSerial: startSerial,
          payload: {
            song,
            growth: 0.6,
            inviteNpcId: invite?.id,
          } satisfies RecordWork,
        });

        state.player.career.momentum = Math.min(100, state.player.career.momentum + 3);
        state.player.stats.productionKnowledge = Math.min(
          100,
          state.player.stats.productionKnowledge + 0.4,
        );

        result = {
          ok: true,
          message:
            `"${title}" is booked in for ${daysTotal} day${daysTotal > 1 ? 's' : ''}. ` +
            `Mix it, then release it — a remix goes out like any other record.` +
            (invite ? ` The ask has gone on file for ${invite.name} and goes out the day it is finished.` : ''),
          songId: song.id,
        };
        state.lastEventLog.unshift(
          `🔁 Remix of "${original.title}" booked in as "${title}" — ${daysTotal} day${daysTotal > 1 ? 's' : ''}.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);
      });

      return result;
    },

    // ─── DELUXE / MIXTAPE ───────────────────────────────────────────────

    createDeluxe: (albumId, songIds) => {
      let result: { ok: true; albumId: string } | { ok: false; error: string } = {
        ok: false,
        error: 'Something went wrong.',
      };
      set((state) => {
        if (!state.player) {
          result = { ok: false, error: 'No artist loaded.' };
          return;
        }
        const base = state.albums.find((a) => a.id === albumId);
        if (!base) {
          result = { ok: false, error: 'That project no longer exists.' };
          return;
        }
        if ((base.ownerId ?? state.player.id) !== state.player.id) {
          result = { ok: false, error: 'That is not your project.' };
          return;
        }
        if (base.type === 'deluxe') {
          result = { ok: false, error: 'That is already a deluxe edition.' };
          return;
        }
        if (songIds.length < MIN_PROJECT_TRACKS.deluxe) {
          result = { ok: false, error: PROJECT_TRACK_RULE.deluxe };
          return;
        }

        // A deluxe is usually old tracks plus whatever was finished too late
        // for the original, so unreleased masters belong here more than
        // anywhere. They come out with the deluxe.
        const mine = new Map(state.songs.map((s) => [s.id, s]));
        // Tracks already on the base edition are the whole point of a deluxe —
        // but a track cannot be listed twice, and it cannot already be on
        // another project of yours.
        const onBase = new Set(base.songs);
        for (const other of state.albums) {
          if (other.id === base.id) continue;
          if ((other.ownerId ?? state.player.id) !== state.player.id) continue;
          for (const id of other.songs) onBase.add(id);
        }

        const extra: Song[] = [];
        for (const id of songIds) {
          const song = mine.get(id);
          if (!song) {
            result = { ok: false, error: 'That track is not in your vault.' };
            return;
          }
          if (onBase.has(id)) {
            result = { ok: false, error: `"${song.title}" is already on one of your projects.` };
            return;
          }
          extra.push(song);
        }

        // The extras that were not out yet come out with the deluxe.
        for (const t of extra) {
          if (!isReleased(t)) releaseAsProjectTrack(state, t);
        }

        const nowSerial = dateToSerial(state.gameDate);
        const id = `alb_deluxe_${base.id}_${state.albums.length}`;
        state.albums.push({
          id,
          title: `${base.title} (Deluxe)`,
          songs: [...base.songs, ...extra.map((s) => s.id)],
          releaseDate: formatGameDate(state.gameDate),
          totalStreams: 0,
          totalEarnings: 0,
          certifications: [],
          ownerId: state.player.id,
          ownerName: state.player.artistName,
          ownerCountry: state.player.country,
          type: 'deluxe',
          originalAlbumId: base.id,
          coverSeed: hashString(`rl-cover|deluxe|${base.id}`),
          releaseSerial: nowSerial,
        } as typeof state.albums[number]);

        result = { ok: true, albumId: id };
        state.lastEventLog.unshift(
          `💿 "${base.title}" is back out as a deluxe edition with ${extra.length} extra track${extra.length === 1 ? '' : 's'}.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);
      });
      return result;
    },

    createMixtape: (data) => {
      let result: { ok: true; albumId: string } | { ok: false; error: string } = {
        ok: false,
        error: 'Something went wrong.',
      };
      set((state) => {
        if (!state.player) {
          result = { ok: false, error: 'No artist loaded.' };
          return;
        }
        const title = data.title.trim();
        if (!title) {
          result = { ok: false, error: 'Give the mixtape a name.' };
          return;
        }
        if (data.songIds.length < MIN_PROJECT_TRACKS.mixtape) {
          result = { ok: false, error: PROJECT_TRACK_RULE.mixtape };
          return;
        }

        // Same rule as an album: your own masters, out or not. A mixtape is
        // where unreleased material has always lived, so this is the format
        // that needs it most.
        const mine = new Map(state.songs.map((s) => [s.id, s]));
        const used = new Set<string>();
        for (const a of state.albums) {
          if ((a.ownerId ?? state.player.id) !== state.player.id) continue;
          for (const id of a.songs) used.add(id);
        }

        const tracks: Song[] = [];
        for (const id of data.songIds) {
          const song = mine.get(id);
          if (!song) {
            result = { ok: false, error: 'That track is not in your vault.' };
            return;
          }
          if (used.has(id)) {
            result = { ok: false, error: `"${song.title}" is already on one of your projects.` };
            return;
          }
          tracks.push(song);
        }

        // Whatever was not out yet comes out with the tape.
        for (const t of tracks) {
          if (!isReleased(t)) releaseAsProjectTrack(state, t);
        }

        const nowSerial = dateToSerial(state.gameDate);
        const id = `alb_tape_${state.player.id}_${state.albums.length}`;
        state.albums.push({
          id,
          title,
          songs: tracks.map((s) => s.id),
          releaseDate: formatGameDate(state.gameDate),
          totalStreams: 0,
          totalEarnings: 0,
          certifications: [],
          ownerId: state.player.id,
          ownerName: state.player.artistName,
          ownerCountry: state.player.country,
          type: 'mixtape',
          coverSeed: hashString(`rl-cover|tape|${id}`),
          releaseSerial: nowSerial,
        } as typeof state.albums[number]);

        for (const t of state.songs) {
          if (tracks.some((x) => x.id === t.id)) t.mixtapeId = id;
        }

        result = { ok: true, albumId: id };
        state.lastEventLog.unshift(`📼 "${title}" is out — ${tracks.length} tracks, mixtape rules.`);
        state.lastEventLog = state.lastEventLog.slice(0, 10);
      });
      return result;
    },

    // ─── VIDEO VAULT ────────────────────────────────────────────────────
    publishVideo: (videoId) => {
      let result: VaultActionResult = { ok: false, message: 'That video is not in the vault.' };
      set((state) => {
        const video = state.videos?.find((v) => v.id === videoId);
        if (!video) return;
        if (video.published) {
          result = { ok: false, message: 'That video is already up.' };
          return;
        }
        // A visual for a master that is not out cannot go up before the record.
        const song = state.songs.find((s) => s.id === video.songId);
        if (song && !isReleased(song)) {
          result = {
            ok: false,
            message: `"${song.title}" is not out yet. The video goes up with the record.`,
          };
          return;
        }
        video.status = 'published';
        video.published = true;
        video.awaitingRelease = false;
        // A live visual lifts the record it belongs to — the same flag a
        // same-day shoot sets. Without this, publishing a vaulted video left
        // the song thinking it had no video at all.
        if (song) song.hasVideo = true;
        result = { ok: true, message: `"${video.title}" is live.` };
      });
      return result;
    },

    // ─── FEATURE NEGOTIATION ────────────────────────────────────────────
    //
    // The track goes out; the answer comes back days later, during
    // `advanceTurn`. Nothing here decides the outcome — that is
    // `decideFeatureResponse` in sim/features.ts, kept pure so it can be
    // reasoned about (and tested) on its own.
    sendFeatureRequest: (songId, npcId) => {
      let result: FeatureActionResult = { ok: false, message: 'That did not go through.' };

      set((state) => {
        if (!state.player) {
          result = { ok: false, message: 'There is no career open to send anything from.' };
          return;
        }

        const song = state.songs.find(s => s.id === songId);
        // Only your own unreleased material can be shopped. Once it is out,
        // the feature ship has sailed.
        if (!song) {
          result = { ok: false, message: 'That record is not in your vault.' };
          return;
        }
        if (song.masterStatus === 'released') {
          result = {
            ok: false,
            message: `"${song.title}" is already out. You cannot add a verse to a record people have heard — put one on a remix instead.`,
          };
          return;
        }

        const npc = state.npcs.find(n => n.id === npcId);
        if (!npc) {
          result = { ok: false, message: 'That artist is not in your world.' };
          return;
        }
        if (npc.role !== 'artist') {
          result = {
            ok: false,
            message: `${npc.name} is not an artist. You want a verse off them, not a meeting.`,
          };
          return;
        }

        // They are already on this record. There is nothing left to negotiate.
        if ((song.featuredArtists ?? []).includes(npcId)) {
          result = { ok: false, message: `${npc.name} is already on this record.` };
          return;
        }

        // Already talking to them about this record? A live conversation does
        // not need a second message — but a dead one can be reopened.
        const existing = state.featureRequests.find(
          r => r.songId === songId && r.npcId === npcId && r.status !== 'declined' && r.status !== 'ignored',
        );
        if (existing) {
          result = {
            ok: false,
            message: `You are already waiting on ${npc.name} about "${song.title}" — ${existing.status === 'sent' ? `they have until ${existing.dueDate} to answer` : 'their answer is already in your Mailbox'}.`,
          };
          return;
        }

        if (!spendEnergy(state, ENERGY_COSTS.shopFeature, { admin: true })) {
          const need = effectiveEnergy(state, ENERGY_COSTS.shopFeature, { admin: true });
          result = {
            ok: false,
            message: `Sending a track out takes ${need} energy and you are at ${Math.floor(state.player.energy)}. ${energyShortfallMessage(need, state.player.energy)}`,
          };
          return;
        }

        const days = featureResponseDays(npc as FeatureCandidate);
        const req = openFeatureRequest(state, song, npc);

        state.lastEventLog.unshift(
          `📤 Sent "${song.title}" to ${npc.name}. Expect an answer in about ${days} days.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        result = {
          ok: true,
          message: `Sent "${song.title}" to ${npc.name}. Expect an answer in about ${days} days — nothing happens fast in this business.`,
          // A plain copy, NOT the draft. The draft is revoked the moment the
          // producer returns, and a caller that holds it and reads `status` a
          // second later would be reading a proxy that throws.
          request: { ...req },
        };
      });

      return result;
    },

    /**
     * Push back on a price.
     *
     * The player names a number; what comes back is `counterFeatureFee`'s
     * answer. Nothing here decides it, exactly as with the opening reply, so
     * the two halves of the negotiation cannot drift apart.
     */
    counterFeatureOffer: (requestId, offer) => {
      let result: FeatureActionResult = { ok: false, message: 'That is not on the table.' };

      set((state) => {
        if (!state.player) return;

        const req = state.featureRequests.find(r => r.id === requestId);
        if (!req) {
          result = { ok: false, message: 'That negotiation is no longer open.' };
          return;
        }
        if (req.status !== 'terms') {
          result = { ok: false, message: 'There is no price to argue with — nothing is on the table.' };
          return;
        }
        // The UI hides the control past the cap; the store enforces it, because
        // a rule that only exists in the view is not a rule.
        if ((req.negotiationRound ?? 0) >= MAX_NEGOTIATION_ROUNDS) {
          result = {
            ok: false,
            message: `You have pushed ${MAX_NEGOTIATION_ROUNDS} times. ${req.npcName} is done talking — pay the number or walk away.`,
          };
          return;
        }

        const npc = state.npcs.find(n => n.id === req.npcId);
        if (!npc) {
          result = { ok: false, message: 'That artist is not in your world any more.' };
          return;
        }

        const counter = Math.round(offer);
        if (!Number.isFinite(counter) || counter <= 0) {
          result = { ok: false, message: 'Offer them an actual number.' };
          return;
        }
        if (counter >= req.fee) {
          result = {
            ok: false,
            message: `You are already being asked ${'$'}${req.fee.toLocaleString()}. Offering more than that is not a negotiation.`,
          };
          return;
        }
        if (counter > state.player.career.money) {
          result = {
            ok: false,
            message: `You have ${'$'}${Math.floor(state.player.career.money).toLocaleString()} — you cannot offer money you do not have.`,
          };
          return;
        }

        const song = state.songs.find(s => s.id === req.songId);
        const manager = activeManager(
          state.contracts as unknown as ActiveContract[],
          state.npcs as unknown as NPC[],
        );

        const round = (req.negotiationRound ?? 0) + 1;
        const out = counterFeatureFee({
          npc: npc as FeatureCandidate,
          songQuality: song?.quality ?? 50,
          managerSkill: managerSkillOf(manager),
          playerFame: blendedFame(state.player),
          genre: state.player.genre,
          currentFee: req.fee,
          offer: counter,
          round,
          roll: Math.random(),
        });

        req.originalFee = req.originalFee ?? req.fee;
        req.negotiationRound = round;
        req.lastOffer = counter;
        req.reason = out.reason;

        if (out.refused) {
          req.status = 'declined';
        } else {
          req.fee = out.fee;
        }

        // The conversation lives in the DMs as well as in the Mailbox —
        // a price is something somebody said to you.
        const thread = state.dmThreads[req.npcId] ?? { npcId: req.npcId, messages: [], unread: 0 };
        thread.messages.push({
          id: uuidv4(),
          npcId: req.npcId,
          fromPlayer: true,
          content: `${'$'}${counter.toLocaleString()} and I will put it out properly.`,
          timestamp: new Date().toISOString(),
          read: true,
        });
        thread.messages.push({
          id: uuidv4(),
          npcId: req.npcId,
          fromPlayer: false,
          content: out.reason,
          timestamp: new Date().toISOString(),
          read: false,
        });
        thread.unread += 1;
        state.dmThreads[req.npcId] = thread;

        result = out.refused
          ? { ok: false, message: out.reason }
          : { ok: true, message: out.reason };

        state.lastEventLog.unshift(
          out.refused
            ? `🚫 ${npc.name} walked away from the table on "${req.songTitle}".`
            : `🤝 Countered ${npc.name} at ${'$'}${counter.toLocaleString()} — they are at ${'$'}${req.fee.toLocaleString()}.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);
      });

      return result;
    },

    payFeatureFee: (requestId) => {
      let ok = false;

      set((state) => {
        if (!state.player) return;
        const req = state.featureRequests.find(r => r.id === requestId);
        if (!req || req.status !== 'terms') return;
        if (state.player.career.money < req.fee) return;

        state.player.career.money -= req.fee;
        req.paid = true;
        req.status = 'verse_ready';

        const npc = state.npcs.find(n => n.id === req.npcId);
        if (npc) {
          const song = state.songs.find(s => s.id === req.songId);
          req.verseQuality = verseQualityFor(npc as FeatureCandidate, song?.quality ?? 50);
          npc.memoryLog = [
            ...npc.memoryLog.slice(-9),
            `[Business] Paid $${req.fee.toLocaleString()} for a verse on "${req.songTitle}".`,
          ];
        }

        state.lastEventLog.unshift(
          `💸 Paid $${req.fee.toLocaleString()} to ${req.npcName}. The verse is in — cut it into the record.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);
        ok = true;
      });

      return ok;
    },

    declineFeatureTerms: (requestId) =>
      set((state) => {
        const req = state.featureRequests.find(r => r.id === requestId);
        if (!req || req.status !== 'terms') return;
        req.status = 'declined';
        req.reason = 'You passed on the fee. No hard feelings — this time.';
        state.lastEventLog.unshift(`🚫 Walked away from ${req.npcName}'s terms.`);
        state.lastEventLog = state.lastEventLog.slice(0, 10);
      }),

    addFeatureVerse: (requestId) => {
      let ok = false;

      set((state) => {
        if (!state.player) return;
        const req = state.featureRequests.find(r => r.id === requestId);
        // Only a verse that has actually landed can be cut in.
        if (!req || req.status !== 'verse_ready') return;

        const song = state.songs.find(s => s.id === req.songId);
        if (!song || song.masterStatus === 'released') return;
        if (!spendEnergy(state, ENERGY_COSTS.addVerse)) return;

        const npc = state.npcs.find(n => n.id === req.npcId);
        if (!npc) return;

        const existing = song.featureArtistNames ?? [];
        const existingIds = song.featuredArtists ?? [];

        // Recompute through the SAME chemistry formula the studio uses, so a
        // verse that arrives late lands on exactly the scale the player was
        // shown when they recorded.
        const featureList = [
          ...existingIds
            .map(id => state.npcs.find(n => n.id === id))
            .filter((n): n is NPC => n !== undefined)
            .map(n => ({ npc: n, relationship: n.relationshipScore })),
          { npc, relationship: npc.relationshipScore },
        ];

        const updated = applyFeatureVerse({
          song: {
            lyricsQuality: song.lyricsQuality ?? 0,
            productionQuality: song.productionQuality ?? 0,
            vocalPerformance: song.vocalPerformance ?? 0,
            commercialPotential: song.commercialPotential ?? 50,
            mood: song.mood ?? 'defiant',
            genre: song.genre,
          },
          features: featureList,
          verseQuality: req.verseQuality ?? 60,
          verseFame: npc.fame,
          stats: state.player.stats,
          existingFeatureCount: existingIds.length,
        });

        song.chemistry = updated.chemistry;
        song.vocalPerformance = updated.vocalPerformance;
        song.commercialPotential = updated.commercialPotential;
        song.quality = updated.quality;
        song.featuredArtists = [...existingIds, npc.id];
        song.featureArtistNames = [...existing, npc.name];

        req.status = 'added';

        // Being on a record together changes the relationship.
        npc.relationshipScore = Math.max(-100, Math.min(100, npc.relationshipScore + (req.freeVerse ? 8 : 4)));
        npc.memoryLog = [
          ...npc.memoryLog.slice(-9),
          `[Studio] Cut a verse on "${song.title}".`,
        ];

        // A name agreeing to be on your record is attention arriving.
        addMomentum(state, 2);

        state.lastEventLog.unshift(
          `🎙️ ${npc.name} is on "${song.title}". The record reads ${describeScore(song.quality)}`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);
        ok = true;
      });

      return ok;
    },

    // ─── INBOUND: SOMEBODY WANTS YOU ON THEIR RECORD ────────────────────
    //
    // The mirror of the block above, and it is NOT the same code with the sign
    // flipped. When the player asks, the risk is silence and the thing they do
    // not know is whether they will be heard. Here they are the one being paid,
    // the risk is money, and the thing they do not know is what the verse is
    // worth to the person across the table. That number is `ceiling`, it is
    // never rendered, and the manager's read is the only honest estimate of it
    // in the game.

    readInboundWithManager: (requestId) => {
      let result: FeatureActionResult = { ok: false, message: 'That ask is not open.' };

      set((state) => {
        if (!state.player) return;
        const req = state.inboundRequests.find((r) => r.id === requestId);
        if (!req) {
          result = { ok: false, message: 'That ask is not open.' };
          return;
        }
        if (req.status !== 'open') {
          result = { ok: false, message: 'That one is already settled — the number is on the card.' };
          return;
        }

        const npc = state.npcs.find((n) => n.id === req.npcId);
        if (!npc) {
          result = { ok: false, message: 'That artist is not in your world any more.' };
          return;
        }

        const manager = activeManager(raw(state.contracts) as ActiveContract[], raw(state.npcs) as NPC[]) ?? null;
        const read = managerReadOnInbound({
          npc: npc as unknown as InboundCandidate,
          songQuality: req.songQuality,
          playerFame: blendedFame(state.player),
          playerGenre: state.player.genre,
          manager,
          budget: req.ceiling,
          roll: Math.random(),
        });

        // Snapshotted onto the request. The number the player acts on has to be
        // the number they can still read back afterwards, or a reload turns a
        // decision into a guess they cannot explain.
        req.managerRead = {
          trackVerdict: read.trackVerdict,
          recommendedFee: read.recommendedFee,
          estimatedCeiling: read.estimatedCeiling,
          confidence: read.confidence,
          artistRead: read.artistRead,
          advice: read.advice,
          pass: read.pass,
          managerName: manager ? manager.name : 'Nobody',
        };

        state.lastEventLog.unshift(
          manager
            ? `💼 ${manager.name} has read the ${npc.name} ask — they say ask $${read.recommendedFee.toLocaleString()}.`
            : `🤔 No manager to call. You are guessing on the ${npc.name} ask.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        result = {
          ok: true,
          message: manager
            ? `${manager.name}: "${read.advice}"`
            : 'You do not have a manager, so there is nobody to ask. Read the record yourself.',
        };
      });

      return result;
    },

    quoteInboundVerse: (requestId, quote) => {
      let result: FeatureActionResult = { ok: false, message: 'That ask is not open.' };

      set((state) => {
        if (!state.player) return;
        const req = state.inboundRequests.find((r) => r.id === requestId);
        if (!req) {
          result = { ok: false, message: 'That ask is not open.' };
          return;
        }
        if (req.status !== 'open') {
          result = { ok: false, message: 'That one is already settled.' };
          return;
        }
        // Same rule as the outbound haggle, enforced in the store rather than
        // only hidden in the view: a cap that lives in the UI is not a cap.
        if ((req.negotiationRound ?? 0) >= MAX_NEGOTIATION_ROUNDS) {
          result = {
            ok: false,
            message: `You have pushed ${MAX_NEGOTIATION_ROUNDS} times. ${req.npcName} is done — take the number or leave it.`,
          };
          return;
        }

        const npc = state.npcs.find((n) => n.id === req.npcId);
        if (!npc) {
          result = { ok: false, message: 'That artist is not in your world any more.' };
          return;
        }

        const ask = Math.round(quote);
        if (!Number.isFinite(ask) || ask <= 0) {
          result = { ok: false, message: 'Ask for an actual number.' };
          return;
        }
        if (ask <= req.offer) {
          result = {
            ok: false,
            message: `They are already offering $${req.offer.toLocaleString()}. Asking for less than that is not a negotiation.`,
          };
          return;
        }

        const round = (req.negotiationRound ?? 0) + 1;
        const decision = decideInboundResponse({
          npc: npc as unknown as InboundCandidate,
          budget: req.ceiling,
          currentOffer: req.offer,
          quote: ask,
          round,
          roll: Math.random(),
        });

        req.negotiationRound = round;
        req.lastAsk = ask;
        req.offer = decision.fee;
        req.reason = decision.reason;

        if (decision.accepted) {
          // They pay now and the player delivers after. The fee is banked here
          // rather than when the verse lands, because that is the deal the
          // player was offered: "he pays me and I send him the verse".
          req.status = 'agreed';
          req.agreedFee = decision.fee;
          req.agreedDate = formatGameDate(state.gameDate);
          state.player.career.money += decision.fee;
          state.player.career.totalEarnings += decision.fee;

          const npcRef = state.npcs.find((n) => n.id === req.npcId);
          if (npcRef) {
            npcRef.relationshipScore = Math.max(-100, Math.min(100, npcRef.relationshipScore + 3));
            npcRef.memoryLog = [
              ...npcRef.memoryLog.slice(-9),
              `[Feature] Agreed $${decision.fee.toLocaleString()} for a verse on "${req.npcSongTitle}".`,
            ];
          }

          state.lastEventLog.unshift(
            `💰 ${req.npcName} agreed to $${decision.fee.toLocaleString()} for a verse on "${req.npcSongTitle}". Write it and send it.`,
          );
          state.lastEventLog = state.lastEventLog.slice(0, 10);
        } else if (decision.walked) {
          req.status = 'withdrawn';
          const npcRef = state.npcs.find((n) => n.id === req.npcId);
          if (npcRef) {
            npcRef.relationshipScore = Math.max(-100, Math.min(100, npcRef.relationshipScore - 5));
          }
          state.lastEventLog.unshift(`🚪 ${req.npcName} walked away from the verse.`);
          state.lastEventLog = state.lastEventLog.slice(0, 10);
        } else {
          state.lastEventLog.unshift(`↔️ ${req.npcName} came up to $${decision.fee.toLocaleString()}.`);
          state.lastEventLog = state.lastEventLog.slice(0, 10);
        }

        result = { ok: true, message: decision.reason };
      });

      return result;
    },

    acceptInboundOffer: (requestId) => {
      let result: FeatureActionResult = { ok: false, message: 'That ask is not open.' };

      set((state) => {
        if (!state.player) return;
        const req = state.inboundRequests.find((r) => r.id === requestId);
        if (!req) {
          result = { ok: false, message: 'That ask is not open.' };
          return;
        }
        if (req.status !== 'open') {
          result = { ok: false, message: 'That one is already settled.' };
          return;
        }
        if (req.offer <= 0) {
          result = { ok: false, message: 'There is no number on the table to take.' };
          return;
        }

        req.status = 'agreed';
        req.agreedFee = req.offer;
        req.agreedDate = formatGameDate(state.gameDate);
        state.player.career.money += req.offer;
        state.player.career.totalEarnings += req.offer;

        const npc = state.npcs.find((n) => n.id === req.npcId);
        if (npc) {
          npc.relationshipScore = Math.max(-100, Math.min(100, npc.relationshipScore + 4));
          npc.memoryLog = [
            ...npc.memoryLog.slice(-9),
            `[Feature] Took $${req.offer.toLocaleString()} for a verse on "${req.npcSongTitle}" — no haggling.`,
          ];
        }

        state.lastEventLog.unshift(
          `💰 Took $${req.offer.toLocaleString()} from ${req.npcName} for a verse on "${req.npcSongTitle}".`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        result = {
          ok: true,
          message: `Agreed at $${req.offer.toLocaleString()} — the money is in the account. ${req.npcName} is waiting on the verse.`,
        };
      });

      return result;
    },

    declineInboundRequest: (requestId) => {
      let result: FeatureActionResult = { ok: false, message: 'That ask is not open.' };

      set((state) => {
        if (!state.player) return;
        const req = state.inboundRequests.find((r) => r.id === requestId);
        if (!req) {
          result = { ok: false, message: 'That ask is not open.' };
          return;
        }
        if (req.status !== 'open') {
          result = { ok: false, message: 'That one is already settled.' };
          return;
        }

        req.status = 'declined';
        const npc = state.npcs.find((n) => n.id === req.npcId);
        if (npc) {
          // Turning somebody down is not free, but it is not a war either —
          // saying no to a record is a normal thing to do.
          npc.relationshipScore = Math.max(-100, Math.min(100, npc.relationshipScore - 3));
        }

        state.lastEventLog.unshift(`🙅 Turned down ${req.npcName}'s ask for a verse.`);
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        result = { ok: true, message: `You passed on ${req.npcName}'s record.` };
      });

      return result;
    },

    sendInboundVerse: (requestId) => {
      let result: FeatureActionResult = { ok: false, message: 'There is nothing agreed to send.' };

      set((state) => {
        if (!state.player) return;
        const req = state.inboundRequests.find((r) => r.id === requestId);
        if (!req) {
          result = { ok: false, message: 'That ask is not open.' };
          return;
        }
        if (req.status !== 'agreed') {
          result = {
            ok: false,
            message: req.status === 'delivered'
              ? 'That verse is already on their record.'
              : 'Nothing is agreed yet — settle a number first.',
          };
          return;
        }
        // A verse is not a message. It is a session, and it costs one.
        if (!spendEnergy(state, ENERGY_COSTS.writeVerse)) {
          const need = effectiveEnergy(state, ENERGY_COSTS.writeVerse);
          result = {
            ok: false,
            message: `Writing this one takes ${need} energy and you are at ${Math.floor(state.player.energy)}. ${energyShortfallMessage(need, state.player.energy)}`,
          };
          return;
        }

        const days = 2 + Math.round(state.player.stats.songwriting / 40);
        const startSerial = dateToSerial(state.gameDate);
        const verseQuality = inboundVerseQuality({
          lyricism: state.player.stats.lyricism,
          flow: state.player.stats.flow,
          delivery: state.player.stats.delivery,
          vocalAbility: state.player.stats.vocalAbility,
          songwriting: state.player.stats.songwriting,
        });

        state.workItems.push({
          id: uuidv4(),
          kind: 'verse',
          label: `Verse for ${req.npcName}`,
          detail: `"${req.npcSongTitle}" · $${(req.agreedFee ?? 0).toLocaleString()} paid · ${days} day${days > 1 ? 's' : ''} writing`,
          daysTotal: days,
          daysDone: 0,
          startedSerial: startSerial,
          payload: {
            requestId: req.id,
            npcId: req.npcId,
            npcName: req.npcName,
            songId: req.npcSongId,
            songTitle: req.npcSongTitle,
            verseQuality,
            fee: req.agreedFee ?? 0,
          } satisfies VerseWork,
        });

        // The money is already banked; the days are what stops the player
        // sending the same verse twice while it is still being written.
        state.player.stats.songwriting = Math.min(100, state.player.stats.songwriting + 0.3);

        state.lastEventLog.unshift(
          `✍️ Writing the verse for ${req.npcName}'s "${req.npcSongTitle}" — ${days} day${days > 1 ? 's' : ''}.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        result = {
          ok: true,
          message: `You are writing it. ${days} day${days > 1 ? 's' : ''} — it lands on their record when it is done.`,
        };
      });

      return result;
    },

    // ─── JOBS ───────────────────────────────────────────────────────────
    refreshJobBoard: () =>
      set((state) => {
        if (!state.player) return;
        if (state.jobBoardTurn === state.turnCount && state.jobBoard.length > 0) return;
        state.jobBoard = generateJobBoard({
          seed: state.turnCount + 1,
          playerFame: blendedFame(state.player),
          stats: state.player.stats,
          city: state.player.city,
        }) as JobListing[];
        state.jobBoardTurn = state.turnCount;
      }),

    workJob: (jobId) => {
      let outcome = { ok: false, message: '' };

      set((state) => {
        if (!state.player) return;

        const job = state.jobBoard.find(j => j.id === jobId);
        if (!job) {
          outcome = { ok: false, message: 'That job is off the board.' };
          return;
        }

        if (!spendEnergy(state, job.energyCost)) {
          outcome = {
            ok: false,
            message: energyShortfallMessage(job.energyCost, state.player.energy),
          };
          return;
        }

        state.player.career.money += job.pay;
        state.player.career.totalEarnings += job.pay;

        state.jobShifts.unshift({
          id: uuidv4(),
          jobId: job.id,
          title: job.title,
          employer: job.employer,
          date: formatGameDate(state.gameDate),
          pay: job.pay,
          energySpent: job.energyCost,
        });
        state.jobShifts = state.jobShifts.slice(0, 40);

        // Working a shift for someone else still teaches you something,
        // depending on what the work actually was.
        const statByCategory: Record<string, keyof ArtistStats | undefined> = {
          performance: 'stagePresence',
          session: 'flow',
          writing: 'songwriting',
          media: 'charisma',
          brand: 'networking',
          labour: 'discipline',
        };
        const stat = statByCategory[job.category];
        if (stat) {
          state.player.stats[stat] = Math.min(100, state.player.stats[stat] + 0.6);
        }

        // The shift eats the days it took, and the board rotates with them.
        state.gameDate = advanceDate(state.gameDate, job.daysCost) as typeof state.gameDate;
        state.turnCount += 1;

        state.lastEventLog.unshift(
          `${JOB_CATEGORY_LABEL[job.category]?.emoji ?? '🧰'} ${job.title} for ${job.employer} — ` +
          `$${job.pay.toLocaleString()}, ${job.energyCost} energy, ${job.daysCost} day${job.daysCost > 1 ? 's' : ''}.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        outcome = { ok: true, message: `${job.outcome} +$${job.pay.toLocaleString()}` };
      });

      // Rolling the board is a separate concern from working the shift.
      if (outcome.ok) get().refreshJobBoard();

      return outcome;
    },

    /**
     * Price the guest list before anything is ordered.
     *
     * The dialog and the shoot call the same function, so the number the player
     * is shown is the number that gets charged.
     */
    quoteCameos: (songId, npcIds, budget) => {
      const state = get();
      const empty = { quotes: [] as CameoQuote[], total: 0, qualityBonus: 0 };
      const song = state.songs.find(s => s.id === songId);
      if (!song || !state.player) return empty;

      const onRecord = new Set(song.featuredArtists ?? []);
      const guests = npcIds
        .filter(id => onRecord.has(id))
        .map(id => state.npcs.find(n => n.id === id))
        .filter((n): n is NPC => n !== undefined);

      return quoteCameos(guests as FeatureCandidate[], {
        playerFame: blendedFame(state.player),
        budget: Math.max(0, Math.round(budget)),
        songQuality: song.quality,
      });
    },

    createMusicVideo: (payload) => {
      // `set()` cannot return a value, so the outcome is captured here and
      // handed back once the state has committed.
      let result: MusicVideoResult = { ok: false, message: 'Shoot could not be started.' };

      set((state) => {
        if (!state.player) return;
        const player = state.player;

        const song = state.songs.find(s => s.id === payload.songId);
        if (!song) {
          result = { ok: false, message: 'That record no longer exists.' };
          return;
        }
        const nowSerial = dateToSerial(state.gameDate);
        // A shoot for a master that is not out yet is allowed, and it is the
        // normal way to work: you shoot the visual, then drop the record and
        // the video together. You do not have to wait for a release date first.
        const forUnreleased = !isReleased(song);
        if (!forUnreleased && payload.releaseSerial < nowSerial) {
          result = { ok: false, message: 'That release date is in the past.' };
          return;
        }

        const director = VIDEO_DIRECTORS.find(d => d.id === payload.directorId);
        if (!director) {
          result = { ok: false, message: 'Pick a director.' };
          return;
        }

        const budget = Math.max(0, Math.round(payload.budget));
        const marketing = Math.max(0, Math.round(payload.marketingBudget));

        // ── The guest list ─────────────────────────────────────────────
        // Only people who are already on the record. Somebody who is not on
        // the song is not turning up to be in its video, and asking them is
        // the feature negotiation, not this.
        const onRecord = new Set(song.featuredArtists ?? []);
        const invited = (payload.cameos ?? []).filter(id => onRecord.has(id));
        const guestQuotes = invited
          .map(id => state.npcs.find(n => n.id === id))
          .filter((n): n is NPC => n !== undefined)
          .map(npc => cameoQuote({
            npc: npc as FeatureCandidate,
            playerFame: blendedFame(player),
            budget,
            songQuality: song.quality,
          }));

        // A guest who will not do it stops the shoot. Quietly shooting the
        // video without them would be worse than refusing: the player asked
        // for something and would not find out they did not get it.
        const noShow = guestQuotes.find(q => !q.appears);
        if (noShow) {
          result = { ok: false, message: noShow.reason };
          return;
        }

        const cameoCost = guestQuotes.reduce((n, q) => n + q.fee, 0);
        const cameoBonus = guestQuotes.reduce((n, q) => n + q.qualityBonus, 0);
        const cost = budget + marketing + director.fee + cameoCost;

        if (player.career.money < cost) {
          result = {
            ok: false,
            message: cameoCost > 0
              ? `That shoot costs $${cost.toLocaleString()} — $${budget.toLocaleString()} production, $${marketing.toLocaleString()} promotion, $${director.fee.toLocaleString()} for ${director.name} and $${cameoCost.toLocaleString()} to the guests. You have $${Math.floor(player.career.money).toLocaleString()}.`
              : `That shoot costs $${cost.toLocaleString()} and you have $${Math.floor(player.career.money).toLocaleString()}.`,
          };
          return;
        }
        // A shoot day is a shoot day.
        if (!spendEnergy(state, ENERGY_COSTS.musicVideo)) {
          result = { ok: false, message: 'You do not have the energy for a shoot today.' };
          return;
        }

        const title = payload.title.trim() || videoTitle(song.title, hashString(`mv|${song.id}`), song.genre);
        const id = `vid-${song.id}-${nowSerial}`;
        const seed = videoSeed(id);
        const quality = shootQuality({
          directorSkill: director.skill,
          budget,
          songQuality: song.quality,
          seed,
          crewBonus: crewBonuses(raw(state.crew) as CrewMember[]).videoBonus,
          cameoBonus,
        });

        player.career.money -= cost;

        if (!state.videos) state.videos = [];
        const video = createVideo({
          id,
          songId: song.id,
          songTitle: song.title,
          title,
          artistId: player.id,
          artistName: player.artistName,
          artistCountry: player.country,
          artistGenre: song.genre ?? player.genre,
          directorId: director.id,
          directorName: director.name,
          concept: payload.concept,
          visualStyle: payload.visualStyle,
          quality,
          budget,
          marketingBudget: marketing,
          uploadSerial: payload.releaseSerial,
          uploadDate: formatGameDate(serialToDate(payload.releaseSerial)),
          isPlayer: true,
          songQuality: song.quality,
          cameoArtistIds: guestQuotes.map(q => q.npcId),
          cameoArtistNames: guestQuotes.map(q => q.name),
          cameoCost,
        });

        // ── A SHOOT IS DAYS ON SET, NOT A CLICK ────────────────────────
        // The video is built here — the money is spent, the director is booked
        // and the edit is what it is — but it does not exist on the platform
        // until the days are behind it. That also settles a thing the instant
        // version got wrong: a video can no longer be dated before the shoot
        // that produced it. The completion path clamps the release forward if
        // the shoot overran the gap the player left.
        const shootDays = videoShootDays(budget);
        const startSerial = dateToSerial(state.gameDate);
        const workId = uuidv4();
        state.workItems.push({
          id: workId,
          kind: 'video',
          label: `Shooting "${title}"`,
          detail: `${director.name} · ${shootDays} day${shootDays > 1 ? 's' : ''} · $${cost.toLocaleString()}`,
          daysTotal: shootDays,
          daysDone: 0,
          startedSerial: startSerial,
          payload: {
            video,
            songId: song.id,
            songTitle: song.title,
            releaseSerial: payload.releaseSerial,
            budget,
            marketing,
            quality,
            directorName: director.name,
            guestNames: guestQuotes.map(q => q.name),
          } satisfies VideoWork,
        });

        state.lastEventLog.unshift(
          `🎬 On set with ${director.name} for "${song.title}" — ${shootDays} day${shootDays > 1 ? 's' : ''}, $${cost.toLocaleString()}.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        result = {
          ok: true,
          message: `Shooting "${title}" with ${director.name} — ${shootDays} day${shootDays > 1 ? 's' : ''} on set. The edit lands when the days are done.`,
          videoId: id,
        };
      });

      return result;
    },

    deleteVideo: (videoId) =>
      set((state) => {
        const video = (state.videos ?? []).find(v => v.id === videoId);
        if (!video || !video.isPlayer) return;
        video.removed = true;
        video.published = false;
        video.status = 'draft';
      }),

    loadComments: (videoId) =>
      set((state) => {
        const video = (state.videos ?? []).find(v => v.id === videoId);
        if (!video) return;
        if (!state.videoComments) state.videoComments = {};

        const existing = state.videoComments[videoId] ?? [];
        const ctx = commentContextFor(state, video);
        const roster = (raw(state.npcs) as NPC[]).filter(n => n.role === 'artist' || n.tier !== 'local');
        const offset = existing.filter(c => !c.isPlayer && !c.parentId).length;
        const next = commentPage(video, ctx, roster, offset, COMMENT_PAGE);
        if (next.length === 0) return;
        state.videoComments[videoId] = [...existing, ...next];
      }),

    postComment: (videoId, content, parentId) =>
      set((state) => {
        const text = content.trim();
        if (!text) return;
        const video = (state.videos ?? []).find(v => v.id === videoId);
        if (!video) return;
        if (!state.videoComments) state.videoComments = {};

        const serial = dateToSerial(state.gameDate);
        const minute = 1 + (hashString(`${videoId}|${text}|${serial}`) % 1439);
        const comment = playerComment(videoId, text, serial, minute, parentId);

        const existing = state.videoComments[videoId] ?? [];
        state.videoComments[videoId] = [...existing, comment];
        video.commentCount += 1;

        // The world answers the player's own comment a day or two later. Only
        // for top-level comments — a reply to a reply would need its own thread.
        if (!parentId) {
          const ctx = commentContextFor(state, video);
          const roster = (raw(state.npcs) as NPC[]).filter(n => n.role === 'artist' || n.tier !== 'local');
          const replies = repliesTo(video, ctx, roster, comment, serial);
          state.videoComments[videoId] = [...state.videoComments[videoId], ...replies];
          video.commentCount += replies.length;
        }
      }),

    deleteComment: (videoId, commentId) =>
      set((state) => {
        const list = state.videoComments?.[videoId];
        if (!list) return;
        // Only the player's own comment, and only when it is still theirs.
        const target = list.find(c => c.id === commentId && c.isPlayer);
        if (!target) return;
        state.videoComments![videoId] = list.filter(
          c => c.id !== commentId && c.parentId !== commentId,
        );
      }),

    reactToComment: (commentId, value) =>
      set((state) => {
        if (!state.commentReactions) state.commentReactions = {};
        const previous = state.commentReactions[commentId];

        // Reactions on generated comments are derived, so a change of mind is
        // applied as a delta to the stored counter rather than a new row.
        const findComment = (): VideoComment | undefined => {
          for (const list of Object.values(state.videoComments ?? {})) {
            const hit = list.find(c => c.id === commentId);
            if (hit) return hit;
          }
          return undefined;
        };
        const comment = findComment();

        if (comment) {
          if (previous === 1) comment.likes = Math.max(0, comment.likes - 1);
          if (previous === -1) comment.dislikes = Math.max(0, comment.dislikes - 1);
          if (previous === value) {
            delete state.commentReactions[commentId];
            return;
          }
          if (value === 1) comment.likes += 1;
          if (value === -1) comment.dislikes += 1;
        } else if (previous === value) {
          delete state.commentReactions[commentId];
          return;
        }

        state.commentReactions[commentId] = value;
      }),

    // ─── DMs ────────────────────────────────────────────────────────────
    sendDM: (npcId, message, attachedSongId) =>
      set((state) => {
        if (!state.dmThreads[npcId]) {
          state.dmThreads[npcId] = { npcId, messages: [], unread: 0 };
        }

        const playerMsg: DMMessage = {
          id: uuidv4(),
          npcId,
          fromPlayer: true,
          content: message,
          timestamp: new Date().toISOString(),
          attachedSongId,
          read: true,
        };

        state.dmThreads[npcId].messages.push(playerMsg);

        // Generate NPC reply
        const npc = state.npcs.find(n => n.id === npcId);
        if (npc) {
          let replyContent: string;
          let relChange: number;

          if (attachedSongId) {
            const song = state.songs.find(s => s.id === attachedSongId);
            if (song) {
              const reaction = generateSongReaction(npc, song.title, song.quality);
              replyContent = reaction.text;
              relChange = reaction.relationshipChange;
            } else {
              const reply = generateDMReply(npc, message);
              replyContent = reply.text;
              relChange = reply.relationshipChange;
            }
          } else {
            const reply = generateDMReply(npc, message);
            replyContent = reply.text;
            relChange = reply.relationshipChange;
          }

          const npcMsg: DMMessage = {
            id: uuidv4(),
            npcId,
            fromPlayer: false,
            content: replyContent,
            timestamp: new Date().toISOString(),
            read: false,
          };

          state.dmThreads[npcId].messages.push(npcMsg);
          state.dmThreads[npcId].unread += 1;

          // Update relationship — one lookup, reused. The previous version ran
          // the identical `find` twice and discarded the first result.
          npc.relationshipScore = Math.max(-100, Math.min(100, npc.relationshipScore + relChange));
          // Add to memory log
          const memEntry = `[DM] Player said: "${message.slice(0, 50)}..." Reply: "${replyContent.slice(0, 50)}..."`;
          npc.memoryLog = [...npc.memoryLog.slice(-9), memEntry];
        }
      }),

    reachOutToNpc: (npcId) => {
      let result: FeatureActionResult = { ok: false, message: 'That went nowhere.' };

      set((state) => {
        if (!state.player) {
          result = { ok: false, message: 'There is no career open.' };
          return;
        }

        const npc = state.npcs.find((n) => n.id === npcId);
        if (!npc) {
          result = { ok: false, message: 'That person is not in your world.' };
          return;
        }

        // ── One evening at a time ───────────────────────────────────────
        // The cooldown is the whole design. Without it this is a slider: hold
        // the button, buy the friendship. It is stored on the NPC rather than
        // in a list here, so it survives a reload with the rest of their state.
        const nowSerial = dateToSerial(state.gameDate);
        const last = npc.lastReachOut;
        if (last !== undefined) {
          const since = nowSerial - last;
          if (since < REACH_OUT_COOLDOWN_DAYS) {
            const wait = REACH_OUT_COOLDOWN_DAYS - since;
            result = {
              ok: false,
              message:
                `You and ${npc.name} spent an evening together ${since <= 0 ? 'today' : `${since} day${since === 1 ? '' : 's'} ago`}. ` +
                `Give it ${wait} more day${wait === 1 ? '' : 's'} — this is a relationship, not a button.`,
            };
            return;
          }
        }

        if (!spendEnergy(state, ENERGY_COSTS.reachOut, { admin: true })) {
          const need = effectiveEnergy(state, ENERGY_COSTS.reachOut, { admin: true });
          result = {
            ok: false,
            message:
              `Showing up properly takes ${need} energy and you are at ` +
              `${Math.floor(state.player.energy)}. ${energyShortfallMessage(need, state.player.energy)}`,
          };
          return;
        }

        // ── Who they are decides what an evening is worth ───────────────
        // Read off the same characteristics the negotiation uses, so the person
        // who is generous with a verse is generous with their time.
        const d = featureDisposition(npc as FeatureCandidate);
        const openness = Math.max(0.7, Math.min(1.5, 1 / d.feeMult));

        // Diminishing: the last ten points of a friendship cost more than the
        // first ten. Somebody already at 80 does not become your brother over
        // dinner.
        const room = Math.max(0.15, 1 - Math.max(0, npc.relationshipScore) / 110);

        // A name far above your level has less reason to care that you called.
        const gap = npc.fame - blendedFame(state.player);
        const reach = gap > 40 ? 0.45 : gap > 20 ? 0.7 : 1;

        let gain = 5 * openness * room * reach;

        // And sometimes it just does not land. A volatile person is more likely
        // to take an evening the wrong way, which is the risk in showing up.
        const wentBadly = Math.random() < 0.09 * d.moodiness;
        if (wentBadly) gain = -gain * 0.5;

        const rounded = Math.round(gain * 10) / 10;
        npc.relationshipScore = Math.max(
          -100,
          Math.min(100, Math.round((npc.relationshipScore + rounded) * 10) / 10),
        );
        npc.lastReachOut = nowSerial;
        npc.memoryLog = [
          ...npc.memoryLog.slice(-9),
          `[Time] Spent an evening together. (${rounded >= 0 ? '+' : ''}${rounded})`,
        ];

        // ── It has to read like a person, not a progress bar ────────────
        const opener = wentBadly
          ? `Caught ${npc.name} at a bad moment.`
          : npc.relationshipScore >= 60
            ? `${npc.name} was glad you came through.`
            : `${npc.name} made time for you.`;
        const closer = wentBadly
          ? 'It did not go the way you wanted, and they will remember that you tried anyway.'
          : rounded >= 3
            ? 'That is a real step, not a favour.'
            : 'Small, but it counts. Keep showing up.';

        const thread = state.dmThreads[npcId] ?? { npcId, messages: [], unread: 0 };
        thread.messages.push({
          id: uuidv4(),
          npcId,
          fromPlayer: true,
          content: 'You around this week? Would be good to link up properly, no agenda.',
          timestamp: new Date().toISOString(),
          read: true,
        });
        thread.messages.push({
          id: uuidv4(),
          npcId,
          fromPlayer: false,
          content: `${opener} ${closer}`,
          timestamp: new Date().toISOString(),
          read: false,
        });
        thread.unread += 1;
        state.dmThreads[npcId] = thread;

        state.lastEventLog.unshift(
          `🤝 You spent an evening with ${npc.name}. ` +
            `${rounded >= 0 ? '+' : ''}${rounded} relationship — now ${npc.relationshipScore}.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        result = {
          ok: true,
          message: `${opener} ${closer} ${rounded >= 0 ? '+' : ''}${rounded} — you are at ${npc.relationshipScore} with them.`,
        };
      });

      return result;
    },

    markDMRead: (npcId) =>
      set((state) => {
        if (state.dmThreads[npcId]) {
          state.dmThreads[npcId].unread = 0;
          state.dmThreads[npcId].messages.forEach(m => { m.read = true; });
        }
      }),

    // ─── SOCIAL ─────────────────────────────────────────────────────────
    createPost: (platform, content, relatedSongId) =>
      set((state) => {
        if (!state.player) return;
        if (!spendEnergy(state, ENERGY_COSTS.socialPost, { admin: true })) return;

        const post: SocialPost = {
          id: uuidv4(),
          platform: platform as SocialPost['platform'],
          authorId: 'player',
          authorName: state.player.artistName,
          content,
          likes: Math.floor(state.player.career.fanbase * 0.01) + Math.floor(Math.random() * 20),
          shares: Math.floor(Math.random() * 10),
          comments: [],
          timestamp: new Date().toISOString(),
          relatedSongId,
          isPlayerPost: true,
          trendingScore: Math.floor(state.player.career.localFame * 0.3),
          // Stamped with the GAME day, not just the wall clock, so the feed can
          // say how old a post is in game time.
          daySerial: dateToSerial(state.gameDate),
        };

        // NPC reactions — sample a bounded set rather than filtering every artist,
        // media account and fan account in the roster just to use four of them.
        const reactingNPCs: NPC[] = [];
        for (const npc of raw(state.npcs) as NPC[]) {
          if (npc.role !== 'artist' && npc.role !== 'media' && npc.role !== 'fan_account') continue;
          if (Math.random() < 0.3) {
            reactingNPCs.push(npc);
            if (reactingNPCs.length >= 4) break;
          }
        }

        for (const npc of reactingNPCs) {
          const reaction = generatePostComment(npc, content);
          post.comments.push({
            id: uuidv4(),
            authorId: npc.id,
            authorName: npc.name,
            content: reaction.text,
            likes: Math.floor(Math.random() * 30),
            timestamp: new Date().toISOString(),
          });
        }

        state.socialPosts.unshift(post);
        addMomentum(state, 1);
      }),

    likePost: (postId) =>
      set((state) => {
        const post = state.socialPosts.find(p => p.id === postId);
        if (post) post.likes += 1;
      }),

    // ─── THE FEED ───────────────────────────────────────────────────────
    //
    // The feed used to change on exactly one schedule: the weekly boundary. A
    // "refresh" control on top of that could only ever be decoration. This
    // generates a batch from what is TRUE right now — the chart that was just
    // published, the artists who have records out, the arguments running in the
    // world and the player's own — and it is stamped against the game clock, so
    // the cooldown is real and closing the tab does not clear it.
    //
    // It is an ACTION and not a render, which is the only way this can work:
    // a feed that re-rolls itself every time the screen opens is a feed that
    // shows the player a different world every time they look at it.
    refreshFeed: () => {
      let outcome: FeedRefreshResult = { ok: false, message: '', added: 0, waitMinutes: 0 };

      set((state) => {
        if (!state.player) {
          outcome = { ok: false, message: 'There is no career to refresh.', added: 0, waitMinutes: 0 };
          return;
        }

        const now = gameMinute(state);
        const cooldown = feedCooldown(state);
        if (!cooldown.ready) {
          outcome = {
            ok: false,
            message: `Nothing new since the last pull. Give it ${cooldown.waitMinutes} more game minutes.`,
            added: 0,
            waitMinutes: cooldown.waitMinutes,
          };
          return;
        }

        const today = dateToSerial(state.gameDate);
        const npcs = raw(state.npcs) as NPC[];
        const npcSongs = raw(state.npcSongs) as Song[];
        const charts = state.charts as Record<string, ChartEntry[]>;
        const fresh: SocialPost[] = [];

        // The outlet that reports on the scene. One lookup, not a scan per post.
        const outlet = npcs.find(n => n.role === 'media');
        const outletId = outlet?.id ?? 'scene_watch';
        const outletName = outlet?.name ?? 'Scene Watch';

        // 1. The charts, if they have anything to say.
        const home = charts[state.player.country] ?? [];
        let mover: ChartEntry | undefined;
        let bestJump = 0;
        for (const entry of home) {
          const jump = (entry.lastPosition ?? 0) - entry.position;
          if (jump > bestJump) {
            bestJump = jump;
            mover = entry;
          }
        }
        const playerOnChart = Object.values(charts).some(list =>
          list.some(e => e.artistId === state.player!.id),
        );
        fresh.push(...(fanPosts(home[0], mover, npcs, state.player, playerOnChart) as SocialPost[]));

        // 2. Artists talking about their own week.
        for (const npc of pickRandomArtists(npcs, 6)) {
          const own = npcSongs.filter(s => s.ownerId === npc.id);
          fresh.push(...(npcArtistPosts(npc, own) as SocialPost[]));
        }

        // 3. The arguments the player is not part of. This is the whole point
        //    of seeding rivalries: the world has a conversation going whether
        //    or not the player ever opens this screen.
        const hottest = worldBeefs(npcs, today)[0];
        if (hottest) {
          fresh.push({
            id: uuidv4(),
            platform: 'chirp',
            authorId: outletId,
            authorName: outletName,
            content: `${hottest.lastEventLine} ${hottest.aName} and ${hottest.bName}.`,
            likes: Math.round(hottest.heat * 12),
            shares: Math.round(hottest.heat * 1.6),
            comments: [],
            timestamp: new Date().toISOString(),
            isPlayerPost: false,
            trendingScore: hottest.heat,
            daySerial: today,
          } as SocialPost);
        }

        // 4. The player's own arguments, which they are expected to feed.
        for (const beef of state.beefs) {
          if (beef.resolution) continue;
          const heat = decayedHeat(beef, today);
          const standing = beef.rung > 0
            ? `It has reached the ${beefRung(beef.rung)?.name.toLowerCase() ?? 'next'} stage.`
            : 'Neither side has said anything yet.';
          fresh.push({
            id: uuidv4(),
            platform: 'chirp',
            authorId: outletId,
            authorName: outletName,
            content: `${state.player.artistName} against ${beef.npcName}. ${standing} Heat: ${Math.round(heat)}. Record: ${beef.wins}-${beef.losses}.`,
            likes: Math.round(heat * 9) + 20,
            shares: Math.round(heat * 1.2),
            comments: [],
            timestamp: new Date().toISOString(),
            isPlayerPost: false,
            trendingScore: heat,
            daySerial: today,
          } as SocialPost);
        }

        if (fresh.length === 0) {
          outcome = {
            ok: false,
            message: 'Nothing is moving anywhere. Release something, play somewhere, or start something with somebody.',
            added: 0,
            waitMinutes: 0,
          };
          return;
        }

        state.socialPosts.unshift(...fresh);
        if (state.socialPosts.length > 150) state.socialPosts = state.socialPosts.slice(0, 150);
        state.trending = buildTrending(charts, state.player) as typeof state.trending;
        state.feedRefreshedAt = now;

        outcome = {
          ok: true,
          message: `Pulled ${fresh.length} new post${fresh.length === 1 ? '' : 's'}. There will be more in ${FEED_REFRESH_MINUTES} game minutes.`,
          added: fresh.length,
          waitMinutes: FEED_REFRESH_MINUTES,
        };
      });

      return outcome;
    },

    // ─── TAGGING ────────────────────────────────────────────────────────
    //
    // Free, instant and the one thing in here that could be farmed, so it has a
    // daily cap that resets on the GAME day. Whether they answer is the
    // relationship, their fame and how much attention they already get — a
    // friend answers, and an artist with eighty fame and a thousand mentions a
    // day does not.
    tagArtist: (npcId, text) => {
      let outcome: FeatureActionResult = { ok: false, message: '' };

      set((state) => {
        if (!state.player) {
          outcome = { ok: false, message: 'There is nobody to post as.' };
          return;
        }

        const npc = state.npcs.find(n => n.id === npcId);
        if (!npc) {
          outcome = { ok: false, message: 'There is nobody with that name in the scene.' };
          return;
        }
        if (npc.role !== 'artist' && npc.role !== 'producer' && npc.role !== 'media') {
          outcome = {
            ok: false,
            message: `${npc.name} is not somebody you tag. They run the business, not the timeline.`,
          };
          return;
        }

        const today = dateToSerial(state.gameDate);
        // The quota resets on the game day, not on a timer — a cap that resets
        // on a wall clock would let a player farm it by waiting. The rule
        // itself lives in `tagsLeftToday`, so the screen's counter and this
        // refusal are reading the same number.
        const quota =
          state.tagQuota && state.tagQuota.serial === today
            ? state.tagQuota
            : { serial: today, count: 0 };
        if (tagsLeftToday(state) <= 0) {
          state.tagQuota = quota;
          outcome = {
            ok: false,
            message:
              `You have tagged ${TAGS_PER_DAY} people today. Any more and it stops being a mention ` +
              `and starts being a bot. Come back tomorrow.`,
          };
          return;
        }

        if (!spendEnergy(state, ENERGY_COSTS.socialPost, { admin: true })) {
          outcome = {
            ok: false,
            message: energyShortfallMessage(ENERGY_COSTS.socialPost, state.player.energy),
          };
          return;
        }
        quota.count += 1;
        state.tagQuota = quota;

        const disposition = featureDisposition(raw(npc) as NPC);
        const odds = Math.max(
          0.03,
          Math.min(
            0.9,
            0.14 +
              npc.relationshipScore / 200 +
              blendedFame(state.player) / 400 -
              npc.fame / 500 -
              (1 - disposition.replySpeed) * 0.12,
          ),
        );
        const replied = Math.random() < odds;

        const post: SocialPost = {
          id: uuidv4(),
          platform: 'chirp',
          authorId: 'player',
          authorName: state.player.artistName,
          content: text,
          likes: Math.floor(state.player.career.fanbase * 0.005) + Math.floor(Math.random() * 12),
          shares: 0,
          comments: [],
          timestamp: new Date().toISOString(),
          isPlayerPost: true,
          trendingScore: Math.floor(state.player.career.localFame * 0.2),
          daySerial: today,
        };

        if (replied) {
          post.comments.push({
            id: uuidv4(),
            authorId: npc.id,
            authorName: npc.name,
            content: generatePostComment(raw(npc) as NPC, text).text,
            likes: Math.floor(npc.fame * 4 + Math.random() * 40),
            timestamp: new Date().toISOString(),
          });
          npc.relationshipScore = Math.min(100, npc.relationshipScore + 2);
          // Borrowing somebody's audience. Scaled by THEIR fame, which is the
          // reason tagging a big name is worth doing and tagging a small one
          // is not — and capped by the daily quota above.
          const reach = Math.round(npc.fame * 12);
          state.player.career.fanbase += reach;
          state.lastEventLog.unshift(
            `📣 ${npc.name} answered you. ${reach.toLocaleString()} of their people saw it.`,
          );
          state.lastEventLog = state.lastEventLog.slice(0, 10);
        }

        state.socialPosts.unshift(post);

        outcome = {
          ok: true,
          message: replied
            ? `${npc.name} answered.`
            : `${npc.name} saw it and said nothing. That is an answer too.`,
        };
      });

      return outcome;
    },

    // ─── BEEF ───────────────────────────────────────────────────────────
    //
    // Opening one is free and says nothing. The ladder is climbed with
    // `beefMove`, and each rung is gated on heat, so the expensive end of this
    // is only reachable by a beef that has actually been running.
    startBeef: (npcId) => {
      let outcome: FeatureActionResult = { ok: false, message: '' };

      set((state) => {
        if (!state.player) {
          outcome = { ok: false, message: 'There is nobody to start an argument.' };
          return;
        }
        const npc = state.npcs.find(n => n.id === npcId);
        if (!npc) {
          outcome = { ok: false, message: 'There is nobody with that name in the scene.' };
          return;
        }
        if (npc.role !== 'artist') {
          outcome = { ok: false, message: `${npc.name} does not make records. There is nothing to argue about.` };
          return;
        }
        if (!npc.isAvailable) {
          outcome = {
            ok: false,
            message: `${npc.name} is unreachable. You can say whatever you like and they will never hear it.`,
          };
          return;
        }
        const open = state.beefs.find(b => b.npcId === npcId && !b.resolution);
        if (open) {
          outcome = {
            ok: false,
            message: `You are already in it with ${npc.name}. Take it up a rung instead.`,
          };
          return;
        }

        const today = dateToSerial(state.gameDate);
        const beef: BeefState = {
          id: uuidv4(),
          npcId: npc.id,
          npcName: npc.name,
          rung: 0,
          heat: 0,
          heatSerial: today,
          startedSerial: today,
          lastMoveSerial: today,
          wins: 0,
          losses: 0,
          moves: [],
        };
        state.beefs.push(beef);
        state.lastEventLog.unshift(
          `⚔️ You have opened something with ${npc.name}. Nothing has been said yet — the first move is yours.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        outcome = {
          ok: true,
          message: 'Opened. Nothing has been said yet — the first move is yours.',
        };
      });

      return outcome;
    },

    beefMove: (beefId, rungLevel) => {
      let outcome: BeefActionResult = { ok: false, message: '' };

      set((state) => {
        if (!state.player) {
          outcome = { ok: false, message: 'There is nobody to make the move.' };
          return;
        }

        const beef = state.beefs.find(b => b.id === beefId);
        if (!beef) {
          outcome = { ok: false, message: 'That argument is not in your list.' };
          return;
        }
        if (beef.resolution) {
          outcome = {
            ok: false,
            message: `That one is over — ${RESOLUTION_LABEL[beef.resolution.kind].toLowerCase()}.`,
          };
          return;
        }

        const rung = beefRung(rungLevel);
        if (!rung) {
          outcome = { ok: false, message: 'There is no such rung.' };
          return;
        }
        // No skipping. The ladder IS the mechanic — a single "go nuclear"
        // button would make every rung below it pointless.
        if (rung.level !== beef.rung + 1) {
          const expected = beefRung(beef.rung + 1);
          outcome = {
            ok: false,
            message:
              rung.level <= beef.rung
                ? `You are already past the ${rung.name.toLowerCase()}. The ladder only goes up.`
                : `You cannot skip to the ${rung.name.toLowerCase()}. ` +
                  `${expected ? `The ${expected.name.toLowerCase()} comes first.` : 'That is the top.'}`,
          };
          return;
        }

        const today = dateToSerial(state.gameDate);
        const heat = decayedHeat(beef, today);
        if (rung.requiresHeat > heat) {
          outcome = {
            ok: false,
            message:
              `Not yet. The ${rung.name.toLowerCase()} needs the beef at ${rung.requiresHeat} heat and it is at ` +
              `${Math.round(heat)}. Feed it first — ${Math.ceil(rung.requiresHeat - heat)} more.`,
          };
          return;
        }

        const npc = state.npcs.find(n => n.id === beef.npcId);
        if (!npc) {
          outcome = { ok: false, message: `${beef.npcName} is not in the scene any more.` };
          return;
        }

        if (rung.cost > state.player.career.money) {
          outcome = {
            ok: false,
            message:
              `The ${rung.name.toLowerCase()} costs $${rung.cost.toLocaleString()}. ` +
              `You have $${Math.floor(state.player.career.money).toLocaleString()}.`,
          };
          return;
        }
        if (!spendEnergy(state, rung.energy)) {
          outcome = { ok: false, message: energyShortfallMessage(rung.energy, state.player.energy) };
          return;
        }

        const playerFame = blendedFame(state.player);
        const result = settleBeef({
          rung,
          roll: Math.random(),
          playerFame,
          npcFame: npc.fame,
          heat,
          penQuality: bestPenQuality(state),
          reputation: state.player.career.reputation,
          crewReach: crewReachOf(state),
        });

        state.player.career.money -= rung.cost;

        // ── The player's own move ──
        beef.moves.unshift({
          serial: today,
          by: 'player',
          rung: rung.level,
          line: result.line,
          landed: result.landed,
          score: result.score,
          heatDelta: result.heatDelta,
        });
        beef.rung = rung.level;
        beef.lastMoveSerial = today;
        if (result.landed) beef.wins += 1;

        // ── The other side's answer ──
        // Their own score is their fame and the heat they are standing in.
        // They do not get the player's pen, which is the whole reason a small
        // artist can win one of these.
        let npcLanded = false;
        if (result.npcLine) {
          const npcScore = Math.max(0, Math.min(95, 30 + npc.fame * 0.5 + heat * 0.1));
          npcLanded = Math.random() < npcScore / 100;
          beef.moves.unshift({
            serial: today,
            by: 'npc',
            rung: rung.level,
            line: result.npcLine,
            landed: npcLanded,
            score: npcScore,
            heatDelta: npcLanded ? result.npcHeatDelta : 0,
          });
          if (npcLanded) beef.losses += 1;
        }

        // Heat: the player's move, plus whatever their answer was worth. Capped
        // at 100, and written with the serial so the lazy decay stays honest.
        beef.heat = Math.max(
          0,
          Math.min(100, heat + result.heatDelta + (npcLanded ? result.npcHeatDelta : 0)),
        );
        beef.heatSerial = today;
        beef.moves = beef.moves.slice(0, 20);

        // ── The consequences ──
        state.player.career.localFame = Math.max(
          0,
          Math.min(100, state.player.career.localFame + result.fameDelta),
        );
        state.player.career.fanbase = Math.max(0, state.player.career.fanbase + result.fansDelta);
        addMomentum(state, result.landed ? 3 : -1, result.landed ? `the ${rung.name.toLowerCase()} landed` : undefined);

        // A missed move costs reputation. It is the one thing a beef can take
        // off you that a chart run cannot give back.
        if (!result.landed) {
          state.player.career.reputation = Math.max(0, state.player.career.reputation - 2);
        }

        state.lastEventLog.unshift(
          `${result.landed ? '⚔️' : '💨'} ${result.headline} — ${npc.name}. Heat ${Math.round(beef.heat)}.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        outcome = {
          ok: true,
          message: result.line,
          result: {
            landed: result.landed,
            line: result.line,
            headline: result.headline,
            heatDelta: result.heatDelta,
            fameDelta: result.fameDelta,
            fansDelta: result.fansDelta,
          },
        };
      });

      return outcome;
    },

    endBeef: (beefId, kind) => {
      let outcome: FeatureActionResult = { ok: false, message: '' };

      set((state) => {
        if (!state.player) {
          outcome = { ok: false, message: 'There is nobody to end it.' };
          return;
        }
        const beef = state.beefs.find(b => b.id === beefId);
        if (!beef) {
          outcome = { ok: false, message: 'That argument is not in your list.' };
          return;
        }
        if (beef.resolution) {
          outcome = { ok: false, message: 'That one is already over.' };
          return;
        }

        const today = dateToSerial(state.gameDate);
        const heat = decayedHeat(beef, today);
        const npc = state.npcs.find(n => n.id === beef.npcId);
        const npcFame = npc?.fame ?? 0;
        const relationship = npc?.relationshipScore ?? 0;
        const playerFame = blendedFame(state.player);

        const available = availableResolutions({
          heat,
          wins: beef.wins,
          losses: beef.losses,
          relationship,
          npcFame,
          playerFame,
        });
        if (!available.includes(kind)) {
          outcome = {
            ok: false,
            message:
              kind === 'ko'
                ? `You cannot call it a knockout. That needs the beef at 90 heat with three landed moves and none against — you are at ${Math.round(heat)} heat and ${beef.wins}-${beef.losses}.`
                : `They have no reason to concede. You need to be ahead on the record and the beef needs to be at 60 heat — it is at ${Math.round(heat)} and you are ${beef.wins}-${beef.losses}.`,
          };
          return;
        }

        // A truce is not a free action: somebody who is winning does not take it.
        if (kind === 'truce' && !truceAccepted({ heat, wins: beef.wins, losses: beef.losses, relationship, npcFame, playerFame }, Math.random())) {
          beef.heat = Math.min(100, heat + 6);
          beef.heatSerial = today;
          beef.lastMoveSerial = today;
          state.lastEventLog.unshift(`🚫 ${beef.npcName} is not interested in ending it. Heat went up.`);
          state.lastEventLog = state.lastEventLog.slice(0, 10);
          outcome = {
            ok: false,
            message: `${beef.npcName} is not interested in ending it. The heat went up instead.`,
          };
          return;
        }

        const line =
          kind === 'truce'
            ? `${beef.npcName} took the call. Both sides stood down and neither will explain why.`
            : kind === 'concession'
              ? `${beef.npcName} stopped answering. In this scene that is the same as conceding.`
              : `${beef.npcName} had nothing left to say. This one goes on the record as yours.`;

        beef.resolution = { kind, at: today, line };
        beef.heat = heat;
        beef.heatSerial = today;
        state.lastEventLog.unshift(`🤝 ${RESOLUTION_LABEL[kind]} — ${beef.npcName}.`);
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        outcome = { ok: true, message: line };
      });

      return outcome;
    },

    // ─── SHOWS ──────────────────────────────────────────────────────────
    //
    // `planShowAt` is a pure read; `bookShow` is the commitment. Both run the
    // SAME engine over the same state, so the number the player acted on is the
    // number the night was planned around. The old version computed the
    // estimate in the component and the outcome in the store, from different
    // formulas, which is how the two drifted apart.
    // ─── INDUSTRY & LIFE ───────────────────────────────────────────────
    requestSampleClearance: (songId, sampleName, rightsHolder) => {
      let result: FeatureActionResult = { ok: false, message: 'Unable to request clearance.' };
      set((state) => {
        if (!state.player) return;
        const song = state.songs.find(s => s.id === songId);
        if (!song || !isSongReleased(song)) { result.message = 'The song must be released first.'; return; }
        if (!sampleName.trim() || !rightsHolder.trim()) { result.message = 'Add the sample and rights holder.'; return; }
        if (state.sampleClearances.some(c => c.songId === songId && c.status === 'pending')) { result.message = 'A clearance request is already pending.'; return; }
        const cost = Math.max(500, Math.round(song.quality * 180 + (state.player.career.localFame + state.player.career.nationalFame + state.player.career.internationalFame) * 80));
        const clearance: SampleClearance = { id: uuidv4(), songId, songTitle: song.title, sampleName: sampleName.trim(), rightsHolder: rightsHolder.trim(), quotedCost: cost, status: 'pending', requestedDate: formatGameDate(state.gameDate), deadlineSerial: dateToSerial(state.gameDate) + 30 };
        state.sampleClearances.unshift(clearance);
        state.openThreads.unshift({ id: uuidv4(), type: 'legal', description: `Sample clearance pending for "${song.title}" with ${rightsHolder.trim()}.`, involvedNPCIds: [], startDate: formatGameDate(state.gameDate), lastUpdated: formatGameDate(state.gameDate), resolved: false, priority: 6, escalationCount: 0 });
        state.industryNotices.unshift({ id: uuidv4(), type: 'sample', title: 'Sample clearance requested', body: `Rights holder ${rightsHolder.trim()} quoted ${money0(cost)} for "${song.title}".`, date: formatGameDate(state.gameDate), relatedSongId: songId, read: false });
        result = { ok: true, message: `Clearance requested. Quoted cost: ${money0(cost)}.` };
      });
      return result;
    },
    approveSampleClearance: (clearanceId) => {
      let result: FeatureActionResult = { ok: false, message: 'Clearance not found.' };
      set((state) => {
        const c = state.sampleClearances.find(x => x.id === clearanceId);
        if (!c || c.status !== 'pending') return;
        if (!state.player || state.player.career.money < c.quotedCost) { result.message = `You need ${money0(c.quotedCost)} to clear this sample.`; return; }
        state.player.career.money -= c.quotedCost;
        c.status = 'cleared';
        state.industryNotices.unshift({ id: uuidv4(), type: 'sample', title: 'Sample cleared', body: `"${c.songTitle}" is cleared for release and distribution.`, date: formatGameDate(state.gameDate), relatedSongId: c.songId, read: false });
        result = { ok: true, message: `Sample cleared for ${money0(c.quotedCost)}.` };
      });
      return result;
    },
    launchPayola: (songId, city, country) => {
      let result: FeatureActionResult = { ok: false, message: 'Campaign could not start.' };
      set((state) => {
        if (!state.player) return;
        const song = state.songs.find(s => s.id === songId);
        if (!song || !isSongReleased(song)) { result.message = 'Release the song before pitching radio.'; return; }
        const cost = 2500 + Math.round(state.player.career.localFame * 45);
        if (state.player.career.money < cost) { result.message = `You need ${money0(cost)} for the campaign.`; return; }
        state.player.career.money -= cost;
        state.payolaCampaigns.unshift({ id: uuidv4(), songId, songTitle: song.title, city, country, cost, remainingDays: 7, boost: 0.28, exposed: false, completed: false });
        state.openThreads.unshift({ id: uuidv4(), type: 'scandal', description: `An unofficial radio campaign is running for "${song.title}" in ${city}.`, involvedNPCIds: [], startDate: formatGameDate(state.gameDate), lastUpdated: formatGameDate(state.gameDate), resolved: false, priority: 5, escalationCount: 0 });
        state.industryNotices.unshift({ id: uuidv4(), type: 'payola', title: 'Radio campaign launched', body: `"${song.title}" is getting extra radio pressure in ${city}. There is a chance the campaign gets exposed.`, date: formatGameDate(state.gameDate), relatedSongId: songId, read: false });
        result = { ok: true, message: `Radio campaign launched in ${city} for ${money0(cost)}.` };
      });
      return result;
    },
    completeScoutMission: (missionId) => {
      let result: FeatureActionResult = { ok: false, message: 'Mission unavailable.' };
      set((state) => {
        const m = state.scoutMissions.find(x => x.id === missionId);
        if (!m || m.status !== 'open' || !state.player) return;
        if (dateToSerial(state.gameDate) > m.expiresSerial) { m.status = 'expired'; result.message = 'The scout moved on.'; return; }
        const target = state.npcs.find(n => n.id === m.targetNpcId);
        if (!target) { result.message = 'Target no longer available.'; return; }
        if (target.relationshipScore < 10) { result.message = `Build a relationship with ${target.name} first.`; return; }
        m.status = 'completed';
        state.player.career.money += m.rewardMoney;
        state.player.career.localFame = Math.min(100, state.player.career.localFame + m.rewardFame);
        state.player.career.momentum = Math.min(100, state.player.career.momentum + 3);
        state.industryNotices.unshift({ id: uuidv4(), type: 'scout', title: 'A&R mission completed', body: `${m.scoutName} credited you for connecting with ${m.targetName}.`, date: formatGameDate(state.gameDate), relatedNpcId: m.targetNpcId, read: false });
        result = { ok: true, message: `Mission complete: +${money0(m.rewardMoney)}, +${m.rewardFame.toFixed(1)} local fame.` };
      });
      return result;
    },
    retireCareer: () => {
      let result: FeatureActionResult = { ok: false, message: 'You cannot retire yet.' };
      set((state) => {
        if (!state.player || state.legacy.retired) { result.message = 'This career is already retired.'; return; }
        const ageDays = dateToSerial(state.gameDate) - dateToSerial(INITIAL_GAME_DATE);
        if (ageDays < 365 * 5) { result.message = 'Retirement unlocks after five in-game years.'; return; }
        state.legacy.retired = true;
        state.legacy.retiredAt = formatGameDate(state.gameDate);
        state.legacy.legacyScore = Math.round(state.player.career.totalStreams / 100000 + state.awards.filter(a => a.winner === state.player!.id).length * 250 + state.certifications.length * 100 + state.player.career.totalEarnings / 10000 + state.player.career.internationalFame * 20);
        state.industryNotices.unshift({ id: uuidv4(), type: 'retirement', title: 'Career retired', body: `${state.player.artistName} has officially stepped away from active recording and touring.`, date: formatGameDate(state.gameDate), read: false });
        result = { ok: true, message: 'Career retired. Your catalogue, investments and businesses continue earning.' };
      });
      return result;
    },
    attemptComeback: () => {
      let result: FeatureActionResult = { ok: false, message: 'No comeback available.' };
      set((state) => {
        if (!state.player || !state.legacy.retired) { result.message = 'Retire first.'; return; }
        if (state.player.career.money < 5000) { result.message = 'A comeback needs at least $5,000 for music, media and a show.'; return; }
        state.legacy.comebackAttempts += 1;
        const chance = Math.min(0.85, 0.25 + state.player.career.internationalFame / 150 + state.player.career.momentum / 200);
        state.player.career.money -= 5000;
        if (Math.random() < chance) {
          state.legacy.retired = false;
          state.player.career.momentum = Math.min(100, state.player.career.momentum + 15);
          state.player.career.internationalFame = Math.min(100, state.player.career.internationalFame + 8);
          result = { ok: true, message: 'The comeback worked. You are active again.' };
        } else {
          state.legacy.legacyScore = Math.max(0, state.legacy.legacyScore - 50);
          result.message = 'The comeback missed. Your legacy took a small hit, but the catalogue remains.';
        }
      });
      return result;
    },
    choosePostCareerRole: (role: PostCareerRole) => {
      let result: FeatureActionResult = { ok: false, message: 'Role unavailable.' };
      set((state) => {
        if (!state.legacy.retired) { result.message = 'Choose a post-career role after retirement.'; return; }
        state.legacy.postCareerRole = role;
        result = { ok: true, message: `Post-career role set to ${role}.` };
      });
      return result;
    },
    acceptChildSupport: (coParentName) => {
      let result: FeatureActionResult = { ok: false, message: 'Family plan unavailable.' };
      set((state) => {
        if (!state.player) return;
        if (state.family.children >= 3) { result.message = 'The family system is intentionally lightweight: three children maximum.'; return; }
        state.family.children += 1;
        state.family.coParentName = coParentName.trim() || 'Co-parent';
        state.family.monthlyChildSupport = 350 + (state.player.career.localFame + state.player.career.nationalFame) * 4;
        state.family.nextReviewSerial = dateToSerial(state.gameDate) + 30;
        state.industryNotices.unshift({ id: uuidv4(), type: 'family', title: 'Family responsibility', body: `You now have a recurring monthly child-support obligation of ${money0(state.family.monthlyChildSupport)}.`, date: formatGameDate(state.gameDate), read: false });
        result = { ok: true, message: `Family obligation created: ${money0(state.family.monthlyChildSupport)} per month.` };
      });
      return result;
    },

    planShowAt: (venueId, price) => {
      const state = get();
      if (!state.player) return { ok: false, message: 'No career to plan for.' };
      const venue = findVenue(venueId);
      if (!venue) return { ok: false, message: 'That room is not on the list.' };
      const lock = venueLockReason(venue, blendedFame(state.player));
      if (lock) return { ok: false, message: lock };
      return { ok: true, message: '', plan: planShow(showInputFrom(state, venue, price)) };
    },

    inquireVenue: (venueId, wantedSerial) => {
      let out: { ok: boolean; message: string; result?: InquiryResult } = {
        ok: false,
        message: 'That room is not on the list.',
      };

      set((state) => {
        if (!state.player) return;
        if (state.legacy.retired) { out = { ok: false, message: 'This career is retired. Attempt a comeback before booking new shows.' }; return; }
        const venue = findVenue(venueId);
        if (!venue) return;

        const bonuses = crewBonuses(raw(state.crew) as CrewMember[]);
        const hasBooker = bonuses.promoterCut > 0;
        const wanted = wantedSerial ?? dateToSerial(state.gameDate);
        const cost = hasBooker ? INQUIRY_ENERGY_WITH_TEAM : INQUIRY_ENERGY;

        if (!spendEnergy(state, cost)) {
          const need = effectiveEnergy(state, cost);
          out = {
            ok: false,
            message:
              `Working the phones takes ${need} energy and you are at ${Math.floor(state.player.energy)}. ` +
              `${energyShortfallMessage(need, state.player.energy)}`,
          };
          return;
        }

        // The same cooldown `bookShow` enforces, so the nights this report
        // offers are nights the booking gate would actually accept.
        const market = state.cityMarkets[venue.city];
        const cd = checkCooldown(venue.cls, market?.lastShowSerial, dateToSerial(state.gameDate));
        const earliestSerial = cd.ok ? wanted : Math.max(wanted, dateToSerial(state.gameDate) + cd.daysLeft);

        const result = inquire({ venue, wantedSerial: wanted, hasBooker, earliestSerial });
        out = {
          ok: true,
          message: inquiryReport(result, venue, (s) => formatGameDate(serialToDate(s))),
          result,
        };

        state.lastEventLog.unshift(
          `📞 ${venue.name} — ${
            result.bookable
              ? 'the night is open.'
              : result.free
                ? 'the night is open, but not to you yet.'
                : 'that night is gone.'
          }`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);
      });

      return out;
    },

    bookShow: (venueId, type, price) => {
      let result: FeatureActionResult = { ok: false, message: 'That room is not on the list.' };

      set((state) => {
        if (!state.player) return;
        if (state.legacy.retired) { result = { ok: false, message: 'This career is retired. Attempt a comeback before booking new shows.' }; return; }
        const venue = findVenue(venueId);
        if (!venue) return;

        // ── The room ──────────────────────────────────────────────────────
        const fame = blendedFame(state.player);
        const lock = venueLockReason(venue, fame);
        if (lock) {
          result = { ok: false, message: lock };
          return;
        }

        const bonuses = crewBonuses(raw(state.crew) as CrewMember[]);

        // ── A booked date owns its night ──────────────────────────────────
        // A tour is a commitment, not a suggestion. Without this a player could
        // sell tickets for a one-off in a city they will not even be in, on a
        // night the tour has already sold — and the tour would then play that
        // night on top of it.
        const tourNight = dateToSerial(state.gameDate);
        const clashingTour = state.tours.find(
          (t) =>
            t.status !== 'cancelled' &&
            t.legs.some((l) => l.playedSerial === undefined && l.serial === tourNight),
        );
        if (clashingTour) {
          const leg = clashingTour.legs.find(
            (l) => l.playedSerial === undefined && l.serial === tourNight,
          );
          result = {
            ok: false,
            message: `You are on tour that night — ${clashingTour.name} is in ${leg?.city ?? 'another city'}.`,
          };
          return;
        }

        // ── The slot ──────────────────────────────────────────────────────
        const gate = slotRequirement(
          type, venue, state.player.country, fame, bonuses.promoterCut, bonuses.logisticsMult,
        );
        if (gate) {
          result = { ok: false, message: gate };
          return;
        }

        // ── Is the room even free? ────────────────────────────────────────
        // A room is not a button. Somebody else's night is often already in
        // it, and the answer is a report rather than a wall: who has it, and
        // which nearby nights are open. With a promoter on the payroll the
        // report covers a month and a half of the diary instead of a fortnight.
        //
        // This gate sits ABOVE the cooldown on purpose. The other way round, a
        // player standing in both would be told only about the cooldown, wait
        // it out, and *then* be told the room was taken — two dead ends for one
        // booking, and the second one arrives after a two-week wait. And the
        // nights this report offers are filtered past `earliestSerial`, so a
        // night it suggests is always a night the player can actually take.
        const nowSerial = dateToSerial(state.gameDate);
        const market = state.cityMarkets[venue.city];
        const cd = checkCooldown(venue.cls, market?.lastShowSerial, nowSerial);
        const earliestSerial = cd.ok ? nowSerial : nowSerial + cd.daysLeft;

        const tonight = nightAt(venue, nowSerial);
        if (tonight.status === 'taken') {
          const looked = inquire({
            venue,
            wantedSerial: nowSerial,
            hasBooker: bonuses.promoterCut > 0,
            earliestSerial,
          });
          result = {
            ok: false,
            message: inquiryReport(looked, venue, (s) => formatGameDate(serialToDate(s))),
          };
          return;
        }

        // ── The cooldown ──────────────────────────────────────────────────
        // A refusal, not a reschedule. The old code moved the calendar forward
        // a day per booking, which produced a one-day gap that LOOKED like a
        // cooldown while refusing nothing — four Accra shows went through on
        // four consecutive days.
        if (!cd.ok) {
          result = { ok: false, message: cd.reason };
          return;
        }

        // ── Can they even open the doors? ─────────────────────────────────
        const input = showInputFrom(state, venue, price);
        const plan = planShow(input);
        if (state.player.career.money < plan.totalCosts) {
          result = {
            ok: false,
            message:
              `Opening ${venue.name} costs about $${plan.totalCosts.toLocaleString()} before a single ticket. ` +
              `You have $${Math.floor(state.player.career.money).toLocaleString()}.`,
          };
          return;
        }

        const energy = showEnergy(type);
        const energyBefore = state.player.energy / Math.max(1, state.player.maxEnergy);
        if (!spendEnergy(state, energy)) {
          const need = effectiveEnergy(state, energy);
          result = {
            ok: false,
            message: `A show takes ${need} energy and you are at ${Math.floor(state.player.energy)}. ${energyShortfallMessage(need, state.player.energy)}`,
          };
          return;
        }

        // ── The night ─────────────────────────────────────────────────────
        // One roll, and the only random number in the whole show. Everything
        // else — the seats, the money, the review — follows from it.
        const roll = 0.82 + Math.random() * 0.36;
        const night = settleShow(input, roll);

        const performanceQuality = performanceScore({
          stagePresence: state.player.stats.stagePresence,
          performance: state.player.stats.performance,
          charisma: state.player.stats.charisma,
          consistency: state.player.stats.consistency,
          stageBonus: bonuses.stageBonus,
          energyRatio: energyBefore,
          fill: night.fill,
        });

        // Everything from here down is shared with the tour tick. The only
        // difference is that a single show is played now and eats the day,
        // while a tour date has already arrived on the clock.
        const settled = applyShowOutcome(state, {
          venue,
          type,
          price,
          night,
          performanceQuality,
          energy,
          nowSerial,
          controversyMult: bonuses.controversyMult,
          advanceCalendar: true,
        });
        const attendance = settled.attendance;

        result = {
          ok: true,
          message: attendance === 0
            ? `${venue.name} was empty. $${Math.abs(night.net).toLocaleString()} lost.`
            : `${attendance.toLocaleString()} of ${venue.capacity.toLocaleString()} at ${venue.name} — $${night.net.toLocaleString()} ${night.net >= 0 ? 'clear' : 'lost'}.`,
        };
      });

      return result;
    },

    // ─── TOURS ───────────────────────────────────────────────────────────
    //
    // A tour is a run of dates, not a bigger show. `planTourAt` is a pure read
    // over the same engine `bookShow` runs; `bookTour` is the commitment. Both
    // go through `planTour` in `sim/tours.ts`, so the schedule the player reads
    // is the schedule the tick will play — the estimate cannot be a different
    // tour, which is the failure mode the whole show rebuild exists to kill.
    planTourAt: (stops, startSerial) => {
      const state = get();
      if (!state.player) return { ok: false, message: 'No career to plan for.' };
      if (stops.length < 2) {
        return { ok: false, message: 'A tour is two dates or more. Pick at least one more city.' };
      }
      const missing = unresolvedStops(stops);
      if (missing.length) {
        return {
          ok: false,
          message:
            `${missing.length} of those ${stops.length} rooms could not be found, so nothing ` +
            `has been planned. Nothing was booked and no money moved.`,
        };
      }
      const nowSerial = dateToSerial(state.gameDate);
      const plan = planTour({
        stops: tourStopsFrom(state, stops),
        startSerial: startSerial ?? nowSerial,
        daysSinceRelease: daysSinceLastRelease(state, nowSerial),
      });
      return {
        ok: plan.isTour,
        message: tourReport(plan, (s) => formatGameDate(serialToDate(s))),
        plan,
      };
    },

    bookTour: (stops, startSerial) => {
      let result: FeatureActionResult = { ok: false, message: 'Nothing to book.' };

      set((state) => {
        if (!state.player) return;

        const missing = unresolvedStops(stops);
        if (missing.length) {
          result = {
            ok: false,
            message:
              `${missing.length} of those ${stops.length} rooms could not be found, so nothing ` +
              `has been booked. Nothing was charged.`,
          };
          return;
        }

        const nowSerial = dateToSerial(state.gameDate);
        const plan = planTour({
          stops: tourStopsFrom(state, stops),
          startSerial: startSerial ?? nowSerial,
          daysSinceRelease: daysSinceLastRelease(state, nowSerial),
        });

        if (!plan.isTour) {
          result = {
            ok: false,
            message: plan.unavailable.length
              ? `${plan.unavailable.length} of ${stops.length} dates cannot be had. ${tourReport(plan, (s) => formatGameDate(serialToDate(s)))}`
              : 'A tour is two dates or more.',
          };
          return;
        }

        // The routing is real money that leaves before a single ticket, and it
        // is charged ONCE, here. Each night still pays its own freight inside
        // its own settlement, so the two bills never get confused.
        const perLeg = plan.legs.reduce((s, l) => s + l.plan.totalCosts, 0);
        const need = plan.totalTravel + perLeg;
        if (state.player.career.money < need) {
          result = {
            ok: false,
            message:
              `This run costs about $${Math.round(need).toLocaleString()} to put on — ` +
              `$${plan.totalTravel.toLocaleString()} of it moving between cities. ` +
              `You have $${Math.floor(state.player.career.money).toLocaleString()}.`,
          };
          return;
        }

        state.player.career.money -= plan.totalTravel;

        const tour: Tour = {
          id: uuidv4(),
          name: plan.countries.length > 1 ? 'The Run' : `${plan.countries[0]} Run`,
          createdAt: formatGameDate(state.gameDate),
          legs: plan.legs.map((l) => ({
            id: uuidv4(),
            type: l.type,
            venueId: l.venue.id,
            city: l.city,
            country: l.country,
            serial: l.serial,
            price: l.price,
          })),
          travelCost: plan.totalTravel,
          // Locked at booking, so a record that lands mid-tour cannot retro-
          // lift the dates the player already sold.
          buzz: plan.buzz,
          status: 'booked',
        };
        state.tours.push(tour);

        state.lastEventLog.unshift(
          `🚌 Tour booked — ${tour.legs.length} dates, ${plan.cities.join(', ')}. ` +
            `$${plan.totalTravel.toLocaleString()} on the road. ` +
            `Projected $${plan.projected.netAfterTravel.toLocaleString()}.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        result = {
          ok: true,
          message:
            `Booked ${tour.legs.length} dates from ${formatGameDate(serialToDate(plan.firstNight!))} ` +
            `to ${formatGameDate(serialToDate(plan.lastNight!))}. ` +
            `$${plan.totalTravel.toLocaleString()} paid on the road; ` +
            `$${plan.projected.netAfterTravel.toLocaleString()} projected.`,
        };
      });

      return result;
    },

    // ─── SHOW OFFERS ─────────────────────────────────────────────────────
    //
    // Offers arrive from the tick (see "SHOW OFFERS" in `advanceTurnBy`). The
    // player answers them here: counter, accept, or decline with a reason. The
    // NPC reaction is a pure function of who they are (`sim/offers.ts`), and
    // the store only applies it.
    showOfferContext: (id) => {
      const state = get();
      const offer = state.showOffers.find((o) => o.id === id);
      const npc = offer ? state.npcs.find((n) => n.id === offer.hostId) : undefined;
      if (!offer || !npc) return null;
      const now = dateToSerial(state.gameDate);
      return {
        mood: moodOf(npc.id, now),
        relationship: npc.relationshipScore,
        managerSkill: playerNegotiatorSkill(state, 'manager'),
        lawyerSkill: playerNegotiatorSkill(state, 'lawyer'),
        competing: state.showOffers.filter((o) => o.id !== id && o.status === 'open').length,
        traits: traitsOf(npc),
        hostTier: npc.tier,
        hostFame: npc.fame,
        calendarBusy: playerBusyOn(state, offer.serial),
      };
    },

    counterShowOffer: (id, ask) => {
      let out: { ok: boolean; message: string; outcome?: CounterResult['outcome'] } = { ok: false, message: 'That offer is gone.' };
      set((state) => {
        const offer = state.showOffers.find((o) => o.id === id);
        const npc = offer ? state.npcs.find((n) => n.id === offer.hostId) : undefined;
        if (!offer || !npc || offer.status !== 'open') return;
        const now = dateToSerial(state.gameDate);
        if (now > offer.expiresSerial) {
          offer.status = 'expired';
          out = { ok: false, message: 'That offer has expired.' };
          return;
        }
        const res = negotiate(
          offer,
          ask,
          {
            relationship: npc.relationshipScore,
            mood: moodOf(npc.id, now),
            managerSkill: playerNegotiatorSkill(state, 'manager'),
            lawyerSkill: playerNegotiatorSkill(state, 'lawyer'),
            competing: state.showOffers.filter((o) => o.id !== id && o.status === 'open').length,
            traits: traitsOf(npc),
          },
          Math.random(),
        );
        offer.round += 1;
        offer.patience = res.patience;
        offer.log.unshift(res.line);
        offer.log = offer.log.slice(0, 10);
        if (res.outcome === 'accepted' || res.outcome === 'met_halfway') {
          offer.terms = res.terms;
          offer.agreed = res.outcome === 'accepted';
        }
        if (res.outcome === 'walked') {
          offer.status = 'walked';
          npc.relationshipScore = Math.max(-100, npc.relationshipScore - 2);
          state.lastEventLog.unshift(`🚪 ${npc.name}'s camp walked away from the ${offer.city} offer.`);
          state.lastEventLog = state.lastEventLog.slice(0, 10);
        }
        out = { ok: true, message: res.line, outcome: res.outcome };
      });
      return out;
    },

    acceptShowOffer: (id) => {
      let result: FeatureActionResult = { ok: false, message: 'That offer is gone.' };
      set((state) => {
        const offer = state.showOffers.find((o) => o.id === id);
        const npc = offer ? state.npcs.find((n) => n.id === offer.hostId) : undefined;
        if (!offer || !npc || !state.player || offer.status !== 'open') return;
        const now = dateToSerial(state.gameDate);
        if (now > offer.expiresSerial) {
          offer.status = 'expired';
          result = { ok: false, message: 'That offer has expired.' };
          return;
        }
        if (playerBusyOn(state, offer.serial)) {
          result = { ok: false, message: `You already have something on ${formatGameDate(serialToDate(offer.serial))}. Decline it, or clear the date first.` };
          return;
        }
        const clash = state.bookedGigs.find(
          (g) => g.terms.exclusivityDays > 0 && g.city === offer.city && Math.abs(g.serial - offer.serial) < g.terms.exclusivityDays,
        );
        if (clash) {
          result = { ok: false, message: `${clash.hostName}'s radius clause bars you from playing ${offer.city} that close to ${formatGameDate(serialToDate(clash.serial))}.` };
          return;
        }

        const gig: BookedGig = {
          id: uuidv4(),
          offerId: offer.id,
          hostId: offer.hostId,
          hostName: offer.hostName,
          archetype: offer.archetype,
          kind: offer.kind,
          venueId: offer.venueId,
          venueName: offer.venueName,
          city: offer.city,
          country: offer.country,
          capacity: offer.capacity,
          serial: offer.serial,
          acceptedSerial: now,
          terms: { ...offer.terms },
          reminded: [],
        };
        state.bookedGigs.push(gig);
        offer.status = 'accepted';
        npc.relationshipScore = Math.min(100, npc.relationshipScore + 2);
        npc.memoryLog = [`Accepted their ${offer.city} date`, ...(npc.memoryLog ?? [])].slice(0, 10);

        const when = formatGameDate(serialToDate(offer.serial));
        state.lastEventLog.unshift(`🤝 Booked: ${offer.venueName}, ${offer.city} — ${when}.`);
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        const bits: string[] = [];
        if (offer.hidden.includes('cancel') && playerNegotiatorSkill(state, 'lawyer') <= 0) {
          bits.push(`You signed without a lawyer. The fine print has a ${CANCEL_LABEL[offer.terms.cancel].label.toLowerCase()} cancellation clause.`);
        }
        if (offer.terms.exclusivityDays > 0) {
          bits.push(`There is a ${offer.terms.exclusivityDays}-day radius clause around ${offer.city}.`);
        }
        result = {
          ok: true,
          message: `Booked ${offer.venueName} on ${when}. $${offer.terms.fee.toLocaleString()} guaranteed.${bits.length ? ' ' + bits.join(' ') : ''}`,
        };
      });
      return result;
    },

    declineShowOffer: (id, reason, soften) => {
      let result: FeatureActionResult = { ok: false, message: 'That offer is gone.' };
      set((state) => {
        const offer = state.showOffers.find((o) => o.id === id);
        const npc = offer ? state.npcs.find((n) => n.id === offer.hostId) : undefined;
        if (!offer || !npc || !state.player || offer.status !== 'open') return;
        const now = dateToSerial(state.gameDate);
        const eff = declineEffect({
          archetype: offer.archetype,
          traits: traitsOf(npc),
          reason,
          relationship: npc.relationshipScore,
          mood: moodOf(npc.id, now),
          calendarBusy: playerBusyOn(state, offer.serial),
          runDown: state.player.energy / Math.max(1, state.player.maxEnergy) < 0.5,
          negotiated: offer.round > 0,
          soften,
          hostTier: npc.tier,
          roll: Math.random(),
        });
        npc.relationshipScore = Math.max(-100, Math.min(100, npc.relationshipScore + eff.relationship));
        npc.memoryLog = [`Turned down their ${offer.city} date (${reason})`, ...(npc.memoryLog ?? [])].slice(0, 10);
        state.player.career.reputation = Math.max(0, Math.min(100, state.player.career.reputation + eff.reputation));
        offer.status = 'declined';
        offer.log.unshift(eff.line);

        if (eff.grudge || (eff.relationship <= -5 && npc.tier !== 'local')) {
          state.headlines.unshift({
            id: uuidv4(),
            text: `Word is ${state.player.artistName} turned down ${npc.name}'s ${offer.city} date`,
            fullStory: `Industry chatter says the invitation was declined. ${eff.line}`,
            date: formatGameDate(serialToDate(now)),
            relatedEntities: [state.player.id, npc.id],
            priority: 3,
            category: 'show',
          });
        }
        const delta = eff.relationship === 0 ? 'no change' : `${eff.relationship > 0 ? '+' : ''}${eff.relationship} relationship`;
        result = { ok: true, message: `${eff.line} (${delta}).` };
      });
      return result;
    },

    quoteDecline: (id, reason, soften) => {
      const state = get();
      const offer = state.showOffers.find((o) => o.id === id);
      const npc = offer ? state.npcs.find((n) => n.id === offer.hostId) : undefined;
      if (!offer || !npc || !state.player) return null;
      const now = dateToSerial(state.gameDate);
      return declineEffect({
        archetype: offer.archetype,
        traits: traitsOf(npc),
        reason,
        relationship: npc.relationshipScore,
        mood: moodOf(npc.id, now),
        calendarBusy: playerBusyOn(state, offer.serial),
        runDown: state.player.energy / Math.max(1, state.player.maxEnergy) < 0.5,
        negotiated: offer.round > 0,
        soften,
        hostTier: npc.tier,
        roll: 0,
      });
    },

    backOutOfGig: (gigId) => {
      let result: FeatureActionResult = { ok: false, message: 'No such date.' };
      set((state) => {
        const gig = state.bookedGigs.find((g) => g.id === gigId);
        const npc = gig ? state.npcs.find((n) => n.id === gig.hostId) : undefined;
        if (!gig || !state.player) return;
        const now = dateToSerial(state.gameDate);
        const t = backOutTerms(gig, gig.serial - now, npc?.tier ?? 'local');
        state.player.career.money -= t.penalty;
        state.player.career.reputation = Math.max(0, state.player.career.reputation + t.reputation);
        if (npc) {
          npc.relationshipScore = Math.max(-100, npc.relationshipScore + t.relationship);
          npc.memoryLog = [`Backed out of their ${gig.city} date`, ...(npc.memoryLog ?? [])].slice(0, 10);
        }
        state.bookedGigs = state.bookedGigs.filter((g) => g.id !== gigId);
        state.lastEventLog.unshift(`🚫 Backed out of ${gig.hostName}'s ${gig.city} date. -$${t.penalty.toLocaleString()}.`);
        state.lastEventLog = state.lastEventLog.slice(0, 10);
        result = {
          ok: true,
          message: `You pulled out. $${t.penalty.toLocaleString()} penalty, ${t.relationship} relationship, ${t.reputation} reputation.`,
        };
      });
      return result;
    },

    // ─── SCHEDULED SHOWS ─────────────────────────────────────────────────
    //
    // A show is announced, sold over weeks, and played on its night. The
    // clock does the playing: nothing here settles a show, it only commits,
    // reprices, promotes, moves or cancels one. The tick sells the tickets
    // and plays the night (see "SCHEDULED SHOWS" in `advanceTurnBy`).
    scheduleShow: (venueId, type, price, serial) => {
      let result: FeatureActionResult = { ok: false, message: 'That room is not on the list.' };

      set((state) => {
        if (!state.player) return;
        if (state.legacy.retired) { result = { ok: false, message: 'This career is retired. Attempt a comeback before booking new shows.' }; return; }
        const venue = findVenue(venueId);
        if (!venue) return;

        const now = dateToSerial(state.gameDate);
        const lead = serial - now;
        const need = MIN_LEAD_DAYS[venue.cls];
        if (lead < need) {
          result = {
            ok: false,
            message: `${VENUE_CLASS_LABEL[venue.cls]} dates need at least ${need} days to sell. The earliest you can announce is ${formatGameDate(serialToDate(now + need))}.`,
          };
          return;
        }
        if (lead > MAX_LEAD_DAYS) {
          result = { ok: false, message: `Nobody books more than ${MAX_LEAD_DAYS} days out.` };
          return;
        }
        if (state.scheduledShows.length >= MAX_OPEN_SHOWS) {
          result = {
            ok: false,
            message: `You already have ${MAX_OPEN_SHOWS} shows on sale. Play or cancel one first.`,
          };
          return;
        }

        const fame = blendedFame(state.player);
        const lock = venueLockReason(venue, fame);
        if (lock) {
          result = { ok: false, message: lock };
          return;
        }
        const bonuses = crewBonuses(raw(state.crew) as CrewMember[]);
        const gate = slotRequirement(
          type, venue, state.player.country, fame, bonuses.promoterCut, bonuses.logisticsMult,
        );
        if (gate) {
          result = { ok: false, message: gate };
          return;
        }

        // ── Is the night yours to sell? ───────────────────────────────
        if (!isNightFree(venue, serial)) {
          result = { ok: false, message: `${venue.name} is already booked that night. Pick another date.` };
          return;
        }
        const ownClash = state.scheduledShows.find((s) => s.serial === serial);
        if (ownClash) {
          result = { ok: false, message: `You are already playing ${ownClash.city} that night.` };
          return;
        }
        const tourClash = state.tours.find(
          (t) => t.status !== 'cancelled' && t.legs.some((l) => l.playedSerial === undefined && l.serial === serial),
        );
        if (tourClash) {
          result = { ok: false, message: `${tourClash.name} has you on the road that night.` };
          return;
        }

        const gigClash = state.bookedGigs.find((g) => g.serial === serial);
        if (gigClash) {
          result = { ok: false, message: `You are on ${gigClash.hostName}'s bill that night.` };
          return;
        }
        const radius = state.bookedGigs.find(
          (g) => g.terms.exclusivityDays > 0 && g.city === venue.city && Math.abs(g.serial - serial) < g.terms.exclusivityDays,
        );
        if (radius) {
          result = {
            ok: false,
            message: `${radius.hostName}'s radius clause bars you from playing ${venue.city} within ${radius.terms.exclusivityDays} days of ${formatGameDate(serialToDate(radius.serial))}.`,
          };
          return;
        }

        // ── The city needs a breather ─────────────────────────────────
        // Measured against every date the player has in this city, played OR
        // still to come, so announcing three nights in a week cannot dodge the
        // cooldown by being sold before any of them is played.
        const gap = VENUE_CLASSES[venue.cls].cooldownDays;
        const others = [
          ...state.scheduledShows.filter((s) => s.city === venue.city).map((s) => s.serial),
          ...(state.cityMarkets[venue.city]?.lastShowSerial !== undefined
            ? [state.cityMarkets[venue.city]!.lastShowSerial as number]
            : []),
        ];
        const tooClose = others.find((o) => Math.abs(o - serial) < gap);
        if (tooClose !== undefined) {
          result = {
            ok: false,
            message: `${venue.city} needs ${gap} days between your shows. You have a date on ${formatGameDate(serialToDate(tooClose))}.`,
          };
          return;
        }

        const input = showInputFrom(state, venue, price, serial);
        const plan = planShow(input);
        const deposit = Math.round((venue.hireCost * input.venueHireMult * 0.25) / 10) * 10;
        if (state.player.career.money < deposit) {
          result = {
            ok: false,
            message: `Holding ${venue.name} takes a $${deposit.toLocaleString()} deposit. You have $${Math.floor(state.player.career.money).toLocaleString()}.`,
          };
          return;
        }
        if (plan.tickets.likely === 0) {
          result = { ok: false, message: 'At that price nobody is coming. Lower the ticket price first.' };
          return;
        }

        state.player.career.money -= deposit;
        const show: ScheduledShow = {
          id: uuidv4(),
          type,
          venueId: venue.id,
          city: venue.city,
          country: venue.country,
          serial,
          originalSerial: serial,
          announcedSerial: now,
          price,
          capacity: venue.capacity,
          luck: 0.82 + Math.random() * 0.36,
          ticketsSold: 0,
          salesCursor: now,
          deposit,
          marketingSpend: 0,
          postponements: 0,
          status: 'on_sale',
          remindersSent: [],
          sales: [{ serial: now, sold: 0 }],
          notes: [`Announced for ${formatGameDate(serialToDate(serial))} at $${price}.`],
          milestone: 0,
        };
        state.scheduledShows.push(show);

        const when = formatGameDate(serialToDate(serial));
        state.lastEventLog.unshift(`🎟️ ${venue.name} announced for ${when}. Tickets on sale at $${price}.`);
        state.lastEventLog = state.lastEventLog.slice(0, 10);
        state.mailbox.unshift({
          id: uuidv4(),
          from: 'booking_desk',
          fromName: 'Booking desk',
          subject: `🎟️ On sale: ${venue.name}, ${venue.city} — ${when}`,
          body:
            `Tickets for ${venue.name} (${venue.capacity.toLocaleString()} capacity) are live at $${price}.\n\n` +
            `Deposit paid: $${deposit.toLocaleString()}. You will get updates as they sell, and a reminder as the night gets close. ` +
            `If sales are slow you can cut the price, add promotion, move the date or cancel — the sooner the cheaper.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'general',
        });

        result = {
          ok: true,
          message: `Announced ${venue.name} for ${when}. $${deposit.toLocaleString()} deposit paid. Tickets are on sale.`,
        };
      });

      return result;
    },

    repriceScheduledShow: (id, price) => {
      let result: FeatureActionResult = { ok: false, message: 'No such show.' };
      set((state) => {
        const show = state.scheduledShows.find((s) => s.id === id);
        if (!show || !state.player) return;
        const p = Math.max(5, Math.round(price));
        if (p === show.price) {
          result = { ok: false, message: 'That is already the price.' };
          return;
        }
        const was = show.price;
        show.price = p;
        show.notes.unshift(
          p < was
            ? `Price cut $${was} → $${p}. Earlier buyers keep their tickets.`
            : `Price raised $${was} → $${p}.`,
        );
        show.notes = show.notes.slice(0, 12);
        result = {
          ok: true,
          message: p < was
            ? `Tickets now $${p}. A cut brings in new buyers — expect a bump in sales.`
            : `Tickets now $${p}. Fewer new buyers at the higher price.`,
        };
      });
      return result;
    },

    promoteScheduledShow: (id, tierId) => {
      let result: FeatureActionResult = { ok: false, message: 'No such show.' };
      set((state) => {
        const show = state.scheduledShows.find((s) => s.id === id);
        if (!show || !state.player) return;
        const tier = MARKETING_TIERS.find((t) => t.id === tierId);
        if (!tier) return;
        if (show.serial - dateToSerial(state.gameDate) < 2) {
          result = { ok: false, message: 'Too late to promote — the show is the day after tomorrow or sooner.' };
          return;
        }
        const cost = marketingCost(tier, show.capacity, show.price);
        if (state.player.career.money < cost) {
          result = {
            ok: false,
            message: `${tier.label} costs $${cost.toLocaleString()}. You have $${Math.floor(state.player.career.money).toLocaleString()}.`,
          };
          return;
        }
        state.player.career.money -= cost;
        show.marketingSpend += cost;
        show.notes.unshift(`${tier.label}: $${cost.toLocaleString()} spent.`);
        show.notes = show.notes.slice(0, 12);
        result = { ok: true, message: `${tier.label} is running. $${cost.toLocaleString()} spent.` };
      });
      return result;
    },

    quoteScheduledCancel: (id, reason) => {
      const state = get();
      const show = state.scheduledShows.find((s) => s.id === id);
      const venue = show ? findVenue(show.venueId) : undefined;
      if (!show || !venue || !state.player) return null;
      const bonuses = crewBonuses(raw(state.crew) as CrewMember[]);
      return cancelTerms({
        daysOut: show.serial - dateToSerial(state.gameDate),
        deposit: show.deposit,
        hireCost: Math.round(venue.hireCost * bonuses.venueHireMult),
        ticketsSold: show.ticketsSold,
        reason,
        energyRatio: state.player.energy / Math.max(1, state.player.maxEnergy),
        cutRelief: bonuses.cutRelief,
      });
    },

    cancelScheduledShow: (id, reason) => {
      let result: FeatureActionResult = { ok: false, message: 'No such show.' };
      set((state) => {
        const show = state.scheduledShows.find((s) => s.id === id);
        const venue = show ? findVenue(show.venueId) : undefined;
        if (!show || !venue || !state.player) return;

        const bonuses = crewBonuses(raw(state.crew) as CrewMember[]);
        const terms = cancelTerms({
          daysOut: show.serial - dateToSerial(state.gameDate),
          deposit: show.deposit,
          hireCost: Math.round(venue.hireCost * bonuses.venueHireMult),
          ticketsSold: show.ticketsSold,
          reason,
          energyRatio: state.player.energy / Math.max(1, state.player.maxEnergy),
          cutRelief: bonuses.cutRelief,
        });

        // The deposit is already gone. Anything beyond it is billed now.
        const extra = Math.max(0, terms.penalty - show.deposit);
        state.player.career.money -= extra;
        state.player.career.reputation = Math.max(
          0,
          state.player.career.reputation + terms.reputation * bonuses.controversyMult,
        );
        state.scheduledShows = state.scheduledShows.filter((s) => s.id !== id);

        const what = `${venue.name}, ${venue.city}`;
        state.lastEventLog.unshift(
          `🚫 ${what} cancelled. ${show.ticketsSold.toLocaleString()} tickets refunded. -$${terms.penalty.toLocaleString()}.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        state.mailbox.unshift({
          id: uuidv4(),
          from: 'booking_desk',
          fromName: 'Booking desk',
          subject: `🚫 Cancelled: ${what}`,
          body:
            `${show.ticketsSold.toLocaleString()} ticket-holders are being refunded in full.\n\n` +
            `${terms.explain}\n\nTotal cost to you: $${terms.penalty.toLocaleString()}.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'general',
        });

        if (terms.backlash !== 'none') {
          const fan = state.npcs.find((n) => n.role === 'fan_account');
          if (fan) {
            state.socialPosts.unshift({
              id: uuidv4(),
              platform: 'chirp',
              authorId: fan.id,
              authorName: fan.name,
              content: terms.backlash === 'loud'
                ? `Cancelled the week of?? ${state.player.artistName} had people booking flights for ${show.city}. Not good enough. 😤`
                : `${state.player.artistName} just called off the ${show.city} show. Refunds are coming but man, we wanted this one.`,
              likes: Math.max(20, show.ticketsSold),
              shares: Math.round(show.ticketsSold / 6),
              comments: [],
              timestamp: new Date().toISOString(),
              isPlayerPost: false,
              trendingScore: terms.backlash === 'loud' ? 55 : 25,
              daySerial: dateToSerial(state.gameDate),
            });
          }
          state.headlines.unshift({
            id: uuidv4(),
            text: terms.backlash === 'loud'
              ? `${state.player.artistName} pulls ${show.city} show days before the doors`
              : `${state.player.artistName} cancels ${show.city} date`,
            fullStory: `${terms.explain} ${show.ticketsSold.toLocaleString()} fans were refunded.`,
            date: formatGameDate(serialToDate(dateToSerial(state.gameDate))),
            relatedEntities: [state.player.id],
            priority: terms.backlash === 'loud' ? 5 : 2,
            category: 'show',
          });
        }

        result = {
          ok: true,
          message: `${what} is off. ${terms.explain} It cost $${terms.penalty.toLocaleString()}.`,
        };
      });
      return result;
    },

    quoteScheduledPostpone: (id, newSerial) => {
      const state = get();
      const show = state.scheduledShows.find((s) => s.id === id);
      const venue = show ? findVenue(show.venueId) : undefined;
      if (!show || !venue || !state.player) return null;
      const bonuses = crewBonuses(raw(state.crew) as CrewMember[]);
      return postponeTerms({
        daysOut: show.serial - dateToSerial(state.gameDate),
        moveDays: Math.max(1, newSerial - show.serial),
        hireCost: Math.round(venue.hireCost * bonuses.venueHireMult),
        ticketsSold: show.ticketsSold,
        postponements: show.postponements,
      });
    },

    postponeScheduledShow: (id, newSerial) => {
      let result: FeatureActionResult = { ok: false, message: 'No such show.' };
      set((state) => {
        const show = state.scheduledShows.find((s) => s.id === id);
        const venue = show ? findVenue(show.venueId) : undefined;
        if (!show || !venue || !state.player) return;

        const now = dateToSerial(state.gameDate);
        if (show.postponements >= MAX_POSTPONEMENTS) {
          result = { ok: false, message: 'You have already moved this one twice. Promoters will not do it a third time.' };
          return;
        }
        if (newSerial <= show.serial) {
          result = { ok: false, message: 'Pick a date after the current one.' };
          return;
        }
        if (newSerial - now > MAX_LEAD_DAYS) {
          result = { ok: false, message: `Nobody books more than ${MAX_LEAD_DAYS} days out.` };
          return;
        }
        if (!isNightFree(venue, newSerial)) {
          result = { ok: false, message: `${venue.name} is booked on ${formatGameDate(serialToDate(newSerial))}.` };
          return;
        }
        if (state.scheduledShows.some((s) => s.id !== id && s.serial === newSerial)) {
          result = { ok: false, message: 'You already have a show that night.' };
          return;
        }
        const gap = VENUE_CLASSES[venue.cls].cooldownDays;
        const clash = state.scheduledShows.find(
          (s) => s.id !== id && s.city === venue.city && Math.abs(s.serial - newSerial) < gap,
        );
        if (clash) {
          result = { ok: false, message: `That is too close to your ${formatGameDate(serialToDate(clash.serial))} date in ${venue.city}.` };
          return;
        }

        const bonuses = crewBonuses(raw(state.crew) as CrewMember[]);
        const terms = postponeTerms({
          daysOut: show.serial - now,
          moveDays: newSerial - show.serial,
          hireCost: Math.round(venue.hireCost * bonuses.venueHireMult),
          ticketsSold: show.ticketsSold,
          postponements: show.postponements,
        });
        if (state.player.career.money < terms.fee) {
          result = { ok: false, message: `Moving the date costs $${terms.fee.toLocaleString()}. You have $${Math.floor(state.player.career.money).toLocaleString()}.` };
          return;
        }

        state.player.career.money -= terms.fee;
        state.player.career.reputation = Math.max(
          0,
          state.player.career.reputation + terms.reputation * bonuses.controversyMult,
        );
        const oldWhen = formatGameDate(serialToDate(show.serial));
        const newWhen = formatGameDate(serialToDate(newSerial));
        show.ticketsSold -= terms.refunds;
        show.serial = newSerial;
        show.postponements += 1;
        show.status = 'on_sale';
        show.remindersSent = [];
        show.milestone = Math.min(show.milestone, Math.floor((show.ticketsSold / Math.max(1, show.capacity)) * 4) * 25);
        show.notes.unshift(`Postponed ${oldWhen} → ${newWhen}. ${terms.refunds.toLocaleString()} refunds.`);
        show.notes = show.notes.slice(0, 12);

        state.lastEventLog.unshift(`📅 ${venue.name} moved to ${newWhen}. ${terms.refunds.toLocaleString()} refunds.`);
        state.lastEventLog = state.lastEventLog.slice(0, 10);
        state.mailbox.unshift({
          id: uuidv4(),
          from: 'booking_desk',
          fromName: 'Booking desk',
          subject: `📅 Postponed: ${venue.name} is now ${newWhen}`,
          body:
            `Ticket-holders have been told. ${terms.refunds.toLocaleString()} asked for a refund and ${show.ticketsSold.toLocaleString()} are keeping their seats.\n\n` +
            `${terms.explain}`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'general',
        });

        result = {
          ok: true,
          message: `Moved to ${newWhen}. $${terms.fee.toLocaleString()} in fees, ${terms.refunds.toLocaleString()} refunds.`,
        };
      });
      return result;
    },

    cancelTour: (tourId) => {
      let result: FeatureActionResult = { ok: false, message: 'No such tour.' };
      set((state) => {
        const tour = state.tours.find((t) => t.id === tourId);
        if (!tour) return;
        if (tour.status === 'done') {
          result = { ok: false, message: 'That run is already finished.' };
          return;
        }
        if (tour.status === 'cancelled') {
          result = { ok: false, message: 'That run is already off.' };
          return;
        }
        // Dates already played stay in the history — you cannot un-play a show.
        const played = tour.legs.filter((l) => l.playedSerial !== undefined).length;
        tour.status = 'cancelled';
        state.lastEventLog.unshift(
          `🚫 ${tour.name} called off — ${played} of ${tour.legs.length} dates were already played.`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);
        result = {
          ok: true,
          message: `Called off. ${played} of ${tour.legs.length} dates had already been played and stay in the history.`,
        };
      });
      return result;
    },

    // ─── INVESTMENTS ─────────────────────────────────────────────────────
    buyInvestment: (type, name, cost, riskLevel) =>
      set((state) => {
        if (!state.player || state.player.career.money < cost) return;

        state.player.career.money -= cost;

        const monthlyIncomeRates: Record<string, number> = {
          real_estate: 0.005,
          stock: 0,
          music_catalog: 0.008,
          restaurant: 0.03,
          tech_startup: 0,
          clothing_brand: 0.02,
        };

        const investment: Investment = {
          id: uuidv4(),
          type,
          name,
          initialCost: cost,
          currentValue: cost,
          monthlyIncome: cost * (monthlyIncomeRates[type] ?? 0),
          riskLevel,
          purchaseDate: formatGameDate(state.gameDate),
        };

        state.investments.push(investment);
      }),

    sellInvestment: (investmentId) =>
      set((state) => {
        if (!state.player) return;
        const idx = state.investments.findIndex(i => i.id === investmentId);
        if (idx === -1) return;
        const inv = state.investments[idx];
        state.player.career.money += inv.currentValue;
        state.investments.splice(idx, 1);
      }),

    // ─── BUSINESSES ─────────────────────────────────────────────────────
    buyBusiness: (type, name, cost) =>
      set((state) => {
        if (!state.player) return;
        if (state.player.career.money < cost) return;
        if (state.businesses.some(b => b.type === type)) return;
        // Labels are founded from My Label now, not bought as a flat earner.
        if (type === 'record_label') return;

        state.player.career.money -= cost;

        // Each business pays back its purchase price over roughly 5 years.
        // Profitability scales with the player's business knowledge — a
        // sharper operator runs leaner costs, not bigger revenue.
        const revenueRate: Record<string, number> = {
          record_label: 0.028,
          recording_studio: 0.030,
          clothing_line: 0.024,
          nightclub: 0.026,
          media_company: 0.023,
        };
        const costRate: Record<string, number> = {
          record_label: 0.011,
          recording_studio: 0.009,
          clothing_line: 0.008,
          nightclub: 0.012,
          media_company: 0.007,
        };

        const skill = state.player.stats.businessKnowledge ?? 50;
        const efficiency = 1 - (skill - 50) / 250; // 0.8 at skill 100, 1.2 at skill 0
        const monthlyRevenue = cost * (revenueRate[type] ?? 0.02);
        const monthlyCosts = cost * (costRate[type] ?? 0.01) * efficiency;

        const business: Business = {
          id: uuidv4(),
          type,
          name,
          monthlyRevenue,
          monthlyCosts,
          reputation: 50,
          purchaseDate: formatGameDate(state.gameDate),
        };

        state.businesses.push(business);

        const post: SocialPost = {
          id: uuidv4(),
          platform: 'chirp',
          authorId: 'player',
          authorName: state.player.artistName,
          content: `New venture: I own a ${name.toLowerCase()} now. Bought and paid for. 🏢`,
          likes: 0,
          shares: 0,
          comments: [],
          timestamp: formatGameDate(state.gameDate),
          isPlayerPost: true,
          trendingScore: 12,
        };
        state.socialPosts.unshift(post);

        state.lastEventLog.unshift(`Bought ${name} for $${cost.toLocaleString()}`);
        state.lastEventLog = state.lastEventLog.slice(0, 10);
      }),

    sellBusiness: (businessId) =>
      set((state) => {
        if (!state.player) return;
        const idx = state.businesses.findIndex(b => b.id === businessId);
        if (idx === -1) return;
        const biz = state.businesses[idx];
        // Resale value is derived back from monthly revenue (the purchase price
        // is not stored on the record), discounted 30% for it being used.
        const value = Math.round((biz.monthlyRevenue / 0.026) * 0.7);
        state.player.career.money += value;
        state.businesses.splice(idx, 1);
        state.lastEventLog.unshift(`Sold ${biz.name} for $${value.toLocaleString()}`);
        state.lastEventLog = state.lastEventLog.slice(0, 10);
      }),

    // ─── YOUR OWN LABEL ─────────────────────────────────────────────────
    foundLabel: (opts) => {
      let result: FeatureActionResult = { ok: false, message: 'Could not found the label.' };
      set((state) => {
        if (!state.player) return;
        if (state.label) { result.message = `You already run ${state.label.name}.`; return; }
        const name = opts.name.trim().replace(/\s+/g, ' ').slice(0, 32);
        if (name.length < 2) { result.message = 'Give the label a name.'; return; }
        const fame = blendedFame(state.player);
        const existing = state.businesses.find((b) => b.type === 'record_label');
        if (!existing && fame < FOUNDING_MIN_FAME) {
          result.message = `Nobody takes a label call from an unknown. Get to ${FOUNDING_MIN_FAME} fame first.`;
          return;
        }
        let cash = 0;
        if (existing) {
          // The old "record label" business becomes the real thing. Its resale
          // value is the label's opening balance, so nothing is lost.
          cash = Math.round((existing.monthlyRevenue / 0.026) * 0.7);
          state.businesses = state.businesses.filter((b) => b.id !== existing.id);
        } else {
          if (state.player.career.money < FOUNDING_COST) {
            result.message = `Registering the company, a lawyer and a small office costs ${money(FOUNDING_COST)}.`;
            return;
          }
          state.player.career.money -= FOUNDING_COST;
          // Most of the founding money is the label's first float.
          cash = Math.round(FOUNDING_COST * 0.6);
        }
        const serial = dateToSerial(state.gameDate);
        const label: PlayerLabel = {
          id: uuidv4(),
          name,
          color: opts.color || LABEL_COLORS[0],
          country: opts.country || state.player.country,
          genreFocus: opts.genreFocus,
          foundedSerial: serial,
          reputation: startingReputation(fame, !!existing),
          cash,
          roster: [],
          alumni: [],
          pitches: [],
          prospects: [],
          prospectsSerial: serial,
          staff: [],
          history: [],
          events: [],
          monthRevenue: 0,
          monthCosts: 0,
          monthKey: monthKeyOf(state.gameDate),
          debtMonths: 0,
          totalInvested: existing ? 0 : FOUNDING_COST,
          totalWithdrawn: 0,
        };
        label.prospects = pickProspects(raw(state.npcs) as NPC[], label, fame, 0, serial);
        state.label = label;
        labelEvent(label, serial, `${name} is open for business.`, 'good');
        state.socialPosts.unshift({
          id: uuidv4(), platform: 'chirp', authorId: 'player', authorName: state.player.artistName,
          content: `Officially launched my own label: ${name}. 🏷️ We're signing. Send the music.`,
          likes: Math.round(60 + fame * 40), shares: Math.round(8 + fame * 6), comments: [],
          timestamp: new Date().toISOString(), isPlayerPost: true, trendingScore: 20 + fame / 3, daySerial: serial,
        });
        state.lastEventLog.unshift(`Founded ${name}`);
        state.lastEventLog = state.lastEventLog.slice(0, 10);
        result = {
          ok: true,
          message: existing
            ? `${name} is live. Your record-label business became the company, with ${money(cash)} in the bank.`
            : `${name} is live with ${money(cash)} in the bank. Time to find some artists.`,
        };
      });
      return result;
    },

    labelDeposit: (amount) => {
      let result: FeatureActionResult = { ok: false, message: 'No label.' };
      set((state) => {
        const label = state.label;
        if (!label || !state.player) return;
        const amt = Math.floor(amount);
        if (amt <= 0) { result.message = 'Enter an amount.'; return; }
        if (state.player.career.money < amt) { result.message = `You only have ${money(state.player.career.money)}.`; return; }
        state.player.career.money -= amt;
        label.cash += amt;
        label.totalInvested += amt;
        labelEvent(label, dateToSerial(state.gameDate), `You put ${money(amt)} into the label.`, 'neutral');
        result = { ok: true, message: `${money(amt)} moved into ${label.name}.` };
      });
      return result;
    },

    labelWithdraw: (amount) => {
      let result: FeatureActionResult = { ok: false, message: 'No label.' };
      set((state) => {
        const label = state.label;
        if (!label || !state.player) return;
        const amt = Math.floor(amount);
        if (amt <= 0) { result.message = 'Enter an amount.'; return; }
        if (label.cash < amt) { result.message = `The label only has ${money(label.cash)}.`; return; }
        label.cash -= amt;
        label.totalWithdrawn += amt;
        state.player.career.money += amt;
        state.player.career.totalEarnings += amt;
        labelEvent(label, dateToSerial(state.gameDate), `You took a ${money(amt)} dividend.`, 'neutral');
        result = { ok: true, message: `${money(amt)} paid out to you.` };
      });
      return result;
    },

    refreshLabelProspects: () => {
      let result: FeatureActionResult = { ok: false, message: 'No label.' };
      set((state) => {
        const label = state.label;
        if (!label || !state.player) return;
        const serial = dateToSerial(state.gameDate);
        if (serial - label.prospectsSerial < PROSPECT_REFRESH_DAYS) {
          result.message = `The scouting report updates every ${PROSPECT_REFRESH_DAYS} days. Next one in ${PROSPECT_REFRESH_DAYS - (serial - label.prospectsSerial)}.`;
          return;
        }
        label.prospects = pickProspects(raw(state.npcs) as NPC[], label, blendedFame(state.player), staffSkill(label.staff, 'ar'), serial);
        label.prospectsSerial = serial;
        result = { ok: true, message: 'New scouting report in.' };
      });
      return result;
    },

    openLabelPitch: (npcId, dealType) => {
      let result: FeatureActionResult = { ok: false, message: 'Could not reach them.' };
      set((state) => {
        const label = state.label;
        if (!label || !state.player) return;
        const live = labelSigneeIds(label);
        if (live.size >= rosterLimit(label.reputation)) {
          result.message = `${label.name} can carry ${rosterLimit(label.reputation)} artists at this reputation. Grow the name or let someone go.`;
          return;
        }
        if (label.pitches.some((p) => p.npcId === npcId && p.status === 'open')) { result.message = 'You are already talking to them.'; return; }
        const npc = state.npcs.find((n) => n.id === npcId);
        if (!npc || !isSignable(npc as NPC, live)) { result.message = 'They are not available to sign.'; return; }
        const fame = blendedFame(state.player);
        const cap = fameCap(label.reputation, fame);
        if (npc.fame > cap) {
          result.message = `${npc.name}'s camp will not take the meeting. ${label.name} is not big enough for them yet.`;
          return;
        }
        const serial = dateToSerial(state.gameDate);
        const competing = npc.fame >= 25 && unit(`comp|${npcId}|${Math.floor(serial / 14)}`) < 0.3;
        const wants = wantsFor(npc as NPC, dealType, { labelRep: label.reputation, playerFame: fame, relationship: npc.relationshipScore, competing });
        const pitch: LabelPitch = {
          id: uuidv4(),
          npcId,
          name: npc.name,
          openedSerial: serial,
          expiresSerial: serial + (competing ? 9 : PITCH_WINDOW_DAYS),
          terms: openingOffer(wants),
          wants,
          patience: patienceFor(npc as NPC),
          rounds: 0,
          status: 'open',
          competing: competing ? RIVAL_LABELS[hashString(`pc|${npcId}`) % RIVAL_LABELS.length] : undefined,
        };
        label.pitches.unshift(pitch);
        labelEvent(label, serial, `Opened talks with ${npc.name}.`, 'neutral');
        result = { ok: true, message: competing ? `Talks open — but ${pitch.competing} is also chasing ${npc.name}. Move fast.` : `Talks open with ${npc.name}.` };
      });
      return result;
    },

    labelPitchContext: (pitchId) => {
      const state = get();
      const label = state.label;
      if (!label || !state.player) return null;
      const pitch = label.pitches.find((p) => p.id === pitchId);
      if (!pitch) return null;
      const npc = state.npcs.find((n) => n.id === pitch.npcId);
      if (!npc) return null;
      const legal = labelLegalSkill(state);
      const serial = dateToSerial(state.gameDate);
      return {
        mood: moodOf(npc.id, serial),
        legalSkill: legal,
        lawyerNotes: lawyerRead(pitch.wants, legal),
        npc,
        potentialEstimate: potentialEstimate(potentialOf(npc), staffSkill(label.staff, 'ar'), npc.id),
        cap: fameCap(label.reputation, blendedFame(state.player)),
      };
    },

    counterLabelPitch: (pitchId, terms) => {
      let out: { outcome: 'accepted' | 'countered' | 'refused' | 'walked' | 'error'; message: string } = { outcome: 'error', message: 'Those talks are over.' };
      set((state) => {
        const label = state.label;
        if (!label || !state.player) return;
        const pitch = label.pitches.find((p) => p.id === pitchId);
        if (!pitch || pitch.status !== 'open') return;
        const npc = state.npcs.find((n) => n.id === pitch.npcId);
        if (!npc) return;
        const serial = dateToSerial(state.gameDate);
        const r = negotiateLabel(
          npc as NPC,
          pitch,
          terms,
          {
            labelRep: label.reputation,
            playerFame: blendedFame(state.player),
            relationship: npc.relationshipScore,
            moodShift: MOOD_INFO[moodOf(npc.id, serial)].shift,
            legalSkill: labelLegalSkill(state),
          },
          Math.random(),
        );
        pitch.rounds += 1;
        pitch.patience = r.patience;
        pitch.lastReply = r.message;
        if (r.outcome === 'walked') {
          pitch.status = 'walked';
          npc.relationshipScore = Math.max(-100, npc.relationshipScore - 3);
          labelEvent(label, serial, `${pitch.name} walked away from the table.`, 'bad');
          if (pitch.renewal) {
            const s = label.roster.find((x) => x.npcId === pitch.npcId);
            if (s) retireSignee(state, label, s, 'left');
          }
        } else if (r.outcome === 'countered') {
          // Their counter is an offer they would sign as it stands.
          pitch.terms = r.terms;
          pitch.agreedTerms = { ...r.terms };
        } else if (r.outcome === 'accepted') {
          // They said yes to exactly this — it stays on the table to sign.
          pitch.terms = { ...terms };
          pitch.agreedTerms = { ...terms };
        } else {
          pitch.agreedTerms = undefined;
        }
        out = { outcome: r.outcome, message: r.message };
      });
      return out;
    },

    signLabelPitch: (pitchId) => {
      let result: FeatureActionResult = { ok: false, message: 'Those talks are over.' };
      set((state) => {
        const label = state.label;
        if (!label || !state.player) return;
        const pitch = label.pitches.find((p) => p.id === pitchId);
        if (!pitch || pitch.status !== 'open') return;
        const npc = state.npcs.find((n) => n.id === pitch.npcId);
        if (!npc) return;
        // Signing at the terms on the table only works if those are terms they
        // have actually agreed to — their own counter, or an offer they accepted.
        const agreed = pitch.agreedTerms && JSON.stringify(pitch.agreedTerms) === JSON.stringify(pitch.terms);
        const { score } = scoreOffer(npc as NPC, pitch.terms, pitch.wants);
        if (!agreed && score < 1) {
          result.message = 'They have not agreed to these terms. Send them as an offer first.';
          return;
        }
        if (label.cash < pitch.terms.advance) {
          result.message = `The advance is ${money(pitch.terms.advance)} and the label has ${money(label.cash)}. Put money in first.`;
          return;
        }
        const serial = dateToSerial(state.gameDate);
        labelSpend(label, pitch.terms.advance);
        pitch.status = 'signed';

        const existing = label.roster.find((s) => s.npcId === pitch.npcId);
        if (pitch.renewal && existing) {
          existing.terms = { ...pitch.terms };
          existing.status = 'active';
          existing.signedSerial = serial;
          existing.endsSerial = serial + pitch.terms.termMonths * 30;
          existing.releasesDelivered = 0;
          existing.recoupBalance += pitch.terms.advance;
          existing.fameAtSigning = existing.fame;
          existing.mood = Math.min(100, existing.mood + 15);
          existing.loyalty = Math.min(100, existing.loyalty + 10);
          existing.notes.unshift(`Re-signed: ${DEAL_INFO[pitch.terms.dealType].label}, ${pitch.terms.royalty}% royalty.`);
          labelEvent(label, serial, `${pitch.name} re-signed with ${label.name}.`, 'good');
          result = { ok: true, message: `${pitch.name} re-signed.` };
          return;
        }

        const signee: LabelSignee = {
          npcId: npc.id,
          name: npc.name,
          genre: (npc.genre ?? 'hip_hop') as LabelSignee['genre'],
          country: npc.country,
          tier: npc.tier,
          signedSerial: serial,
          endsSerial: serial + pitch.terms.termMonths * 30,
          terms: { ...pitch.terms },
          fameAtSigning: npc.fame,
          fame: npc.fame,
          potential: potentialOf(npc as NPC),
          recoupBalance: pitch.terms.advance * recoupShare(pitch.terms.dealType, 'advance'),
          mood: 70,
          loyalty: Math.round(Math.max(20, Math.min(80, 40 + npc.relationshipScore / 3))),
          releases: [],
          releasesDelivered: 0,
          status: 'active',
          grossEarned: 0,
          labelEarned: 0,
          artistPaid: 0,
          monthGross: 0,
          notes: [`Signed: ${DEAL_INFO[pitch.terms.dealType].label}, ${pitch.terms.royalty}% royalty, ${money(pitch.terms.advance)} advance.`],
        };
        label.roster.push(signee);
        npc.team = { ...(npc.team ?? {}), label: label.name };
        npc.relationshipScore = Math.min(100, npc.relationshipScore + 8);
        label.prospects = label.prospects.filter((p) => p.npcId !== npc.id);
        label.reputation = Math.min(100, label.reputation + (npc.fame >= 40 ? 3 : 1));
        labelEvent(label, serial, `Signed ${npc.name}. ${money(pitch.terms.advance)} advance.`, 'good');
        state.socialPosts.unshift({
          id: uuidv4(), platform: 'chirp', authorId: 'player', authorName: state.player.artistName,
          content: `Welcome ${npc.name} to ${label.name}. 🏷️ The family just got bigger.`,
          likes: Math.round(50 + npc.fame * 35 + blendedFame(state.player) * 20), shares: Math.round(6 + npc.fame * 5), comments: [],
          timestamp: new Date().toISOString(), isPlayerPost: true, trendingScore: 15 + npc.fame / 2, daySerial: serial,
        });
        pushNotification(state, {
          kind: 'business',
          title: `${npc.name} signed to ${label.name}`,
          body: `${DEAL_INFO[pitch.terms.dealType].label} · ${pitch.terms.royalty}% royalty · ${pitch.terms.releasesOwed} releases.`,
          artSeed: `artist|${npc.id}`,
          action: { type: 'artist', id: npc.id },
        });
        result = { ok: true, message: `${npc.name} is signed to ${label.name}.` };
      });
      return result;
    },

    withdrawLabelPitch: (pitchId) =>
      set((state) => {
        const label = state.label;
        if (!label) return;
        const pitch = label.pitches.find((p) => p.id === pitchId);
        if (!pitch || pitch.status !== 'open') return;
        pitch.status = 'withdrawn';
        if (pitch.renewal) {
          const s = label.roster.find((x) => x.npcId === pitch.npcId);
          if (s) retireSignee(state, label, s, 'left');
        }
      }),

    fundLabelRelease: (npcId, tier) => {
      let result: FeatureActionResult = { ok: false, message: 'Not on the roster.' };
      set((state) => {
        const label = state.label;
        if (!label) return;
        const s = label.roster.find((x) => x.npcId === npcId);
        if (!s) return;
        if (s.status === 'dispute') { result.message = `${s.name} is refusing to record until the dispute is settled.`; return; }
        if (s.status !== 'active' && s.status !== 'expiring') { result.message = `${s.name} is not under contract.`; return; }
        if (s.terms.dealType === 'distribution') { result.message = `${s.name} funds their own records on a distribution deal. They hand you finished masters.`; return; }
        if (s.inStudio) { result.message = `${s.name} is already in the studio.`; return; }
        // Without new music handed in, a record can still be rushed — but not
        // on top of the last one. A release needs room to breathe.
        const sinceLast = dateToSerial(state.gameDate) - (s.lastReleaseSerial ?? -999);
        if (s.requestSerial === undefined && sinceLast < 30) {
          result.message = `${s.name}'s last record came out ${sinceLast} day${sinceLast === 1 ? '' : 's'} ago. Give it at least a month.`;
          return;
        }
        if (label.cash < 0) { result.message = 'The label is overdrawn. Put money in first.'; return; }
        const t = RELEASE_TIERS[tier];
        const marketing = Math.max(t.marketing, s.terms.marketingCommit);
        const cost = t.cost + marketing;
        if (label.cash < cost) { result.message = `That costs ${money(cost)} (recording ${money(t.cost)} + marketing ${money(marketing)}). The label has ${money(label.cash)}.`; return; }
        const serial = dateToSerial(state.gameDate);
        labelSpend(label, cost);
        s.recoupBalance += t.cost * recoupShare(s.terms.dealType, 'recording') + marketing * recoupShare(s.terms.dealType, 'marketing');
        const quality = releaseQuality(s.fame, tier, staffSkill(label.staff, 'ar'), Math.random());
        s.inStudio = { until: serial + t.days, tier, cost, quality, marketing };
        s.requestSerial = undefined;
        s.mood = Math.min(100, s.mood + (tier === 'major' ? 5 : tier === 'standard' ? 3 : 1));
        labelEvent(label, serial, `${s.name} is in the studio — ${t.label.toLowerCase()}, out in ${t.days} days.`, 'neutral');
        result = { ok: true, message: `${s.name} is in the studio. The record lands in ${t.days} days.` };
      });
      return result;
    },

    promoteLabelSong: (songId, amount) => {
      let result: FeatureActionResult = { ok: false, message: 'Not a label record.' };
      set((state) => {
        const label = state.label;
        if (!label) return;
        const s = [...label.roster, ...label.alumni].find((x) => x.releases.includes(songId));
        const song = state.npcSongs.find((x) => x.id === songId);
        if (!s || !song) return;
        const amt = Math.floor(amount);
        if (amt <= 0) { result.message = 'Enter an amount.'; return; }
        if (label.cash < amt) { result.message = `The label only has ${money(label.cash)}.`; return; }
        labelSpend(label, amt);
        if (labelSigneeIds(label).has(s.npcId)) s.recoupBalance += amt * recoupShare(s.terms.dealType, 'marketing');
        song.marketingBudget = (song.marketingBudget ?? 0) + Math.round(amt * marketingEfficiency(staffSkill(label.staff, 'marketing')));
        s.mood = Math.min(100, s.mood + 2);
        labelEvent(label, dateToSerial(state.gameDate), `Pushed ${money(amt)} behind "${song.title}".`, 'neutral');
        result = { ok: true, message: `${money(amt)} campaign behind "${song.title}".` };
      });
      return result;
    },

    answerLabelDemand: (npcId, answer) => {
      let result: FeatureActionResult = { ok: false, message: 'No open demand.' };
      set((state) => {
        const label = state.label;
        if (!label) return;
        const s = label.roster.find((x) => x.npcId === npcId);
        if (!s?.demand) return;
        const serial = dateToSerial(state.gameDate);
        const d = s.demand;
        if (answer === 'raise' && d.royalty) {
          s.notes.unshift(`Royalty raised ${s.terms.royalty}% → ${d.royalty}%.`);
          s.terms.royalty = d.royalty;
          s.mood = Math.min(100, s.mood + 18);
          s.loyalty = Math.min(100, s.loyalty + 10);
          labelEvent(label, serial, `Gave ${s.name} the raise.`, 'good');
          result = { ok: true, message: `${s.name} is happy. Royalty now ${d.royalty}%.` };
        } else if (answer === 'bonus' && d.bonus) {
          if (label.cash < d.bonus) { result.message = `The bonus is ${money(d.bonus)}; the label has ${money(label.cash)}.`; return; }
          labelSpend(label, d.bonus);
          s.mood = Math.min(100, s.mood + 12);
          s.loyalty = Math.min(100, s.loyalty + 4);
          labelEvent(label, serial, `Paid ${s.name} a ${money(d.bonus)} bonus.`, 'good');
          result = { ok: true, message: `${s.name} took the bonus. For now.` };
        } else {
          s.mood = Math.max(0, s.mood - 15);
          s.loyalty = Math.max(0, s.loyalty - 10);
          labelEvent(label, serial, `Told ${s.name} no.`, 'bad');
          result = { ok: true, message: `${s.name}'s camp did not take it well.` };
          if (s.mood < 25) {
            s.status = 'dispute';
            labelMail(state, `⚠️ ${s.name} is in dispute`, `${s.name} says they are done recording for ${label.name} until the deal is fixed.`);
          }
        }
        s.demand = undefined;
      });
      return result;
    },

    answerRivalOffer: (npcId, answer) => {
      let result: FeatureActionResult = { ok: false, message: 'No offer on the table.' };
      set((state) => {
        const label = state.label;
        if (!label) return;
        const s = label.roster.find((x) => x.npcId === npcId);
        if (!s?.rivalOffer) return;
        const serial = dateToSerial(state.gameDate);
        const offer = s.rivalOffer;
        if (answer === 'match') {
          s.notes.unshift(`Matched ${offer.labelName}: royalty ${s.terms.royalty}% → ${offer.royalty}%.`);
          s.terms.royalty = offer.royalty;
          s.mood = Math.min(100, s.mood + 12);
          s.loyalty = Math.min(100, s.loyalty + 15);
          s.rivalOffer = undefined;
          labelEvent(label, serial, `Matched ${offer.labelName} to keep ${s.name}.`, 'good');
          result = { ok: true, message: `${s.name} stays, on ${offer.royalty}%.` };
        } else if (answer === 'sell') {
          labelEarn(label, offer.buyout);
          s.labelEarned += offer.buyout;
          retireSignee(state, label, s, 'sold');
          labelEvent(label, serial, `Sold ${s.name}'s contract to ${offer.labelName} for ${money(offer.buyout)}.`, 'neutral');
          labelMail(state, `🤝 ${s.name} → ${offer.labelName}`, `${offer.labelName} paid ${money(offer.buyout)} to take over ${s.name}'s contract. The records ${label.name} already released stay in your catalogue.`);
          result = { ok: true, message: `Contract sold for ${money(offer.buyout)}.` };
        } else {
          s.rivalOffer = undefined;
          if (s.loyalty >= 70) {
            s.mood = Math.max(0, s.mood - 3);
            result = { ok: true, message: `${s.name} understands. They were staying anyway.` };
          } else {
            s.mood = Math.max(0, s.mood - 18);
            s.loyalty = Math.max(0, s.loyalty - 8);
            result = { ok: true, message: `You kept ${s.name}. They are not happy about it.` };
            if (s.mood < 25) s.status = 'dispute';
          }
          labelEvent(label, serial, `Refused to release ${s.name} to ${offer.labelName}.`, s.loyalty >= 70 ? 'neutral' : 'bad');
        }
      });
      return result;
    },

    settleLabelDispute: (npcId) => {
      let result: FeatureActionResult = { ok: false, message: 'No dispute.' };
      set((state) => {
        const label = state.label;
        if (!label) return;
        const s = label.roster.find((x) => x.npcId === npcId);
        if (!s || s.status !== 'dispute') return;
        const cost = settlementCost(s, labelLegalSkill(state));
        if (label.cash < cost) { result.message = `Settling costs ${money(cost)}; the label has ${money(label.cash)}.`; return; }
        labelSpend(label, cost);
        s.status = 'active';
        s.mood = 50;
        s.loyalty = Math.max(0, s.loyalty - 5);
        s.demand = undefined;
        labelEvent(label, dateToSerial(state.gameDate), `Settled with ${s.name} for ${money(cost)}.`, 'neutral');
        result = { ok: true, message: `Settled for ${money(cost)}. ${s.name} is back in the studio.` };
      });
      return result;
    },

    dropLabelArtist: (npcId) => {
      let result: FeatureActionResult = { ok: false, message: 'Not on the roster.' };
      set((state) => {
        const label = state.label;
        if (!label) return;
        const s = label.roster.find((x) => x.npcId === npcId);
        if (!s) return;
        const serial = dateToSerial(state.gameDate);
        const optics = dropOptics(s);
        label.reputation = Math.max(0, label.reputation + optics);
        const npc = state.npcs.find((n) => n.id === npcId);
        if (npc) npc.relationshipScore = Math.max(-100, npc.relationshipScore - 12);
        if (s.inStudio) labelEvent(label, serial, `The unfinished ${s.name} record is shelved for good.`, 'bad');
        retireSignee(state, label, s, 'dropped');
        label.pitches = label.pitches.map((p) => (p.npcId === npcId && p.status === 'open' ? { ...p, status: 'withdrawn' } : p));
        labelEvent(label, serial, `Dropped ${s.name}.${optics < 0 ? ' People noticed.' : ''}`, 'bad');
        result = { ok: true, message: `${s.name} is off the label.${s.recoupBalance > 0 ? ` ${money(s.recoupBalance)} unrecouped is written off.` : ''}` };
      });
      return result;
    },

    labelStaffCandidates: (role) => {
      const state = get();
      const label = state.label;
      if (!label) return [];
      const from = STAFF_INFO[role].from;
      const taken = new Set(label.staff.map((s) => s.npcId));
      const out: { npcId: string; name: string; skill: number; salary: number; country: string }[] = [];
      for (const n of state.npcs) {
        if (!from.includes(n.role) || taken.has(n.id)) continue;
        const skill = npcSkill(n);
        out.push({ npcId: n.id, name: n.name, skill, salary: staffSalary(skill), country: n.country });
      }
      // Home country first, then the best; a short list, like a recruiter's.
      out.sort((a, b) => (Number(b.country === label.country) - Number(a.country === label.country)) || b.skill - a.skill);
      const home = out.filter((c) => c.country === label.country).slice(0, 4);
      const abroad = out.filter((c) => c.country !== label.country).slice(0, 2);
      return [...home, ...abroad];
    },

    hireLabelStaff: (role, npcId) => {
      let result: FeatureActionResult = { ok: false, message: 'Could not hire.' };
      set((state) => {
        const label = state.label;
        if (!label) return;
        if (label.staff.some((s) => s.role === role)) { result.message = `You already have a ${STAFF_INFO[role].title}. Let them go first.`; return; }
        const npc = state.npcs.find((n) => n.id === npcId);
        if (!npc || !STAFF_INFO[role].from.includes(npc.role)) return;
        const skill = npcSkill(npc as NPC);
        const salary = staffSalary(skill);
        if (label.cash < salary) { result.message = `The first month's salary is ${money(salary)}. The label has ${money(label.cash)}.`; return; }
        const serial = dateToSerial(state.gameDate);
        label.staff.push({ role, npcId, name: npc.name, skill, salary, hiredSerial: serial });
        labelEvent(label, serial, `Hired ${npc.name} as ${STAFF_INFO[role].title} (${money(salary)}/month).`, 'good');
        if (role === 'ar') label.prospectsSerial = -999; // a new A&R brings a fresh report next tick
        result = { ok: true, message: `${npc.name} joins as ${STAFF_INFO[role].title}.` };
      });
      return result;
    },

    fireLabelStaff: (role) =>
      set((state) => {
        const label = state.label;
        if (!label) return;
        const s = label.staff.find((x) => x.role === role);
        if (!s) return;
        label.staff = label.staff.filter((x) => x.role !== role);
        labelEvent(label, dateToSerial(state.gameDate), `${s.name} left the ${STAFF_INFO[role].title} job.`, 'neutral');
      }),

    // ─── LUXURY ─────────────────────────────────────────────────────────
    buyLuxuryItem: (itemId) =>
      set((state) => {
        if (!state.player) return;
        const item = LUXURY_CATALOG.find(i => i.id === itemId);
        if (!item) return;
        if (state.player.career.money < item.cost) return;
        if (state.ownedAssets.find(a => a.id === itemId)) return;

        state.player.career.money -= item.cost;
        state.ownedAssets.push({ ...item, purchaseDate: formatGameDate(state.gameDate) });

        if (item.disciplineBonus) {
          state.player.stats.discipline = Math.min(100, state.player.stats.discipline + item.disciplineBonus);
        }

        const post: SocialPost = {
          id: uuidv4(),
          platform: 'snapgram',
          authorId: 'player',
          authorName: state.player.artistName,
          content: `Just picked up the ${item.name} 🤑 Hard work pays off. ${item.category === 'car' ? '🏎️' : item.category === 'home' ? '🏠' : item.category === 'jewelry' ? '💎' : '✨'}`,
          likes: Math.floor(state.player.career.fanbase * 0.05) + 100,
          shares: Math.floor(Math.random() * 50),
          comments: [],
          timestamp: new Date().toISOString(),
          isPlayerPost: true,
          trendingScore: 30,
        };
        state.socialPosts.unshift(post);
      }),

    // ─── MAILBOX ────────────────────────────────────────────────────────
    readMail: (mailId) =>
      set((state) => {
        const mail = state.mailbox.find(m => m.id === mailId);
        if (mail) mail.read = true;
      }),

    acceptOffer: (mailId, kind) => {
      const before = get();
      if (!before.player) return { ok: false, message: 'There is nobody to sign anything.' };

      const mail = before.mailbox.find((m) => m.id === mailId);
      if (!mail || !mail.offerData) {
        return { ok: false, message: 'That offer is no longer on the table.' };
      }

      const offer = mail.offerData as ActiveContract['terms'];

      // ── Management is exclusive ────────────────────────────────────────
      // One manager at a time is the whole point of the deal. A manager with
      // no exclusivity cannot promise anybody anything, and the player cannot
      // tell which of two people is doing the work. Taking a new one means
      // firing the old one first — that is what the Team screen is for.
      if (offer.type === 'management') {
        const current = before.contracts.find((c) => c.type === 'management' && c.active);
        if (current) {
          return {
            ok: false,
            message: `${current.npcName} already manages you. Fire them first — nobody works a roster they are not on.`,
          };
        }
      }

      // ── Which structure did the player choose? ─────────────────────────
      const feeKind: ManagementFeeKind =
        kind ?? offer.feeKind ?? (offer.monthlyFee && !offer.percentage ? 'retainer' : 'commission');

      const terms: ActiveContract['terms'] = { ...offer };
      if (offer.type === 'management') {
        terms.feeKind = feeKind;
        if (feeKind === 'retainer') {
          terms.percentage = 0;
          terms.monthlyFee = offer.monthlyFee ?? 0;
        } else {
          terms.monthlyFee = 0;
          terms.percentage = offer.percentage;
        }
      }

      set((state) => {
        if (!state.player) return;

        const m = state.mailbox.find((x) => x.id === mailId);
        if (m) m.read = true;

        if (mail.type === 'contract' || mail.type === 'offer') {
          const newContract: ActiveContract = {
            id: uuidv4(),
            type: terms.type,
            npcId: mail.from,
            npcName: mail.fromName,
            terms,
            signedAt: formatGameDate(state.gameDate),
            expiresAt: `${state.gameDate.year + (terms.lengthYears ?? 2)}`,
            active: true,
          };
          state.contracts.push(newContract);

          if (terms.advance && terms.advance > 0) {
            state.player.career.money += terms.advance;
          }

          const npc = state.npcs.find((n) => n.id === mail.from);
          if (npc) npc.relationshipScore = Math.min(100, npc.relationshipScore + 10);

          // The offer has been answered — it stops being a pending decision.
          state.mailbox = state.mailbox.filter((x) => x.id !== mailId);
        }
      });

      if (terms.type === 'management') {
        return {
          ok: true,
          message:
            feeKind === 'retainer'
              ? `${mail.fromName} is your manager — $${(terms.monthlyFee ?? 0).toLocaleString()} a month, nothing off your income.`
              : `${mail.fromName} is your manager — ${terms.percentage}% of gross for ${terms.lengthYears ?? 2} years.`,
        };
      }
      return { ok: true, message: `Signed with ${mail.fromName}.` };
    },

    declineOffer: (mailId) =>
      set((state) => {
        const mail = state.mailbox.find(m => m.id === mailId);
        if (!mail) return;
        mail.read = true;
        // Dropping an offer can cost a little goodwill with the sender.
        const npc = state.npcs.find(n => n.id === mail.from);
        if (npc) npc.relationshipScore = Math.max(-100, npc.relationshipScore - 5);
        state.mailbox = state.mailbox.filter(m => m.id !== mailId);
      }),

    /**
     * Push back on the terms.
     *
     * Deliberately a trade rather than a discount. Each round the other side
     * moves on the number the player cares about and takes something back on a
     * different axis — the commission comes down but the term goes up, or the
     * retainer comes down but the minimum months go up. A relationship makes
     * the trade better; pushing a hostile counterparty just ends the call.
     */
    negotiateOffer: (mailId) => {
      const before = get();
      if (!before.player) return { ok: false, message: 'There is nobody to negotiate.' };

      const mail = before.mailbox.find((m) => m.id === mailId);
      if (!mail || !mail.offerData) return { ok: false, message: 'That offer is gone.' };

      const offer = mail.offerData as ActiveContract['terms'];
      const rounds = mail.negotiationRounds ?? 0;
      const npc = before.npcs.find((n) => n.id === mail.from);
      const warmth = npc?.relationshipScore ?? 0;

      if (rounds >= 3) {
        return {
          ok: false,
          message: `${mail.fromName} has already moved twice. The number on the table is the number. Sign it or leave it.`,
        };
      }

      // A cold counterparty does not want to be haggled with.
      if (rounds === 0 && warmth < -20) {
        return {
          ok: false,
          message: `${mail.fromName} is not in the mood to be negotiated with. Fix the relationship before you start asking for better terms.`,
        };
      }

      const leverage = Math.max(0, Math.min(1, (warmth + 40) / 120)); // 0 … 1
      // The first round is generous, later ones less so. That is the whole
      // reason not to spam the button.
      const give = 1 - rounds * 0.28;

      const newTerms: ActiveContract['terms'] = { ...offer };
      let change = '';

      if (offer.type === 'management') {
        const pctCut = Math.max(1, Math.round((1 + leverage * 3) * give));
        const newPct = Math.max(5, (offer.percentage ?? 15) - pctCut);
        const feeCut = Math.round((((offer.monthlyFee ?? 1000) * (0.06 + leverage * 0.12)) * give) / 50) * 50;
        const newFee = Math.max(150, (offer.monthlyFee ?? 1000) - feeCut);

        newTerms.percentage = newPct;
        newTerms.monthlyFee = newFee;
        newTerms.lengthYears = Math.min(5, (offer.lengthYears ?? 2) + (rounds === 0 ? 0 : 1));
        newTerms.minMonths = (offer.minMonths ?? 12) + (rounds === 0 ? 0 : 6);

        change =
          `${newPct}% of gross, or $${newFee.toLocaleString()} a month` +
          (rounds === 0 ? '' : ` — and the term is now ${newTerms.lengthYears} years.`);
      } else if (offer.type === 'label') {
        const adv = Math.round((offer.advance * (0.08 + leverage * 0.17) * give) / 500) * 500;
        const roy = Math.min(30, (offer.royaltyRate ?? 15) + Math.max(1, Math.round(1 + leverage * 2)));
        newTerms.advance = offer.advance + adv;
        newTerms.royaltyRate = roy;
        newTerms.percentage = 100 - roy;
        newTerms.albumRequirements = (offer.albumRequirements ?? 1) + (rounds === 0 ? 0 : 1);
        change = `$${newTerms.advance.toLocaleString()} advance and ${roy}% royalty`;
      } else {
        return { ok: false, message: 'There is nothing to negotiate on that one.' };
      }

      set((state) => {
        const m = state.mailbox.find((x) => x.id === mailId);
        if (!m || !m.offerData) return;
        m.offerData = newTerms;
        m.negotiationRounds = rounds + 1;
        m.renegotiated = true;
        m.body =
          `You came back to me. Fine — I have moved.\n\n` +
          `New terms: ${change}\n\n` +
          (rounds === 0
            ? `This is a real concession. I do not do this often.`
            : `That is as far as I go. The rest is up to you.`) +
          `\n\n— ${mail.fromName}`;
        const n = state.npcs.find((x) => x.id === mail.from);
        // Haggling wears on people, however well it goes.
        if (n) n.relationshipScore = Math.max(-100, n.relationshipScore - 2);
      });

      return { ok: true, message: `${mail.fromName} came back with ${change}` };
    },

    // ─── THE TEAM ────────────────────────────────────────────────────────
    hireCrew: (npcId) => {
      const state = get();
      if (!state.player) return { ok: false, message: 'There is nobody to hire for.' };

      const npc = state.npcs.find((n) => n.id === npcId);
      if (!npc) return { ok: false, message: 'That person is not in your world.' };

      const check = hireCheck(npc, state.crew ?? [], state.player.career.money);
      if (!check.ok) return check;

      const wage = crewWage(npc, npc.role);
      const upfront = hireUpfrontCost(npc, npc.role);
      const skill = npcSkill(npc);
      const serial = dateToSerial(state.gameDate);
      // Their characteristics, frozen onto the record. Deterministic from the
      // id, so this is a cache the tick can fold without the whole roster.
      const traits = traitsFor(npc);

      set((s) => {
        if (!s.player) return;
        s.player.career.money -= upfront;
        const member: CrewMember = {
          id: uuidv4(),
          npcId: npc.id,
          npcName: npc.name,
          role: npc.role,
          monthlyWage: wage,
          hiredAt: formatGameDate(s.gameDate),
          hiredSerial: serial,
          skill,
          visible: traits.visible,
          hidden: traits.hidden,
          // Tenure and morale both start neutral. `chemistryOf` reads the first
          // and `moraleFactor` the second, and neither means anything on day
          // one — a writer you met this morning does not know your voice yet.
          monthsServed: 0,
          morale: 70,
        };
        s.crew.push(member);
        const n = s.npcs.find((x) => x.id === npc.id);
        if (n) {
          n.relationshipScore = Math.min(100, n.relationshipScore + 6);
          n.memoryLog = [...n.memoryLog.slice(-9), `Hired onto the payroll as ${roleSpec(npc.role).title.toLowerCase()} (${formatGameDate(s.gameDate)}).`];
        }
        s.lastEventLog.unshift(`🤝 ${npc.name} joined the team as your ${roleSpec(npc.role).title.toLowerCase()}.`);
        s.lastEventLog = s.lastEventLog.slice(0, 10);
      });

      return {
        ok: true,
        message: `${npc.name} is on the payroll at $${wage.toLocaleString()} a month. Two months up front came to $${upfront.toLocaleString()}.`,
      };
    },

    fireCrew: (crewId) => {
      const state = get();
      const member = (state.crew ?? []).find((c) => c.id === crewId);
      if (!member) return { ok: false, message: 'They are not on your payroll.' };
      if (!state.player) return { ok: false, message: 'There is nobody to fire anyone.' };

      const severance = severanceFor(member);

      set((s) => {
        if (!s.player) return;
        s.player.career.money -= severance;
        s.crew = s.crew.filter((c) => c.id !== crewId);
        const n = s.npcs.find((x) => x.id === member.npcId);
        if (n) {
          n.relationshipScore = Math.max(-100, n.relationshipScore - 18);
          n.memoryLog = [...n.memoryLog.slice(-9), `Let go from the payroll (${formatGameDate(s.gameDate)}).`];
        }
        s.lastEventLog.unshift(`👋 ${member.npcName} is off the payroll. Severance: $${severance.toLocaleString()}.`);
        s.lastEventLog = s.lastEventLog.slice(0, 10);
      });

      return {
        ok: true,
        message: `${member.npcName} is off the payroll. One month's severance — $${severance.toLocaleString()} — and they are not happy about it.`,
      };
    },

    fireManager: () => {
      const state = get();
      const contract = state.contracts.find((c) => c.type === 'management' && c.active);
      if (!contract) return { ok: false, message: 'Nobody manages you right now.' };
      if (!state.player) return { ok: false, message: 'There is nobody to fire anyone.' };

      const months = Math.max(
        1,
        Math.round(
          (dateToSerial(state.gameDate) -
            dateToSerial(parseGameDate(contract.signedAt) ?? state.gameDate)) /
            30,
        ),
      );
      const minMonths = contract.terms.minMonths ?? 0;
      // Walking before the minimum term is a real cost, and the game says so
      // rather than quietly letting it slide.
      const penalty =
        months < minMonths
          ? Math.round(state.player.career.totalEarnings * 0.02 / 100) * 100
          : 0;

      set((s) => {
        if (!s.player) return;
        s.player.career.money -= penalty;
        const c = s.contracts.find((x) => x.id === contract.id);
        if (c) c.active = false;
        const n = s.npcs.find((x) => x.id === contract.npcId);
        if (n) {
          n.relationshipScore = Math.max(-100, n.relationshipScore - 30);
          n.memoryLog = [...n.memoryLog.slice(-9), `Fired as manager after ${months} month${months === 1 ? '' : 's'} (${formatGameDate(s.gameDate)}).`];
        }
        s.lastEventLog.unshift(`📤 You let ${contract.npcName} go as your manager.`);
        s.lastEventLog = s.lastEventLog.slice(0, 10);
      });

      return {
        ok: true,
        message:
          penalty > 0
            ? `${contract.npcName} is out. You were inside the ${minMonths}-month minimum, so the buy-out cost $${penalty.toLocaleString()}.`
            : `${contract.npcName} is out. You are representing yourself again — which means the phone only rings when you make it ring.`,
      };
    },

    // ─── INTERVIEWS ─────────────────────────────────────────────────────
    startInterview: (stationId) =>
      set((state) => {
        const interview: Interview = {
          id: uuidv4(),
          stationId,
          date: formatGameDate(state.gameDate),
          qa: [],
          headline: '',
          completed: false,
          fameGained: 0,
          reputationChange: 0,
        };
        state.interviews.push(interview);
      }),

    answerQuestion: (interviewId, questionIdx, tone) =>
      set((state) => {
        const interview = state.interviews.find(i => i.id === interviewId);
        if (!interview || interview.qa[questionIdx]) return;

        // Tone effects (rule-based)
        const toneEffects: Record<InterviewTone, { fame: number; rep: number; street: number }> = {
          diplomatic: { fame: 2, rep: 3, street: 0 },
          dismissive: { fame: -1, rep: -2, street: 2 },
          aggressive: { fame: 3, rep: -3, street: 5 },
          humorous: { fame: 4, rep: 1, street: 1 },
          honest: { fame: 2, rep: 2, street: 1 },
        };

        const effect = toneEffects[tone];
        interview.fameGained += effect.fame;
        interview.reputationChange += effect.rep;
      }),

    completeInterview: (interviewId) =>
      set((state) => {
        if (!state.player) return;
        const interview = state.interviews.find(i => i.id === interviewId);
        if (!interview || interview.completed) return;
        // Sitting for an interview is a press day.
        if (!spendEnergy(state, ENERGY_COSTS.interview, { admin: true })) return;

        interview.completed = true;
        interview.headline = `${state.player.artistName} Opens Up in New Interview`;

        state.player.career.localFame = Math.min(100, state.player.career.localFame + interview.fameGained);
        // A bad interview is the classic thing a publicist is paid to survive.
        // What they cannot do is make a good one land harder.
        state.player.career.reputation = Math.min(
          100,
          state.player.career.reputation + (
            interview.reputationChange < 0
              ? interview.reputationChange * crewBonuses(raw(state.crew) as CrewMember[]).controversyMult
              : interview.reputationChange
          ),
        );
        state.player.stats.charisma = Math.min(100, state.player.stats.charisma + 0.5);
        state.player.stats.networking = Math.min(100, state.player.stats.networking + 0.3);

        // A press day puts your name in front of people who were not looking.
        addMomentum(state, 2);

        // Post headline
        const post: SocialPost = {
          id: uuidv4(),
          platform: 'chirp',
          authorId: 'blog_kojo',
          authorName: 'Kojo Writes',
          content: `📰 JUST OUT: ${interview.headline} Read it here → [link]`,
          likes: Math.floor(Math.random() * 200) + 50,
          shares: Math.floor(Math.random() * 50),
          comments: [],
          timestamp: new Date().toISOString(),
          isPlayerPost: false,
          trendingScore: 40,
        };
        state.socialPosts.unshift(post);

        state.headlines.unshift({
          id: uuidv4(),
          text: interview.headline,
          fullStory: `${state.player.artistName} sat down for a candid interview. ${interview.reputationChange >= 0 ? 'Came across well.' : 'Some comments are raising eyebrows.'}`,
          date: formatGameDate(state.gameDate),
          relatedEntities: [state.player.id],
          priority: 5,
          category: 'general',
        });
      }),

    // ─── TURN ADVANCEMENT ───────────────────────────────────────────────
    advanceTurn: (unit, opts) =>
      set((state) => {
        if (!state.player) return;

        const days = unit === 'day' ? 1 : unit === 'week' ? 7 : 30;
        // Read before anything moves, so the report can state the balance
        // either side of the turn rather than reconstructing it.
        const fromDate = formatGameDate(state.gameDate);
        const moneyBefore = state.player.career.money;
        const energyBefore = state.player.energy;
        // Every money write in this tick is recorded against a name, and the
        // report is drained at the bottom. The ledger is opened here rather
        // than inside a branch so a turn that moves no money still closes it.
        openTurnLedger();
        state.gameDate = advanceDate(state.gameDate, days) as typeof state.gameDate;
        state.turnCount += 1;

        // Plain, non-draft views for the read-heavy parts of the tick. Scanning
        // the roster through the immer proxy costs ~7x more (see `raw()`), and
        // this tick scans it in a dozen places.
        const rawNPCs = raw(state.npcs) as NPC[];
        const rawNPCSongs = raw(state.npcSongs) as Song[];
        const rawSongs = raw(state.songs) as Song[];

        // Who manages the player, resolved once. Two different parts of the tick
        // need it — the fanbase conversion rate and the offer engine — and
        // looking it up twice is how the two halves drift apart.
        const currentManager = activeManager(
          raw(state.contracts) as ActiveContract[],
          rawNPCs,
        );

        // ─── THE CREW ─────────────────────────────────────────────────
        // Folded ONCE, at the top, before anything reads it. Everything the
        // payroll does for the player lands in this one object, so a hire can
        // never be half-applied — and the energy line further down needs it,
        // which is why it moved up here from beside the payroll block.
        const crew = crewBonuses(raw(state.crew) as CrewMember[]);

        // The energy ceiling is DERIVED, not accumulated. A trainer raises it
        // while they are on the payroll and it falls back the moment they
        // leave; adding to `maxEnergy` in place would ratchet it upwards for
        // ever and fire the trainer twice.
        //
        // Rounded, because a fractional ceiling is a number the player will
        // eventually read off a bar and it should be a whole point of energy.
        const ceiling = Math.round(MAX_ENERGY + crew.maxEnergyBonus);
        if (state.player.maxEnergy !== ceiling) {
          state.player.maxEnergy = ceiling;
          state.player.energy = Math.min(state.player.energy, ceiling);
        }

        // ─── STREAMING, DAY BY DAY ────────────────────────────────────────
        // The clock jumps 1, 7 or 30 days in one go, but streams are earned one
        // day at a time. This walks every day the cursor has not seen yet, so a
        // skipped month processes all thirty days and no day is ever counted
        // twice — the cursor only moves forward, to the day just reached.
        const targetSerial = dateToSerial(state.gameDate);
        const fromSerial = (state.streamCursor ?? targetSerial - days) + 1;

        // ── OFF THE DRAFT ─────────────────────────────────────────────
        // Both engines push and shift a day array per platform per song, and
        // per video. Through immer's proxy each of those writes costs an order
        // of magnitude more than a plain array write, and the bill is paid
        // every single game day: measured at ~330ms per day, against ~1ms once
        // the same work runs on plain objects.
        //
        // So the streaming state is copied out, the engines run on the copy,
        // and the result goes back in one write. Nothing outside this block
        // ever sees the plain version.
        const plainStats = clonePlain<Record<string, SongPlatformState>>(
          raw(state.platformStats) ?? {},
        );
        const plainVideos = clonePlain<Video[]>(raw(state.videos) ?? []);

        const streamRun = advanceStreamingDays(
          state,
          fromSerial,
          targetSerial,
          rawNPCs,
          plainStats,
          plainVideos,
        );

        state.platformStats = plainStats;
        state.videos = plainVideos as typeof state.videos;
        state.streamCursor = targetSerial;

        // NOTE: the engine computes the revenue here, but it is NOT banked here.
        // The credit happens once, further down, where the crew's payout
        // multiplier is known — otherwise a distribution deal could never lift
        // the money, and crediting in both places paid every stream twice.
        // `streamRun.revenue` is read-only from this point on.

        // Video views are produced by the same loop. Write them back onto the
        // song records the rest of the game reads, so a record's video views
        // and its video's views are never two different numbers.
        for (const song of state.songs) {
          const views = streamRun.viewsBySong[song.id];
          if (views !== undefined) song.videoViews = (song.videoViews ?? 0) + views;
        }
        for (const song of state.npcSongs) {
          const views = streamRun.viewsBySong[song.id];
          if (views !== undefined) song.videoViews = (song.videoViews ?? 0) + views;
        }
        let totalWeeklyStreams = 0;

        // Update player age
        state.player.age = calculateAge(state.player.dateOfBirth, state.gameDate);

        // ─── ENERGY ──────────────────────────────────────────────────────
        // Letting the clock run is the price of doing anything that costs
        // effort. This is what kills the "tour every day forever" exploit: a
        // tour is 52 of your 100, so a second one needs a night off.
        //
        // Recovery is computed from the time the turn was actually worth, by
        // the same rule a rest uses (three hours is a full night). A day, a
        // week and a month all exceed that and so still leave you fresh — but
        // the rule is now one rule, and a turn shorter than a night would no
        // longer be an unconditional reset.
        //
        // Nothing on the payroll scales this, and that is not an oversight. A
        // turn of a day or more is ALREADY a full refill, so a multiplier here
        // would be applied to a number that is always the ceiling and would do
        // precisely nothing — a mechanic that reads as working and is not. The
        // assistant's energy effect lives in `spendEnergy` and `rest`, which
        // are the two places energy actually moves.
        state.player.energy = elapsedRecovery(days, state.player.energy, state.player.maxEnergy);

        const log: string[] = [];
        /**
         * The tour dates played during this turn, kept apart from `log`.
         *
         * They are earned FIRST (the run settles before the tax and the payroll
         * are worked out) but they are the last thing the player should be able
         * to miss. Pushed into `log` with everything else, a busy month simply
         * cuts them: `log.slice(-10)` keeps the newest ten, and a tour date is
         * the oldest thing in the turn. A night the player played that never
         * appears in the feed is a night they never saw happen.
         */
        const tourLines: string[] = [];

        // ─── TOUR DATES ──────────────────────────────────────────────────
        // A booked run plays itself as the clock reaches each night.
        //
        // Two things here are load-bearing. First, every due leg is settled in
        // date order, and dated to its OWN night — a month-long jump has to
        // play all of them, and a city's fatigue has to be measured against the
        // night it was caused on, not the night the jump happened to land.
        // Second, each leg goes through `applyShowOutcome`, the very same
        // settlement a one-off uses, so a tour can never pay differently from a
        // show on the same night.
        if (state.tours.length) {
          const due: { tour: Tour; leg: TourLeg }[] = [];
          for (const t of state.tours) {
            if (t.status === 'cancelled' || t.status === 'done') continue;
            for (const leg of t.legs) {
              if (leg.playedSerial === undefined && leg.serial <= targetSerial) {
                due.push({ tour: t, leg });
              }
            }
          }
          due.sort((a, b) => a.leg.serial - b.leg.serial);

          for (const { tour, leg } of due) {
            const venue = findVenue(leg.venueId);
            // A room that no longer resolves cannot be played. Mark it so the
            // run still finishes instead of blocking on it for ever.
            if (!venue) {
              leg.playedSerial = leg.serial;
              continue;
            }

            const input = showInputFrom(state, venue, leg.price, leg.serial);
            const roll = 0.82 + Math.random() * 0.36;
            const night = settleShow({ ...input, promo: input.promo * tour.buzz }, roll);

            // Rested: the nights between dates are what pays for a tour, and a
            // turn of a day or more is already a full recovery.
            const quality = performanceScore({
              stagePresence: state.player.stats.stagePresence,
              performance: state.player.stats.performance,
              charisma: state.player.stats.charisma,
              consistency: state.player.stats.consistency,
              stageBonus: crew.stageBonus,
              energyRatio: 1,
              fill: night.fill,
            });

            const settled = applyShowOutcome(state, {
              venue,
              type: leg.type,
              price: leg.price,
              night,
              performanceQuality: quality,
              energy: 0,
              nowSerial: leg.serial,
              controversyMult: crew.controversyMult,
              advanceCalendar: false,
              tourId: tour.id,
              logSink: tourLines,
            });

            leg.playedSerial = leg.serial;
            leg.net = night.net;
            leg.tickets = settled.attendance;

            // You are where the last date was. A tour moves the artist, which
            // is the whole reason the nights either side of it are spoken for.
            state.player.city = leg.city;
            state.player.country = leg.country;
          }

          for (const t of state.tours) {
            if (t.status === 'cancelled') continue;
            const played = t.legs.filter((l) => l.playedSerial !== undefined).length;
            if (played === 0) t.status = 'booked';
            else if (played < t.legs.length) t.status = 'running';
            else t.status = 'done';
          }
        }
        // ─── SCHEDULED SHOWS ─────────────────────────────────────────────
        // Announced shows sell DAY BY DAY and play on their night.
        //
        // Sales are brought up to the earlier of today and the show's date,
        // one day at a time, so a thirty-day jump sells thirty days of
        // tickets and never skips the presale spike. Messages are sent for
        // where the show ends up, not for every day it passed through — a
        // month turn must not drop four stale reminders into the inbox.
        if (state.scheduledShows.length) {
          for (const show of state.scheduledShows) {
            const venue = findVenue(show.venueId);
            if (!venue) continue;
            const until = Math.min(targetSerial, show.serial);
            if (show.salesCursor >= until) continue;

            const target = liveShowTarget(state, show, venue);
            for (let d = show.salesCursor + 1; d <= until; d++) {
              show.ticketsSold = soldBy(
                { announcedSerial: show.announcedSerial, serial: show.serial, ticketsSold: show.ticketsSold, capacity: show.capacity },
                d,
                target,
              );
              show.sales.push({ serial: d, sold: show.ticketsSold });
            }
            if (show.sales.length > 70) show.sales = show.sales.slice(-70);
            show.salesCursor = until;

            const daysOut = show.serial - targetSerial;
            if (daysOut <= 0) continue; // the night itself is reported on settlement

            const fill = show.ticketsSold / Math.max(1, show.capacity);
            const pct = Math.floor(fill * 100);
            const where = `${venue.name}`;

            if (show.ticketsSold >= show.capacity && show.status !== 'sold_out') {
              show.status = 'sold_out';
              show.milestone = 100;
              show.notes.unshift('SOLD OUT.');
              tourLines.push(`🔥 ${where} is SOLD OUT — ${show.capacity.toLocaleString()} tickets gone, ${daysOut} days to spare.`);
              state.mailbox.unshift({
                id: uuidv4(), from: 'booking_desk', fromName: 'Booking desk',
                subject: `🔥 SOLD OUT: ${where}, ${show.city}`,
                body: `Every one of ${show.capacity.toLocaleString()} tickets is gone with ${daysOut} days still to go. You could have filled a bigger room — remember that for the next announcement.`,
                timestamp: new Date().toISOString(), read: false, type: 'general',
              });
              const fan = state.npcs.find((n) => n.role === 'fan_account');
              if (fan) {
                state.socialPosts.unshift({
                  id: uuidv4(), platform: 'chirp', authorId: fan.id, authorName: fan.name,
                  content: `${show.city} is SOLD OUT!! ${state.player.artistName} said ${show.capacity.toLocaleString()} seats and we took them all. 🔥🔥`,
                  likes: Math.max(50, Math.round(show.capacity * 0.4)), shares: Math.round(show.capacity * 0.08),
                  comments: [], timestamp: new Date().toISOString(), isPlayerPost: false,
                  trendingScore: 60, daySerial: targetSerial,
                });
              }
              addMomentum(state, 3);
            } else if (show.status !== 'sold_out') {
              const crossed = [25, 50, 75].filter((m) => pct >= m && m > show.milestone);
              if (crossed.length) {
                const top = crossed[crossed.length - 1];
                show.milestone = top;
                show.notes.unshift(`${top}% sold (${show.ticketsSold.toLocaleString()}).`);
                tourLines.push(`🎟️ ${where}: ${show.ticketsSold.toLocaleString()} of ${show.capacity.toLocaleString()} sold (${pct}%). ${daysOut} days to go.`);
              }
            }

            // Reminders: the nearest threshold crossed, once.
            const rem = dueReminder(daysOut, show.remindersSent);
            if (rem !== null) {
              show.remindersSent = [...show.remindersSent, ...REMINDER_DAYS.filter((d) => d >= rem)];
              const mood = salesMood(
                { announcedSerial: show.announcedSerial, serial: show.serial, ticketsSold: show.ticketsSold, capacity: show.capacity },
                targetSerial,
                target,
              );
              tourLines.push(`⏰ ${where} in ${daysOut} day${daysOut === 1 ? '' : 's'} — ${show.ticketsSold.toLocaleString()}/${show.capacity.toLocaleString()} sold.`);
              state.mailbox.unshift({
                id: uuidv4(), from: 'booking_desk', fromName: 'Booking desk',
                subject: `⏰ ${daysOut} day${daysOut === 1 ? '' : 's'} to ${where} — ${pct}% sold`,
                body:
                  `${reminderTone(daysOut)}\n\n${show.ticketsSold.toLocaleString()} of ${show.capacity.toLocaleString()} tickets sold at $${show.price} (${MOOD_LABEL[mood].toLowerCase()}).` +
                  (mood === 'slow' || mood === 'at_risk'
                    ? `\n\nSales are behind where they should be. Cut the price, add promotion, move the date, or cancel while it is still cheap.`
                    : ''),
                timestamp: new Date().toISOString(), read: false, type: 'general',
              });
            } else if (
              show.status !== 'sold_out' &&
              (show.lastWarnSerial === undefined || targetSerial - show.lastWarnSerial >= 7)
            ) {
              const mood = salesMood(
                { announcedSerial: show.announcedSerial, serial: show.serial, ticketsSold: show.ticketsSold, capacity: show.capacity },
                targetSerial,
                target,
              );
              if (mood === 'at_risk') {
                show.lastWarnSerial = targetSerial;
                show.notes.unshift(`Warning: only ${pct}% sold with ${daysOut} days left.`);
                tourLines.push(`⚠️ ${where}: only ${pct}% sold with ${daysOut} days left. Act now.`);
                state.mailbox.unshift({
                  id: uuidv4(), from: 'booking_desk', fromName: 'Booking desk',
                  subject: `⚠️ ${where} is struggling — ${pct}% sold`,
                  body: `With ${daysOut} days left only ${show.ticketsSold.toLocaleString()} of ${show.capacity.toLocaleString()} tickets have gone. Open Shows → Upcoming to cut the price, buy promotion, postpone or cancel. The earlier you decide, the less it costs.`,
                  timestamp: new Date().toISOString(), read: false, type: 'general',
                });
              }
            }
          }

          // ── Play every night the clock has reached, in date order ─────
          const tonight = state.scheduledShows
            .filter((s) => s.serial <= targetSerial)
            .sort((a, b) => a.serial - b.serial);
          for (const show of tonight) {
            const venue = findVenue(show.venueId);
            state.scheduledShows = state.scheduledShows.filter((s) => s.id !== show.id);
            if (!venue) continue;

            const input = showInputFrom(state, venue, show.price, show.serial);
            const prepaid: ShowCostLine[] = show.marketingSpend > 0
              ? [{ key: 'promotion', label: 'Promotion (prepaid)', amount: show.marketingSpend }]
              : [];
            const night = settleSoldShow(input, show.ticketsSold, prepaid);
            const quality = performanceScore({
              stagePresence: state.player.stats.stagePresence,
              performance: state.player.stats.performance,
              charisma: state.player.stats.charisma,
              consistency: state.player.stats.consistency,
              stageBonus: crew.stageBonus,
              energyRatio: 1,
              fill: night.fill,
            });
            const balanceBefore = state.player.career.money;
            const settled = applyShowOutcome(state, {
              venue, type: show.type, price: show.price, night,
              performanceQuality: quality, energy: 0, nowSerial: show.serial,
              controversyMult: crew.controversyMult, advanceCalendar: false, logSink: tourLines,
            });
            // The deposit and promotion were paid weeks ago. The settlement
            // charged them as costs, so hand the cash back or they are paid twice.
            state.player.career.money += show.deposit + show.marketingSpend;
            ledgerAdd('shows', state.player.career.money - balanceBefore);
            void settled;

            const fillPct = Math.round(night.fill * 100);
            state.mailbox.unshift({
              id: uuidv4(), from: 'booking_desk', fromName: 'Booking desk',
              subject: `🎤 Settlement: ${venue.name}, ${venue.city}`,
              body:
                `${night.tickets.toLocaleString()} of ${venue.capacity.toLocaleString()} came (${fillPct}%).\n` +
                `Door $${night.gross.toLocaleString()} + merch $${night.merch.toLocaleString()}.\n` +
                `Costs $${night.totalCosts.toLocaleString()}.\n` +
                `Net ${night.net >= 0 ? '+' : '−'}$${Math.abs(night.net).toLocaleString()}.\n\n` +
                `Reviewed ${quality}/100.${show.postponements ? ` (Postponed ${show.postponements}×.)` : ''}`,
              timestamp: new Date().toISOString(), read: false, type: 'general',
            });
          }
        }

        // ─── SHOW OFFERS ─────────────────────────────────────────────────
        // Offers expire; new ones arrive; accepted dates are played.
        //
        // Offers are rare on purpose. A fee can never exceed what the room can
        // pay (`fairFee` is capacity-bounded), each host can only have one
        // offer open, and with no manager the stream is thinner and the
        // window shorter — some offers expire unseen, as the spec has it.
        {
          const hasManagerNow = !!currentManager || crew.promoterCut > 0 || playerNegotiatorSkill(state, 'manager') > 0;

          for (const o of state.showOffers) {
            if (o.status === 'open' && targetSerial > o.expiresSerial) {
              o.status = 'expired';
              const host = state.npcs.find((n) => n.id === o.hostId);
              // Leaving a friend on read is a small slight.
              if (host && o.hostRole === 'artist' && host.relationshipScore > 10) {
                host.relationshipScore -= 2;
              }
              tourLines.push(`⌛ The offer from ${o.hostName} (${o.city}) expired unanswered.`);
            }
          }
          // Keep a short history of answered offers, and every open one.
          const open = state.showOffers.filter((o) => o.status === 'open');
          const done = state.showOffers.filter((o) => o.status !== 'open').slice(-10);
          state.showOffers = [...open, ...done];

          const fresh = rollShowOffers(state, rawNPCs, targetSerial, days, hasManagerNow, crew.promoterCut > 0, rawSongs);
          for (const o of fresh) {
            state.showOffers.push(o);
            tourLines.push(`📩 New offer: ${o.hostName} — ${o.venueName}, ${o.city}. See Shows → Offers.`);
            state.mailbox.unshift({
              id: uuidv4(), from: o.hostId, fromName: o.hostName,
              subject: `📩 ${o.hostRole === 'artist' ? 'Invitation' : 'Offer'}: ${o.venueName}, ${o.city} — ${formatGameDate(serialToDate(o.serial))}`,
              body:
                `${o.reason}\n\n${BILLING_LABEL[o.terms.billing]} · ${o.terms.slotMins} min · $${o.terms.fee.toLocaleString()} guaranteed.\n` +
                `Reply by ${formatGameDate(serialToDate(o.expiresSerial))}. Open Shows → Offers to negotiate, accept or decline.`,
              timestamp: new Date().toISOString(), read: false, type: 'general',
            });
          }

          // Reminders for accepted dates.
          for (const g of state.bookedGigs) {
            const rem = dueReminder(g.serial - targetSerial, g.reminded);
            if (rem !== null) {
              g.reminded = [...g.reminded, ...REMINDER_DAYS.filter((d) => d >= rem)];
              tourLines.push(`⏰ ${g.hostName}'s ${g.city} date is in ${g.serial - targetSerial} day${g.serial - targetSerial === 1 ? '' : 's'}.`);
            }
          }

          // Play the nights the clock has reached.
          const nights = state.bookedGigs.filter((g) => g.serial <= targetSerial).sort((a, b) => a.serial - b.serial);
          for (const gig of nights) {
            state.bookedGigs = state.bookedGigs.filter((g) => g.id !== gig.id);
            playBookedGig(state, gig, crew, tourLines);
          }
        }

        // World news goes here instead. The dashboard feed is ten lines long,
        // and on a month turn the scene alone generates a dozen of them — every
        // NPC release and every show. Pushed into the same array they crowded
        // out the player's own business entirely: the tax withholding, the
        // accountant's recovery, the manager's monthly report, the payroll. The
        // feed is the ONLY place the turn is shown, so it has to be about YOU
        // first and the scene second.
        const worldLog: string[] = [];

        // ─── FEATURE REPLIES ─────────────────────────────────────────────
        // Anything shopped out that is now due comes back. The decision itself
        // lives in `decideFeatureResponse`; this only applies it and posts the
        // answer into the player's DMs, because silence is also an answer.
        for (const req of state.featureRequests) {
          if (req.status !== 'sent') continue;
          if (!dateReached(req.dueDate, state.gameDate)) continue;

          const npc = state.npcs.find((n) => n.id === req.npcId);
          if (!npc) {
            req.status = 'ignored';
            continue;
          }

          const song = state.songs.find((s) => s.id === req.songId);
          const manager = activeManager(raw(state.contracts) as ActiveContract[], rawNPCs);

          const decision = decideFeatureResponse({
            npc: npc as FeatureCandidate,
            playerFame: blendedFame(state.player),
            songQuality: song?.quality ?? 50,
            managerSkill: managerSkillOf(manager),
            genre: state.player.genre,
            roll: Math.random(),
          });

          req.reason = decision.reason;
          req.fee = decision.fee;
          // What they opened at, so the screen can show how far the player has
          // already talked them down.
          if (decision.outcome === 'terms') {
            req.originalFee = decision.fee;
            req.negotiationRound = 0;
          }

          if (decision.outcome === 'free') {
            req.status = 'verse_ready';
            req.freeVerse = true;
            req.verseQuality = verseQualityFor(npc as FeatureCandidate, song?.quality ?? 50);

            // ── A CO-SIGN IS AN EVENT, NOT A SENTENCE ──────────────────
            // The letter promises that they are telling people about it. That
            // has to actually happen, or the best moment in the whole feature
            // system is just a nicer paragraph. So they post — in their own
            // voice, to their own audience — and the industry notices.
            state.socialPosts.unshift({
              id: uuidv4(),
              platform: 'chirp',
              authorId: npc.id,
              authorName: npc.name,
              content: song
                ? `Been sitting with "${song.title}" all week. ${state.player.artistName} is the one. Verse is in. 🎙️`
                : `${state.player.artistName} is the one. Verse is in. 🎙️`,
              likes: Math.round(npc.fame * 400 + Math.random() * 5000),
              shares: Math.round(npc.fame * 60 + Math.random() * 400),
              comments: [],
              timestamp: new Date().toISOString(),
              relatedSongId: song?.id,
              isPlayerPost: false,
              trendingScore: 70 + npc.fame * 0.3,
            } as SocialPost);

            state.headlines.unshift({
              id: uuidv4(),
              text: generateHeadline('feature', state.player.artistName, npc.name),
              fullStory:
                `${npc.name} has gone public on ${state.player.artistName}, calling ` +
                `"${song?.title ?? 'the record'}" their pick of the moment and jumping on it for free. ` +
                `A co-sign from that name is worth more than the verse would have cost.`,
              date: formatGameDate(state.gameDate),
              relatedEntities: [state.player.id, npc.id],
              priority: 8,
              category: 'feature',
            });

            // The co-sign lands on the player's standing: their audience is
            // looking now, and their own regard for you deepens because you
            // were worth the gesture.
            const coSignFame = Math.max(1, Math.round(npc.fame * 0.05));
            state.player.career.localFame = Math.min(
              100,
              state.player.career.localFame + coSignFame * 0.5,
            );
            state.player.career.nationalFame = Math.min(
              100,
              state.player.career.nationalFame + coSignFame * 0.25,
            );
            npc.relationshipScore = Math.max(-100, Math.min(100, npc.relationshipScore + 3));
            addMomentum(state, 5 + npc.fame * 0.05, `${npc.name} went public on you`);
            log.push(`🤝 ${npc.name} co-signed you publicly — worth more than the fee.`);
          } else if (decision.outcome === 'terms') {
            req.status = 'terms';
          } else {
            req.status = decision.outcome; // 'declined' | 'ignored'
          }

          const thread = state.dmThreads[req.npcId] ?? {
            npcId: req.npcId,
            messages: [],
            unread: 0,
          };

          // ── Silence is silent ──────────────────────────────────────────
          // An "ignored" outcome means they never opened it. Writing a DM that
          // says "Sarkodie never replied" was a contradiction — if he did not
          // reply, there is nothing in the thread. The letter in the Mailbox
          // is where "no word back" belongs; the DM stays as it was, with only
          // the player's own outgoing message in it.
          if (decision.outcome !== 'ignored') {
            thread.messages.push({
              id: uuidv4(),
              npcId: req.npcId,
              fromPlayer: false,
              content: decision.reason,
              timestamp: new Date().toISOString(),
              read: false,
            });
            thread.unread += 1;
            state.dmThreads[req.npcId] = thread;
          } else if (!state.dmThreads[req.npcId]) {
            state.dmThreads[req.npcId] = thread;
          }

          // ─── And into the Mailbox ──────────────────────────────────────
          // DMs are where the conversation lives; the Mailbox is where the
          // *decision* lands, because a reply with a price on it needs to be
          // actioned and mail is the screen with an action on it. Silence
          // gets a letter too — "they never came back to you" is information.
          const subject =
            decision.outcome === 'free'
              ? `${req.npcName} is sending you a verse for "${req.songTitle}"`
              : decision.outcome === 'terms'
                ? `${req.npcName} will jump on "${req.songTitle}" — for a price`
                : decision.outcome === 'declined'
                  ? `${req.npcName} passed on "${req.songTitle}"`
                  : `No word back from ${req.npcName} on "${req.songTitle}"`;

          const nextStep =
            decision.outcome === 'free'
              ? `\n\nThey are doing this for the relationship, not the money. Open the track in the Studio and add the verse to the record.`
              : decision.outcome === 'terms'
                ? `\n\nTheir fee is $${decision.fee.toLocaleString()}. Pay it and the verse is yours, or pass — either is a real answer.`
                : decision.outcome === 'declined'
                  ? `\n\nNothing to action here. Worth remembering who said no, and why.`
                  : `\n\nNothing to action. Silence is an answer too — reach them another way, or build more of a name first.`;

          state.mailbox.unshift({
            id: uuidv4(),
            // A letter that says "they never replied" cannot be from them. When
            // the outcome is silence it is a PingChat notification, not a
            // message from the artist — otherwise the inbox contradicts itself.
            from: decision.outcome === 'ignored' ? 'pingchat' : req.npcId,
            fromName: decision.outcome === 'ignored' ? 'PingChat' : req.npcName,
            subject,
            body: `${decision.reason}${nextStep}`,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'feature_reply',
            featureRequestId: req.id,
          });

          log.push(
            decision.outcome === 'ignored'
              ? `🔇 ${req.npcName} never came back to you about "${req.songTitle}".`
              : `📥 ${req.npcName} came back to you about "${req.songTitle}".`,
          );
        }

        // ─── JOB BOARD ROTATION ──────────────────────────────────────────
        // New week, new board. Rolled here rather than lazily so the player
        // never opens the screen to a stale list.
        state.jobBoard = generateJobBoard({
          seed: state.turnCount + 1,
          playerFame: blendedFame(state.player),
          stats: state.player.stats,
          city: state.player.city,
        }) as JobListing[];
        state.jobBoardTurn = state.turnCount;

        // ─── STREAM TICKING ──────────────────────────────────────────
        // The engine has already done the work, one day at a time. This reads
        // its results back onto the song records the rest of the game reads, so
        // there is exactly one place streams are ever produced.
        const totalPayout = streamRun.revenue;
        const songBreakdown: WeeklyStatement['songBreakdown'] = [];

        for (const song of liveSongs(state.songs)) {
          const st = state.platformStats?.[song.id];
          if (!st) {
            song.weeklyStreams = 0;
            continue;
          }

          const totals = songTotals(st);
          song.weeklyStreams = totals.week;
          song.totalStreams = totals.lifetime;
          totalWeeklyStreams += totals.week;

          // The rate actually paid: money earned this tick divided by the units
          // that earned it. Read off the engine, not modelled separately.
          const tickUnits = streamRun.perSong[song.id] ?? 0;
          const earned = streamRun.revenueBySong[song.id] ?? 0;
          song.totalEarnings += earned;
          song.lastRatePerStream = tickUnits > 0 ? earned / tickUnits : undefined;

          if (totals.week > 0) {
            songBreakdown.push({
              songId: song.id,
              title: song.title,
              streams: totals.week,
              payout: earned,
            });
          }

          // Video views are owned entirely by the video engine, which has
          // already written them back onto this record above. Nothing to do
          // here — a second source would double-count.

          // Check certifications
          const units = getUnitsForCertification(song.totalStreams, song.videoViews);
          const certLevels: Array<[string, number]> = [
            ['legendary', 100_000_000 / 150],
            ['diamond', 10_000_000 / 150],
            ['platinum', 1_000_000 / 150],
            ['gold', 500_000 / 150],
            ['silver', 100_000 / 150],
          ];

          for (const [level, threshold] of certLevels) {
            const certKey = `${state.player.country}:${level}`;
            if (units >= threshold && !song.certifications.includes(certKey)) {
              song.certifications.push(certKey);
              state.certifications.push({
                id: uuidv4(),
                songId: song.id,
                songTitle: song.title,
                level: level as Certification['level'],
                multiplier: 1,
                country: state.player.country,
                awardedDate: formatGameDate(state.gameDate),
                units,
              });
              log.push(`🏆 "${song.title}" is now ${level.toUpperCase()} certified in ${state.player.country}!`);
              break;
            }
          }
        }

        // ─── THE CREW ─────────────────────────────────────────────────
        // Folded at the top of the tick, where the energy line needs it. The
        // payroll block below reads the same object.

        // Payout — with the crew's cut of the upside. A distribution plug
        // earns their wage by getting a better rate, so the multiplier lands
        // here, before the statement is written: the statement has to show
        // what actually arrived, not what would have arrived without them.
        const paidPayout = totalPayout * crew.payoutMult;
        state.player.career.money += paidPayout;
        ledgerAdd('streams', paidPayout);
        state.player.career.totalStreams += totalWeeklyStreams;
        state.player.career.totalEarnings += paidPayout;

        // ─── MOMENTUM ─────────────────────────────────────────────────
        // Momentum is the industry's attention on you *right now*. It is the
        // one number with no way to grind: it moves when something actually
        // happens and bleeds when nothing does.
        //
        // This is why it used to sit at zero. Its only sources were recording
        // and releasing — both rare, worth a couple of points each — against a
        // monthly decay, so a player who was not mid-release lived at the
        // floor. The week itself is now a source: a record doing real numbers
        // keeps you hot, and a record doing nothing does not.
        if (unit === 'week' || unit === 'month') {
          const weeks = unit === 'month' ? 4 : 1;
          const perWeek = totalWeeklyStreams / weeks;
          // A log curve. The gap between 1k and 10k weekly streams is a career;
          // the gap between 10M and 20M is a rounding error.
          const streamHeat = perWeek > 0 ? Math.log10(perWeek + 1) * 0.6 : 0;
          const hasSongs = liveSongs(rawSongs).length > 0;

          // Momentum is not "are you big" — it is "are you bigger than you
          // were". The yardstick is therefore your OWN recent form, not an
          // absolute number of streams: a newcomer's 2,000 streams are a
          // breakthrough, and a star's twenty million are a flop if they were
          // doing thirty. An absolute floor made the bleed unreachable — the
          // engine scales a record's streams with the artist, so every live
          // release clears any constant you could pick, and momentum could
          // only ever rise.
          // Read the recent weeks through a PLAIN copy. Calling a prototype
          // method straight onto the draft array (`state.weeklyStatements
          // .slice(...)`) registers child drafts against that array, and the
          // tick then mutates the same array with `unshift` — which leaves
          // revoked child drafts inside the committed state. The symptom is
          // that Save throws, permanently, from a completely unrelated place.
          // `raw()` here is free: the array has not been touched yet.
          const priorWeeks = raw(state.weeklyStatements) as WeeklyStatement[];
          const form = priorWeeks
            .slice(0, 4)
            .map(w => w.totalStreams)
            .filter(v => v > 0);
          const baseline = form.length ? form.reduce((a, b) => a + b, 0) / form.length : 0;

          if (!hasSongs) {
            // Nothing out. There is nothing to be hot off, and nothing to lose.
          } else if (baseline === 0 || perWeek >= baseline * 1.05) {
            addMomentum(state, Math.min(2, streamHeat) * weeks);
          } else if (perWeek < baseline * 0.9) {
            // A record that is falling off. Attention is not a savings
            // account, and stopping the room forgetting you is a publicist's
            // whole job — which is the same effect measured from the other end.
            addMomentum(state, -0.6 * weeks * crew.fameDecayMult);
          }
          // Within 10% of your own recent form you are neither rising nor
          // falling, so momentum holds.
        }

        // Weekly statement
        if (unit === 'week' || unit === 'month') {
          const stmt: WeeklyStatement = {
            id: uuidv4(),
            weekStartDate: formatGameDate(state.gameDate),
            totalStreams: totalWeeklyStreams,
            totalPayout: paidPayout,
            songBreakdown,
            flavorText: generateRoyaltyFlavor(),
          };
          state.weeklyStatements.unshift(stmt);
          if (state.weeklyStatements.length > 52) {
            state.weeklyStatements = state.weeklyStatements.slice(0, 52);
          }
        }

        // ─── CONTRACT CUTS ────────────────────────────────────────────
        // Two structures, two mechanics. A commission deal takes a slice of
        // what came in — so it costs nothing in a bad week. A retainer costs
        // the same every month whether or not a single stream landed, which is
        // exactly why it is cheaper over a career.
        for (const contract of state.contracts.filter(c => c.active)) {
          if (contract.terms.feeKind === 'retainer') {
            if (unit === 'month') {
              const fee = contract.terms.monthlyFee ?? 0;
              state.player.career.money -= fee;
              ledgerAdd('management', -fee);
              log.push(`💼 ${contract.npcName}: $${fee.toLocaleString()} monthly retainer.`);
            }
            continue;
          }
          if (contract.terms.percentage && paidPayout > 0) {
            const gross = paidPayout * (contract.terms.percentage / 100);
            // A lawyer on the payroll reads the third page and gets some of it
            // back. This is the only place their fee turns into money.
            const saved = gross * crew.cutRelief;
            const cut = gross - saved;
            state.player.career.money -= cut;
            ledgerAdd('management', -cut);
            log.push(
              `💼 ${contract.npcName} took their ${contract.terms.percentage}% cut ($${cut.toFixed(2)})` +
                (saved > 0.5 ? ` — your lawyer clawed back $${saved.toFixed(2)} of it.` : ''),
            );
          }
        }

        // ─── PAYROLL ──────────────────────────────────────────────────
        // Wages go out every month, and the people earning them do their job
        // every week. Both halves are here so a hire is never just a bill.
        if (crew.monthlyWage > 0 && unit === 'month') {
          state.player.career.money -= crew.monthlyWage;
          ledgerAdd('payroll', -crew.monthlyWage);
          log.push(`👥 Payroll: $${crew.monthlyWage.toLocaleString()} across ${(state.crew ?? []).length} people.`);
        }

        if (unit === 'week' || unit === 'month') {
          const weeks = unit === 'month' ? 4 : 1;
          const raised: string[] = [];
          for (const [stat, perWeek] of Object.entries(crew.stats)) {
            const gain = (perWeek ?? 0) * weeks;
            if (gain <= 0) continue;
            const key = stat as keyof ArtistStats;
            const before = state.player.stats[key];
            state.player.stats[key] = Math.min(100, before + gain);
            if (state.player.stats[key] > before) {
              raised.push(`${key} +${(state.player.stats[key] - before).toFixed(1)}`);
            }
          }
          if (raised.length > 0) {
            log.push(`👥 Your team put in the work: ${raised.join(', ')}.`);
          }
        }

        // ─── THE VOCAL COACH ──────────────────────────────────────────
        // The one thing a hire can give you that outlives them. A coach writes
        // to the STAT, not to a bonus, and the tick never takes it back — so
        // firing them stops the growth, it does not undo the work. Capped below
        // 100, because a stat you cannot lose the top of is not a stat.
        if (unit === 'month' && Object.keys(crew.coaching).length > 0) {
          const COACHING_CAP = 92;
          const improved: string[] = [];
          for (const [stat, perMonth] of Object.entries(crew.coaching)) {
            const key = stat as keyof ArtistStats;
            const before = state.player.stats[key];
            if (before >= COACHING_CAP) continue;
            const gain = perMonth ?? 0;
            if (gain <= 0) continue;
            state.player.stats[key] = Math.min(COACHING_CAP, before + gain);
            if (state.player.stats[key] > before) {
              improved.push(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} +${(state.player.stats[key] - before).toFixed(1)}`);
            }
          }
          if (improved.length > 0) {
            log.push(`🎤 Coaching is showing: ${improved.join(', ')}. That stays with you.`);
          }
        }

        // ─── THE PEOPLE GET BETTER, OR THEY DO NOT ────────────────────
        // Everybody on the payroll improves while they are working — but only
        // up to their own ceiling, which comes from who they are. A hard
        // working unknown has somewhere to go; a lazy one is already as good as
        // they will ever be. That is what makes a cheap hire a bet rather than
        // a saving, and it is why the payroll screen shows the ceiling.
        //
        // Tenure and morale are settled in the same pass, because all three are
        // facts about the same month of employment.
        if (unit === 'month' && (state.crew ?? []).length > 0) {
          for (const member of state.crew) {
            // Months served is what `chemistryOf` reads. It is the tick's
            // number, the way `skill` is.
            member.monthsServed = (member.monthsServed ?? 0) + 1;

            // Morale drifts back toward 70 — neither a grudge nor a honeymoon
            // lasts for ever. What moves it off 70 is an event, and the events
            // are in `createStudioSong`, where the slight actually happens.
            const morale = member.morale ?? 70;
            if (morale !== 70) {
              const drift = Math.max(1, Math.round(Math.abs(morale - 70) * 0.12));
              member.morale = morale > 70 ? Math.max(70, morale - drift) : Math.min(70, morale + drift);
            }

            const npc = state.npcs.find((n) => n.id === member.npcId);
            if (!npc) continue;
            const rate = growthPerMonth(npc);
            if (rate <= 0) continue;

            const before = npcSkill(npc);
            npc.skillBonus = (npc.skillBonus ?? 0) + rate;
            const after = npcSkill(npc);
            // The payroll record mirrors the person: `crewBonuses` folds the
            // crew without the roster in hand, so this is the number it reads.
            member.skill = after;

            // `npcDeltas` is collected from the plain `rawNPCs` snapshot taken
            // at the top of the tick, which does not see a write made here — so
            // the growth is mirrored onto that snapshot too, or it would be
            // lost on the next load while the roster regenerated without it.
            const mirror = rawNPCs.find((n) => n.id === member.npcId);
            if (mirror) mirror.skillBonus = npc.skillBonus;

            if (after > before && after % 5 === 0) {
              log.push(
                stillGrowing(npc)
                  ? `📈 ${npc.name} is improving — now rated ${after}, with room left.`
                  : `📈 ${npc.name} has topped out at ${after}. That is as good as they get.`,
              );
            }
          }
        }

        // ─── INVESTMENT TICKING ───────────────────────────────────────
        if (unit === 'month') {
          for (const inv of state.investments) {
            // Monthly income
            state.player.career.money += inv.monthlyIncome;
            ledgerAdd('investments', inv.monthlyIncome);

            // Value change based on risk
            const changeRange = inv.riskLevel === 'low' ? 0.02 : inv.riskLevel === 'medium' ? 0.08 : 0.20;
            const change = (Math.random() - 0.4) * changeRange; // Slightly positive bias
            inv.currentValue = Math.max(inv.initialCost * 0.1, inv.currentValue * (1 + change));
          }

          // Business income
          for (const biz of state.businesses) {
            const profit = biz.monthlyRevenue - biz.monthlyCosts;
            state.player.career.money += profit;
            ledgerAdd('business', profit);
            if (profit > 0) log.push(`🏢 ${biz.name}: +$${profit.toLocaleString()} profit`);
          }
        }

        // ─── BEEF: DECAY, AND THE ONES THAT END THEMSELVES ────────────
        // Heat is stored "as of `heatSerial`" and read through `decayedHeat`,
        // so this is not what makes a beef cool — the decay is lazy and always
        // correct. What this block does is two things the lazy read cannot:
        // bring the stored figure up to date so the screen is not doing maths
        // on a stale number, and CLOSE the beefs that have gone cold. A beef
        // nobody fed for a month is over, and it has to be marked over or the
        // screen keeps offering rungs on an argument that ended.
        if (state.beefs.length > 0) {
          const nowSerial = dateToSerial(state.gameDate);
          for (const beef of state.beefs) {
            if (beef.resolution) continue;
            beef.heat = settleHeat(beef, nowSerial);
            beef.heatSerial = nowSerial;

            const fizzled = fizzleIfCold(beef, nowSerial);
            if (!fizzled) continue;
            beef.resolution = {
              kind: fizzled,
              at: nowSerial,
              line: `Nobody fed it. ${beef.npcName} stopped answering and so did you, and the timeline moved on.`,
            };
            state.lastEventLog.unshift(
              `💤 The ${beef.npcName} thing is over. It went quiet for ${FIZZLE_DAYS} days and nobody picked it back up.`,
            );
          }
          state.lastEventLog = state.lastEventLog.slice(0, 10);
        }

        // ─── FAME DECAY ───────────────────────────────────────────────
        // Momentum's bleed now lives beside its gains, in the weekly block near
        // the payout above. Two decay sites is two opinions about how fast
        // attention drains, and the publicist's multiplier has to apply to
        // whichever one is real.

        // ─── FANBASE GROWTH ───────────────────────────────────────────
        // A manager is not a wage and not a percentage — they are a network.
        // Their one measurable effect is that the audience you do reach
        // converts better, because somebody is working the room on your behalf.
        // A charismatic hire adds on top of that: people liking *them* is a
        // separate, smaller effect from them knowing people.
        const mgrNet = managerNetwork(currentManager);
        // The arithmetic lives in `sim/fanbase.ts` so the fanbase screen and
        // this tick cannot quote different numbers. It used to be inline here,
        // which meant the panel was re-deriving it and free to drift.
        const fanGrowth = fanGrowthFor({
          weeklyStreams: totalWeeklyStreams,
          momentum: state.player.career.momentum,
          managerNet: mgrNet,
          fanMult: crew.fanMult,
        });
        state.player.career.fanbase = Math.round(state.player.career.fanbase + fanGrowth);

        // ─── AND THEY ACTUALLY WORK FOR YOU ───────────────────────────
        // A manager is not a wage, so a manager who takes a cut and changes
        // nothing visible is a bill with a name on it. Every month they place
        // you and they chase money on your behalf, and then they tell you what
        // happened — including when the answer was nothing.
        //
        // The odds and the sizes are `managerMonth`'s, so the number the Team
        // screen promises and the number the tick pays come from one place.
        if (unit === 'month' && currentManager) {
          const mm = managerMonth({
            net: mgrNet,
            playerFame: blendedFame(state.player),
            fanbase: state.player.career.fanbase,
            rollPlacement: Math.random(),
            rollEndorsement: Math.random(),
            pickOutlet: Math.random(),
            pickBrand: Math.random(),
            sizeRoll: Math.random(),
          });

          if (mm.placement) {
            // A placement is a room you walk into, and a photographer changes
            // how far you carry out of it. This is the visual multiplier's one
            // hook: it scales the reach of anything the public sees.
            const vis = crew.visualMult;
            state.player.career.localFame = Math.min(
              100,
              state.player.career.localFame + mm.placement.fame * vis,
            );
            state.player.career.nationalFame = Math.min(
              100,
              state.player.career.nationalFame + mm.placement.fame * 0.5 * vis,
            );
            state.player.career.fanbase = Math.round(
              state.player.career.fanbase + mm.placement.fans * vis,
            );
          }
          if (mm.endorsement) {
            state.player.career.money += mm.endorsement.amount;
            ledgerAdd('endorsement', mm.endorsement.amount);
          }

          log.push(`💼 ${currentManager.name} ${mm.report}.`);
        }

        // ─── WHO THEY ARE, SHOWING UP ─────────────────────────────────
        // The hidden layer is not a stat block; it is behaviour. A lazy or
        // angry operator costs you something visible every so often, and the
        // event log is where the player finds out what they actually hired.
        // Chance-based, so it reads as a person rather than a debuff timer.
        if ((state.crew ?? []).length > 0 && crew.events.length > 0 && Math.random() < 0.14) {
          const line = crew.events[Math.floor(Math.random() * crew.events.length)];
          const who = state.crew[Math.floor(Math.random() * state.crew.length)];
          if (who) {
            log.push(`👥 ${who.npcName} ${line}.`);
            // Whoever it was, the team notices — and so does their own regard
            // for you, scaled by how thin-skinned they are about it.
            const n = state.npcs.find((x) => x.id === who.npcId);
            if (n) {
              n.relationshipScore = Math.max(
                -100,
                Math.min(100, n.relationshipScore - Math.round(crew.friction)),
              );
            }
          }
        }

        // ─── LOCAL FAME GROWTH ────────────────────────────────────────
        if (totalWeeklyStreams > 10000) {
          state.player.career.localFame = Math.min(100, state.player.career.localFame + 0.2);
        }
        if (totalWeeklyStreams > 100000) {
          state.player.career.nationalFame = Math.min(100, state.player.career.nationalFame + 0.2);
        }
        if (totalWeeklyStreams > 1000000) {
          state.player.career.internationalFame = Math.min(100, state.player.career.internationalFame + 0.1);
        }

        // ─── CHARTS ───────────────────────────────────────────────────
        // Player and NPC songs compete on the same regional charts.
        state.charts = updateCharts(
          raw(state.charts) as Record<string, ChartEntry[]>,
          [...liveSongs(rawSongs), ...rawNPCSongs] as Song[],
          rawNPCs,
          raw(state.player) as Player,
        ) as typeof state.charts;

        // ─── GLOBAL CHARTS ────────────────────────────────────────────
        // Weekly, from the seven days just gone. The cursor holds the last
        // Saturday already published for, so this is a no-op on every day but
        // Saturday — and a jump of a month lands one fresh chart, not four
        // identical ones with different dates on them.
        publishGlobalCharts(state, rawNPCs);

        // Refresh trending topics from the new chart state.
        state.trending = buildTrending(state.charts as Record<string, ChartEntry[]>, state.player) as typeof state.trending;

        // ─── SOCIAL WORLD ─────────────────────────────────────────────
        // NPCs and fans post about what actually just happened on the charts.
        const ghanaChart = state.charts['Ghana'] ?? [];
        const leader = ghanaChart[0];
        const bestMover = [...ghanaChart]
          .filter(e => e.lastPosition > e.position)
          .sort((a, b) => (b.lastPosition - b.position) - (a.lastPosition - a.position))[0];

        const playerOnChart = Object.values(state.charts).some(
          list => list.some(e => e.artistId === state.player!.id)
        );

        const newSocial: SocialPost[] = [];

        // Fans reacting to the real chart state.
        newSocial.push(...fanPosts(leader, bestMover, rawNPCs, state.player, playerOnChart) as SocialPost[]);

        // A couple of NPC artists posting about their own records.
        // Scanned on the raw roster, not the draft: picking 5 random artists out
        // of 11,851 is a full sort, and the proxy makes that ~7x dearer.
        const artistsForPosts = pickRandomArtists(rawNPCs, 5);
        for (const npc of artistsForPosts) {
          const own = rawNPCSongs.filter(s => s.ownerId === npc.id);
          newSocial.push(...npcArtistPosts(npc, own) as SocialPost[]);
        }

        if (newSocial.length > 0) {
          state.socialPosts.unshift(...newSocial);
          // Keep the feed bounded.
          if (state.socialPosts.length > 150) {
            state.socialPosts = state.socialPosts.slice(0, 150);
          }
        }

        // One lookup map for the whole tick — an earlier version ran
        // `state.npcs.find(n => ev.involvedNPCIds.includes(n.id))` per event,
        // which is a full roster scan nested inside a per-event loop.
        const npcById = new Map(rawNPCs.map(n => [n.id, n]));

        // ─── AWARD SEASON ─────────────────────────────────────────────
        // Ceremonies run at the end of the in-game year. Winners come from real
        // performance, and NPCs win their own awards regardless of the player.
        const dueShows = showsDueThisTurn(state.gameDate.month);
        if (dueShows.length > 0 && state.gameDate.day >= 25) {
          for (const show of dueShows) {
            const result = runAwardShow(
              show,
              state.charts as Record<string, ChartEntry[]>,
              [...liveSongs(state.songs), ...state.npcSongs] as Song[],
              state.player,
              state.gameDate.year,
            );
            if (result.awards.length === 0) continue;
            state.awards.push(...result.awards as typeof state.awards);
            log.push(...result.headlines);

            // Feed the ceremony into the news and the social world.
            for (const line of result.headlines) {
              state.headlines.unshift({
                id: uuidv4(),
                text: line,
                fullStory: `${show.name} held its annual ceremony. Full winners list inside.`,
                date: formatGameDate(state.gameDate),
                relatedEntities: [],
                priority: 9,
                category: 'award',
              });
            }

            const winnerAward = result.awards[0];
            const winnerIsPlayer = state.player && winnerAward.winner === state.player.id;
            state.socialPosts.unshift({
              id: uuidv4(),
              platform: 'chirp',
              authorId: winnerIsPlayer ? 'player' : winnerAward.winner,
              authorName: winnerIsPlayer
                ? state.player!.artistName
                : (npcById.get(winnerAward.winner)?.name ?? 'Artist'),
              content: winnerIsPlayer
                ? `WE WON. 🏆 Thank you to everyone who believed. This is for the city.`
                : pick([
                    `Appreciate the recognition. More work to do. 🏆`,
                    `Blessed. This one goes to the fans. 🙏🏆`,
                    `Award season. We move. 🏆`,
                  ]),
              likes: Math.floor(200 + Math.random() * 3000),
              shares: Math.floor(50 + Math.random() * 400),
              comments: [],
              timestamp: new Date().toISOString(),
              isPlayerPost: !!winnerIsPlayer,
              trendingScore: 90,
            });
          }
        }

        // ─── STORY DIRECTOR ───────────────────────────────────────────
        // Shallow spread of the draft, NOT `raw(state)`.
        //
        // `raw(state)` routes through immer's `current()`, which deep-clones
        // the entire state — the 11.6k roster, every song, every platform's
        // day history — purely to hand a read-only engine a snapshot. That
        // clone measured ~230ms on every single tick, day or month, and was
        // the largest remaining cost in the whole advance. The director reads
        // only `player`, `openThreads`, `songs` and `turnCount` (see
        // `scanTriggers`), so a shallow spread is equivalent and costs ~60
        // property reads. The three big collections are swapped for the plain
        // arrays the tick already made, so the engine never walks a proxy.
        const storyState = {
          ...(state as unknown as GameState),
          npcs: rawNPCs,
          npcSongs: rawNPCSongs,
          songs: rawSongs,
        } as GameState;
        const { events: storyEvents, newOpenThreads } = runStoryDirector(storyState);

        for (const thread of newOpenThreads) {
          state.openThreads.push(thread as typeof state.openThreads[0]);
        }

        for (const ev of storyEvents) {
          log.push(`📰 ${ev.headline}: ${ev.description}`);

          // Apply effects
          if (ev.effectType === 'fame') state.player.career.localFame = Math.min(100, state.player.career.localFame + ev.effectValue);
          if (ev.effectType === 'reputation') {
            // The press cycle is where a publicist earns their fee: a story
            // that damages you damages you less while somebody is handling it.
            const rep = ev.effectValue < 0 ? ev.effectValue * crew.controversyMult : ev.effectValue;
            state.player.career.reputation = Math.min(100, Math.max(0, state.player.career.reputation + rep));
          }
          if (ev.effectType === 'money') state.player.career.money = Math.max(0, state.player.career.money + ev.effectValue);

          // Add NPC social post for the event
          if (ev.involvedNPCIds.length > 0) {
            const npc = ev.involvedNPCIds.map(id => npcById.get(id)).find(Boolean);
            if (npc) {
              const npcPost: SocialPost = {
                id: uuidv4(),
                platform: 'chirp',
                authorId: npc.id,
                authorName: npc.name,
                content: generateNPCChirpPost(npc),
                likes: Math.floor(npc.fame * 10 + Math.random() * 200),
                shares: Math.floor(Math.random() * 50),
                comments: [],
                timestamp: new Date().toISOString(),
                isPlayerPost: false,
                trendingScore: npc.fame,
              };
              state.socialPosts.unshift(npcPost);
            }
          }
        }

        // ─── NPC MUSIC WORLD ──────────────────────────────────────────
        // NPC songs live their own lives: they climb, decay, surge, and die out.
        const npcTick = tickNPCSongs(state.npcSongs as Song[], rawNPCs);
        for (const ev of npcTick.events) worldLog.push(ev);

        // ─── ONE SOURCE OF TRUTH FOR THE NUMBERS ──────────────────────
        // The streaming engine writes per-platform daily values into
        // `platformStats`, and that is what every chart is built from. The NPC
        // scalar model above keeps its own `weeklyStreams` / `totalStreams`, and
        // the two drifted a long way apart: a record sitting at #1 on the global
        // chart displayed a 279K lifetime next to an 82M week, because the
        // read-back below the stream tick only ever covered the player's songs.
        // Read the engine back onto the record here too, so the chart, the
        // record page and the cards all quote the same number.
        for (const song of state.npcSongs as Song[]) {
          const st = state.platformStats?.[song.id];
          if (!st) continue;
          const totals = songTotals(st);
          song.weeklyStreams = totals.week;
          song.totalStreams = totals.lifetime;
          song.peakWeeklyStreams = Math.max(song.peakWeeklyStreams ?? 0, totals.week);
        }

        // NPC artists keep releasing — the scene never stands still.
        const { songs: fresh, events: releaseEvents } = npcReleaseTick(
          rawNPCs,
          state.npcSongs as Song[],
          state.gameDate,
          state.turnCount,
        );
        // Artists signed to the player's label release through the label, on
        // the label's money — never on the world's own schedule.
        if (state.label && fresh.length > 0) {
          const signed = labelSigneeIds(state.label);
          for (let i = fresh.length - 1; i >= 0; i--) {
            if (fresh[i].ownerId && signed.has(fresh[i].ownerId as string)) fresh.splice(i, 1);
          }
          releaseEvents.splice(0, releaseEvents.length, ...fresh.map((s) => `🎵 ${s.ownerName} dropped "${s.title}".`));
        }
        if (fresh.length > 0) {
          state.npcSongs.push(...fresh);
          worldLog.push(...releaseEvents);
          // Subscribers hear about it. Nobody else does — a notification for an
          // artist you do not follow would be noise, not news.
          for (const song of fresh) {
            const npc = rawNPCs.find((n) => n.id === song.ownerId);
            if (!npc) continue;
            const follows = (state.subscriptions ?? []).some((s) => s.artistId === npc.id);
            if (!follows) continue;
            pushNotification(state, {
              kind: 'artist_release',
              title: `${npc.name} dropped "${song.title}"`,
              body: `${npc.name} released a new record.`,
              artSeed: `song|${song.id}`,
              action: { type: 'song', id: song.id },
            });
          }
        }
        state.npcSongs = pruneNPCSongs(
          state.npcSongs as Song[],
          // Every record the player has been asked onto and not yet delivered.
          // Losing one of these to the trim means the player writes a verse for
          // a song that no longer exists.
          new Set([
            ...state.inboundRequests
              .filter((r) => r.status === 'open' || r.status === 'agreed')
              .map((r) => r.npcSongId),
            // The label's catalogue is an asset the player paid for.
            ...(state.label
              ? [...state.label.roster, ...state.label.alumni].flatMap((s) => s.releases)
              : []),
          ]),
        ) as typeof state.npcSongs;

        // ─── NPC ALBUM WORLD ──────────────────────────────────────────
        // Artists who just put out a single sometimes bundle their recent work
        // into an EP or album. Without this the Global Top 200 only ever
        // shrinks: the recurrent rule retires entries and nothing replaces them.
        if (unit !== 'day' && fresh.length > 0) {
          const albums = state.npcAlbums ?? (state.npcAlbums = []);
          const owners = new Set<string>();
          for (const s of fresh) if (s.ownerId) owners.add(s.ownerId);

          let madeAlbums = 0;
          for (const ownerId of owners) {
            if (madeAlbums >= 3) break;
            const npc = rawNPCs.find(n => n.id === ownerId);
            if (!npc) continue;
            const own = (state.npcSongs as Song[]).filter(s => s.ownerId === ownerId);
            const ownProjects = albums.filter(a => a.ownerId === ownerId);
            const project = buildNewProject(
              npc,
              own,
              ownProjects as unknown as Project[],
              targetSerial,
            );
            if (!project) continue;
            albums.push(project as (typeof albums)[number]);
            madeAlbums++;
          }
          if (albums.length > 900) {
            state.npcAlbums = albums.slice(0, 900) as typeof state.npcAlbums;
          }
        }

        // ─── NPC VIDEO WORLD ──────────────────────────────────────────
        // NPC artists shoot visuals for their current singles on their own, so
        // the video platform is alive whether or not the player ever opens it.
        if (unit !== 'day') {
          const freshVideos = npcVideoTick(
            state,
            rawNPCs,
            dateToSerial(chartWeekEnding(state.gameDate)),
          );
          for (const v of freshVideos) {
            // Only notify for artists the player actually follows.
            const follows = (state.subscriptions ?? []).some(
              (s) => s.artistId === v.artistId,
            );
            if (follows) {
              pushNotification(state, {
                kind: 'artist_video',
                title: `${v.artistName} uploaded "${v.title}"`,
                body: `A new visual for "${v.songTitle}".`,
                artSeed: `video|${v.id}`,
                action: { type: 'video', id: v.id },
              });
            }
          }
        }

        // ─── NPC WORLD FLAVOUR ────────────────────────────────────────
        const npcEvents = simulateNPCWorld(rawNPCs, state.turnCount);
        worldLog.push(...npcEvents.map(e => `🌍 ${e}`));

        // ─── YOUR OWN LABEL ───────────────────────────────────────────
        // After the streaming engine (it needs what the records earned) and
        // after the NPC release tick (so a signee's record is never released
        // twice). The label has its own bank account; nothing here touches
        // the player's money.
        if (state.label) {
          labelTick(state, rawNPCs, streamRun.labelRevenueBySong, targetSerial, worldLog);
        }

        // ─── INDUSTRY & LIFE TICK ─────────────────────────────────────
        const todaySerial = dateToSerial(state.gameDate);
        for (const campaign of state.payolaCampaigns) {
          if (campaign.completed || campaign.remainingDays <= 0) continue;
          const song = state.songs.find(s => s.id === campaign.songId);
          if (!song) { campaign.completed = true; continue; }
          // Extra attention is applied after the normal streaming calculation.
          const activeDays = Math.min(days, campaign.remainingDays);
          song.weeklyStreams = Math.round(song.weeklyStreams * (1 + campaign.boost * (activeDays / 7)));
          campaign.remainingDays -= days;
          // Exposure is uncommon, but becomes more likely when the player is
          // famous enough for journalists and radio insiders to care.
          if (!campaign.exposed && Math.random() < 0.015 + state.player.career.reputation / 5000) {
            campaign.exposed = true;
            state.player.career.reputation = Math.max(0, state.player.career.reputation - 4);
            state.headlines.unshift({ id: uuidv4(), text: `Questions surround ${state.player.artistName}'s radio push`, fullStory: `Industry insiders are questioning the radio campaign behind "${song.title}" in ${campaign.city}. No formal finding has been made, but the story is spreading.`, date: formatGameDate(state.gameDate), relatedEntities: [state.player.id, song.id], priority: 6, category: 'scandal' });
            state.industryNotices.unshift({ id: uuidv4(), type: 'payola', title: 'Radio campaign exposed', body: `The campaign for "${song.title}" is being questioned publicly. Reputation took a hit.`, date: formatGameDate(state.gameDate), relatedSongId: song.id, read: false });
            log.push(`📻 Radio campaign exposed in ${campaign.city}. Reputation -4.`);
          }
          if (campaign.remainingDays <= 0) campaign.completed = true;
        }

        // Expired sample requests become legal risks instead of silently vanishing.
        for (const c of state.sampleClearances) {
          if (c.status === 'pending' && todaySerial > c.deadlineSerial) {
            c.status = 'expired';
            state.openThreads.unshift({ id: uuidv4(), type: 'legal', description: `Clearance deadline expired for "${c.songTitle}".`, involvedNPCIds: [], startDate: formatGameDate(state.gameDate), lastUpdated: formatGameDate(state.gameDate), resolved: false, priority: 8, escalationCount: 1 });
            log.push(`⚖️ Sample clearance expired for "${c.songTitle}".`);
          }
        }

        // Monthly family obligation. It is an actual ledger expense, not flavour.
        if (state.family.children > 0 && state.family.nextReviewSerial !== undefined && todaySerial >= state.family.nextReviewSerial) {
          const months = Math.max(1, Math.floor((todaySerial - state.family.nextReviewSerial) / 30) + 1);
          const charge = Math.round(state.family.monthlyChildSupport * months);
          state.player.career.money -= charge;
          ledgerAdd('child_support', -charge);
          state.family.nextReviewSerial += months * 30;
          log.push(`👶 Family support: ${money0(charge)}.`);
        }

        // A&R missions are generated only when the player's career has enough
        // traction. They expire, so they behave like real industry work rather
        // than a permanent quest list.
        if (state.player.career.localFame >= 20 && state.scoutMissions.filter(m => m.status === 'open').length < 2 && Math.random() < 0.18) {
          const target = rawNPCs.find(n => n.role === 'artist' && n.country === state.player!.country && n.id !== state.player!.id && n.relationshipScore < 60);
          const scout = rawNPCs.find(n => n.role === 'a_and_r_scout' || n.role === 'ar');
          if (target && scout) {
            state.scoutMissions.unshift({ id: uuidv4(), scoutName: scout.name, targetNpcId: target.id, targetName: target.name, objective: `Build a working relationship with ${target.name}.`, rewardMoney: 1000 + Math.round(state.player.career.localFame * 50), rewardFame: 2 + state.player.career.localFame / 25, expiresSerial: todaySerial + 45, status: 'open' });
            state.industryNotices.unshift({ id: uuidv4(), type: 'scout', title: `${scout.name} noticed your work`, body: `A&R wants you to build a connection with ${target.name}.`, date: formatGameDate(state.gameDate), relatedNpcId: target.id, read: false });
            log.push(`🔎 A&R scout ${scout.name} opened a mission involving ${target.name}.`);
          }
        }

        // Rare, earned "they noticed you" moments. This is a social/world event,
        // not a free reward: the relationship starts neutral and the opportunity
        // must still be handled by the player.
        if (state.player.career.nationalFame >= 45 && Math.random() < 0.035) {
          const big = rawNPCs.filter(n => n.role === 'artist' && n.tier === 'international' && n.fame > state.player!.career.nationalFame).sort((a,b) => b.fame-a.fame)[0];
          if (big) {
            state.industryNotices.unshift({ id: uuidv4(), type: 'noticed', title: `${big.name} noticed your rise`, body: `${big.name}'s team has been watching your recent numbers. Nothing is promised — but your name is in the room.`, date: formatGameDate(state.gameDate), relatedNpcId: big.id, read: false });
            state.mailbox.unshift({ id: uuidv4(), from: big.id, fromName: big.name, subject: 'Been seeing the work', body: `My team has been watching what you've been doing lately. Keep going.`, timestamp: new Date().toISOString(), read: false, type: 'general' });
            log.push(`👀 ${big.name} noticed your rise.`);
          }
        }

        // Legacy score remains visible while active and updates from real career
        // achievements, so retirement is a summary of a life rather than a reset.
        state.legacy.legacyScore = Math.max(state.legacy.legacyScore, Math.round(state.player.career.totalStreams / 100000 + state.awards.filter(a => a.winner === state.player!.id).length * 250 + state.certifications.length * 100 + state.player.career.totalEarnings / 10000 + state.player.career.internationalFame * 20));
        const titles: string[] = [];
        if (state.legacy.legacyScore >= 500) titles.push('Hall of Famer');
        if (state.legacy.legacyScore >= 1000) titles.push('Mogul');
        if (state.legacy.legacyScore >= 2000) titles.push('Cultural Icon');
        state.legacy.titles = titles;

        // ─── MANAGER APPROACH ─────────────────────────────────────────
        // Several manager archetypes circle once the player shows traction —
        // and once one of them is signed, the rest start trying to take them
        // off you. A manager who is never challenged is not a deal.
        const mgrOffers = generateManagerOffers(
          state.player,
          rawNPCs,
          state.turnCount,
          currentManager ? 1 : 0,
          currentManager,
        );
        for (const offer of mgrOffers) {
          // Avoid stacking identical pending offers.
          const dupe = state.mailbox.some(m => m.type === 'offer' && !m.read && m.from === offer.from);
          if (dupe) continue;
          state.mailbox.unshift(offer as typeof state.mailbox[0]);
          log.push(
            currentManager
              ? `💼 ${offer.fromName} wants to take you off ${currentManager.name} — check your Mailbox.`
              : `💼 ${offer.fromName} wants to manage you — check your Mailbox.`,
          );
        }

        // ─── LABEL INTEREST ───────────────────────────────────────────
        // Labels compete for a hot artist rather than one static offer.
        const hasLabel = state.contracts.some(c => c.type === 'label' && c.active);
        const labelOffers = generateLabelOffers(
          state.player,
          rawNPCs,
          bestSongQuality(rawSongs),
          hasLabel,
        );
        for (const offer of labelOffers) {
          const dupe = state.mailbox.some(m => m.type === 'contract' && !m.read && m.fromName === offer.fromName);
          if (dupe) continue;
          state.mailbox.unshift(offer as typeof state.mailbox[0]);
          log.push(`📬 ${offer.fromName} sent you a contract offer.`);
        }

        // ─── TAX ──────────────────────────────────────────────────────
        // The ledger is drained HERE rather than at the report, because the tax
        // charge is worked out on the ledger's own income total and then added
        // back into it — one account of the money, read and written once.
        const ledgerEntries = drainTurnLedger();
        let turnIncome = 0;
        for (const [, amount] of ledgerEntries) {
          if (amount > 0) turnIncome += amount;
        }

        // ─── WHAT THE ACCOUNTANT AND THE STYLIST BRING IN ─────────────
        // Both are sized as a share of the turn's music income, because both
        // are really buying the same thing: reach. A brand pays for audience
        // and an accountant's recovery is proportional to what there was to
        // lose. A flat figure would be pocket change at the top and a jackpot
        // at the bottom, which is how a mechanic becomes a money printer.
        //
        // Sited here rather than in the payroll block because this is the one
        // place in the tick where the turn's income is known — the ledger has
        // just been read.
        if (turnIncome > 0 && (crew.recoveryRate > 0 || crew.brandRate > 0)) {
          const recovered = Math.round(turnIncome * crew.recoveryRate);
          const brand = Math.round(turnIncome * crew.brandRate);
          if (recovered > 0) {
            state.player.career.money += recovered;
            ledgerEntries.set('recovery', (ledgerEntries.get('recovery') ?? 0) + recovered);
            log.push(`💰 Your accountant found ${money0(recovered)} that was going missing — unpaid royalties and overbilled fees.`);
          }
          if (brand > 0) {
            state.player.career.money += brand;
            ledgerEntries.set('brand', (ledgerEntries.get('brand') ?? 0) + brand);
            log.push(`👗 Brand work brought in ${money0(brand)} this month. That money has nothing to do with music.`);
          }
          // Both are income like any other and are taxed like any other. A
          // recovered royalty is not a gift from the taxman.
          turnIncome += recovered + brand;
        }

        const thisYear = state.gameDate.year;
        // Months since year zero, so "has the month turned over?" is one
        // comparison rather than a year/month pair that can half-match.
        const thisMonth = thisYear * 12 + state.gameDate.month;

        // Open the books on the first turn of a career, and charge nothing:
        // there is no month behind you yet to bill for.
        if (state.taxYear === undefined || state.taxMonth === undefined) {
          state.taxYear = thisYear;
          state.taxMonth = thisMonth;
          state.taxYearIncome = 0;
          state.taxPaidThisYear = 0;
        }

        // A new game year settles the annual charge on what the player owns.
        if (state.taxYear !== thisYear) {
          const holdings = [
            ...state.ownedAssets.map((a) => ({ label: a.name, value: a.cost })),
            ...state.businesses.map((b) => ({ label: b.name, value: b.monthlyRevenue * 24 })),
            ...state.investments.map((i) => ({ label: i.name, value: i.currentValue })),
          ];
          const propTax = propertyTax(holdings);
          if (propTax > 0) {
            state.player.career.money -= propTax;
            ledgerEntries.set('property_tax', -(ledgerEntries.get('property_tax') ?? 0) - propTax);
            log.push(`🏛️ Property tax on ${money0(holdingsValue(holdings))} of holdings: ${money0(propTax)}.`);
          }
          log.push(`🏛️ New tax year. Last year you paid ${money0(state.taxPaidThisYear ?? 0)} on ${money0(state.taxYearIncome ?? 0)} earned.`);
          state.taxYear = thisYear;
          state.taxYearIncome = 0;
          state.taxPaidThisYear = 0;
          state.taxMonth = thisMonth;
        }

        // Every turn's income is recorded, whatever the turn's length — the
        // running clock ticks a day at a time, and a month's bill has to be
        // built out of thirty of those.
        //
        // An accountant shelters a slice of it. This is a REAL effect on a real
        // number: the tax screen's "earned this year" is the figure the bill is
        // worked out on, so a deduction that only existed in the prose would
        // show up as a promise the tax line contradicts.
        state.taxYearIncome = (state.taxYearIncome ?? 0) + turnIncome * (1 - crew.deductionRate);

        // ── WITHHOLDING IS MONTHLY ────────────────────────────────────
        // It used to be charged on EVERY turn with the cumulative method. The
        // money was the same in the end, but it came out in a hundred small
        // pieces — a player watching the running clock saw tax leave on a
        // single day's earnings and reasonably read it as a daily tax.
        //
        // The trigger is the MONTH BOUNDARY, not the +1 Month button, so a
        // player who never sims is still billed the moment the clock rolls the
        // month over. The method stays cumulative: the bill is worked out on
        // the whole year so far and only the gap against what has already been
        // paid is taken, so a month that was missed is made up by the next one
        // and a year that ends badly does not leave you having overpaid on a
        // good spring.
        if (state.taxMonth !== thisMonth) {
          const withholding = monthlyWithholding({
            yearToDateIncome: state.taxYearIncome,
            yearToDatePaid: state.taxPaidThisYear ?? 0,
          });
          if (withholding.due > 0.5) {
            state.player.career.money -= withholding.due;
            state.taxPaidThisYear = (state.taxPaidThisYear ?? 0) + withholding.due;
            state.taxPaidLifetime = (state.taxPaidLifetime ?? 0) + withholding.due;
            ledgerEntries.set('tax', -(ledgerEntries.get('tax') ?? 0) - withholding.due);
            log.push(
              `🏛️ Tax withholding ${money0(withholding.due)} for the month — you are keeping ${pct0(1 - withholding.bill.effectiveRate)} of what you earn.`,
            );
          }
          state.taxMonth = thisMonth;
        }

        // ─── INBOUND: SOMEBODY WANTS YOU ON THEIR RECORD ──────────────
        // The complaint this answers is "I am famous now and nobody has asked
        // me for a verse". The outbound system has always let the player ask;
        // nothing ever asked THEM. So once the player is actually worth asking,
        // artists come to them — and the player is the one quoting a number.
        //
        // Two details matter more than they look:
        //
        //  · It only asks about artists who have RELEASED something, because
        //    you cannot be asked onto a record that does not exist.
        //  · `weeksElapsed` scales the chance, because this runs once per
        //    `advanceTurn` whatever the unit — without it, tapping +1 Day would
        //    generate thirty times the asks of skipping a month.
        if (state.player) {
          const openAsks = state.inboundRequests.filter(
            (r) => r.status === 'open' || r.status === 'agreed',
          );
          const busy = state.inboundRequests
            .filter((r) => r.status === 'open')
            .map((r) => r.npcId);

          // How hot the player is right now: the best record they have put out
          // in the last couple of months. A record that is still moving is the
          // single most common reason anybody picks up the phone.
          let recentHeat = 0;
          for (const s of rawSongs) {
            if (!isReleased(s)) continue;
            if ((s.weeksOut ?? 99) > 8) continue;
            if (s.quality > recentHeat) recentHeat = s.quality;
          }

          const artistPool = rawNPCs.filter((n) => n.role === 'artist');
          const releasedOwners = new Set(
            (state.npcSongs as Song[])
              .filter((s) => s.ownerId && s.releaseDate)
              .map((s) => s.ownerId as string),
          );

          const ask = generateInboundAsk({
            playerFame: blendedFame(state.player),
            playerGenre: state.player.genre,
            playerCountry: state.player.country,
            recentHeat,
            pool: artistPool
              .filter((n) => releasedOwners.has(n.id))
              .map((n) => n as unknown as InboundCandidate),
            busyIds: busy,
            openCount: openAsks.length,
            weeksElapsed: days / 7,
            roll: Math.random(),
          });

          if (ask.npc) {
            const host = (state.npcSongs as Song[]).find(
              (s) => s.ownerId === ask.npc!.id && s.releaseDate,
            );
            const npc = rawNPCs.find((n) => n.id === ask.npc!.id);
            // A record to be asked onto. Without one there is no ask, however
            // much they rate the player.
            if (host && npc) {
              openInboundAsk(state, npc, host, ask.reason);
              // Deliberately NOT pushed into `log`.
              //
              // The turn feed is ten lines and it belongs to the turn's own
              // receipts. An ask already reaches the player three other ways —
              // a notification, a DM and a letter in the Mailbox — and pushing
              // it here as well meant that on a busy month it evicted the
              // manager line from the feed, which is the same event delivered
              // once and lost once.
            }
          }
        }

        // ─── AN AGREED VERSE NOBODY SENT ──────────────────────────────
        // The player is paid at AGREEMENT and delivers afterwards, which is the
        // deal they were offered. The upside of delivering is the credit — the
        // fame, the momentum, the relationship — so a player who wants only the
        // money can take it and never write a bar. That is a real choice, but
        // it is not a free one: an artist who has paid for a verse and is still
        // waiting on it eventually notices, and eventually stops waiting.
        //
        // One nudge, then it lapses. The player keeps the fee either way — it
        // was paid — but the credit and the goodwill are gone.
        if (state.inboundRequests.length > 0) {
          for (const r of state.inboundRequests) {
            if (r.status !== 'agreed' || !r.agreedDate) continue;
            // The verse is already being written; the clock on this is the
            // waiting, not the work.
            const writing = (state.workItems ?? []).some(
              (w) => w.kind === 'verse' && (w.payload as VerseWork).requestId === r.id,
            );
            if (writing) continue;

            const agreed = parseGameDate(r.agreedDate);
            const waiting = agreed ? daysBetween(agreed, state.gameDate) : 0;
            if (waiting >= 45) {
              r.status = 'withdrawn';
              // Marks this as the PLAYER's failure to deliver, not the artist
              // walking off a high quote. Same status, opposite story.
              r.lapsed = true;
              const npc = state.npcs.find((n) => n.id === r.npcId);
              if (npc) {
                npc.relationshipScore = Math.max(-100, Math.min(100, npc.relationshipScore - 12));
                npc.memoryLog = [
                  ...npc.memoryLog.slice(-9),
                  `[Feature] Paid ${state.player!.artistName} for a verse and never got it.`,
                ];
              }
              log.push(`🚪 ${r.npcName} gave up waiting on the verse for "${r.npcSongTitle}".`);
            } else if (waiting >= 21 && !r.chased) {
              r.chased = true;
              const npc = state.npcs.find((n) => n.id === r.npcId);
              if (npc) {
                const thread = state.dmThreads[npc.id] ?? { npcId: npc.id, messages: [], unread: 0 };
                thread.messages.push({
                  id: uuidv4(),
                  npcId: npc.id,
                  fromPlayer: false,
                  content: `Any sign of that verse? I have paid for it and I am holding a slot on the record.`,
                  timestamp: new Date().toISOString(),
                  read: false,
                });
                thread.unread += 1;
                state.dmThreads[npc.id] = thread;
              }
              log.push(`⏳ ${r.npcName} is chasing the verse for "${r.npcSongTitle}".`);
            }
          }
        }

        // ─── WORK IN PROGRESS ─────────────────────────────────────────
        // Every job the player has committed to eats the days that just passed,
        // and the ones that are done land here. This sits at the END of the
        // tick on purpose: a master that is finished today starts earning
        // tomorrow, rather than being credited with streams from days it spent
        // as a rough.
        //
        // Money and energy were taken when the job was ORDERED, so nothing is
        // charged here — this only puts the finished thing in the player's
        // hands.
        if ((state.workItems ?? []).length > 0) {
          const stillWorking: WorkItem[] = [];
          for (const item of state.workItems) {
            item.daysDone += days;
            if (item.daysDone >= item.daysTotal) {
              finishWork(state, item, log);
            } else {
              stillWorking.push(item);
            }
          }
          state.workItems = stillWorking;
        }

        // ─── UPDATE EVENT LOG ─────────────────────────────────────────
        // `log` is built in CHRONOLOGICAL order with `push`, but the feed is
        // rendered newest-first and every other writer in this file `unshift`es
        // into it. `slice(0, 10)` therefore kept the turn's OLDEST ten lines and
        // silently discarded the tail — and the tail is where the money is: the
        // accountant's recovery, the stylist's brand cheque and the month's tax
        // withholding are all pushed last, so on any busy month the player never
        // saw any of them.
        //
        // So the player's own turn takes the feed, newest first, and the scene
        // gets whatever room is left — capped at three lines, because a dozen
        // NPC releases a month would otherwise bury the player's own business.
        // Nothing is lost by the cap: the full account of the turn is in
        // `lastTurnReport`, which the dashboard shows as a receipt.
        const WORLD_LINES = 3;
        // The tour dates get a reserved place rather than being folded into the
        // tail of `log`, where a busy month would cut them. They stay in
        // chronological order: they happened first, so they read last.
        //
        // The reservation is generous on purpose. A night the player PLAYED is
        // the last thing that should ever be dropped from the feed, so a run of
        // up to six dates gets all of its lines even on a month turn where the
        // payroll and the tax are competing for the same ten. Six is the ceiling
        // because a run longer than that spans more than one tick anyway, and a
        // feed that is nothing but tour lines is not a feed. Anything squeezed
        // out is still itemised in `lastTurnReport`, and the tour's own panel
        // keeps every leg's takings.
        const TOUR_LINES_MAX = 6;
        const reserved = tourLines.slice(-TOUR_LINES_MAX);
        const keep = Math.max(0, 10 - reserved.length);
        const mine = [
          ...log.slice(-keep).reverse(),
          ...reserved.slice().reverse(),
        ];
        const room = Math.max(0, 10 - mine.length);
        const world = room > 0 ? worldLog.slice(-Math.min(WORLD_LINES, room)).reverse() : [];
        state.lastEventLog = [...mine, ...world].slice(0, 10);

        // ─── THE TURN REPORT ──────────────────────────────────────────
        // `ledgerEntries` was drained at the top of the tax block and has been
        // added to since, so this is the complete account of the turn. A
        // `silent` turn (the background clock catching up) still drains it and
        // writes nothing, so the player is never handed a receipt for time they
        // did not ask to pass.
        if (!opts?.silent) {
          state.lastTurnReport = buildTurnReport({
            turnCount: state.turnCount,
            unit,
            days,
            fromDate,
            toDate: formatGameDate(state.gameDate),
            moneyBefore,
            moneyAfter: state.player.career.money,
            entries: ledgerEntries,
            streams: totalWeeklyStreams,
            fans: fanGrowth,
            energyBefore,
            energyAfter: state.player.energy,
          }) as TurnReport;
        }

        // ─── SAVE ────────────────────────────────────────────────────
        const stateSnapshot = {
          initialized: state.initialized,
          player: state.player,
          songs: state.songs,
          albums: state.albums,
          // `rawNPCs` is the same array `raw(state.npcs)` would rebuild — and
          // rebuilding it means a second deep clone of the 11.6k roster. The
          // tick never mutates `state.npcs` (verified: the only other touch is
          // a read-only `.find`), so the start-of-tick view is still exact.
          npcDeltas: collectNPCDeltas(rawNPCs),
          dmThreads: state.dmThreads,
          socialPosts: state.socialPosts.slice(0, 100),
          mailbox: state.mailbox,
          contracts: state.contracts,
          crew: state.crew,
          shows: state.shows,
          cityMarkets: state.cityMarkets,
          tours: state.tours,
          scheduledShows: state.scheduledShows,
          showOffers: state.showOffers,
          bookedGigs: state.bookedGigs,
          studio: state.studio,
          beefs: state.beefs,
          feedRefreshedAt: state.feedRefreshedAt,
          tagQuota: state.tagQuota,
          investments: state.investments,
          businesses: state.businesses,
          label: state.label ?? null,
          ownedAssets: state.ownedAssets,
          awards: state.awards,
          certifications: state.certifications,
          openThreads: state.openThreads,
          interviews: state.interviews,
          headlines: state.headlines.slice(0, 50),
          charts: state.charts,
          weeklyStatements: state.weeklyStatements.slice(0, 20),
          gameDate: state.gameDate,
          clockMinute: state.clockMinute,
          clockPaused: state.clockPaused,
          clockSpeed: state.clockSpeed,
          turnCount: state.turnCount,
          lastEventLog: state.lastEventLog,
          cityFame: state.cityFame,
          sampleClearances: state.sampleClearances,
          payolaCampaigns: state.payolaCampaigns,
          scoutMissions: state.scoutMissions,
          industryNotices: state.industryNotices.slice(0, 40),
          family: state.family,
          legacy: state.legacy,
          npcSongs: state.npcSongs,
          trending: state.trending,
          featureRequests: state.featureRequests,
          inboundRequests: state.inboundRequests,
          workItems: state.workItems,
          jobBoard: state.jobBoard,
          jobShifts: state.jobShifts,
          jobBoardTurn: state.jobBoardTurn,
          // The tax year has to survive a reload, or closing the tab mid-year
          // wipes the liability and the player keeps everything. `taxMonth` is
          // the monthly withholding cursor and matters just as much: lose it
          // and the next tick bills the whole year again.
          taxYear: state.taxYear,
          taxMonth: state.taxMonth,
          taxYearIncome: state.taxYearIncome,
          taxPaidThisYear: state.taxPaidThisYear,
          taxPaidLifetime: state.taxPaidLifetime,
        };
        saveToActiveSlot(state, stateSnapshot);
      }),

    /** The player has read the report — take it down. */
    dismissTurnReport: () =>
      set((state) => {
        state.lastTurnReport = null;
      }),

    // ─── THE RUNNING CLOCK ──────────────────────────────────────────────
    //
    // The clock is not decoration. It advances game minutes on a real timer and,
    // when it passes midnight, hands the day to `advanceTurn` — the same tick a
    // manual "+1 Day" uses. That is deliberate: a second simulation path would
    // drift from the first, and the world would then have two versions of
    // itself depending on how the player got there.
    advanceClock: (minutes) => {
      const before = get();
      if (!before.player || before.clockPaused) return;

      const next = (before.clockMinute ?? 0) + minutes;
      if (next < MINUTES_PER_DAY) {
        set((state) => {
          state.clockMinute = next;
        });
        return;
      }

      // Roll the remainder onto the new day first, so the day tick's auto-save
      // writes a clock that already belongs to the date it saves.
      const days = Math.floor(next / MINUTES_PER_DAY);
      set((state) => {
        state.clockMinute = next % MINUTES_PER_DAY;
      });

      // A tab left in the background can owe a lot of days. Capped, because
      // each one is a full tick and an uncapped catch-up on a week-old tab
      // would stall the frame it lands on.
      const owed = Math.min(days, MAX_CLOCK_CATCHUP_DAYS);
      // Silent: this is time the player did not ask for, so it must not raise a
      // turn report. Only the explicit +1 Day / +1 Week / +1 Month do that.
      for (let i = 0; i < owed; i++) get().advanceTurn('day', { silent: true });
    },

    // ─── SLEEP ──────────────────────────────────────────────────────────
    //
    // The other way back up, and the cheap one in time. Letting a whole day run
    // refills you completely but costs the day; three hours of sleep does the
    // same and costs three hours. That is the whole trade, and it is why the
    // rest control exists next to the clock rather than instead of it.
    rest: (minutes) => {
      const before = get();
      if (!before.player) return { ok: false, message: 'There is nobody to put to bed.' };

      const p = before.player;
      const refusal = restRefusal(minutes, p.energy, p.maxEnergy);
      if (refusal) return { ok: false, message: refusal };

      const from = Math.round(p.energy);
      // A personal assistant scales the GAIN, not the total. Scaling the total
      // would push past the ceiling and then be clamped back to it, so the
      // whole benefit would land in the range where there was nothing left to
      // recover — a mechanic that reads as working and does nothing.
      const base = restRecovery(minutes, p.energy, p.maxEnergy);
      const restMult = crewBonuses(before.crew).energyRecovery;
      const recovered = Math.min(
        p.maxEnergy,
        Math.round(p.energy + (base - p.energy) * restMult),
      );
      // Does this rest run past midnight? If it does the day has to be
      // processed, exactly as the clock would have done it.
      const totalMinutes = (before.clockMinute ?? 0) + minutes;
      const daysRolled = Math.floor(totalMinutes / MINUTES_PER_DAY);

      set((state) => {
        if (!state.player) return;
        state.player.energy = recovered;
        state.clockMinute = totalMinutes % MINUTES_PER_DAY;
      });

      // Silent, and capped for the same reason the clock is: a nap that crosses
      // midnight is one day, not a receipt.
      for (let i = 0; i < Math.min(daysRolled, MAX_CLOCK_CATCHUP_DAYS); i++) {
        get().advanceTurn('day', { silent: true });
      }

      const after = Math.round(get().player?.energy ?? recovered);
      const hours = minutes >= 60
        ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`
        : `${minutes} min`;

      return {
        ok: true,
        message: `Slept ${hours}. Energy ${from} → ${after}.`,
      };
    },

    setClockPaused: (paused) =>
      set((state) => {
        state.clockPaused = paused;
      }),

    setClockSpeed: (speed) =>
      set((state) => {
        state.clockSpeed = speed;
      }),

    // ─── STATS ──────────────────────────────────────────────────────────
    updatePlayerStat: (stat, amount) =>
      set((state) => {
        if (!state.player) return;
        state.player.stats[stat] = Math.max(0, Math.min(100, state.player.stats[stat] + amount));
      }),

    // ─── TRAINING ───────────────────────────────────────────────────────
    trainStat: (stat, intensity) =>
      set((state) => {
        if (!state.player) return;

        const cost = TRAINING_COST[intensity];
        const days = TRAINING_DAYS[intensity];
        const current = state.player.stats[stat];

        if (state.player.career.money < cost) return;
        if (current >= 100) return;
        if (!spendEnergy(state, trainingEnergy(intensity))) return;

        const gain = trainingGain(current, intensity);

        state.player.career.money -= cost;
        state.player.stats[stat] = Math.min(100, current + gain);

        const coach = COACHES[stat];
        state.lastEventLog.unshift(
          `${coach ? coach.emoji : '🏋️'} Trained ${stat} (+${gain}) over ${days} days — $${cost.toLocaleString()}`,
        );
        state.lastEventLog = state.lastEventLog.slice(0, 10);

        // Time passes. The date and the turn counter move directly rather than
        // through `advanceTurn`, because training has already charged its own
        // cost and logged its own line. The streaming cursor is left alone, so
        // the next real turn picks these days up — no day is skipped, it is
        // only settled later.
        state.gameDate = advanceDate(state.gameDate, days) as typeof state.gameDate;
        state.turnCount += 1;
      }),

    // A direct setter for arranging a world, not something the player does.
    // See the interface declaration for why the free button that used to call
    // this was removed rather than rebalanced.
    updateNPCRelationship: (npcId, change) =>
      set((state) => {
        const npc = state.npcs.find(n => n.id === npcId);
        if (npc) {
          npc.relationshipScore = Math.max(-100, Math.min(100, npc.relationshipScore + change));
        }
      }),

    resolveOpenThread: (threadId) =>
      set((state) => {
        const thread = state.openThreads.find(t => t.id === threadId);
        if (thread) thread.resolved = true;
      }),

    // ─── STREAMING / CHARTS / VIDEO ACTIONS ──────────────────────────────

    setScreenCountry: (screenKey, country) =>
      set((state) => {
        if (!state.screenCountry) state.screenCountry = {};
        state.screenCountry[screenKey] = country;
        if (!state.recentCountries) state.recentCountries = [];
        const home = state.player?.country;
        state.recentCountries = [
          country,
          ...state.recentCountries.filter((c) => c !== country),
        ]
          // The home country is pinned separately in the picker, so it does not
          // need to occupy one of the recent slots.
          .filter((c) => c !== home)
          .slice(0, 5);
      }),

    subscribe: (artistId, artistName, kind) =>
      set((state) => {
        if (!state.subscriptions) state.subscriptions = [];
        const exists = state.subscriptions.some(
          (s) => s.artistId === artistId && s.kind === kind,
        );
        if (exists) return;
        state.subscriptions.push({
          artistId,
          artistName,
          kind,
          subscribedAt: formatDateString(state.gameDate),
          lastNotified: dateToSerial(state.gameDate),
        });
      }),

    unsubscribe: (artistId, kind) =>
      set((state) => {
        if (!state.subscriptions) return;
        state.subscriptions = state.subscriptions.filter(
          (s) => !(s.artistId === artistId && s.kind === kind),
        );
      }),

    recordWatch: (videoId) =>
      set((state) => {
        if (!state.watchHistory) state.watchHistory = [];
        state.watchHistory = [
          videoId,
          ...state.watchHistory.filter((v) => v !== videoId),
        ].slice(0, 60);
      }),

    reactToVideo: (videoId, value) =>
      set((state) => {
        const video = (state.videos ?? []).find((v) => v.id === videoId);
        if (!video) return;
        if (!state.videoReactions) state.videoReactions = {};
        const previous = state.videoReactions[videoId];

        // Undo the old reaction before applying the new one, so a change of mind
        // never leaves a vote behind and the same button cannot be spammed.
        if (previous === 1) video.likes = Math.max(0, video.likes - 1);
        if (previous === -1) video.dislikes = Math.max(0, video.dislikes - 1);

        if (previous === value) {
          delete state.videoReactions[videoId];
          return;
        }
        if (value === 1) video.likes += 1;
        else video.dislikes += 1;
        state.videoReactions[videoId] = value;
      }),

    markNotificationRead: (id) =>
      set((state) => {
        const n = (state.notifications ?? []).find((x) => x.id === id);
        if (n) n.read = true;
      }),

    markAllNotificationsRead: () =>
      set((state) => {
        for (const n of state.notifications ?? []) n.read = true;
      }),

    clearNotifications: () =>
      set((state) => {
        state.notifications = [];
      }),

    // ─── SAVE/LOAD ───────────────────────────────────────────────────────
    saveGame: () => {
      const state = get();
      if (!state.activeSlotId) {
        set((s) => {
          s.saveError =
            'This career is not attached to a save slot, so nothing is being written. ' +
            'Start a new career, or open one from the careers list.';
        });
        return;
      }
      const result = writeSlot(state.activeSlotId, {
        initialized: state.initialized,
        player: state.player,
        songs: state.songs,
        albums: state.albums,
        npcDeltas: collectNPCDeltas(raw(state.npcs) as NPC[]),
        dmThreads: state.dmThreads,
        socialPosts: state.socialPosts.slice(0, 100),
        mailbox: state.mailbox,
        contracts: state.contracts,
        crew: state.crew,
        shows: state.shows,
        cityMarkets: state.cityMarkets,
        tours: state.tours,
          scheduledShows: state.scheduledShows,
          showOffers: state.showOffers,
          bookedGigs: state.bookedGigs,
        studio: state.studio,
        beefs: state.beefs,
        feedRefreshedAt: state.feedRefreshedAt,
        tagQuota: state.tagQuota,
        investments: state.investments,
        businesses: state.businesses,
        label: state.label ?? null,
        ownedAssets: state.ownedAssets,
        awards: state.awards,
        certifications: state.certifications,
        openThreads: state.openThreads,
        interviews: state.interviews,
        headlines: state.headlines.slice(0, 50),
        charts: state.charts,
        weeklyStatements: state.weeklyStatements.slice(0, 20),
        gameDate: state.gameDate,
        clockMinute: state.clockMinute,
        clockPaused: state.clockPaused,
        clockSpeed: state.clockSpeed,
        turnCount: state.turnCount,
        lastEventLog: state.lastEventLog,
        cityFame: state.cityFame,
        sampleClearances: state.sampleClearances,
        payolaCampaigns: state.payolaCampaigns,
        scoutMissions: state.scoutMissions,
        industryNotices: state.industryNotices.slice(0, 40),
        family: state.family,
        legacy: state.legacy,
        npcSongs: state.npcSongs,
        trending: state.trending,
        featureRequests: state.featureRequests,
        inboundRequests: state.inboundRequests,
        workItems: state.workItems,
        jobBoard: state.jobBoard,
        jobShifts: state.jobShifts,
        jobBoardTurn: state.jobBoardTurn,
        // Tax. A reload mid-year must not wipe the liability, and a reload
        // mid-month must not re-bill the month.
        taxYear: state.taxYear,
        taxMonth: state.taxMonth,
        taxYearIncome: state.taxYearIncome,
        taxPaidThisYear: state.taxPaidThisYear,
        taxPaidLifetime: state.taxPaidLifetime,
        // ── Streaming, charts and video ──────────────────────────────────
        platformStats: state.platformStats,
        streamCursor: state.streamCursor,
        chartWeekCursor: state.chartWeekCursor,
        globalSongs: state.globalSongs,
        globalAlbums: state.globalAlbums,
        chartRuns: state.chartRuns,
        chartMilestones: state.chartMilestones,
        globalCerts: state.globalCerts,
        npcAlbums: state.npcAlbums,
        screenCountry: state.screenCountry,
        recentCountries: state.recentCountries,
        subscriptions: state.subscriptions,
        notifications: state.notifications,
        videos: state.videos,
        videoComments: state.videoComments,
        videoReactions: state.videoReactions,
        commentReactions: state.commentReactions,
        watchHistory: state.watchHistory,
      });
      set((s) => {
        s.saveError = result.ok ? null : result.error;
      });
    },

    /** Open a career that is already on disk, without disturbing the others. */
    loadSlot: (slotId) => {
      const saved = readSlot(slotId);
      if (!saved || !saved.player) return false;
      set((state) => {
        applySlotPayload(state, saved);
        // The payload does not carry its own slot id — that belongs to the
        // index, not the career — so it is set here, after the merge, or the
        // next auto-save would have nowhere to go.
        state.activeSlotId = slotId;
      });
      setActiveSlot(slotId);
      return true;
    },

    /** Resume whichever career was last played. */
    loadGame: () => {
      const index = readIndex();
      if (!index.activeSlotId) return false;
      return get().loadSlot(index.activeSlotId);
    },

    /** Every career on disk, newest first. */
    listSaves: () => readIndex().slots,

    /**
     * Start a career in a slot of its own.
     *
     * This is the fix for the bug where starting a new career destroyed the old
     * one: `newGame` used to `removeItem` the single save key. Nothing is
     * deleted now — a new career is a new slot, and the previous ones are left
     * exactly where they are.
     */
    newCareer: () => {
      const index = readIndex();
      if (index.slots.length >= MAX_SLOTS) {
        set((s) => {
          s.saveError =
            `You are already keeping ${MAX_SLOTS} careers, which is as many as this ` +
            'browser will hold. Delete one you are finished with, then start another.';
        });
        return false;
      }
      const id = newSlotId();
      set((state) => {
        Object.assign(state, getInitialState());
        state.activeSlotId = id;
        state.initialized = true;
        state.saveError = null;
      });
      setActiveSlot(id);
      return true;
    },

    /**
     * Throw a career away for good.
     *
     * If it was the one being played, the player has to end up somewhere: the
     * most recent other career, or the splash screen if that was the last one.
     * Leaving them on a dashboard for a career that no longer exists would be
     * the same class of bug as the one this whole change is fixing.
     */
    deleteSlot: (slotId) => {
      const index = readIndex();
      if (!index.slots.some((s) => s.id === slotId)) return false;
      const wasActive = index.activeSlotId === slotId;
      removeSlot(slotId);
      set((state) => {
        if (wasActive) {
          const next = readIndex().activeSlotId;
          const saved = next ? readSlot(next) : null;
          if (next && saved && saved.player) {
            applySlotPayload(state, saved);
            state.activeSlotId = next;
          } else {
            Object.assign(state, getInitialState());
          }
        }
        state.saveError = null;
      });
      return true;
    },

    /** Give a career a name the player will recognise. */
    renameSlot: (slotId, label) => {
      renameSaveSlot(slotId, label);
      set((state) => {
        state.saveError = null;
      });
    },

    /**
     * The splash screen's "start new career".
     *
     * It used to be `Object.assign(state, getInitialState())` plus
     * `localStorage.removeItem(SAVE_KEY)` — which is to say, it deleted the
     * only save that existed. It now opens a slot of its own and leaves every
     * other career alone.
     */
    newGame: () => {
      get().newCareer();
    },
  }))
);

// ─── ONE-TIME MIGRATION ─────────────────────────────────────────────────────
//
// This game shipped with a single save at one fixed key. The first time this
// build runs, that career is moved into a slot of its own so the player does
// not lose it — and the old key is only removed after the copy has been read
// back and compared, so an interrupted migration leaves the original intact
// rather than destroying the only copy of somebody's career.
adoptLegacySave();
