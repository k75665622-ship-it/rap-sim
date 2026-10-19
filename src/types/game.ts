// ─── CORE GAME TYPES ───────────────────────────────────────────────────────

import type { BeatsState } from '../sim/beats';
import type { LiveTarget, Story, LiveSession } from '../sim/socialLive';
import type { IvQuestion, IvEffect } from '../sim/interviews';
import type { MarketState, Portfolio } from '../sim/markets';
import type { Venture } from '../sim/ventures';
import type { DevProject } from '../sim/realestate';
import type { BlackjackHand, Fixture, SportsBet } from '../sim/casino';
import type { FootballState } from '../sim/football';
import type { DripState } from '../sim/drip';
import type { HomeState, OwnedHome } from '../sim/home';
import type { Loan } from '../sim/bank';
import type { Memory } from '../sim/memories';
import type { Look } from '../sim/look';

export type Background = 'broke_hustler' | 'middle_class' | 'industry_connect';
export type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
export type Genre =
  | 'hip_hop' | 'afrobeats' | 'drill' | 'trap' | 'conscious' | 'pop_rap' | 'dancehall' | 'grime'
  // Added later: the sung and the played side of the scene.
  | 'rnb' | 'neo_soul' | 'pop' | 'amapiano' | 'highlife' | 'gospel' | 'reggae'
  | 'jazz_rap' | 'boom_bap' | 'alte' | 'latin' | 'rock';
export type RelationshipStage = 'acquainted' | 'flirting' | 'dating' | 'engaged' | 'married' | 'broken_up' | 'divorced';
export type NPCTier = 'local' | 'national' | 'international';
export type NPCRole = 'artist' | 'manager' | 'lawyer' | 'label_ceo' | 'media' | 'fan_account' | 'publicist' | 'producer' | 'radio_owner' | 'rival_manager' | 'ar'
  // Scene infrastructure — the people who make a music city work.
  | 'engineer' | 'promoter' | 'blogger' | 'dj' | 'stylist' | 'photographer' | 'songwriter' | 'session_musician'
  | 'distributor' | 'investor' | 'venue_owner' | 'a_and_r_scout' | 'choreographer' | 'tour_manager'
  // The Artist's Personal Team — the seats nobody in the scene sits in.
  // Assigned by a stable overlay in `sim/roles.ts`, never by the roster draw:
  // adding them to `ROLE_WEIGHTS` would shift every generated NPC's name,
  // tier and fame, and the roster is the world's spine.
  | 'personal_assistant' | 'accountant' | 'trainer' | 'vocal_coach';
export type Platform = 'chirp' | 'snapgram' | 'clip' | 'circle' | 'pingchat' | 'mailbox';
export type TurnUnit = 'day' | 'week' | 'month';
export type SongVersion = 'original' | 'remix' | 'acoustic' | 'live' | 'clean' | 'extended' | 'deluxe';

// ─── ARTIST STATS (18 STATS) ──────────────────────────────────────────────

export interface ArtistStats {
  // Craft
  lyricism: number;
  flow: number;
  delivery: number;
  vocalAbility: number;
  songwriting: number;
  freestyle: number;
  // Performance
  stagePresence: number;
  performance: number;
  charisma: number;
  // Business
  marketing: number;
  networking: number;
  businessKnowledge: number;
  discipline: number;
  beatSelection: number;
  productionKnowledge: number;
  // X-Factor
  creativity: number;
  originality: number;
  consistency: number;
}

export interface CareerStats {
  localFame: number;
  nationalFame: number;
  internationalFame: number;
  fanbase: number;
  money: number;
  reputation: number;
  momentum: number;
  totalStreams: number;
  totalEarnings: number;
}

// ─── PLAYER ──────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  artistName: string;
  realName: string;
  dateOfBirth: string; // ISO date
  age: number;
  gender: Gender;
  genre: Genre;
  continent: string;
  country: string;
  city: string;
  background: Background;
  stats: ArtistStats;
  career: CareerStats;
  /**
   * Daily energy budget, 0..maxEnergy. Every action that takes real effort —
   * recording, touring, training, a shift at a job — spends it. It refills only
   * when time passes (any `advanceTurn`), which is what stops the player from
   * touring back-to-back forever.
   */
  energy: number;
  maxEnergy: number;
  createdAt: string;
  /** How they look: body, face, hair, tattoos and the fit they have on. */
  look?: Look;
}

// ─── SONGS ───────────────────────────────────────────────────────────────

export interface Song {
  id: string;
  title: string;
  genre: Genre;
  quality: number; // 0-100
  releaseDate: string;
  marketingBudget: number;
  totalStreams: number;
  weeklyStreams: number;
  totalEarnings: number;
  version: SongVersion;
  originalSongId?: string; // for remixes/versions
  featuredArtists: string[]; // NPC ids
  chartPositions: Record<string, number>; // country → position
  certifications: string[]; // e.g. "Ghana:Gold", "Nigeria:Platinum"
  hasVideo: boolean;
  videoViews: number;
  /** Blended per-stream rate actually paid last tick, from streaming platforms. */
  lastRatePerStream?: number;

  // ── Studio session (player songs recorded through the editor) ──────────
  /** Beats per minute chosen in the editor. */
  bpm?: number;
  /** Emotional register — drives how the record lands critically vs commercially. */
  mood?: SongMood;
  /** The lyric sheet as written. Kept so it can be reopened and continues to count. */
  lyrics?: string;
  /** Sub-scores 0-100, computed from the session inputs. */
  lyricsQuality?: number;
  productionQuality?: number;
  /** Who actually wrote the sheet, when it was not the artist. */
  ghostwriterId?: string;
  ghostwriterName?: string;
  /** Best this production could sound after a proper mix session. */
  productionCeiling?: number;
  vocalPerformance?: number;
  /** Chemistry between the player and any featured artists, 0-100. */
  chemistry?: number;
  /** Producer credit — an NPC id, or undefined when self-produced. */
  producerId?: string;
  producerName?: string;
  producerSkill?: number;
  /** The specific beat used, from the producer's catalogue. */
  beatId?: string;
  beatName?: string;
  beatQuality?: number;
  /** Display names of features, resolved at record time. */
  featureArtistNames?: string[];
  /** How far the record is expected to travel commercially, 0-100, hidden from the player. */
  commercialPotential?: number;
  /** How the critics are likely to receive it, 0-100. Hidden from the player. */
  criticalPotential?: number;
  /** What the session actually cost. */
  recordingCost?: number;
  /** Recorded but not yet out. Only a master can be released. */
  masterStatus?: MasterStatus;
  /** In-game date the session wrapped. */
  recordingDate?: string;
  /**
   * Where the record was tracked — the room's id and its display name.
   *
   * Optional, so a master recorded before the room system existed simply has no
   * room rather than a wrong one. A rented room is a booking, not an asset, so
   * the NAME is stored alongside the id: the catalogue is code, and a save must
   * still be able to say where a record was made if a room is ever retired.
   */
  roomId?: string;
  roomName?: string;
  /**
   * Production points the room actually contributed on the day.
   *
   * Stored, not re-derived. A re-score has to reproduce the take that exists,
   * and the player's gear can change between recording a master and editing its
   * words — reading the live studio would silently re-track an old record on
   * newer equipment. A room you rented once is not a room you still have.
   */
  studioBonus?: number;
  /** Vocal sliders as set in the booth, 0-100 each. */
  vocalSettings?: VocalSettings;
  /**
   * The platforms the record was actually delivered to at release.
   *
   * `undefined` means "everywhere" — which is what NPC records and every save
   * written before distribution was a choice carry. An array is an explicit
   * delivery list, and the engine only earns streams on those platforms: the
   * share of the world you skipped is audience you never reached.
   */
  platformIds?: string[];

  // ── Lineage, vault state ───────────────────────────────────────────────
  /**
   * How this record derives from another, when it does. `originalSongId` alone
   * cannot say *what kind* of derivation it is: a re-record is still the same
   * song (version stays `original`) while a remix is a new reading of it.
   */
  lineage?: 'remix' | 'rerecord' | 'deluxe';
  /** For a re-record: which take this is. The first recording is take 1. */
  takeNumber?: number;
  /**
   * Archived. Out of the active vault, but the record and its numbers are still
   * there — archiving is not deleting, and only the player can do either.
   */
  archivedAt?: string;
  /** The player has flagged this master as ready to go out. */
  readyToRelease?: boolean;
  /** Free-text note the player left on a vault master. */
  vaultNote?: string;
  /** The mixtape this record was filed under, if any. */
  mixtapeId?: string;
  /**
   * Second winds this record has been given — a remix landing, a deluxe.
   *
   * It lives on the SONG, not only on the streaming state, because the
   * streaming state is derived and is rebuilt from the seed on every load. A
   * push the player paid for is a fact about the record, so it has to survive
   * the reload; the engine copies these into whatever state it rebuilds.
   */
  revivals?: Revival[];

  // ── Ownership (NPC songs carry these; player songs leave them undefined) ──
  ownerId?: string;          // npc id — the artist who owns the song
  ownerName?: string;        // display name for charts
  ownerCountry?: string;     // home market, drives regional chart strength
  weeksOut?: number;         // weeks since release, drives the trajectory curve
  peakWeeklyStreams?: number;
  /** Set on records released through the player's own label. */
  labelName?: string;
  /** Share of the artist's audience this record reaches (album deep cuts < 1). */
  streamWeight?: number;
}

/** Where a record sits in its life cycle. */
export type MasterStatus = 'recorded' | 'mixed' | 'mastered' | 'released';

/** The five booth sliders, each 0-100. */
export interface VocalSettings {
  delivery: number;
  energy: number;
  pitch: number;
  flow: number;
  performance: number;
}

/** Emotional register of a record. Affects critical vs commercial pull. */
export type SongMood =
  | 'aggressive'
  | 'melancholy'
  | 'celebratory'
  | 'introspective'
  | 'sensual'
  | 'defiant';


export interface Album {
  id: string;
  title: string;
  songs: string[]; // song ids
  releaseDate: string;
  totalStreams: number;
  totalEarnings: number;
  certifications: string[];
  // ── Projects (albums / EPs / deluxe) ───────────────────────────────────
  /** npc id or player id. Absent on the legacy player album records. */
  ownerId?: string;
  ownerName?: string;
  ownerCountry?: string;
  type?: 'album' | 'ep' | 'deluxe' | 'mixtape';
  /** Deluxe editions merge their units into this album's totals. */
  originalAlbumId?: string;
  /** Stable seed for the artwork tile. */
  coverSeed?: number;
  /** Absolute game day serial of release, so album age is exact. */
  releaseSerial?: number;
}

// ─── STREAMING (per-platform, per-country) ────────────────────────────────

/** One platform's slice of one song. Mirrors `PlatformSlice` in sim/streaming. */
export interface PlatformSlice {
  /** Lifetime units — streams, or downloads on iTunes. */
  t: number;
  /** Last 7 daily values, oldest first. */
  d: number[];
}

/**
 * Everything the streaming engine knows about one song. Seeded, so a given
 * song/platform/day always produces the same figure.
 */
export interface SongPlatformState {
  seed: number;
  release: number;
  peakDay: number;
  /** Last 30 daily totals, oldest first. */
  hist: number[];
  byPlatform: Record<string, PlatformSlice>;
  /**
   * Fresh pushes this record has had since it came out — a remix landing, a
   * deluxe edition, a sync. Each one lifts the decay curve for a window around
   * its day, which is how a well-timed remix gives an ageing song a second
   * wind instead of a footnote.
   */
  revivals?: Revival[];
}

/** One second wind, planted on a specific game day. */
export interface Revival {
  /**
   * The record's own age, in days, when the push landed. Age rather than a date
   * on purpose: the lift belongs to the record's life cycle, so it stays
   * correct no matter what happens to the game clock afterwards.
   */
  at: number;
  /** Peak multiplier, 0.4 = +40% at the centre. */
  power: number;
  /** Half-width in days; the lift decays as a bell. */
  width: number;
  /** Why it happened, for the record page. */
  reason: string;
}

// ─── GLOBAL CHARTS ────────────────────────────────────────────────────────

export type ChartMovement = 'new' | 'reentry' | 'up' | 'down' | 'same';

export interface ChartRow {
  /** song id (Top 100) or album id (Top 200). */
  itemId: string;
  title: string;
  artistId: string;
  artistName: string;
  artistCountry: string;
  position: number;
  /** 0 when the item was not on last week's chart. */
  lastPosition: number;
  peak: number;
  weeks: number;
  weeksAtNo1: number;
  /** Points (songs) or album-equivalent units (albums). The headline metric. */
  metric: number;
  movement: ChartMovement;
  /** Places gained or lost, 0 when new/same. */
  delta: number;
  isPlayer: boolean;
  /** True when this item has ever been at #1. */
  hasTopped: boolean;

  // Songs
  streams?: number;
  premiumStreams?: number;
  freeStreams?: number;
  purchases?: number;
  radio?: number;
  videoViews?: number;
  /** Song id this row's figures belong to, for a remix rolled into its original. */
  mergedFrom?: string[];

  // Albums
  pureSales?: number;
  teu?: number;
  sea?: number;
  projectType?: 'album' | 'ep' | 'deluxe' | 'mixtape';
}

/** A saved run of positions for one item on one chart. */
export interface ChartRun {
  /** Positions, oldest first. `0` marks a week off the chart. */
  positions: number[];
  /** Serial of the most recent week recorded. */
  lastWeek: number;
}

export type MilestoneKind =
  | 'first_entry'
  | 'first_top10'
  | 'first_number_one'
  | 'biggest_debut'
  | 'longest_at_one'
  | 'certified';

export interface ChartMilestone {
  id: string;
  kind: MilestoneKind;
  chart: 'songs' | 'albums';
  itemId: string;
  itemTitle: string;
  artistId: string;
  artistName: string;
  /** The game date it happened on. */
  date: string;
  detail: string;
}

// ─── CERTIFICATIONS ───────────────────────────────────────────────────────

export type CertLevel = 'gold' | 'platinum' | 'diamond' | 'legendary';

export interface GlobalCertification {
  id: string;
  itemId: string;
  itemTitle: string;
  artistId: string;
  artistName: string;
  level: CertLevel;
  /** 1 for platinum, 3 for 3x platinum, and so on. */
  multiplier: number;
  units: number;
  awardedDate: string;
  /** Short badge label, e.g. "3x PLATINUM". */
  label: string;
}

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────

export interface Subscription {
  /** npc id, or 'player'. */
  artistId: string;
  artistName: string;
  kind: 'artist' | 'channel';
  subscribedAt: string;
  /** Last game day serial the player was notified about this artist. */
  lastNotified?: number;
}

// ─── VIDEO ────────────────────────────────────────────────────────────────

export type VideoStatus = 'draft' | 'published';

export interface Video {
  id: string;
  /** The song this video belongs to. Always a real record. */
  songId: string;
  songTitle: string;
  title: string;
  artistId: string;
  artistName: string;
  artistCountry: string;
  artistGenre?: Genre;
  /** Who directed it. 'self' for the player's own shoot. */
  directorId: string;
  directorName: string;
  concept: string;
  visualStyle: string;
  quality: number;
  budget: number;
  marketingBudget: number;
  status: VideoStatus;
  /** Game day serial of upload. */
  uploadSerial: number;
  /** In-game date string, for display. */
  uploadDate: string;
  /** Seeded minute-of-day, so "20 minutes ago" is possible on upload day. */
  minuteOfDay: number;
  durationSec: number;
  seed: number;
  /** Lifetime views. */
  views: number;
  likes: number;
  dislikes: number;
  /** Total comments. The rows themselves are generated on demand. */
  commentCount: number;
  /** Stable seed for the thumbnail tile. */
  thumbSeed: number;
  isPlayer: boolean;
  /** True once it has been pushed to the platform. */
  published: boolean;
  /** Best single day of views. */
  peakDay: number;
  /** Last 30 daily view counts, oldest first. */
  hist: number[];
  /** Set when the record is deleted from the platform by the player. */
  removed?: boolean;
  /**
   * Shot for a master that is not out yet. It sits in the vault until the song
   * is released, then it can be published — you no longer have to wait for a
   * release before you are allowed to shoot.
   */
  awaitingRelease?: boolean;
  /**
   * Featured artists who turned up to be in the video, and what the guest list
   * cost. Stored rather than derived: the relationship moves after the shoot,
   * and a video is a record of who was actually on set that day.
   */
  cameoArtistIds?: string[];
  cameoArtistNames?: string[];
  cameoCost?: number;
}

export type CommentMood = 'positive' | 'negative' | 'funny' | 'critical' | 'neutral';

export interface VideoComment {
  id: string;
  videoId: string;
  authorId: string;
  authorName: string;
  authorIsArtist: boolean;
  /** npc id of the artist, when the commenter is one. */
  authorArtistId?: string;
  content: string;
  likes: number;
  dislikes: number;
  mood: CommentMood;
  /** Game day serial. */
  daySerial: number;
  minuteOfDay: number;
  isPlayer: boolean;
  /** Set when this is a reply. */
  parentId?: string;
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────

export type NotificationKind =
  | 'chart_debut'
  | 'chart_move'
  | 'chart_number_one'
  | 'chart_exit'
  | 'certification'
  | 'milestone'
  | 'artist_release'
  | 'artist_video'
  | 'subscriber'
  | 'video_milestone'
  | 'feature'
  | 'business';

export interface GameNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Artwork seed so the panel can draw a tile. */
  artSeed: string;
  /** Game day serial + minute, so "2 days ago" is honest. */
  daySerial: number;
  minuteOfDay: number;
  read: boolean;
  /** Where tapping it should go. */
  action?:
    | { type: 'song'; id: string }
    | { type: 'artist'; id: string }
    | { type: 'video'; id: string }
    | { type: 'chart'; id: 'songs' | 'albums' }
    | { type: 'platform'; id: string }
    /** Somebody asking the player for a verse — lands on the Mailbox. */
    | { type: 'inbound'; id: string }
    /** A legal case — lands on the Courthouse. */
    | { type: 'court'; id: string }
    /** Award news — lands on the Awards page. */
    | { type: 'awards'; id: string }
    /** A feature deal — lands on Studio → Features. */
    | { type: 'features'; id: string }
    /** Rent, bills, the landlord — lands on Home & Lifestyle. */
    | { type: 'home'; id: string };
}

// ─── NPC ─────────────────────────────────────────────────────────────────

/**
 * The people around an artist — who manages them, what label they are on, what
 * crew they run with. Only the curated roster fills this in; the procedurally
 * generated scene is largely unsigned, and the profile page says so plainly
 * rather than inventing representation.
 */
export interface NPCTeam {
  /** Roster id of their manager, when they have one on record. */
  managerId?: string;
  /** Display name of the manager, so the page reads even if the id misses. */
  managerName?: string;
  label?: string;
  crew?: string;
  /** Producers they work with most. */
  producer?: string;
  /** Anything else worth knowing — booking agent, publicist, lawyer. */
  extras?: string[];
}

export interface NPC {
  id: string;
  name: string;
  realName?: string;
  tier: NPCTier;
  role: NPCRole;
  personality: string[]; // 2-3 traits
  genre?: Genre;
  country: string;
  city?: string;
  relationshipScore: number; // -100 to 100
  relationshipStage: RelationshipStage;
  memoryLog: string[]; // last ~10 meaningful interactions
  fame: number; // 0-100 (NPC's own fame)
  isAvailable: boolean;
  managerId?: string; // for national/international NPCs
  gender: Gender;
  age: number;
  bio?: string;
  /** Label, crew and management. Absent for the unsigned majority. */
  team?: NPCTeam;
  /**
   * How much better they have got since the world was generated, in skill
   * points. Persisted through `npcDeltas` — the roster itself is rebuilt from
   * the seed on every load, so growth has to be carried separately or it is
   * lost the moment the tab closes.
   *
   * This is what makes a cheap hire a decision rather than a purchase: a hard
   * working unknown grows into somebody worth three times their wage, and a
   * lazy one plateaus at whatever they were the day you met them.
   */
  skillBonus?: number;
  /**
   * Day serial of the last deliberate gesture toward them.
   *
   * A relationship is not a button you hold down. Reaching out to somebody
   * three evenings running is not three times the friendship, so this is what
   * the cooldown is measured against. Persisted through `npcDeltas` with the
   * rest of the per-NPC state, because the roster is rebuilt from its seed on
   * every load and anything not carried there is gone when the tab closes.
   */
  lastReachOut?: number;
}

// ─── DM / MESSAGES ───────────────────────────────────────────────────────

export interface DMMessage {
  id: string;
  npcId: string;
  fromPlayer: boolean;
  content: string;
  timestamp: string;
  attachedSongId?: string;
  /**
   * The record's name as it was when the message was sent.
   *
   * Stored rather than looked up, because a master can be retitled and a DM is
   * a record of what was actually said. It is rewritten alongside the song
   * when the player renames it, so the thread does not end up quoting a title
   * that never existed at the time.
   */
  attachedTitle?: string;
  read: boolean;
  /** A message that wants a decision — the options live on the moment. */
  momentId?: string;
  /** A grey line in the chat (what happened, "Seen"), not a bubble. */
  system?: boolean;
  /** Small outcome chips under a system line: "+$500", "Kofi +6". */
  chips?: string[];
  /** Written by the AI rather than the built-in lines. */
  ai?: boolean;
  /** An appointment card in the chat. */
  appointmentId?: string;
}

export interface DMThread {
  npcId: string;
  messages: DMMessage[];
  unread: number;
  /** Messages the player sent today — double-texting has a cost. */
  sentToday?: { serial: number; count: number };
  /** Waiting on an AI reply (real ms when asked), for a chat message or a decision. */
  pendingAI?: { since: number; momentId?: string; optionId?: string };
  /** They have stopped answering you until this day serial. */
  mutedUntil?: number;
}

/** A message that arrives later on the game clock (a follow-up after being left on read). */
export interface PendingDM {
  id: string;
  npcId: string;
  text: string;
  /** Absolute game minute: day serial × 1440 + minute of day. */
  atMinute: number;
}

/** A plan with somebody at a time on the game clock. */
export interface Appointment {
  id: string;
  npcId: string;
  npcName: string;
  kind: 'studio' | 'linkup' | 'party' | 'meeting' | 'gig';
  title: string;
  place: string;
  /** A gig: what they pay, in cash, on the night. */
  fee?: number;
  /** A gig where they bring you out as a surprise guest (no fee). */
  bringOut?: boolean;
  /** Absolute game minute. */
  atMinute: number;
  from: 'npc' | 'player';
  /** 'proposed' waits for your answer; 'confirmed' is in the diary. */
  status: 'proposed' | 'confirmed' | 'live' | 'done' | 'missed' | 'cancelled';
  createdSerial: number;
  /** How late they turn up, decided when it starts. */
  lateBy?: number;
  outcome?: string;
  chips?: string[];
  /** Left on read: the invite was seen and not answered. */
  ignored?: boolean;
}

// ─── FEATURE NEGOTIATION ──────────────────────────────────────────────────

/**
 * Where a feature request has got to. A verse is never instant — the track
 * goes out, the other artist (or their people) sits with it, and something
 * comes back days later.
 */
export type FeatureRequestStatus =
  | 'sent'         // delivered to their DMs, no reply yet
  | 'terms'        // they will do it, for a fee — waiting on the player
  | 'paid_waiting' // paid; they are recording it and owe you a verse by a date
  | 'verse_ready'  // agreed (paid or free), the verse is in hand
  | 'declined'     // a no, with a reason
  | 'ignored'      // never answered
  | 'added';       // folded into the record

// ─── INBOUND: SOMEBODY WANTS YOU ON THEIR RECORD ───────────────────────────
//
// The mirror of `FeatureRequest`, and deliberately a separate type rather than
// a `direction` flag on the same one. In the outbound flow `songId` is YOUR
// record and the fee is money leaving your account; here `songId` is THEIR
// record and the fee is money arriving in it. Overloading one field with two
// opposite meanings is how a screen ends up showing a paying gig as a bill.
//
// The private information flips too, which is the whole point of the mode: when
// you are the one asking, you know the song and they know you. When you are the
// one being asked, the only thing that matters — what the verse is worth to
// them — is the one thing you cannot see, and a manager is how you find out.

export type InboundStatus =
  | 'open'         // they have asked, and are waiting on your number
  | 'agreed'       // a number was settled; the verse has not been sent yet
  | 'delivered'    // the verse is on their record
  | 'declined'     // you said no, with a reason
  | 'withdrawn';   // it ended without a verse — see `lapsed` for who ended it

export interface InboundRequest {
  id: string;
  /** THEIR record — the one you would be a guest on. */
  npcSongId: string;
  npcSongTitle: string;
  /** Quality of their record, as it was when they asked. */
  songQuality: number;
  npcId: string;
  npcName: string;
  status: InboundStatus;
  /** In-game date the ask arrived. */
  sentDate: string;
  /** What they opened with, and what is on the table now. */
  openingOffer: number;
  offer: number;
  /**
   * The most they will ever pay. PRIVATE — never rendered directly. The player
   * only ever sees the manager's estimate of it, which is the whole mechanic.
   */
  ceiling: number;
  /** Why they want you, in their own voice. */
  reason: string;
  /** How many times the player has pushed the number up. Capped in sim. */
  negotiationRound?: number;
  /** The last number the player asked for. */
  lastAsk?: number;
  /** What was finally settled on, once agreed. */
  agreedFee?: number;
  /**
   * The day the number was agreed.
   *
   * The player is paid at agreement and delivers afterwards — that is the deal
   * they were offered — so without this there is no way to tell a verse that
   * was agreed this morning from one that has been sat on for two months, and
   * no way for the artist to notice either.
   */
  agreedDate?: string;
  /** True once they have chased the verse. They only ask once. */
  chased?: boolean;
  /** How the money moves: up front, half and half, on delivery, or free. */
  payTerms?: import('../sim/deals').PayTerms;
  /** What has actually reached your account so far. */
  paidSoFar?: number;
  /** Day serial the verse is due. */
  dueSerial?: number;
  /** After delivery: what's still owed, when (hidden plan), and whether you've chased it. */
  balanceDue?: number;
  balancePlan?: import('../sim/deals').PayOutcome;
  balanceDueSerial?: number;
  balanceChased?: number;
  deliveredSerial?: number;
  /** They want their money back (day serial). */
  refundDemanded?: number;
  /** A court case over this deal. */
  caseId?: string;
  /** How much care went into the verse. */
  effort?: 'quick' | 'standard' | 'polished';
  /**
   * True when a `withdrawn` ask ended because the PLAYER never sent the verse,
   * rather than because the artist walked off a high quote. Both end the same
   * way and both are `withdrawn`, but they are not the same story and the UI
   * must not tell the player they were outbid when they simply never delivered.
   */
  lapsed?: boolean;
  /** The manager's read, snapshotted when the player asks for it. */
  managerRead?: {
    trackVerdict: string;
    recommendedFee: number;
    estimatedCeiling: number;
    confidence: number;
    artistRead: string;
    advice: string;
    pass: boolean;
    managerName: string;
  };
}

export interface FeatureRequest {
  id: string;
  songId: string;
  songTitle: string;
  npcId: string;
  npcName: string;
  status: FeatureRequestStatus;
  /** In-game date the track was sent. */
  sentDate: string;
  /** In-game date the reply is due. Nothing happens before this. */
  dueDate: string;
  /** What they want for the verse. 0 when they are doing it for the love. */
  fee: number;
  /** True when relationship, not money, carried it. */
  freeVerse: boolean;
  /** Why they answered the way they did — shown to the player verbatim. */
  reason: string;
  /** Quality of the verse once it lands, 0-100. */
  verseQuality?: number;
  /** True once the player has paid and the verse is theirs to use. */
  paid?: boolean;
  /**
   * What they opened at, before any haggling. Kept so the screen can show the
   * player what they have already talked the price down from.
   */
  originalFee?: number;
  /** How many times the player has pushed back on the price. Capped in sim. */
  negotiationRound?: number;
  /** The last number the player put on the table. */
  lastOffer?: number;
  /** Day serial the verse is due (after paying). */
  verseDueSerial?: number;
  /** How they'll actually deliver — decided when you pay, never shown. */
  delivery?: { outcome: 'on_time' | 'late' | 'ghost'; lateBy: number; excused?: boolean };
  /** Times you've chased the verse. */
  chased?: number;
  /** You asked for your money back (day serial), and what came of it. */
  refundAsked?: number;
  refunded?: number;
  /** A court case over this deal. */
  caseId?: string;
}

/**
 * What came of asking somebody for a verse, or of pushing back on their price.
 *
 * Every one of these paths has a reason attached, because the alternative —
 * returning `null` for "no money", "no energy", "already talking to them" and
 * "already on the record" alike — is a button that does nothing and says
 * nothing, and there is no way for the player to tell which one it was.
 */
export interface FeatureActionResult {
  ok: boolean;
  message: string;
  request?: FeatureRequest;
}

/**
 * What pulling the feed did.
 *
 * The cooldown is reported in GAME minutes, not seconds, because that is what
 * it is measured in — the refresh is stamped against `feedRefreshedAt`, which
 * is the game clock. A button that says "wait 40 seconds" and a clock that runs
 * at four minutes a second would be describing two different things.
 */
export interface FeedRefreshResult {
  ok: boolean;
  message: string;
  /** How many new posts landed. */
  added: number;
  /** Game minutes until it can be pulled again. 0 when it is ready now. */
  waitMinutes: number;
}

/** What one rung of a beef did. */
export interface BeefActionResult {
  ok: boolean;
  message: string;
  /** Present when a move was actually made. */
  result?: {
    landed: boolean;
    line: string;
    headline: string;
    heatDelta: number;
    fameDelta: number;
    fansDelta: number;
  };
}

// ─── WORK IN PROGRESS ─────────────────────────────────────────────────────
// Everything the artist does that takes DAYS rather than a click. A session,
// a mix, a shoot: you commit to it, you pay for it and you spend the energy,
// and then the days have to pass before you have anything to show. The player
// is free the whole time — that is the point of taking the energy up front
// rather than locking the artist in a room.

export type WorkKind = 'record' | 'mix' | 'video' | 'verse';

export interface WorkItem {
  id: string;
  kind: WorkKind;
  /** What the player reads on the card: `Recording "Night Shift"`. */
  label: string;
  /** The second line — who is on it, what it cost. */
  detail: string;
  /** The day count the job was quoted at, already scaled by the payroll. */
  daysTotal: number;
  /** Days of work actually behind it. The tick owns this number. */
  daysDone: number;
  /**
   * The day the job was ordered, as a day serial. The completion date is
   * `startedSerial + daysTotal` and is derived from this rather than from the
   * clock at the moment the tick happens to notice — a 30-day sim must not
   * date a 6-day session as if it took a month.
   */
  startedSerial: number;
  /**
   * Everything the completion path needs to produce exactly what was paid for.
   *
   * Typed at the store boundary rather than here, because the payload shapes
   * live beside the actions that consume them (`StudioSessionPayload`,
   * `MusicVideoPayload`) and importing those into the state types would make
   * the state depend on the store.
   */
  payload: unknown;
}

// ─── JOBS ─────────────────────────────────────────────────────────────────

export type JobCategory =
  | 'performance' | 'session' | 'writing' | 'media' | 'labour' | 'brand';

export interface JobListing {
  id: string;
  title: string;
  employer: string;
  category: JobCategory;
  /** Paid on completion. */
  pay: number;
  /** Energy the shift costs. */
  energyCost: number;
  /** Days the work takes off the calendar. */
  daysCost: number;
  /** Minimum stat to be considered, when the job is selective. */
  requirement: { stat: keyof ArtistStats; min: number; label: string } | null;
  /** Minimum local fame, for jobs that need a name. */
  fameRequired: number;
  blurb: string;
  /** Short line shown after the shift. */
  outcome: string;
}

export interface JobShift {
  id: string;
  jobId: string;
  title: string;
  employer: string;
  date: string;
  pay: number;
  energySpent: number;
}

// ─── SOCIAL POSTS ─────────────────────────────────────────────────────────

export interface SocialComment {
  id: string;
  authorId: string; // npc id, 'player', or 'fan:<handle>'
  authorName: string;
  content: string;
  likes: number;
  timestamp: string;
  /** What kind of commenter this is — stan, hater, troll, a rival's fan. */
  tone?: 'stan' | 'love' | 'neutral' | 'hater' | 'troll' | 'rival' | 'artist';
  /** Replies under this comment (one level, like the real apps). */
  replies?: SocialComment[];
  liked?: boolean;
  /** Game minute it was posted; comments arrive through the hours after a post. */
  minute?: number;
}

export interface SocialPost {
  id: string;
  platform: Platform;
  authorId: string; // npc id or 'player'
  authorName: string;
  content: string;
  mediaType?: 'image' | 'video' | 'audio';
  likes: number;
  shares: number;
  comments: SocialComment[];
  timestamp: string;
  relatedSongId?: string;
  isPlayerPost: boolean;
  trendingScore: number;
  /** Post type on its app: a photo dump, a dance challenge, a Q&A… */
  kind?: string;
  /** People tagged in it. */
  tags?: { id: string; name: string }[];
  /** A straight repost of another post. */
  repostOf?: string;
  /** A quote of another post, with this post's text on top. */
  quoteOf?: string;
  /** Video and photo apps count views. */
  views?: number;
  /** The player has liked / reposted it. */
  liked?: boolean;
  reposted?: boolean;
  viral?: boolean;
  /** Engagement still to arrive over the next days (player posts). */
  growth?: { likes: number; shares: number; comments: number; views: number; follows: number; days: number };
  /** Absolute game minute it went up. With `target`, the numbers are live — read them through `liveCounts`. */
  postedMinute?: number;
  /** Where the numbers end up once the post has run its course. */
  target?: LiveTarget;
  /** The highest like milestone already announced (player posts). */
  milestone?: number;
  /** The song used as the sound, on Clip. */
  soundSongId?: string;
  /**
   * The game day this was posted.
   *
   * Optional because posts written before this existed have only the wall-clock
   * `timestamp`, and an optional field on a saved ARRAY ELEMENT is not a new
   * save head. The feed prefers this and falls back to the timestamp, so a post
   * from the old days still reads sensibly instead of claiming to be from 1970.
   */
  daySerial?: number;
  /** Put up by your social media manager, in your name. */
  byTeam?: string;
}

export interface TrendingTopic {
  tag: string;
  posts: number;
  reason: string;
}

// ─── MAILBOX ─────────────────────────────────────────────────────────────

export interface MailMessage {
  id: string;
  from: string; // npc id or name
  fromName: string;
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
  type: 'offer' | 'legal' | 'general' | 'contract' | 'interview_request' | 'feature_reply' | 'feature_ask';
  offerData?: ContractOffer | InterviewOffer;
  /** Set on `feature_reply` mail so the player can act on it from the inbox. */
  featureRequestId?: string;
  /**
   * Set on `feature_ask` mail — somebody asking the PLAYER for a verse.
   *
   * A separate field from `featureRequestId` on purpose: the two point at
   * different lists, and one id field meaning "the negotiation this is about"
   * across two negotiations that run in opposite directions is how a screen
   * ends up offering to pay somebody who is trying to pay you.
   */
  inboundRequestId?: string;
  /**
   * How many times the player has pushed back on these terms.
   *
   * Negotiation is not free: each round moves the number in the player's
   * favour, but the other side gives up less each time and eventually stops
   * answering. It lives on the mail so it survives a reload mid-haggle.
   */
  negotiationRounds?: number;
  /** Set when the terms have been re-cut, so the body can say so. */
  renegotiated?: boolean;
}

/**
 * How a management deal is actually paid.
 *
 * These are genuinely different deals, not a formatting choice. A commission
 * deal costs nothing until the artist earns and then takes a slice of
 * everything for the life of the contract; a retainer costs money every month
 * whether or not a single stream comes in. An artist with no income should be
 * able to afford the retainer and should be terrified of the commission; an
 * artist about to blow up should want the exact opposite.
 */
export type ManagementFeeKind = 'commission' | 'retainer';

export interface ContractOffer {
  type: 'management' | 'label' | 'distribution' | 'publishing';
  percentage: number;
  advance: number;
  royaltyRate: number;
  lengthYears: number;
  albumRequirements?: number;
  creativeControl: boolean;
  exclusivity: boolean;
  /** Management only. Absent on legacy offers, which are all commission. */
  feeKind?: ManagementFeeKind;
  /**
   * A management offer prints BOTH structures and the player picks one, so
   * `percentage` is always the commission option and `monthlyFee` is always
   * the retainer option. `feeKind` says which one they led with.
   */
  monthlyFee?: number;
  /** Months before either side can walk away without penalty. */
  minMonths?: number;
}

/**
 * Someone on the player's payroll.
 *
 * Deliberately not an `ActiveContract`: a manager is a deal with a percentage
 * attached and a lawyer is a wage, and collapsing the two made the tick unable
 * to tell them apart. Crew members are staff — they cost money every month and
 * they do a specific job every week.
 */
export interface CrewMember {
  id: string;
  npcId: string;
  npcName: string;
  role: NPCRole;
  /** Paid every game month. */
  monthlyWage: number;
  /** In-game date they started. */
  hiredAt: string;
  /** Game day serial of the hire, so tenure is exact. */
  hiredSerial: number;
  /** Their competence, 0-100, frozen at hire so it cannot drift under them. */
  skill: number;
  /** Commission on the income they help generate, when the deal is a cut. */
  commission?: number;
  /**
   * Who they are, copied off the roster at hire time. Deterministic from the
   * npcId, so this is a cache rather than a new source of truth — but the tick
   * folds the payroll without the 11.6k roster in hand, and recomputing it
   * there would mean carrying the whole world into every tick.
   */
  visible?: VisibleTrait[];
  /** Not shown to the player. Discovered by working with them. */
  hidden?: HiddenTrait[];
  /** What you have them working on — see `sim/assignments.ts`. */
  assignment?: string;
  /** What they did last week. */
  lastWork?: string;
  /**
   * How many game months they have been on the payroll.
   *
   * Stored rather than derived from `hiredSerial`, because the fold that reads
   * it runs in the studio, in the video shoot and in three UI previews as well
   * as in the tick — and a preview that cannot see the clock would quietly
   * promise less than the session delivers. The tick owns this number, the way
   * it owns `skill`.
   */
  monthsServed?: number;
  /**
   * How they feel about the job, 0-100. Starts at 70.
   *
   * This is the producer's exclusivity and the engineer's patience in one
   * number. Cutting over another producer's beat while yours is on the payroll
   * costs morale; using theirs pays it back; and morale scales what they
   * contribute, so a slighted producer is not just an annoyed line in the log.
   */
  morale?: number;
}

export interface InterviewOffer {
  stationId: string;
  stationName: string;
  pay: number;
  date: string;
}

// ─── CONTRACT ────────────────────────────────────────────────────────────

export interface ActiveContract {
  id: string;
  type: 'management' | 'label' | 'distribution' | 'publishing';
  npcId: string;
  npcName: string;
  terms: ContractOffer;
  signedAt: string;
  expiresAt: string;
  active: boolean;
}

// ─── SHOWS ───────────────────────────────────────────────────────────────

export type ShowType = 'local_club' | 'university' | 'festival' | 'international_tour';

/**
 * The class of room a show is played in.
 *
 * Lives here rather than in `sim/shows.ts` so the saved record can name it
 * without the type file depending on the engine.
 */
export type VenueClass = 'club' | 'theatre' | 'hall' | 'arena' | 'stadium';

/** One named line on a show's settlement. */
export interface ShowCostLine {
  key: string;
  label: string;
  amount: number;
  /** Who is being paid, when it is a person rather than a supplier. */
  to?: string;
}

/**
 * A city's memory of the player.
 *
 * `fatigue` is decayed lazily — see `decayedFatigue` in `sim/shows.ts` — so the
 * tick does not have to visit every city every day to keep the world honest.
 */
export interface CityMarket {
  city: string;
  country: string;
  /** Recent attendance here, in "shows' worth". Decays ~11-day half-life. */
  fatigue: number;
  /** The game day serial `fatigue` was last brought up to date. */
  fatigueSerial: number;
  /** Game day serial of the last show here, for the cooldown. */
  lastShowSerial?: number;
  /** How many shows the player has played in this city, ever. */
  shows: number;
}

export interface Show {
  id: string;
  type: ShowType;
  city: string;
  country: string;
  date: string;
  ticketPrice: number;
  capacity: number;
  attendance: number;
  performanceQuality: number;
  moneyEarned: number;
  fameGained: number;
  completed: boolean;

  // ── Added with the show rebuild ────────────────────────────────────────
  //
  // All optional, because show history is saved and an old record has none of
  // this. A row without a `venueName` is a show from before the rebuild, and
  // the History tab renders it as such rather than pretending otherwise.

  /** The room it was played in. */
  venueId?: string;
  venueName?: string;
  venueClass?: VenueClass;
  /** Merchandise taken on the night. */
  merch?: number;
  /** Every dollar that left the building, itemised. */
  costs?: ShowCostLine[];
  /** Gross door take, before costs. */
  gross?: number;
  /** What the crowd paid per head, for the history table. */
  avgTicket?: number;
  /**
   * The tour this date belonged to, when it was part of a run.
   *
   * Optional, so it is not a new save head — a `Show` row is an array element,
   * and an old row simply has no tour. The history table groups on it.
   */
  tourId?: string;
  /** Set when the night was somebody else's show. */
  hostName?: string;
  billing?: OfferBilling;
}

/**
 * One date on a tour.
 *
 * Deliberately thin: everything about the room and the city is DERIVED from
 * `venueId` and `serial`, the same way venues and the venue diary are. What is
 * stored is only what the player chose — where, which night, and at what price.
 */
export interface TourLeg {
  id: string;
  type: ShowType;
  venueId: string;
  city: string;
  country: string;
  /** The game day serial this date plays on. */
  serial: number;
  price: number;
  /** Set once the night has been played, so it can never be played twice. */
  playedSerial?: number;
  /** What the night actually took, once it has been played. */
  net?: number;
  tickets?: number;
}

/**
 * A booked run of dates.
 *
 * `status` is derived from the legs as much as stored, but it is kept because a
 * cancelled tour has to stay in the list without ever playing again.
 */
export interface Tour {
  id: string;
  name: string;
  createdAt: string;
  legs: TourLeg[];
  /** The routing, paid once when the run was booked. */
  travelCost: number;
  /** The album buzz locked in at booking, so a later release cannot retro-lift it. */
  buzz: number;
  status: 'booked' | 'running' | 'done' | 'cancelled';
}

/**
 * A show that has been announced and is selling, but has not been played.
 *
 * Only what the player chose and what has happened is stored. The room, the
 * city and the demand are derived from `venueId` and the live game state each
 * day, so a saved show never holds a number the rules have since changed.
 */
export interface ScheduledShow {
  id: string;
  type: ShowType;
  venueId: string;
  city: string;
  country: string;
  /** The game day serial the show plays on. */
  serial: number;
  /** Where it started, so a postponed show still remembers. */
  originalSerial: number;
  /** The day tickets went on sale. */
  announcedSerial: number;
  price: number;
  capacity: number;
  /** The hidden spread of the on-sale: weather, buzz, how the week went. 0.82-1.18. */
  luck: number;
  ticketsSold: number;
  /** Days sales have been brought up to date through. */
  salesCursor: number;
  /** Paid up-front to hold the room. Credited back against the hire on the night. */
  deposit: number;
  /** Money put into promotion. Also credited back as a cost line on the night. */
  marketingSpend: number;
  postponements: number;
  status: 'on_sale' | 'sold_out';
  /** Which reminders the desk has already sent (days out). */
  remindersSent: number[];
  /** Last day a slow-sales warning went out, so it is not spammed. */
  lastWarnSerial?: number;
  /** Cumulative tickets by day, for the sales chart. Newest last, capped. */
  sales: { serial: number; sold: number }[];
  /** Short log of what happened to this show, newest first. */
  notes: string[];
  /** Highest sold-percentage milestone announced (25/50/75/100). */
  milestone: number;
  /** Openers and special guests on your own bill. */
  guests?: ShowGuest[];
}

// ─── SHOW OFFERS & INVITATIONS ───────────────────────────────────────────

export type Archetype = 'business' | 'street' | 'creative' | 'status';
export type OfferBilling = 'guest' | 'support' | 'co_headliner' | 'headliner';
export type OfferCancel = 'flexible' | 'standard' | 'strict';
export type DeclineReason = 'scheduling' | 'fee' | 'billing' | 'creative' | 'health' | 'rival' | 'none';

/** The sheet that is negotiated. Everything the player can move lives here. */
export interface OfferTerms {
  /** Guaranteed fee paid to the player. */
  fee: number;
  /** Percentage of the player's own merch sales they keep. */
  merchSplit: number;
  billing: OfferBilling;
  /** Minutes on stage. */
  slotMins: number;
  /** Whether travel and hotel are covered by the host. */
  travel: boolean;
  /** What it costs to pull out after saying yes. */
  cancel: OfferCancel;
  /** Radius clause: no shows of your own in the host's city within this many days. 0 = none. */
  exclusivityDays: number;
}

export interface ShowOffer {
  id: string;
  hostId: string;
  hostName: string;
  hostRole: NPCRole;
  archetype: Archetype;
  kind: 'headline' | 'invite' | 'festival' | 'club_night';
  venueId: string;
  venueName: string;
  city: string;
  country: string;
  capacity: number;
  /** The night the show is played. */
  serial: number;
  receivedSerial: number;
  /** The last day the offer stands. */
  expiresSerial: number;
  terms: OfferTerms;
  /** What the slot is fairly worth. */
  fair: number;
  /** The most they will ever pay. Hidden from the player. */
  ceiling: number;
  /** Counter-offers left before they walk. */
  patience: number;
  round: number;
  /** Terms the player cannot read without a lawyer. */
  hidden: ('cancel' | 'exclusivity')[];
  /** Why they are asking YOU. */
  reason: string;
  relationshipAtOffer: number;
  status: 'open' | 'accepted' | 'declined' | 'expired' | 'walked';
  /** Set when they have said yes to the player's last ask — it is now the player's to book. */
  agreed?: boolean;
  /** What was said, newest first. */
  log: string[];
  /** Everybody else on the bill. Optional: offers made before lineups existed have none. */
  lineup?: LineupAct[];
}

/** One act on a bill that is not the player. */
export interface LineupAct {
  npcId: string;
  name: string;
  fame: number;
  slot: 'headliner' | 'co_headliner' | 'support' | 'opener' | 'dj' | 'guest';
  /** You are at war with them. */
  beef?: boolean;
  /** You are cool with them. */
  friend?: boolean;
}

/** An artist you asked onto YOUR show. */
export interface ShowGuest {
  npcId: string;
  name: string;
  fame: number;
  role: 'opener' | 'special_guest';
  fee: number;
  status: 'confirmed' | 'declined' | 'no_show' | 'played';
  askedSerial: number;
}

/** An accepted offer, waiting for its night. Played by the clock. */
export interface BookedGig {
  id: string;
  offerId: string;
  hostId: string;
  hostName: string;
  archetype: Archetype;
  kind: ShowOffer['kind'];
  venueId: string;
  venueName: string;
  city: string;
  country: string;
  capacity: number;
  serial: number;
  acceptedSerial: number;
  terms: OfferTerms;
  reminded: number[];
  /** Who else is on the bill. */
  lineup?: LineupAct[];
  /** With a rival on the bill: stay out of their way, or not. */
  avoidRival?: boolean;
}

// ─── THE STUDIO ──────────────────────────────────────────────────────────

/**
 * The player's own room.
 *
 * Only the LEVELS are stored. The catalogue, the prices and the production
 * bonuses all live in `sim/room.ts` as static data, because they are rules, not
 * player state — storing them would mean migrating them every time a price
 * changed, and it would let a save hold a room the code no longer has.
 *
 * A rented room is deliberately NOT here: it is chosen for one session and paid
 * for at that moment, so it belongs in the session's payload rather than in the
 * world.
 */
export interface StudioState {
  /** Slot id → the rung owned. A missing slot is one nothing has been bought for. `building` is the room itself. */
  levels: Record<string, number>;
  /** Rent the room out to other artists when you are not in it. */
  rentOut?: boolean;
}

// ─── BEEF ────────────────────────────────────────────────────────────────
// A beef is a ladder, not a flag. The rungs, the heat curve, the costs and the
// outcomes all live in `sim/beef.ts` as rules; what is saved is only the state
// of one argument — where it stands, how hot it is, and who has landed what.

export type BeefResolutionKind = 'truce' | 'concession' | 'ko' | 'fizzle';

export interface BeefResolution {
  kind: BeefResolutionKind;
  /** Day serial it ended on. */
  at: number;
  /** What happened, in the game's own words. */
  line: string;
}

/** One move in the argument, by either side. */
export interface BeefMove {
  /** Day serial the move was made. */
  serial: number;
  by: 'player' | 'npc';
  /** Which rung of `BEEF_RUNGS` this move was. */
  rung: number;
  /** The move, narrated. */
  line: string;
  landed: boolean;
  /** How good it was, 0-100. */
  score: number;
  heatDelta: number;
}

export interface BeefState {
  id: string;
  npcId: string;
  npcName: string;
  /**
   * The highest rung the argument has reached. 0 means it is open but nothing
   * has actually been said yet. Rungs cannot be skipped, so this is also the
   * ladder position.
   */
  rung: number;
  /**
   * The heat as of `heatSerial`.
   *
   * Read it through `decayedHeat(beef, nowSerial)` and never directly: this
   * figure is stale by however many days have passed since `heatSerial`, and
   * comparing it to a threshold is how a cold beef keeps looking hot.
   */
  heat: number;
  /** The serial `heat` was last brought up to date. */
  heatSerial: number;
  startedSerial: number;
  /** The serial of the last move by either side. Drives the fizzle. */
  lastMoveSerial: number;
  /** Moves the player has landed. */
  wins: number;
  /** Moves the other side has landed. */
  losses: number;
  /** Newest first. */
  moves: BeefMove[];
  resolution?: BeefResolution;
}

// ─── INVESTMENTS ─────────────────────────────────────────────────────────

export type InvestmentType = 'real_estate' | 'stock' | 'music_catalog' | 'restaurant' | 'tech_startup' | 'clothing_brand';

export interface Investment {
  id: string;
  type: InvestmentType;
  name: string;
  initialCost: number;
  currentValue: number;
  monthlyIncome: number;
  riskLevel: 'low' | 'medium' | 'high';
  purchaseDate: string;
}

// ─── BUSINESSES ──────────────────────────────────────────────────────────

export type BusinessType = 'record_label' | 'recording_studio' | 'clothing_line' | 'nightclub' | 'media_company';

export interface Business {
  id: string;
  type: BusinessType;
  name: string;
  monthlyRevenue: number;
  monthlyCosts: number;
  reputation: number;
  purchaseDate: string;
}

// ─── FAN WARS ────────────────────────────────────────────────────────────

export interface CasinoState {
  visitSerial?: number;
  vipPoints: number;
  net: number;
  biggestWin: number;
  biggestLoss: number;
  day: { serial: number; net: number; reported?: boolean };
  blackjack?: BlackjackHand | null;
  fixtures: Fixture[];
  bets: SportsBet[];
  history: string[];
}

export interface InterviewInvite {
  id: string;
  outletId: string;
  outletName: string;
  format: string;
  reason: string;
  fee: number;
  receivedSerial: number;
  expiresSerial: number;
  status: 'open' | 'accepted' | 'declined' | 'expired' | 'done';
}

export interface ActiveInterview {
  id: string;
  inviteId?: string;
  outletId: string;
  outletName: string;
  host: string;
  format: string;
  questions: IvQuestion[];
  idx: number;
  transcript: { q: string; a: string; reaction: string; tag: string; surprise?: string; passed?: boolean }[];
  effects: IvEffect[];
  fee: number;
  startedSerial: number;
  walked?: boolean;
}

export interface InterviewRecord {
  id: string;
  outletId: string;
  outletName: string;
  format: string;
  headline: string;
  serial: number;
  highlights: string[];
  deltas: { fame: number; rep: number; momentum: number; fans: number; money: number };
  viral: boolean;
  walked: boolean;
}

/** One thing on the manager's desk: what it is, the details, and their advice. */
export interface ManagerBrief {
  id: string;
  kind: 'show' | 'feature' | 'interview' | 'fyi';
  refId?: string;
  title: string;
  details: string[];
  advice: 'take' | 'pass' | 'counter' | 'your call';
  reason: string;
  /** The number they would counter at, when they would. */
  counterAt?: number;
  createdSerial: number;
  status: 'new' | 'seen' | 'done';
  outcome?: string;
}

export interface SocialActivity {
  id: string;
  kind: 'like' | 'comment' | 'follow' | 'mention' | 'repost' | 'milestone' | 'unfollow' | 'story' | 'verified';
  text: string;
  actorId?: string;
  actorName?: string;
  postId?: string;
  /** Shown once the clock reaches it. */
  minute: number;
  read?: boolean;
}

export interface FanWar {
  id: string;
  npcId: string;
  npcName: string;
  /** What THEIR fans call themselves. */
  theirFans: string;
  /** 0-100: how loud it is. */
  intensity: number;
  /** -50..50: positive means your fans are winning. */
  edge: number;
  cause: string;
  startedSerial: number;
  lastSerial: number;
  status: 'active' | 'over';
  log: string[];
}

// ─── MOMENTS ─────────────────────────────────────────────────────────────
// People texting you, your team walking in with a problem. Small decisions
// with consequences. See `sim/moments.ts`.

export interface MomentOption {
  id: string;
  label: string;
  hint?: string;
  /** Money it costs to choose this. */
  cost?: number;
  /** Energy it costs to choose this. */
  energy?: number;
}

export type MomentEffect =
  | { k: 'money'; v: number }
  | { k: 'fame'; v: number }
  | { k: 'fans'; v: number }
  | { k: 'momentum'; v: number }
  | { k: 'reputation'; v: number }
  | { k: 'energy'; v: number }
  | { k: 'rel'; npcId: string; v: number }
  | { k: 'heat'; npcId: string; v: number; win?: boolean }
  | { k: 'startBeef'; npcId: string }
  | { k: 'morale'; crewId: string; v: number }
  | { k: 'wage'; crewId: string; v: number }
  | { k: 'quit'; crewId: string }
  | { k: 'stat'; stat: keyof ArtistStats; v: number }
  | { k: 'post'; authorId: string; authorName: string; content: string; likes: number }
  | { k: 'headline'; text: string; story: string; category: Headline['category'] }
  | { k: 'followUp'; template: string; days: number; data: Record<string, unknown> }
  | { k: 'inboundAsk'; npcId: string; free?: boolean }
  | { k: 'addOpener'; npcId: string }
  | { k: 'featureFree'; requestId: string }
  | { k: 'featureCancel'; requestId: string }
  | { k: 'featureNow'; requestId: string }
  | { k: 'featureDelay'; requestId: string; days: number }
  /** A beat lands in your library — bought, or traded for a verse. */
  | { k: 'beat'; npcId: string; npcName: string; quality: number; price: number; how: 'bought' | 'traded' }
  /** You owe a verse on their tape in exchange for something worth `value`. */
  | { k: 'tradeVerse'; npcId: string; value: number }
  /** A night on the clock: a cash gig, or being brought out at their show. */
  | { k: 'gig'; npcId: string; fee: number; atMinute: number; place: string; bringOut?: boolean }
  /** They'll put a verse on your best unreleased song, free — it arrives in Studio → Features. */
  | { k: 'guestVerse'; npcId: string }
  /** A piece of clothing, gifted — it goes in your wardrobe. */
  | { k: 'dripGift'; from: string };

export interface Moment {
  id: string;
  kind: string;
  /** dm: a text. team: your people need a decision. life: something happening to you. */
  channel: 'dm' | 'team' | 'life';
  npcId?: string;
  npcName?: string;
  crewRole?: string;
  title: string;
  body: string;
  options: MomentOption[];
  createdSerial: number;
  expiresSerial: number;
  /** Scheduled follow-ups wait here until their day comes. */
  status: 'scheduled' | 'open' | 'resolved' | 'expired';
  dueSerial?: number;
  data?: Record<string, unknown>;
  resolution?: { optionId?: string; label?: string; text: string };
}

// ─── YOUR OWN RECORD LABEL ───────────────────────────────────────────────
//
// The player's label is a company with its own bank account. The player puts
// money in and takes dividends out; everything else (advances, recording,
// marketing, staff, studio, office) is paid from the label's cash, and the
// label is paid by its artists' records actually streaming. Signed artists
// work on their own: they write, pitch demos to the label, and release what
// is approved. See `sim/label.ts`.

export type LabelDealType = 'standard' | 'three_sixty' | 'distribution' | 'joint_venture';
export type LabelStaffRole = 'ar' | 'marketing' | 'radio' | 'legal' | 'producer' | 'engineer';
export type LabelReleaseTier = 'demo' | 'standard' | 'major';
export type LabelGear = 'booth' | 'console' | 'mics' | 'live_room' | 'mastering';
export type LabelTactic = 'vision' | 'personal' | 'ask' | 'hardball' | 'deadline';

export interface LabelTerms {
  dealType: LabelDealType;
  /** Recoupable money paid to the artist on signing. */
  advance: number;
  /** The artist's share of net master revenue, in percent. */
  royalty: number;
  /** How many singles the artist owes the label. */
  releasesOwed: number;
  /** How many albums the artist owes the label. */
  albumsOwed: number;
  /** Length of the deal in months. */
  termMonths: number;
  /** One-year extensions the LABEL may take at the end of the term. */
  optionYears: number;
  /** Marketing the label promises to spend on each release. */
  marketingCommit: number;
  /** Video money the label promises for each single (label-funded deals). */
  videoBudget: number;
  /** The artist has the final say on what comes out. */
  creativeControl: boolean;
  /**
   * All-in deal: the artist is handed a recording fund and pays for their own
   * recording, videos, features and marketing out of it. Recoupable.
   */
  allIn: boolean;
  recordingFund: number;
  /** Non-recoupable sweetener paid on signing. */
  signingBonus: number;
  /** Share of the artist's publishing the label takes, percent. */
  publishingShare: number;
  /** 360 only: share of touring and merch, percent. */
  touringShare: number;
}

export interface LabelDemand {
  kind: 'raise' | 'release';
  openedSerial: number;
  /** For a raise: the royalty they want. */
  royalty?: number;
  /** For a raise: a one-off bonus that would also settle it. */
  bonus?: number;
  text: string;
}

export interface LabelRivalOffer {
  labelName: string;
  royalty: number;
  /** What the rival will pay YOUR label to release the artist. */
  buyout: number;
  openedSerial: number;
  expiresSerial: number;
}

export interface LabelSubmission {
  id: string;
  npcId: string;
  name: string;
  kind: 'single' | 'album';
  title: string;
  trackCount: number;
  /** The real quality of the demo. Hidden; the A&R estimate is what is shown. */
  quality: number;
  /** What the office thinks of it. Better A&R, closer guess. */
  estimate: number;
  /** The budget the artist is asking for. */
  askTier: LabelReleaseTier;
  pitch: string;
  submittedSerial: number;
  reworks: number;
  status: 'pending' | 'reworking' | 'approved' | 'rejected' | 'leaked' | 'released';
  /** When a rework comes back. */
  dueSerial?: number;
  /** Released straight away because the artist has creative control. */
  auto?: boolean;
}

export interface LabelSession {
  submissionId?: string;
  kind: 'single' | 'album';
  title: string;
  trackCount: number;
  until: number;
  tier: LabelReleaseTier;
  cost: number;
  quality: number;
  marketing: number;
  /** Paid out of the artist's own all-in fund. */
  selfFunded?: boolean;
}

export interface LabelSignee {
  npcId: string;
  name: string;
  genre: Genre;
  country: string;
  tier: NPCTier;
  signedSerial: number;
  endsSerial: number;
  terms: LabelTerms;
  fameAtSigning: number;
  /** Carried here because the roster is rebuilt from its seed on load. */
  fame: number;
  /** Hidden ceiling 0-100. An A&R narrows the estimate. */
  potential: number;
  /** Unrecouped balance. The artist's royalty pays this down first. */
  recoupBalance: number;
  /** All-in deals: what is left of the artist's recording fund. */
  fund: number;
  /** 0-100. How they feel about the label right now. */
  mood: number;
  /** 0-100. How hard they are to take off you. */
  loyalty: number;
  releases: string[];
  albums: string[];
  releasesDelivered: number;
  albumsDelivered: number;
  /** Singles out since their last album — they want a project after three. */
  singlesSinceAlbum: number;
  lastReleaseSerial?: number;
  /** When their next demo will be ready. */
  workSerial: number;
  /** A record in the studio. */
  inStudio?: LabelSession;
  /** A video being shot, landing on `until`. */
  videoShoot?: { songId: string; until: number; budget: number; quality: number };
  optionsUsed: number;
  /** Legacy (v1): new music handed in and waiting. Superseded by submissions. */
  requestSerial?: number;
  demand?: LabelDemand;
  rivalOffer?: LabelRivalOffer;
  /** When the last rival came knocking — they do not call every week. */
  lastRivalSerial?: number;
  status: 'active' | 'dispute' | 'expiring' | 'expired' | 'dropped' | 'sold' | 'left';
  /** Lifetime money. */
  grossEarned: number;
  labelEarned: number;
  artistPaid: number;
  /** This month's figures, rolled into the statement on the 1st. */
  monthGross: number;
  notes: string[];
}

export interface LabelPitch {
  id: string;
  npcId: string;
  name: string;
  openedSerial: number;
  expiresSerial: number;
  /** What is on the table now. */
  terms: LabelTerms;
  /** What they will actually take. Hidden; a lawyer reads some of it. */
  wants: LabelTerms;
  patience: number;
  rounds: number;
  status: 'open' | 'signed' | 'walked' | 'withdrawn' | 'expired';
  /** Another label also chasing them. */
  competing?: string;
  /** A re-sign at the end of a deal, rather than a new signing. */
  renewal?: boolean;
  lastReply?: string;
  /** Terms they have said yes to — their own counter, or an offer they accepted. */
  agreedTerms?: LabelTerms;
  /** Goodwill earned at the table with tactics. Shifts what they will accept. */
  warmth?: number;
  usedTactics?: LabelTactic[];
  /** What they have told you they want, line by line. */
  revealed?: string[];
}

export interface LabelProspect {
  npcId: string;
  /** What the scouting report says. */
  note: string;
  /** The A&R's estimate of their ceiling, or undefined with no A&R. */
  potentialEstimate?: number;
}

export interface LabelStaff {
  role: LabelStaffRole;
  npcId: string;
  name: string;
  skill: number;
  salary: number;
  hiredSerial: number;
}

export interface LabelMonth {
  key: string;
  revenue: number;
  costs: number;
  profit: number;
}

export interface LabelEvent {
  serial: number;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

export interface LabelStudio {
  /** 0 = no studio (rent rooms), 1 home setup … 4 flagship. */
  tier: number;
  gear: Record<LabelGear, number>;
  /** Days the rooms were in use this month — rent only comes from idle time. */
  busyDays: number;
}

export interface LabelPolicy {
  /** What happens to a demo nobody answers. */
  approve: 'manual' | 'good' | 'all';
  /** "Good" means the office estimate is at least this. */
  threshold: number;
  /** Budget for auto-approved releases: the artist's ask, or a fixed tier. */
  tier: 'ask' | LabelReleaseTier;
  /** Videos for label-funded singles. */
  videos: 'manual' | 'hits' | 'all';
}

export interface PlayerLabel {
  id: string;
  name: string;
  color: string;
  country: string;
  genreFocus: Genre | 'any';
  foundedSerial: number;
  reputation: number;
  cash: number;
  roster: LabelSignee[];
  /** Everyone who has ever left, newest first (kept short). */
  alumni: LabelSignee[];
  pitches: LabelPitch[];
  prospects: LabelProspect[];
  prospectsSerial: number;
  staff: LabelStaff[];
  history: LabelMonth[];
  events: LabelEvent[];
  submissions: LabelSubmission[];
  policy: LabelPolicy;
  studio: LabelStudio;
  /** Running totals for the month in progress. */
  monthRevenue: number;
  monthCosts: number;
  /** `YYYY-MM` of the month in progress. */
  monthKey: string;
  /** Consecutive month-ends with negative cash. */
  debtMonths: number;
  totalInvested: number;
  totalWithdrawn: number;
}

// ─── LUXURY ITEMS ─────────────────────────────────────────────────────────

export interface LuxuryItem {
  id: string;
  name: string;
  category: 'car' | 'home' | 'jewelry' | 'watch' | 'art' | 'jet' | 'yacht';
  cost: number;
  unlockThreshold: number;
  disciplineBonus?: number;
  purchaseDate?: string;
}

// ─── AWARDS ──────────────────────────────────────────────────────────────

export type AwardTier = 'country' | 'regional' | 'global';

export interface Award {
  id: string;
  name: string;
  tier: AwardTier;
  country?: string;
  region?: string;
  category: string;
  year: number;
  winner: string; // player id or npc id
  nominees: string[];
}

export interface Certification {
  id: string;
  songId: string;
  songTitle: string;
  level: 'silver' | 'gold' | 'platinum' | 'diamond' | 'legendary';
  multiplier: number; // 1x, 2x, etc.
  country: string;
  awardedDate: string;
  units: number;
}

// ─── STORY DIRECTOR ───────────────────────────────────────────────────────

export interface OpenThread {
  id: string;
  type: 'beef' | 'romance' | 'legal' | 'deal' | 'scandal' | 'feature' | 'label' | 'award' | 'show' | 'wildcard';
  description: string;
  involvedNPCIds: string[];
  startDate: string;
  lastUpdated: string;
  resolved: boolean;
  priority: number; // 1-10
  escalationCount: number;
  /** Game day it opened — threads nobody touches for weeks close themselves. */
  openedSerial?: number;
}

// ─── INTERVIEWS ───────────────────────────────────────────────────────────

export interface InterviewStation {
  id: string;
  name: string;
  personality: 'friendly' | 'provocative' | 'underground' | 'rival_aligned';
  riskLevel: number; // 0-100
  audienceType: string;
  rivalNPCId?: string;
}

export type InterviewTone = 'diplomatic' | 'dismissive' | 'aggressive' | 'humorous' | 'honest';

export interface InterviewQA {
  question: string;
  tone: InterviewTone;
  answer: string;
}

export interface Interview {
  id: string;
  stationId: string;
  date: string;
  qa: InterviewQA[];
  headline: string;
  completed: boolean;
  fameGained: number;
  reputationChange: number;
}

// ─── HEADLINES ────────────────────────────────────────────────────────────

export interface Headline {
  id: string;
  text: string;
  fullStory: string;
  date: string;
  relatedEntities: string[];
  priority: number;
  category: 'award' | 'chart' | 'beef' | 'feature' | 'show' | 'scandal' | 'business' | 'general';
}

// ─── CHART ───────────────────────────────────────────────────────────────

export interface ChartEntry {
  songId: string;
  songTitle: string;
  artistId: string; // player id or npc id
  artistName: string;
  position: number;
  lastPosition: number;
  weeksOnChart: number;
  country: string;
  peakPosition: number;
}

// ─── GAME STATE ───────────────────────────────────────────────────────────

export type GameScreen =
  | 'splash'
  | 'welcome'
  | 'account'
  | 'style'
  | 'journal'
  | 'court'
  | 'awards'
  | 'create_artist'
  | 'dashboard'
  | 'studio'
  | 'social_chirp'
  | 'social_snapgram'
  | 'social_clip'
  | 'social_circle'
  | 'pingchat'
  | 'mailbox'
  | 'charts'
  | 'npc_profile'
  | 'stats'
  | 'training'
  | 'jobs'
  | 'interviews'
  | 'ai'
  | 'shows'
  | 'investments'
  | 'trophy_room'
  | 'news'
  | 'lifestyle'
  | 'streaming'
  | 'streams'
  | 'platform'
  | 'videos'
  | 'watch'
  | 'channel'
  | 'artist_page'
  | 'song'
  | 'search'
  | 'create_video'
  | 'team'
  | 'tax'
  | 'careers'
  | 'retirement'
  | 'label';

export interface GameDate {
  day: number;
  month: number;
  year: number;
}

export interface WeeklyStatement {
  id: string;
  weekStartDate: string;
  totalStreams: number;
  totalPayout: number;
  songBreakdown: Array<{ songId: string; title: string; streams: number; payout: number }>;
  flavorText: string;
}

// ─── CHARACTERISTICS ────────────────────────────────────────────────────────
// Who somebody is, as opposed to what they are called. Visible ones are shown
// on the profile and are what the person leads with when they pitch; hidden
// ones are only discovered by working with them. See `sim/traits.ts`.

export type VisibleTrait =
  | 'connected'
  | 'creative'
  | 'smart'
  | 'brave'
  | 'risk_taker'
  | 'charismatic'
  | 'ruthless'
  | 'meticulous';

export type HiddenTrait =
  | 'hard_working'
  | 'lazy'
  | 'anger_issues'
  | 'loyal'
  | 'greedy'
  | 'egotistical'
  | 'volatile'
  | 'generous';

// ─── THE TURN REPORT ────────────────────────────────────────────────────────
// What one press of +1 Day / +1 Week / +1 Month actually did to the money.
// Built by `sim/ledger.ts`; rendered by `components/TurnReportModal.tsx`.
// The total is always the real change in the balance — the itemised lines are
// only a breakdown of it, and anything they fail to explain is shown as an
// explicit "Other" row.

export type LedgerKind = 'income' | 'expense';

export interface LedgerLine {
  key: string;
  label: string;
  kind: LedgerKind;
  /** Always positive. `kind` carries the direction. */
  amount: number;
  note?: string;
}

export interface TurnReport {
  /** Matches `GameState.turnCount` at the moment the turn finished. */
  turnCount: number;
  unit: 'day' | 'week' | 'month';
  days: number;
  fromDate: string;
  toDate: string;
  income: number;
  expenses: number;
  net: number;
  moneyBefore: number;
  moneyAfter: number;
  lines: LedgerLine[];
  /** Whether the itemised lines account for the whole change in balance. */
  reconciled: boolean;
  streams: number;
  fans: number;
  energyBefore: number;
  energyAfter: number;
}


// ─── INDUSTRY / LIFE EXTENSIONS ─────────────────────────────────────────

export type PostCareerRole = 'executive' | 'producer' | 'manager' | 'mentor';
export type IndustryNoticeType = 'noticed' | 'scout' | 'sample' | 'payola' | 'family' | 'retirement';

export interface SampleClearance {
  id: string;
  songId: string;
  songTitle: string;
  sampleName: string;
  rightsHolder: string;
  quotedCost: number;
  status: 'pending' | 'cleared' | 'denied' | 'expired';
  requestedDate: string;
  deadlineSerial: number;
}

export interface PayolaCampaign {
  id: string;
  songId: string;
  songTitle: string;
  city: string;
  country: string;
  cost: number;
  remainingDays: number;
  boost: number;
  exposed: boolean;
  completed: boolean;
}

export interface ScoutMission {
  id: string;
  scoutName: string;
  targetNpcId: string;
  targetName: string;
  objective: string;
  rewardMoney: number;
  rewardFame: number;
  expiresSerial: number;
  status: 'open' | 'completed' | 'expired';
}

export interface IndustryNotice {
  id: string;
  type: IndustryNoticeType;
  title: string;
  body: string;
  date: string;
  relatedNpcId?: string;
  relatedSongId?: string;
  read: boolean;
}

export interface FamilyState {
  children: number;
  monthlyChildSupport: number;
  coParentName?: string;
  nextReviewSerial?: number;
}

export interface LegacyState {
  /** True only in the 'retired' mode (kept for older saves and checks). */
  retired: boolean;
  /** Full-time, semi-retired, business focus or retired. */
  mode?: import('../sim/careerMode').CareerMode;
  /** Day serial the current mode began. */
  modeSince?: number;
  /** An announced comeback: release something before `until`. */
  comeback?: { announced: number; until: number; hype: number; used?: boolean };
  retiredAt?: string;
  legacyScore: number;
  titles: string[];
  postCareerRole?: PostCareerRole;
  comebackAttempts: number;
}

export interface GameState {
  initialized: boolean;
  screen: GameScreen;
  /**
   * Which save slot the live game belongs to. Mirrored from the save index so
   * the UI can name the career being played; the index is still the source of
   * truth for what exists on disk.
   */
  activeSlotId?: string | null;
  /**
   * Set when a save write fails — almost always the storage quota. Kept in
   * state rather than only logged, because a save that quietly stops working
   * is the worst failure the game has: the player keeps playing and loses
   * everything, with no signal until it is too late to act on.
   */
  saveError?: string | null;
  player: Player | null;
  songs: Song[];
  albums: Album[];
  npcs: NPC[];
  dmThreads: Record<string, DMThread>; // npcId → thread
  socialPosts: SocialPost[];
  mailbox: MailMessage[];
  contracts: ActiveContract[];
  /**
   * The player's payroll — engineers, publicists, lawyers, tour managers and
   * the rest. Each one costs money every month and does a specific job every
   * week; see `sim/roles.ts` for what that job actually is.
   */
  crew: CrewMember[];
  shows: Show[];
  /**
   * How recently the player has played each city, keyed by city name.
   *
   * A city is not an unlimited well. Without this, the same room in the same
   * town could be sold out every night forever, which is how a probe booked
   * four Accra shows on four consecutive days and filled all four.
   */
  cityMarkets: Record<string, CityMarket>;
  /**
   * Booked runs of dates.
   *
   * A tour is a SCHEDULE, not an event: the player commits to several nights
   * across cities, pays the routing up front, and each date plays itself when
   * the clock reaches it. See `sim/tours.ts` for the planner and the routing.
   */
  tours: Tour[];
  /** Shows that are announced and selling but not yet played. */
  scheduledShows: ScheduledShow[];
  /** Offers waiting for an answer. */
  showOffers: ShowOffer[];
  /** Accepted dates, played by the clock. */
  bookedGigs: BookedGig[];
  /**
   * The player's own studio — the gear they have bought.
   *
   * A new field on `GameState` means FOUR heads, not three: `saveGame`, the
   * `advanceTurn` auto-save, `getInitialState()`, and the legacy migration in
   * `adoptLegacySave`. `newCareer` is `Object.assign(state, getInitialState())`
   * and `Object.assign` never clears a key the source omits, so a career that
   * skipped the migration would inherit the previous artist's studio.
   */
  studio: StudioState;
  /**
   * Open and settled beefs, newest last.
   *
   * The same four-head rule as `studio` applies: a new `GameState` field has to
   * appear in `saveGame`, the `advanceTurn` auto-save, `getInitialState()` and
   * the migration in `adoptLegacySave`, or a new career inherits the previous
   * artist's arguments.
   */
  beefs: BeefState[];
  /**
   * The absolute game minute (serial * 1440 + clockMinute) of the last feed
   * refresh. `undefined` means never. The feed refresh is a real action with a
   * real cooldown, so it has to be stamped against the GAME clock rather than
   * the wall clock — otherwise closing the tab resets it.
   */
  feedRefreshedAt?: number;
  /**
   * How many artists the player has tagged today, and which day "today" is.
   *
   * Tagging is free and tagging is the one thing here that could be spammed
   * into a fame farm, so it has a daily cap. The serial is stored alongside the
   * count because the cap resets on the game day, not on a timer.
   */
  tagQuota?: { serial: number; count: number };
  investments: Investment[];
  businesses: Business[];
  /** The player's own record label. Null until they found one. */
  label?: PlayerLabel | null;
  /** Texts and team decisions waiting on the player, and recent outcomes. */
  moments?: Moment[];
  /** Followers on each social app (chirp, snapgram, clip, circle). */
  socialStats?: Record<string, { followers: number; lastPostSerial?: number }>;
  /** Posts made today across every app — posting ten times a day is spam. */
  postsToday?: { serial: number; count: number };
  /** Likes/comments per NPC today, so relationship farming has a ceiling. */
  socialTouches?: { serial: number; counts: Record<string, number> };
  /** What the player's fans call themselves. */
  fanbaseName?: string;
  /** Fanbases at war with yours. */
  fanWars?: FanWar[];
  /** Beats you own, beats on order, and this week's beat store. */
  beats?: BeatsState;
  /** Accounts the player follows. */
  following?: string[];
  /** Accounts that follow the player back. */
  followedBy?: string[];
  /** Accounts the player has blocked: no posts, comments, DMs or tags from them. */
  blocked?: string[];
  /** Follow-backs that will (or will not) happen. */
  pendingFollows?: { npcId: string; dueMinute: number; yes: boolean }[];
  /** Likes, comments, follows and mentions — the notifications tab. */
  socialActivity?: SocialActivity[];
  /** Stories, 24 hours each. */
  stories?: Story[];
  /** The last time the player went live, and how it went. */
  lastLive?: LiveSession & { serial: number };
  /** The blue tick. */
  verified?: boolean;
  /** Stations, shows and podcasts asking for you. */
  interviewInvites?: InterviewInvite[];
  /** The sit-down in progress. */
  activeInterview?: ActiveInterview | null;
  /** Every interview you have done, newest first. */
  interviewLog?: InterviewRecord[];
  /** How each outlet feels about you. Walk out on one and it remembers. */
  outletRel?: Record<string, number>;
  /** The day you last pitched yourself to an outlet. */
  lastPitchSerial?: number;
  /** What your manager has on their desk for you. */
  managerDesk?: ManagerBrief[];
  /** The stock exchange, the crypto market and the property index. */
  market?: MarketState;
  portfolio?: Portfolio;
  /** Businesses you run. */
  ventures?: Venture[];
  /** Land and buildings you are developing. */
  devProjects?: DevProject[];
  casino?: CasinoState;
  /** Net worth, once a week, for the chart. */
  wealthHistory?: { serial: number; net: number }[];
  /** The world football sports book. */
  football?: FootballState;
  /** Follow-ups and late replies waiting for their minute. */
  pendingDMs?: PendingDM[];
  /** Plans on the clock: studio sessions, link-ups. */
  appointments?: Appointment[];
  /** The plan happening right now (the modal is open). */
  activeAppointment?: string | null;
  /** Clothes, jewellery, the shop's drops and the wardrobe. */
  drip?: DripState;
  /** Where you live and what it costs. */
  home?: HomeState;
  /** Homes you own (lived in, empty, or let out). */
  homes?: OwnedHome[];
  /** What you've borrowed. */
  loans?: Loan[];
  /** Your record with the banks. */
  credit?: { missedEver: number; defaults: number; paidOff: number };
  /** Lifetime earnings at each month-end, for what you earn a month. */
  earningsMarks?: { serial: number; total: number }[];
  /** The career's journal. The AI reads it so people remember. */
  memories?: Memory[];
  /** Last headline and notification already written into the journal. */
  memoryCursor?: { headline?: string; notification?: string };
  /** Momentum earned from posting this week (capped; see socialMomentum). */
  socialMomentum?: { week: number; gained: number };
  /** Records the big names have announced and not yet released. */
  npcUpcoming?: { song: Song; releaseSerial: number }[];
  /** When each story-director story last ran (key → day serial). */
  storyFired?: Record<string, number>;
  /** Award seasons by "body:year". */
  awardSeasons?: Record<string, import('../store/gameStore').AwardSeason>;
  /** Award bodies whose news reaches you as notifications. */
  awardFollows?: string[];
  /** The award night happening now (the modal is open). */
  activeCeremony?: { key: string; step: 'carpet' | 'show' | 'results' | 'speech' | 'done'; revealed: number; notes: string[] } | null;
  /** Lawsuits, either side. */
  cases?: import('../sim/court').LegalCase[];
  /** A hearing happening now (the court modal is open): "caseId|hearingId". */
  activeHearing?: string | null;
  /** Open the Studio on a particular section next time (e.g. Features). */
  pendingStudioMode?: string | null;
  ownedAssets: LuxuryItem[];
  awards: Award[];
  certifications: Certification[];
  openThreads: OpenThread[];
  interviews: Interview[];
  headlines: Headline[];
  charts: Record<string, ChartEntry[]>; // country → entries
  weeklyStatements: WeeklyStatement[];
  gameDate: GameDate;
  /**
   * Minutes past midnight on `gameDate`. The clock runs on its own — a real
   * interval advances this, and when it passes 1440 a game day is processed
   * through the ordinary turn tick. Sub-day position is also what lets a
   * record's numbers read as "still climbing today" instead of frozen at
   * yesterday's total.
   */
  clockMinute: number;
  /** The clock only runs while this is false. */
  clockPaused?: boolean;
  /** 1, 2 or 4. How fast real seconds map to game minutes. */
  clockSpeed?: number;
  turnCount: number;
  selectedNPCId: string | null;
  lastEventLog: string[]; // "WHILE YOU WERE GONE"
  cityFame: Record<string, number>; // "Country:City" → fame
  // Industry/life systems added after the core career build.
  sampleClearances: SampleClearance[];
  payolaCampaigns: PayolaCampaign[];
  scoutMissions: ScoutMission[];
  industryNotices: IndustryNotice[];
  family: FamilyState;
  legacy: LegacyState;
  npcSongs: Song[]; // NPC released songs
  trending: TrendingTopic[];
  /** Open and settled feature negotiations, newest last. */
  featureRequests: FeatureRequest[];
  /**
   * Artists who have asked YOU for a verse.
   *
   * The other direction of `featureRequests`, and the reason it is its own
   * array: the player is the one being asked here, the money moves towards
   * them, and the only thing that decides the outcome is a ceiling they cannot
   * see. Kept newest last, like the outbound list.
   */
  inboundRequests: InboundRequest[];
  /**
   * Jobs that are IN PROGRESS right now.
   *
   * A session is not a button. You book six days in the room, you pay for the
   * room and you spend the energy, and then the six days have to actually
   * pass before the master is in your hands. The money and the energy go at
   * ORDER time — that is what stops you booking four sessions for one
   * afternoon — and the record lands when the last day is done.
   *
   * The tick owns `daysDone`, the way it owns `skill`.
   */
  workItems: WorkItem[];
  /** The board of jobs currently available. Rotates as turns pass. */
  jobBoard: JobListing[];
  /** Shifts the player has actually worked. */
  jobShifts: JobShift[];
  /** Turn number the current job board was rolled for. */
  jobBoardTurn?: number;
  /**
   * Save-only. The NPC roster is regenerated deterministically on load, so we
   * persist only the records the player actually changed.
   */
  npcDeltas?: Record<
    string,
    {
      r: number;
      s: RelationshipStage;
      f?: number;
      b?: number;
      m?: string[];
      /** Day serial of the last deliberate reach-out, for the cooldown. */
      t?: number;
    }
  >;

  // ─── STREAMING, CHARTS, VIDEO (added 2026-09-28) ────────────────────────
  // All optional so a save written before this existed still loads cleanly.

  /** Per-song, per-platform streaming state. Keyed by song id. */
  platformStats?: Record<string, SongPlatformState>;
  /**
   * Absolute game-day serial of the last day the streaming engine processed.
   * This is the guard that stops a day, a week or a month being counted twice,
   * and it is what makes skipping 40 days process all 40.
   */
  streamCursor?: number;
  /** Serial of the last chart week published. 0 = never. */
  chartWeekCursor?: number;
  /** Current Global Top 100 (songs). */
  globalSongs?: ChartRow[];
  /** Current Global Top 200 (albums, EPs and deluxe editions). */
  globalAlbums?: ChartRow[];
  /** Position history per chart per item. Key `songs|itemId` / `albums|itemId`. */
  chartRuns?: Record<string, ChartRun>;
  /** Recorded milestones, newest last. */
  chartMilestones?: ChartMilestone[];
  /** Global certifications, newest last. */
  globalCerts?: GlobalCertification[];
  /** NPC albums and EPs. */
  npcAlbums?: Album[];
  /** Which country each screen was last looking at. */
  screenCountry?: Record<string, string>;
  /** Most recently viewed countries, newest first. */
  recentCountries?: string[];
  /** Artist and channel subscriptions. Persisted. */
  subscriptions?: Subscription[];
  /** The notification feed. */
  notifications?: GameNotification[];
  /** Every video on the platform. */
  videos?: Video[];
  /** Generated comments, per video. */
  videoComments?: Record<string, VideoComment[]>;
  /** The player's own like/dislike, per video id. */
  videoReactions?: Record<string, 1 | -1>;
  /** The player's own like/dislike, per comment id. */
  commentReactions?: Record<string, 1 | -1>;
  /** Video ids the player has watched, newest first. Drives recommendations. */
  watchHistory?: string[];

  // ── Navigation (transient — never written to the save) ───────────────────
  /** The record a drawer or detail screen is showing. */
  selectedSongId?: string | null;
  /** The video the watch screen is showing. */
  selectedVideoId?: string | null;
  /** The artist whose page is open. 'player' for the player's own page. */
  selectedArtistId?: string | null;
  /** The platform a streaming screen is looking at. */
  selectedPlatformId?: string;
  /**
   * An artist the player asked for a feature, on the way from their profile to
   * the Studio. The Studio consumes it once (opens the Features tab with the
   * name already in the filter) and clears it, so it is a hand-off rather than
   * a setting — which is why it lives here with the other navigation state and
   * never reaches the save.
   */
  pendingFeatureNpcId?: string | null;
  /**
   * The account of the turn that was just simulated, if it was one the player
   * pressed for. Deliberately transient: it describes a single press of the
   * clock, so restoring it on load would pop a receipt for a turn the player
   * does not remember making. A turn nobody asked for (the background clock
   * catching up) leaves this untouched.
   */
  lastTurnReport?: TurnReport | null;

  // ── Tax (persisted — reloading must not wipe a year's liability) ─────────
  /** The game year the three figures below belong to. */
  taxYear?: number;
  /**
   * The game month withholding was last charged for, as `year * 12 + month`.
   *
   * Withholding is a MONTHLY charge, and this is the cursor that makes it one.
   * It cannot be derived from `taxYear` alone: the year only changes in
   * January, so a year-only cursor would either charge nothing for eleven
   * months or charge every turn — which is exactly the bug this replaced.
   */
  taxMonth?: number;
  /** Income earned so far this game year. Drives the bracket walk. */
  taxYearIncome?: number;
  /** Tax already charged this game year, so the charge is only ever the gap. */
  taxPaidThisYear?: number;
  /** Everything ever paid, for the record. */
  taxPaidLifetime?: number;
}
