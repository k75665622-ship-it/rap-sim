// ─── SEEDED RIVALRIES ─────────────────────────────────────────────────────
// The arguments that exist whether or not the player is watching.
//
// A RULE THIS FILE EXISTS TO ENFORCE
// ───────────────────────────────────
// The roster in `data/realArtists.ts` is real people, and the note at the top
// of that file is the rule: the game does not put words in their mouths. A beef
// system is the most dangerous thing you could bolt onto a roster like that,
// because the obvious implementation is to write dialogue and attribute it.
//
// So this file has NO DIALOGUE FIELD. `RivalrySeed` has nowhere to put a quote,
// which means no screen can render one — not because somebody remembered not
// to, but because the type does not allow it. Every line the player ever sees
// about one of these rivalries is written by the game, in the game's voice,
// about a structural fact that is already on the roster: two people on the same
// label, two people from the same city, two people making the same sound in the
// same year. Those are the facts. The narration is the game's.
//
// The rivalries are DERIVED, not stored — the same way venues and the venue
// diary are. A seed plus the current week produces the heat, the standing and
// the last thing that happened, so the world has beefs without a single byte of
// save state and without the player doing anything.

import type { NPC } from '../types/game';
import { hashString } from '../sim/rng';

/** What the tension actually is. A structural fact, never a statement. */
export type RivalryBasis =
  | 'same_crew'
  | 'same_label'
  | 'same_city'
  | 'same_sound'
  | 'ex_labelmates'
  | 'chart_collision';

export interface RivalrySeed {
  /** Roster id, side A. */
  a: string;
  /** Roster id, side B. */
  b: string;
  basis: RivalryBasis;
  /**
   * The fact, in one line, as the game states it. This is a description of the
   * roster, NOT something either artist said.
   */
  why: string;
  /** How hot this runs at its peak, 0-100. */
  heat: number;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * The seeds.
 *
 * Every one of these is checkable against `data/realArtists.ts` — same crew,
 * same label, same city, same genre, or two internationals competing for the
 * same slot. `validateRivalry` checks exactly that and the store drops anything
 * that fails, so a typo'd id or a basis that is not actually supported by the
 * roster cannot reach a screen.
 */
export const RIVALRY_SEEDS: RivalrySeed[] = [
  // ── Ghana ──────────────────────────────────────────────────────────────
  {
    a: 'stonebwoy',
    b: 'shatta_wale',
    basis: 'same_sound',
    why: 'The two biggest dancehall acts in Accra, with a fanbase each and a decade of the same argument.',
    heat: 74,
  },
  {
    a: 'medikal',
    b: 'sarkodie_real',
    basis: 'same_sound',
    why: 'Two of the most decorated rappers in the country, one semi-retired and one who never stops releasing.',
    heat: 52,
  },
  {
    a: 'kwesi_arthur_real',
    b: 'medikal',
    basis: 'same_sound',
    why: 'Tema against Sowutuom — the underground favourite and the one who already made it.',
    heat: 41,
  },
  {
    a: 'amaarae',
    b: 'gyakie',
    basis: 'same_sound',
    why: 'Two of the most distinctive voices in Accra, occupying the same space in the same year.',
    heat: 33,
  },

  // ── Nigeria ────────────────────────────────────────────────────────────
  {
    a: 'wizkid',
    b: 'davido',
    basis: 'chart_collision',
    why: 'Both international, both Lagos, both releasing into the same week for a decade.',
    heat: 81,
  },
  {
    a: 'burna_real',
    b: 'davido',
    basis: 'chart_collision',
    why: 'Two international Lagos artists whose release dates keep landing on top of each other.',
    heat: 69,
  },
  {
    a: 'olamide',
    b: 'mi_abaga',
    basis: 'same_sound',
    why: 'YBNL against Chocolate City — the street and the lyricists, the same argument in two languages.',
    heat: 47,
  },
  {
    a: 'blaqbonez',
    b: 'ladipoe',
    basis: 'same_sound',
    why: 'The marketer and the lyricist, both Lagos, both insisting they are the better rapper.',
    heat: 38,
  },
  {
    a: 'asake',
    b: 'fireboy',
    basis: 'same_crew',
    why: 'Both YBNL, which means every chart week is an argument they cannot leave at the door.',
    heat: 44,
  },
  {
    a: 'tems',
    b: 'amaarae',
    basis: 'same_sound',
    why: 'Two writers who both came up outside the Lagos mainstream and both refuse to explain themselves.',
    heat: 35,
  },

  // ── Southern Africa ────────────────────────────────────────────────────
  {
    a: 'nasty_c',
    b: 'cassper',
    basis: 'same_sound',
    why: 'Durban against Johannesburg, and two careers built on the same claim about who is the best in the country.',
    heat: 58,
  },
  {
    a: 'ko',
    b: 'cassper',
    basis: 'same_sound',
    why: 'Two label bosses in the same genre in the same city, which makes every release a scoreboard.',
    heat: 49,
  },
  {
    a: 'kabza',
    b: 'dj_maphorisa',
    basis: 'same_crew',
    why: 'Both Piano Hub. The same room, the same sound and a decade of arguing about who made it.',
    heat: 55,
  },

  // ── UK ─────────────────────────────────────────────────────────────────
  {
    a: 'stormzy',
    b: 'skepta',
    basis: 'same_city',
    why: 'London grime, two generations, two labels and the same audience deciding who is the standard.',
    heat: 61,
  },
  {
    a: 'central_cee',
    b: 'dave',
    basis: 'chart_collision',
    why: 'Both international, both London, and the two names the press reach for first.',
    heat: 66,
  },
  {
    a: 'headie_one',
    b: 'fredo',
    basis: 'same_sound',
    why: 'Two London drill careers that have been compared to each other since the first verse.',
    heat: 43,
  },

  // ── USA ────────────────────────────────────────────────────────────────
  {
    a: 'nicki_minaj',
    b: 'cardi_b',
    basis: 'same_city',
    why: 'New York, the same slot at the top, and a fanbase on each side that does the arguing for them.',
    heat: 77,
  },
  {
    a: 'lil_baby',
    b: 'gunna',
    basis: 'same_city',
    why: 'Two Atlanta artists whose careers have been intertwined since before either had a deal.',
    heat: 63,
  },
  {
    a: '21_savage',
    b: 'future',
    basis: 'same_sound',
    why: 'Two Atlanta acts making the same kind of record, competing for the same slot in the same city.',
    heat: 50,
  },
  {
    a: 'megan_thee_stallion',
    b: 'glorilla',
    basis: 'same_sound',
    why: 'Houston against Memphis — two rappers whose every verse gets compared to the other.',
    heat: 42,
  },

  // ── Europe ─────────────────────────────────────────────────────────────
  {
    a: 'booba',
    b: 'damso',
    basis: 'same_label',
    why: 'Both 92i, which means the label has two artists who will not appear on the same record.',
    heat: 57,
  },
  {
    a: 'jul',
    b: 'sch',
    basis: 'same_city',
    why: 'Both Marseille, both releasing at a rate that makes the city pick a side.',
    heat: 46,
  },
  {
    a: 'sfera',
    b: 'geolier',
    basis: 'same_crew',
    why: 'Both Billion Headz, both the biggest thing in their half of Italy, one roster.',
    heat: 51,
  },
  {
    a: 'soolking',
    b: 'elgrande_toto',
    basis: 'same_sound',
    why: 'Two of the biggest rap voices in North Africa, reaching for the same French-language audience.',
    heat: 40,
  },

  // ── Asia ───────────────────────────────────────────────────────────────
  {
    a: 'jay_park',
    b: 'zico',
    basis: 'same_city',
    why: 'Two Seoul label founders who each built an empire after being told they were finished.',
    heat: 45,
  },
  {
    a: 'divine',
    b: 'raftaar',
    basis: 'same_sound',
    why: 'Mumbai against Delhi, and two very different answers to what Indian rap should sound like.',
    heat: 48,
  },
];

// ─── Validation ───────────────────────────────────────────────────────────

export interface RivalryCheck {
  ok: boolean;
  /** Why it failed, in words. `undefined` when it passed. */
  reason?: string;
}

/**
 * The imprint, not the distributor.
 *
 * Roster labels are written as `"Imprint / Distributor"` — `92i / Capitol`,
 * `YBNL / Empire`, `Quality Control / Motown`. Two artists on `92i / Capitol`
 * and `92i / Tallac` are labelmates, and comparing the whole string would call
 * that a lie and drop a seed that is true. The imprint is the part before the
 * slash, which is what "the same label" actually means; the distributor after
 * it is not something an artist signs to.
 */
function imprintOf(n: NPC): string | undefined {
  const raw = n.team?.label;
  if (!raw) return undefined;
  const imprint = raw.split('/')[0].trim().toLowerCase();
  return imprint || undefined;
}

/**
 * Is this seed actually supported by the roster?
 *
 * The point is that the data file cannot lie about itself. A `same_crew` seed
 * between two artists who are not on the same crew is a made-up fact, and a
 * made-up fact about real people is exactly what this file exists to prevent —
 * so it is dropped rather than rendered. Same for a closed artist, who cannot
 * be argued with because they cannot be reached at all.
 */
export function validateRivalry(seed: RivalrySeed, npcs: NPC[]): RivalryCheck {
  if (seed.a === seed.b) return { ok: false, reason: 'An artist cannot be in a beef with themselves.' };
  const a = npcs.find((n) => n.id === seed.a);
  const b = npcs.find((n) => n.id === seed.b);
  if (!a) return { ok: false, reason: `No artist with the id "${seed.a}".` };
  if (!b) return { ok: false, reason: `No artist with the id "${seed.b}".` };
  if (!a.isAvailable || !b.isAvailable) {
    return { ok: false, reason: 'One of the two is unreachable, so there is nothing to argue about.' };
  }

  const shared = (pick: (n: NPC) => string | undefined) => {
    const av = pick(a);
    const bv = pick(b);
    return !!av && !!bv && av === bv;
  };

  switch (seed.basis) {
    case 'same_crew':
      if (!shared((n) => n.team?.crew)) {
        return { ok: false, reason: `${a.name} and ${b.name} are not on the same crew.` };
      }
      break;
    case 'same_label':
      if (!shared(imprintOf)) {
        return { ok: false, reason: `${a.name} and ${b.name} are not on the same label.` };
      }
      break;
    case 'same_city':
      if (!shared((n) => n.city)) {
        return { ok: false, reason: `${a.name} and ${b.name} are not from the same city.` };
      }
      break;
    case 'same_sound':
      if (!shared((n) => n.genre)) {
        return { ok: false, reason: `${a.name} and ${b.name} do not make the same kind of music.` };
      }
      break;
    case 'ex_labelmates':
      if (!imprintOf(a) || !imprintOf(b) || imprintOf(a) === imprintOf(b)) {
        return { ok: false, reason: `${a.name} and ${b.name} were not on different labels.` };
      }
      break;
    case 'chart_collision':
      if (a.tier !== 'international' || b.tier !== 'international') {
        return { ok: false, reason: `${a.name} and ${b.name} do not compete for the same slot.` };
      }
      break;
  }

  return { ok: true };
}

/** Every seed that survives validation, in the order they are declared. */
export function seededRivalries(npcs: NPC[]): RivalrySeed[] {
  return RIVALRY_SEEDS.filter((seed) => validateRivalry(seed, npcs).ok);
}

// ─── The derived state of a world beef ────────────────────────────────────

export interface WorldBeefReading {
  aId: string;
  aName: string;
  bId: string;
  bName: string;
  basis: RivalryBasis;
  why: string;
  /** 0-100, right now. */
  heat: number;
  status: 'cold' | 'warm' | 'hot';
  /** Who has the upper hand this week. */
  standing: 'a' | 'b' | 'even';
  /** Day serial of the most recent exchange. */
  lastEventSerial: number;
  /** What happened, in the game's own words. */
  lastEventLine: string;
}

/**
 * What the game says when one of these flares up.
 *
 * Grouped by basis, so a label beef reads like a label beef. Not one of these is
 * a quote — there is no `said` field on a `RivalrySeed` and there never will be.
 */
const EVENT_LINES: Record<RivalryBasis, string[]> = {
  same_crew: [
    'Two artists on the same roster have stopped being booked on the same night.',
    'A label has two records out in the same week and is promoting one of them.',
    'The same studio, two sessions, and neither of them is taking the later slot.',
  ],
  same_label: [
    'Two artists on one label are both asking for the same release date.',
    'A label is deciding which of its own artists gets the push this quarter.',
    'The same imprint has two campaigns running and one budget.',
  ],
  same_city: [
    'The same city has two headliners and one headline.',
    'Two artists from the same postcode are both on the same festival poster.',
    'A city paper has picked a side and the other one has noticed.',
  ],
  same_sound: [
    'Two artists making the same sound are both being called the one who did it first.',
    'A critic has compared them again, unfavourably, to one of them.',
    'The same genre has two figureheads and one of them just said so.',
  ],
  ex_labelmates: [
    'Two artists who used to share a label have both been asked about it in the same week.',
    'An old split has come up again in an interview that was about something else.',
    'A former labelmate has been mentioned in a verse that was not about them.',
  ],
  chart_collision: [
    'Two release dates have landed on the same week again.',
    'The same chart slot has changed hands twice in a month.',
    'Two campaigns are chasing the same playlist and only one of them is getting it.',
  ],
};

/**
 * The state of one seeded rivalry, derived from the seed and the week.
 *
 * Nothing is stored. The heat breathes on a slow cycle so these flare up and
 * cool down on their own, the standing changes weekly, and the most recent
 * exchange is dated within the last nine days. Two things follow from that: the
 * world has arguments the player is not part of, and no save state is spent on
 * them.
 */
export function worldBeefAt(
  seed: RivalrySeed,
  npcs: NPC[],
  nowSerial: number,
): WorldBeefReading | null {
  const a = npcs.find((n) => n.id === seed.a);
  const b = npcs.find((n) => n.id === seed.b);
  if (!a || !b) return null;

  const week = Math.floor(nowSerial / 7);
  const h = hashString(`${seed.a}|${seed.b}`);
  // A stable per-rivalry offset, so twenty-six of these do not pulse together.
  const phase = (h % 997) / 997;

  // Heat breathes on roughly a twenty-week cycle. Deterministic: same week,
  // same number, every time the screen is opened.
  const wave = Math.sin((week + phase * 20) / 3.2);
  const heat = clamp(Math.round(seed.heat * (0.62 + 0.38 * wave)), 0, 100);

  const lines = EVENT_LINES[seed.basis];
  const lastEventLine = lines[(h + week) % lines.length];
  const lastEventSerial = nowSerial - ((h + week) % 9);

  const roll = (h + week) % 7;
  const standing: WorldBeefReading['standing'] = roll <= 2 ? 'a' : roll <= 4 ? 'b' : 'even';

  return {
    aId: a.id,
    aName: a.name,
    bId: b.id,
    bName: b.name,
    basis: seed.basis,
    why: seed.why,
    heat,
    status: heat >= 70 ? 'hot' : heat >= 40 ? 'warm' : 'cold',
    standing,
    lastEventSerial,
    lastEventLine,
  };
}

/** Every seeded rivalry, read as of `nowSerial`, hottest first. */
export function worldBeefs(npcs: NPC[], nowSerial: number): WorldBeefReading[] {
  return seededRivalries(npcs)
    .map((seed) => worldBeefAt(seed, npcs, nowSerial))
    .filter((r): r is WorldBeefReading => r !== null)
    .sort((x, y) => y.heat - x.heat);
}

export const BASIS_LABEL: Record<RivalryBasis, string> = {
  same_crew: 'Same crew',
  same_label: 'Same label',
  same_city: 'Same city',
  same_sound: 'Same sound',
  ex_labelmates: 'Ex-labelmates',
  chart_collision: 'Same chart slot',
};
